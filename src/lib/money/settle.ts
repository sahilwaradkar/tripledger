import type { ExpenseSplit, GroupExpense, GroupSettlement, Participant } from "@/lib/types";

export interface PersonBalance {
  participantId: string;
  displayName: string;
  paid: number;
  share: number;
  net: number;
}

export interface SettlementTransfer {
  fromParticipantId: string;
  fromName: string;
  toParticipantId: string;
  toName: string;
  amount: number;
}

export type PairwiseDebts = Map<string, Map<string, number>>;

export interface ParticipantDebtLine {
  participantId: string;
  amount: number;
}

export interface ParticipantDebts {
  owes: ParticipantDebtLine[];
  owedBy: ParticipantDebtLine[];
}

export interface NetDebtLine {
  participantId: string;
  /** Amount you owe them (positive number). */
  youOwe: number;
  /** Amount they owe you (positive number). */
  theyOweYou: number;
  /** Net from your perspective: positive = you owe, negative = they owe you. */
  net: number;
}

export interface RequiredMutualOffset {
  lowParticipantId: string;
  highParticipantId: string;
  amount: number;
  referenceKey: string;
  documentId: string;
}

const MONEY_EPS = 0.01;

function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}

function debtKey(fromId: string, toId: string): string {
  return `${fromId}\0${toId}`;
}

export function settlementKind(s: GroupSettlement): "payment" | "auto_offset" {
  return s.kind ?? "payment";
}

export function isManualSettlement(s: GroupSettlement): boolean {
  return settlementKind(s) !== "auto_offset";
}

export function sortedPairIds(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

export function mutualReferenceKey(idA: string, idB: string): string {
  const [low, high] = sortedPairIds(idA, idB);
  return `mutual:${low}:${high}`;
}

export function mutualSettlementDocumentId(idA: string, idB: string): string {
  const [low, high] = sortedPairIds(idA, idB);
  return `mutual_${low}_${high}`;
}

function buildRawDebts(
  participants: Participant[],
  expenses: GroupExpense[],
  manualSettlements: GroupSettlement[],
): Map<string, number> {
  const participantIds = new Set(participants.map((p) => p.id));
  const raw = new Map<string, number>();

  function addDebt(fromId: string, toId: string, amount: number) {
    if (fromId === toId || amount <= 0) return;
    if (!participantIds.has(fromId) || !participantIds.has(toId)) return;
    const key = debtKey(fromId, toId);
    raw.set(key, (raw.get(key) ?? 0) + amount);
  }

  function applySettlementPayment(fromId: string, toId: string, amount: number) {
    if (fromId === toId || amount <= 0) return;
    if (!participantIds.has(fromId) || !participantIds.has(toId)) return;
    const key = debtKey(fromId, toId);
    const direct = raw.get(key) ?? 0;
    if (amount <= direct + MONEY_EPS) {
      raw.set(key, roundMoney(Math.max(0, direct - amount)));
      return;
    }
    const excess = amount - direct;
    raw.set(key, 0);
    addDebt(toId, fromId, excess);
  }

  for (const expense of expenses) {
    const payerId = expense.paidByParticipantId;
    for (const split of expense.splits) {
      if (split.participantId !== payerId) {
        addDebt(split.participantId, payerId, split.amount);
      }
    }
  }

  for (const s of manualSettlements) {
    applySettlementPayment(s.fromParticipantId, s.toParticipantId, s.amount);
  }

  return raw;
}

function applyMutualOffset(
  raw: Map<string, number>,
  idA: string,
  idB: string,
  amount: number,
) {
  if (amount <= 0) return;
  const keyAB = debtKey(idA, idB);
  const keyBA = debtKey(idB, idA);
  raw.set(keyAB, roundMoney(Math.max(0, (raw.get(keyAB) ?? 0) - amount)));
  raw.set(keyBA, roundMoney(Math.max(0, (raw.get(keyBA) ?? 0) - amount)));
}

function rawToPairwise(raw: Map<string, number>, participantIds: Set<string>): PairwiseDebts {
  const result: PairwiseDebts = new Map();
  for (const from of participantIds) {
    result.set(from, new Map());
  }
  for (const [key, amount] of raw) {
    if (amount <= MONEY_EPS) continue;
    const [fromId, toId] = key.split("\0");
    if (!fromId || !toId) continue;
    const row = result.get(fromId);
    if (row) row.set(toId, roundMoney(amount));
  }
  return result;
}

export function computeGrossPairwiseDebts(
  participants: Participant[],
  expenses: GroupExpense[],
  settlements: GroupSettlement[] = [],
): PairwiseDebts {
  const participantIds = new Set(participants.map((p) => p.id));
  const manual = settlements.filter(isManualSettlement);
  const raw = buildRawDebts(participants, expenses, manual);
  return rawToPairwise(raw, participantIds);
}

export function computeRequiredMutualOffsets(
  participants: Participant[],
  gross: PairwiseDebts,
): RequiredMutualOffset[] {
  const ids = participants.map((p) => p.id);
  const required: RequiredMutualOffset[] = [];

  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      const a = ids[i]!;
      const b = ids[j]!;
      const ab = gross.get(a)?.get(b) ?? 0;
      const ba = gross.get(b)?.get(a) ?? 0;
      const amount = roundMoney(Math.min(ab, ba));
      if (amount <= MONEY_EPS) continue;
      const [low, high] = sortedPairIds(a, b);
      required.push({
        lowParticipantId: low,
        highParticipantId: high,
        amount,
        referenceKey: mutualReferenceKey(low, high),
        documentId: mutualSettlementDocumentId(low, high),
      });
    }
  }

  return required;
}

export function computeBalances(
  participants: Participant[],
  expenses: GroupExpense[],
  settlements: GroupSettlement[] = [],
): PersonBalance[] {
  const byId = new Map(participants.map((p) => [p.id, p]));
  const paid = new Map<string, number>();
  const share = new Map<string, number>();
  const netAdjust = new Map<string, number>();

  for (const p of participants) {
    paid.set(p.id, 0);
    share.set(p.id, 0);
    netAdjust.set(p.id, 0);
  }

  for (const expense of expenses) {
    paid.set(
      expense.paidByParticipantId,
      (paid.get(expense.paidByParticipantId) ?? 0) + expense.amount,
    );
    for (const split of expense.splits) {
      share.set(split.participantId, (share.get(split.participantId) ?? 0) + split.amount);
    }
  }

  for (const s of settlements) {
    if (!isManualSettlement(s)) continue;
    netAdjust.set(s.fromParticipantId, (netAdjust.get(s.fromParticipantId) ?? 0) + s.amount);
    netAdjust.set(s.toParticipantId, (netAdjust.get(s.toParticipantId) ?? 0) - s.amount);
  }

  return participants.map((p) => {
    const paidAmount = paid.get(p.id) ?? 0;
    const shareAmount = share.get(p.id) ?? 0;
    const adjustment = netAdjust.get(p.id) ?? 0;
    return {
      participantId: p.id,
      displayName: byId.get(p.id)?.displayName ?? p.displayName,
      paid: paidAmount,
      share: shareAmount,
      net: roundMoney(paidAmount - shareAmount + adjustment),
    };
  });
}

export function computePairwiseDebts(
  participants: Participant[],
  expenses: GroupExpense[],
  settlements: GroupSettlement[] = [],
): PairwiseDebts {
  const participantIds = new Set(participants.map((p) => p.id));
  const manual = settlements.filter(isManualSettlement);
  const raw = buildRawDebts(participants, expenses, manual);

  for (const s of settlements) {
    if (settlementKind(s) !== "auto_offset") continue;
    applyMutualOffset(raw, s.fromParticipantId, s.toParticipantId, s.amount);
  }

  return rawToPairwise(raw, participantIds);
}

export function maxSettlementAmount(
  fromId: string,
  toId: string,
  pairwise: PairwiseDebts,
): number {
  return pairwise.get(fromId)?.get(toId) ?? 0;
}

export function settlementOverage(
  fromId: string,
  toId: string,
  amount: number,
  pairwise: PairwiseDebts,
): number {
  const owed = maxSettlementAmount(fromId, toId, pairwise);
  return roundMoney(Math.max(0, amount - owed));
}

export function debtsForParticipant(
  participantId: string,
  pairwise: PairwiseDebts,
): ParticipantDebts {
  const owes: ParticipantDebtLine[] = [];
  const owedBy: ParticipantDebtLine[] = [];

  const myOwes = pairwise.get(participantId);
  if (myOwes) {
    for (const [toId, amount] of myOwes) {
      if (amount > MONEY_EPS) owes.push({ participantId: toId, amount });
    }
  }

  for (const [fromId, row] of pairwise) {
    if (fromId === participantId) continue;
    const amount = row.get(participantId);
    if (amount != null && amount > MONEY_EPS) {
      owedBy.push({ participantId: fromId, amount });
    }
  }

  owes.sort((a, b) => b.amount - a.amount);
  owedBy.sort((a, b) => b.amount - a.amount);
  return { owes, owedBy };
}

export function netDebtsForParticipant(
  participantId: string,
  pairwise: PairwiseDebts,
): NetDebtLine[] {
  const counterparties = new Set<string>();
  const myRow = pairwise.get(participantId);
  if (myRow) {
    for (const toId of myRow.keys()) counterparties.add(toId);
  }
  for (const [fromId, row] of pairwise) {
    if (row.has(participantId)) counterparties.add(fromId);
  }

  const lines: NetDebtLine[] = [];
  for (const otherId of counterparties) {
    const youOwe = pairwise.get(participantId)?.get(otherId) ?? 0;
    const theyOweYou = pairwise.get(otherId)?.get(participantId) ?? 0;
    const net = roundMoney(youOwe - theyOweYou);
    if (Math.abs(net) <= MONEY_EPS && youOwe <= MONEY_EPS && theyOweYou <= MONEY_EPS) continue;
    lines.push({
      participantId: otherId,
      youOwe: roundMoney(youOwe),
      theyOweYou: roundMoney(theyOweYou),
      net,
    });
  }

  lines.sort((a, b) => Math.abs(b.net) - Math.abs(a.net));
  return lines;
}

export function sumSettlementsBetween(
  fromId: string,
  toId: string,
  settlements: GroupSettlement[],
): number {
  return roundMoney(
    settlements
      .filter(
        (s) =>
          isManualSettlement(s) &&
          s.fromParticipantId === fromId &&
          s.toParticipantId === toId,
      )
      .reduce((sum, s) => sum + s.amount, 0),
  );
}

export function equalSplits(amount: number, participantIds: string[]): ExpenseSplit[] {
  if (participantIds.length === 0) return [];
  const each = Math.round((amount / participantIds.length) * 100) / 100;
  const splits = participantIds.map((id) => ({ participantId: id, amount: each }));
  const total = splits.reduce((s, x) => s + x.amount, 0);
  const diff = roundMoney(amount - total);
  if (diff !== 0 && splits[0]) {
    splits[0] = { ...splits[0], amount: splits[0].amount + diff };
  }
  return splits;
}

export function settleTransfers(balances: PersonBalance[]): SettlementTransfer[] {
  const debtors = balances
    .filter((b) => b.net < -MONEY_EPS)
    .map((b) => ({ ...b, net: -b.net }))
    .sort((a, b) => b.net - a.net);
  const creditors = balances
    .filter((b) => b.net > MONEY_EPS)
    .sort((a, b) => b.net - a.net);

  const transfers: SettlementTransfer[] = [];
  let i = 0;
  let j = 0;

  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i]!;
    const creditor = creditors[j]!;
    const amount = Math.min(debtor.net, creditor.net);
    if (amount > MONEY_EPS) {
      transfers.push({
        fromParticipantId: debtor.participantId,
        fromName: debtor.displayName,
        toParticipantId: creditor.participantId,
        toName: creditor.displayName,
        amount: roundMoney(amount),
      });
    }
    debtor.net -= amount;
    creditor.net -= amount;
    if (debtor.net <= MONEY_EPS) i++;
    if (creditor.net <= MONEY_EPS) j++;
  }

  return transfers;
}
