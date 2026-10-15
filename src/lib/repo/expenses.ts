import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  updateDoc,
  where,
  type Unsubscribe,
} from "firebase/firestore";
import { getFirestoreDb } from "@/lib/firebase";
import type { PersonalExpense } from "@/lib/types";
import { omitUndefined } from "@/lib/utils";

function mapExpense(id: string, data: Record<string, unknown>): PersonalExpense {
  return {
    id,
    ownerId: data.ownerId as string,
    tripId: data.tripId as string | undefined,
    amount: data.amount as number,
    currency: data.currency as string,
    category: data.category as PersonalExpense["category"],
    date: data.date as string,
    note: data.note as string | undefined,
    updatedAt: (data.updatedAt as number) ?? Date.now(),
  };
}

export function subscribePersonalExpenses(
  ownerId: string,
  onData: (expenses: PersonalExpense[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  const q = query(collection(getFirestoreDb(), "expenses"), where("ownerId", "==", ownerId));
  return onSnapshot(
    q,
    (snap) => {
      const items = snap.docs.map((d) => mapExpense(d.id, d.data()));
      items.sort((a, b) => b.date.localeCompare(a.date));
      onData(items);
    },
    (err) => onError?.(err),
  );
}

export async function createPersonalExpense(
  input: Omit<PersonalExpense, "id" | "updatedAt">,
) {
  const ref = await addDoc(
    collection(getFirestoreDb(), "expenses"),
    omitUndefined({
      ...input,
      updatedAt: Date.now(),
    }),
  );
  return ref.id;
}

export async function updatePersonalExpense(
  expenseId: string,
  patch: Partial<Omit<PersonalExpense, "id" | "ownerId">>,
) {
  await updateDoc(
    doc(getFirestoreDb(), "expenses", expenseId),
    omitUndefined({
      ...patch,
      updatedAt: Date.now(),
    }),
  );
}

export async function deletePersonalExpense(expenseId: string) {
  await deleteDoc(doc(getFirestoreDb(), "expenses", expenseId));
}
