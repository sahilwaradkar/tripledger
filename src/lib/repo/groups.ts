import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  runTransaction,
  setDoc,
  updateDoc,
  where,
  type Unsubscribe,
} from "firebase/firestore";
import { getFirestoreDb } from "@/lib/firebase";
import type { Group, GroupExpense, Participant } from "@/lib/types";
import { lookupUserByEmail } from "@/lib/repo/users";
import { generateInviteToken, normalizeEmail, omitUndefined } from "@/lib/utils";

function mapGroup(id: string, data: Record<string, unknown>): Group {
  const createdById = data.createdById as string;
  const adminIds = (data.adminIds as string[] | undefined) ?? [];
  return {
    id,
    name: data.name as string,
    currency: data.currency as string,
    startDate: data.startDate as string | undefined,
    endDate: data.endDate as string | undefined,
    createdById,
    memberIds: (data.memberIds as string[]) ?? [],
    adminIds: adminIds.length ? adminIds : [createdById],
    inviteToken: data.inviteToken as string,
  };
}

function mapParticipant(id: string, data: Record<string, unknown>): Participant {
  return {
    id,
    displayName: data.displayName as string,
    email: data.email as string | undefined,
    userId: data.userId as string | undefined,
    kind: data.kind as Participant["kind"],
    claimedByUserId: data.claimedByUserId as string | undefined,
  };
}

function mapGroupExpense(id: string, data: Record<string, unknown>): GroupExpense {
  return {
    id,
    amount: data.amount as number,
    currency: data.currency as string,
    category: data.category as GroupExpense["category"],
    date: data.date as string,
    note: data.note as string | undefined,
    paidByParticipantId: data.paidByParticipantId as string,
    splits: (data.splits as GroupExpense["splits"]) ?? [],
    updatedAt: (data.updatedAt as number) ?? Date.now(),
  };
}

async function participantEmailTaken(groupId: string, email: string) {
  const normalized = normalizeEmail(email);
  const snap = await getDocs(collection(getFirestoreDb(), "groups", groupId, "participants"));
  return snap.docs.some((d) => {
    const data = d.data();
    const participantEmail = data.email as string | undefined;
    if (participantEmail && normalizeEmail(participantEmail) === normalized) return true;
    return false;
  });
}

export function subscribeGroups(
  userId: string,
  onData: (groups: Group[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  const q = query(
    collection(getFirestoreDb(), "groups"),
    where("memberIds", "array-contains", userId),
  );
  return onSnapshot(
    q,
    (snap) => {
      onData(snap.docs.map((d) => mapGroup(d.id, d.data())));
    },
    (err) => onError?.(err),
  );
}

export function subscribeGroup(
  groupId: string,
  onData: (group: Group | null) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    doc(getFirestoreDb(), "groups", groupId),
    (snap) => {
      if (!snap.exists()) {
        onData(null);
        return;
      }
      onData(mapGroup(snap.id, snap.data()));
    },
    (err) => onError?.(err),
  );
}

export function subscribeParticipants(
  groupId: string,
  onData: (participants: Participant[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    collection(getFirestoreDb(), "groups", groupId, "participants"),
    (snap) => {
      onData(snap.docs.map((d) => mapParticipant(d.id, d.data())));
    },
    (err) => onError?.(err),
  );
}

export function subscribeGroupExpenses(
  groupId: string,
  onData: (expenses: GroupExpense[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    collection(getFirestoreDb(), "groups", groupId, "expenses"),
    (snap) => {
      const items = snap.docs.map((d) => mapGroupExpense(d.id, d.data()));
      items.sort((a, b) => b.date.localeCompare(a.date));
      onData(items);
    },
    (err) => onError?.(err),
  );
}

export async function createGroup(input: {
  name: string;
  currency: string;
  startDate?: string;
  endDate?: string;
  createdById: string;
  creatorDisplayName: string;
  creatorEmail?: string;
}) {
  const inviteToken = generateInviteToken();
  const groupRef = await addDoc(collection(getFirestoreDb(), "groups"), {
    name: input.name,
    currency: input.currency,
    startDate: input.startDate ?? null,
    endDate: input.endDate ?? null,
    createdById: input.createdById,
    memberIds: [input.createdById],
    adminIds: [input.createdById],
    inviteToken,
  });

  await setDoc(doc(getFirestoreDb(), "groups", groupRef.id, "participants", input.createdById), {
    displayName: input.creatorDisplayName,
    userId: input.createdById,
    kind: "member",
    ...(input.creatorEmail ? { email: normalizeEmail(input.creatorEmail) } : {}),
  });

  await setDoc(doc(getFirestoreDb(), "invites", inviteToken), {
    groupId: groupRef.id,
    createdById: input.createdById,
  });

  return { groupId: groupRef.id, inviteToken };
}

export async function updateGroupSettings(
  groupId: string,
  patch: Pick<Group, "name" | "currency" | "startDate" | "endDate">,
) {
  await updateDoc(
    doc(getFirestoreDb(), "groups", groupId),
    omitUndefined({
      name: patch.name,
      currency: patch.currency,
      startDate: patch.startDate ?? null,
      endDate: patch.endDate ?? null,
    }),
  );
}

export async function addParticipantByEmail(
  groupId: string,
  input: { email: string; displayName?: string },
) {
  const email = normalizeEmail(input.email);
  if (!email) throw new Error("Email is required.");

  if (await participantEmailTaken(groupId, email)) {
    throw new Error("Someone with this email is already in the group.");
  }

  const directory = await lookupUserByEmail(email);

  if (directory) {
    const existingMemberDoc = await getDoc(
      doc(getFirestoreDb(), "groups", groupId, "participants", directory.uid),
    );
    if (existingMemberDoc.exists()) {
      throw new Error("This user is already in the group.");
    }

    await runTransaction(getFirestoreDb(), async (tx) => {
      const groupRef = doc(getFirestoreDb(), "groups", groupId);
      const groupSnap = await tx.get(groupRef);
      if (!groupSnap.exists()) throw new Error("Group not found.");
      const group = groupSnap.data();
      const memberIds: string[] = group.memberIds ?? [];
      if (memberIds.includes(directory.uid)) {
        throw new Error("This user is already a group member.");
      }
      tx.update(groupRef, { memberIds: [...memberIds, directory.uid] });
      const participantRef = doc(getFirestoreDb(), "groups", groupId, "participants", directory.uid);
      tx.set(participantRef, {
        displayName: directory.displayName,
        userId: directory.uid,
        kind: "member",
        email,
      });
    });
    return { kind: "member" as const, participantId: directory.uid };
  }

  const name = input.displayName?.trim();
  if (!name) {
    throw new Error("Display name is required for guests without an account.");
  }

  const ref = await addDoc(collection(getFirestoreDb(), "groups", groupId, "participants"), {
    displayName: name,
    kind: "guest",
    email,
  });
  return { kind: "guest" as const, participantId: ref.id };
}

/** @deprecated Use addParticipantByEmail */
export async function addGuestParticipant(groupId: string, displayName: string) {
  const ref = await addDoc(
    collection(getFirestoreDb(), "groups", groupId, "participants"),
    {
      displayName,
      kind: "guest",
    },
  );
  return ref.id;
}

export async function removeParticipant(groupId: string, participant: Participant) {
  await runTransaction(getFirestoreDb(), async (tx) => {
    const participantRef = doc(getFirestoreDb(), "groups", groupId, "participants", participant.id);
    tx.delete(participantRef);

    const uid = participant.userId ?? (participant.kind === "member" ? participant.id : undefined);
    if (!uid) return;

    const groupRef = doc(getFirestoreDb(), "groups", groupId);
    const groupSnap = await tx.get(groupRef);
    if (!groupSnap.exists()) return;
    const group = groupSnap.data();
    const memberIds: string[] = group.memberIds ?? [];
    const adminIds: string[] = group.adminIds ?? [group.createdById as string];
    tx.update(groupRef, {
      memberIds: memberIds.filter((id) => id !== uid),
      adminIds: adminIds.filter((id) => id !== uid),
    });
  });
}

export async function claimGuestParticipant(
  groupId: string,
  participantId: string,
  userId: string,
  displayName: string,
  userEmail?: string | null,
) {
  const participantRef = doc(getFirestoreDb(), "groups", groupId, "participants", participantId);
  const participantSnap = await getDoc(participantRef);
  if (!participantSnap.exists()) throw new Error("Participant not found.");
  const data = participantSnap.data();
  if (data.kind !== "guest") throw new Error("Only guest participants can be claimed.");

  const guestEmail = data.email as string | undefined;
  if (guestEmail && userEmail && normalizeEmail(userEmail) !== normalizeEmail(guestEmail)) {
    throw new Error("Your account email does not match this guest invite.");
  }

  await runTransaction(getFirestoreDb(), async (tx) => {
    const groupRef = doc(getFirestoreDb(), "groups", groupId);
    const groupSnap = await tx.get(groupRef);
    if (!groupSnap.exists()) throw new Error("Group not found.");
    const group = groupSnap.data();
    const memberIds: string[] = group.memberIds ?? [];

    tx.delete(participantRef);

    if (!memberIds.includes(userId)) {
      tx.update(groupRef, { memberIds: [...memberIds, userId] });
    }

    const memberRef = doc(getFirestoreDb(), "groups", groupId, "participants", userId);
    tx.set(memberRef, {
      displayName,
      userId,
      kind: "member",
      claimedByUserId: userId,
      ...(guestEmail ? { email: normalizeEmail(guestEmail) } : {}),
    });
  });
}

export async function joinGroupViaInvite(token: string, userId: string, displayName: string) {
  const inviteRef = doc(getFirestoreDb(), "invites", token);
  const inviteSnap = await getDoc(inviteRef);
  if (!inviteSnap.exists()) {
    throw new Error("Invite link is invalid or expired.");
  }
  const { groupId } = inviteSnap.data() as { groupId: string };

  await runTransaction(getFirestoreDb(), async (tx) => {
    const groupRef = doc(getFirestoreDb(), "groups", groupId);
    const groupSnap = await tx.get(groupRef);
    if (!groupSnap.exists()) {
      throw new Error("Group no longer exists.");
    }
    const group = groupSnap.data();
    const memberIds: string[] = group.memberIds ?? [];
    if (!memberIds.includes(userId)) {
      tx.update(groupRef, { memberIds: [...memberIds, userId] });
    }
    const participantRef = doc(getFirestoreDb(), "groups", groupId, "participants", userId);
    tx.set(
      participantRef,
      {
        displayName,
        userId,
        kind: "member",
      },
      { merge: true },
    );
  });

  return groupId;
}

export async function createGroupExpense(
  groupId: string,
  input: Omit<GroupExpense, "id" | "updatedAt">,
) {
  const ref = await addDoc(
    collection(getFirestoreDb(), "groups", groupId, "expenses"),
    omitUndefined({
      ...input,
      updatedAt: Date.now(),
    }),
  );
  return ref.id;
}

export async function updateGroupExpense(
  groupId: string,
  expenseId: string,
  patch: Partial<Omit<GroupExpense, "id">>,
) {
  await updateDoc(
    doc(getFirestoreDb(), "groups", groupId, "expenses", expenseId),
    omitUndefined({
      ...patch,
      updatedAt: Date.now(),
    }),
  );
}

export async function deleteGroupExpense(groupId: string, expenseId: string) {
  await deleteDoc(doc(getFirestoreDb(), "groups", groupId, "expenses", expenseId));
}

export async function getInviteGroupId(token: string) {
  const snap = await getDoc(doc(getFirestoreDb(), "invites", token));
  if (!snap.exists()) return null;
  return (snap.data() as { groupId: string }).groupId;
}
