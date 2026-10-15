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
import type { Trip } from "@/lib/types";
import { omitUndefined } from "@/lib/utils";

function mapTrip(id: string, data: Record<string, unknown>): Trip {
  return {
    id,
    ownerId: data.ownerId as string,
    name: data.name as string,
    startDate: data.startDate as string | undefined,
    endDate: data.endDate as string | undefined,
  };
}

export function subscribeTrips(
  ownerId: string,
  onData: (trips: Trip[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  const q = query(collection(getFirestoreDb(), "trips"), where("ownerId", "==", ownerId));
  return onSnapshot(
    q,
    (snap) => {
      onData(snap.docs.map((d) => mapTrip(d.id, d.data())));
    },
    (err) => onError?.(err),
  );
}

export async function createTrip(input: Omit<Trip, "id">) {
  const ref = await addDoc(collection(getFirestoreDb(), "trips"), omitUndefined({ ...input }));
  return ref.id;
}

export async function updateTrip(tripId: string, patch: Partial<Omit<Trip, "id" | "ownerId">>) {
  await updateDoc(doc(getFirestoreDb(), "trips", tripId), omitUndefined({ ...patch }));
}

export async function deleteTrip(tripId: string) {
  await deleteDoc(doc(getFirestoreDb(), "trips", tripId));
}
