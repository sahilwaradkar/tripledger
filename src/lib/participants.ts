import type { Group, Participant } from "@/lib/types";
import { groupAdminIds } from "@/lib/utils";

export function participantForUser(participants: Participant[], uid: string) {
  return participants.find(
    (p) => p.id === uid || p.userId === uid || p.claimedByUserId === uid,
  );
}

export function isGroupAdminForUser(group: Group, uid: string) {
  return groupAdminIds(group).includes(uid);
}

export function canUserRecordSettlement(
  group: Group,
  participants: Participant[],
  uid: string,
  fromParticipantId: string,
  toParticipantId: string,
): boolean {
  if (isGroupAdminForUser(group, uid)) return true;
  const me = participantForUser(participants, uid);
  if (!me) return false;
  return me.id === fromParticipantId || me.id === toParticipantId;
}
