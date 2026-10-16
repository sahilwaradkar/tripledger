"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AddParticipantForm } from "@/components/groups/add-participant-form";
import type { Participant } from "@/lib/types";
import { normalizeEmail } from "@/lib/utils";

function canClaimGuest(participant: Participant, userEmail: string | null | undefined) {
  if (participant.kind !== "guest") return false;
  if (!participant.email) return true;
  if (!userEmail) return false;
  return normalizeEmail(participant.email) === normalizeEmail(userEmail);
}

export function GroupMembersPanel({
  participants,
  admins,
  isAdmin,
  soleAdmin,
  user,
  onClaimGuest,
  onRemove,
  onAddParticipant,
}: {
  participants: Participant[];
  admins: string[];
  isAdmin: boolean;
  soleAdmin: boolean;
  user: { uid: string; email?: string | null; displayName?: string | null } | null;
  onClaimGuest: (participantId: string) => void | Promise<void>;
  onRemove: (participant: Participant) => void;
  onAddParticipant: (values: { email: string; displayName?: string }) => Promise<void>;
}) {
  return (
    <div className="space-y-4">
      <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
        {participants.map((p) => {
          const isParticipantAdmin =
            (p.userId != null && admins.includes(p.userId)) || admins.includes(p.id);
          const isSelf =
            user != null &&
            (p.id === user.uid || p.userId === user.uid || p.claimedByUserId === user.uid);
          const canRemove = isAdmin && !(isSelf && soleAdmin);

          return (
            <li key={p.id} className="flex items-center justify-between gap-2 px-3 py-3 text-sm">
              <span className="min-w-0">
                <span className="font-medium">{p.displayName}</span>
                {p.email ? (
                  <span className="block truncate text-xs text-muted">{p.email}</span>
                ) : null}
                <span className="mt-0.5 flex flex-wrap gap-1">
                  {p.kind === "guest" ? (
                    <Badge variant="secondary">Guest</Badge>
                  ) : (
                    <Badge variant="default">Member</Badge>
                  )}
                  {isParticipantAdmin ? <Badge variant="warning">Admin</Badge> : null}
                </span>
              </span>
              <div className="flex shrink-0 flex-col items-end gap-1">
                {canClaimGuest(p, user?.email ?? null) && user ? (
                  <Button size="sm" variant="ghost" onClick={() => void onClaimGuest(p.id)}>
                    Claim (me)
                  </Button>
                ) : null}
                {canRemove ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-red-600"
                    onClick={() => onRemove(p)}
                  >
                    Remove
                  </Button>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
      {isAdmin ? (
        <AddParticipantForm onSubmit={onAddParticipant} />
      ) : (
        <p className="text-xs text-muted">Only admins can add or remove people.</p>
      )}
    </div>
  );
}
