import type { ExpenseSplit, GroupExpense, Participant } from "@/lib/types";

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

export function computeBalances(
  participants: Participant[],
  expenses: GroupExpense[],
): PersonBalance[] {
  const byId = new Map(participants.map((p) => [p.id, p]));
  const paid = new Map<string, number>();
  const share = new Map<string, number>();

  for (const p of participants) {
    paid.set(p.id, 0);
    share.set(p.id, 0);
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

  return participants.map((p) => {
    const paidAmount = paid.get(p.id) ?? 0;
    const shareAmount = share.get(p.id) ?? 0;
    return {
      participantId: p.id,
      displayName: byId.get(p.id)?.displayName ?? p.displayName,
      paid: paidAmount,
      share: shareAmount,
      net: paidAmount - shareAmount,
    };
  });
}

export function equalSplits(amount: number, participantIds: string[]): ExpenseSplit[] {
  if (participantIds.length === 0) return [];
  const each = Math.round((amount / participantIds.length) * 100) / 100;
  const splits = participantIds.map((id) => ({ participantId: id, amount: each }));
  const total = splits.reduce((s, x) => s + x.amount, 0);
  const diff = Math.round((amount - total) * 100) / 100;
  if (diff !== 0 && splits[0]) {
    splits[0] = { ...splits[0], amount: splits[0].amount + diff };
  }
  return splits;
}

export function settleTransfers(balances: PersonBalance[]): SettlementTransfer[] {
  const debtors = balances
    .filter((b) => b.net < -0.01)
    .map((b) => ({ ...b, net: -b.net }))
    .sort((a, b) => b.net - a.net);
  const creditors = balances
    .filter((b) => b.net > 0.01)
    .sort((a, b) => b.net - a.net);

  const transfers: SettlementTransfer[] = [];
  let i = 0;
  let j = 0;

  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i]!;
    const creditor = creditors[j]!;
    const amount = Math.min(debtor.net, creditor.net);
    if (amount > 0.01) {
      transfers.push({
        fromParticipantId: debtor.participantId,
        fromName: debtor.displayName,
        toParticipantId: creditor.participantId,
        toName: creditor.displayName,
        amount: Math.round(amount * 100) / 100,
      });
    }
    debtor.net -= amount;
    creditor.net -= amount;
    if (debtor.net <= 0.01) i++;
    if (creditor.net <= 0.01) j++;
  }

  return transfers;
}
