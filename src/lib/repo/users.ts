import { doc, getDoc, setDoc } from "firebase/firestore";
import { getFirestoreDb } from "@/lib/firebase";
import type { UserProfile } from "@/lib/types";
import { normalizeEmail } from "@/lib/utils";

export interface EmailDirectoryEntry {
  uid: string;
  displayName: string;
}

export async function upsertUserProfile(uid: string, profile: UserProfile) {
  await setDoc(doc(getFirestoreDb(), "users", uid), profile, { merge: true });
  await upsertEmailIndex(uid, profile.email, profile.displayName);
}

export async function upsertEmailIndex(uid: string, email: string, displayName: string) {
  const normalized = normalizeEmail(email);
  if (!normalized) return;
  const ref = doc(getFirestoreDb(), "userEmails", normalized);
  const snap = await getDoc(ref);
  if (snap.exists() && (snap.data().uid as string) !== uid) return;
  await setDoc(ref, {
    uid,
    displayName,
  });
}

export async function lookupUserByEmail(email: string): Promise<EmailDirectoryEntry | null> {
  const normalized = normalizeEmail(email);
  if (!normalized) return null;
  const snap = await getDoc(doc(getFirestoreDb(), "userEmails", normalized));
  if (!snap.exists()) return null;
  const data = snap.data();
  return {
    uid: data.uid as string,
    displayName: data.displayName as string,
  };
}

export async function ensureEmailIndexForAuthUser(
  uid: string,
  email: string | null | undefined,
  displayName: string,
) {
  if (!email) return;
  const existing = await lookupUserByEmail(email);
  if (existing?.uid === uid) return;
  await upsertEmailIndex(uid, email, displayName);
}
