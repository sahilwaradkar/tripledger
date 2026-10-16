import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  setDoc,
  updateDoc,
  type Unsubscribe,
} from "firebase/firestore";
import { getFirestoreDb } from "@/lib/firebase";
import {
  computeGrossPairwiseDebts,
  computeRequiredMutualOffsets,
  isManualSettlement,
} from "@/lib/money/settle";
import type { GroupExpense, GroupSettlement, Participant } from "@/lib/types";
import { omitUndefined } from "@/lib/utils";

function mapGroupSettlement(id: string, data: Record<string, unknown>): GroupSettlement {
  return {
    id,
    fromParticipantId: data.fromParticipantId as string,
    toParticipantId: data.toParticipantId as string,
    amount: data.amount as number,
    currency: data.currency as string,
    date: data.date as string,
    note: data.note as string | undefined,
    recordedByUserId: data.recordedByUserId as string,
    updatedAt: (data.updatedAt as number) ?? Date.now(),
    kind: data.kind as GroupSettlement["kind"] | undefined,
    referenceKey: data.referenceKey as string | undefined,
  };
}

export function subscribeGroupSettlements(
  groupId: string,
  onData: (settlements: GroupSettlement[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    collection(getFirestoreDb(), "groups", groupId, "settlements"),
    (snap) => {
      const items = snap.docs.map((d) => mapGroupSettlement(d.id, d.data()));
      items.sort((a, b) => b.date.localeCompare(a.date) || b.updatedAt - a.updatedAt);
      onData(items);
    },
    (err) => onError?.(err),
  );
}

export async function createGroupSettlement(
  groupId: string,
  input: Omit<GroupSettlement, "id" | "updatedAt">,
) {
  const ref = await addDoc(
    collection(getFirestoreDb(), "groups", groupId, "settlements"),
    omitUndefined({
      ...input,
      kind: input.kind ?? "payment",
      updatedAt: Date.now(),
    }),
  );
  return ref.id;
}

export async function deleteGroupSettlement(groupId: string, settlementId: string) {
  await deleteDoc(doc(getFirestoreDb(), "groups", groupId, "settlements", settlementId));
}

export async function syncMutualSettlements(
  groupId: string,
  input: {
    participants: Participant[];
    expenses: GroupExpense[];
    settlements: GroupSettlement[];
    currency: string;
    userId: string;
  },
): Promise<void> {
  const gross = computeGrossPairwiseDebts(input.participants, input.expenses, input.settlements);
  const required = computeRequiredMutualOffsets(input.participants, gross);
  const requiredByKey = new Map(required.map((r) => [r.referenceKey, r]));
  const byId = new Map(input.participants.map((p) => [p.id, p]));
  const today = new Date().toISOString().slice(0, 10);

  for (const r of required) {
    const lowName = byId.get(r.lowParticipantId)?.displayName ?? "?";
    const highName = byId.get(r.highParticipantId)?.displayName ?? "?";
    const note = `Auto-settled mutual balance with ${lowName} & ${highName}`;
    const ref = doc(getFirestoreDb(), "groups", groupId, "settlements", r.documentId);
    const existing = input.settlements.find((s) => s.id === r.documentId);

    if (
      existing &&
      existing.kind === "auto_offset" &&
      Math.abs(existing.amount - r.amount) <= 0.01 &&
      existing.referenceKey === r.referenceKey
    ) {
      continue;
    }

    if (existing?.kind === "auto_offset") {
      await updateDoc(
        ref,
        omitUndefined({
          amount: r.amount,
          note,
          date: today,
          updatedAt: Date.now(),
        }),
      );
    } else {
      await setDoc(
        ref,
        omitUndefined({
          fromParticipantId: r.lowParticipantId,
          toParticipantId: r.highParticipantId,
          amount: r.amount,
          currency: input.currency,
          date: today,
          note,
          recordedByUserId: input.userId,
          kind: "auto_offset",
          referenceKey: r.referenceKey,
          updatedAt: Date.now(),
        }),
      );
    }
  }

  for (const s of input.settlements) {
    if (s.kind !== "auto_offset" || !s.referenceKey) continue;
    if (!requiredByKey.has(s.referenceKey)) {
      await deleteDoc(doc(getFirestoreDb(), "groups", groupId, "settlements", s.id));
    }
  }
}
