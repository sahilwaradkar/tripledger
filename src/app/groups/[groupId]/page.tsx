"use client";

import { Plus, Share2 } from "lucide-react";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { RequireAuth } from "@/components/auth/require-auth";
import { ExpenseListItem } from "@/components/expenses/expense-list-item";
import { GroupExpenseForm } from "@/components/expenses/group-expense-form";
import { AddParticipantForm } from "@/components/groups/add-participant-form";
import { GroupSettingsForm } from "@/components/groups/group-settings-form";
import { AppShell } from "@/components/layout/app-shell";
import { useAuth } from "@/components/providers/auth-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { computeBalances, settleTransfers } from "@/lib/money/settle";
import { createPersonalExpense } from "@/lib/repo/expenses";
import {
  addParticipantByEmail,
  claimGuestParticipant,
  createGroupExpense,
  deleteGroupExpense,
  removeParticipant,
  subscribeGroup,
  subscribeGroupExpenses,
  subscribeParticipants,
  updateGroupSettings,
} from "@/lib/repo/groups";
import type { Group, GroupExpense, Participant } from "@/lib/types";
import { formatMoney, groupAdminIds, normalizeEmail } from "@/lib/utils";

function participantForUser(participants: Participant[], uid: string) {
  return participants.find(
    (p) => p.id === uid || p.userId === uid || p.claimedByUserId === uid,
  );
}

function canClaimGuest(participant: Participant, userEmail: string | null | undefined) {
  if (participant.kind !== "guest") return false;
  if (!participant.email) return true;
  if (!userEmail) return false;
  return normalizeEmail(participant.email) === normalizeEmail(userEmail);
}

function GroupDetailContent() {
  const params = useParams<{ groupId: string }>();
  const groupId = params.groupId;
  const { user } = useAuth();
  const [group, setGroup] = useState<Group | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [expenses, setExpenses] = useState<GroupExpense[]>([]);
  const [expenseSheetOpen, setExpenseSheetOpen] = useState(false);
  const [personalPromptOpen, setPersonalPromptOpen] = useState(false);
  const [pendingPersonalExpense, setPendingPersonalExpense] = useState<Omit<
    GroupExpense,
    "id" | "updatedAt"
  > | null>(null);
  const [removeTarget, setRemoveTarget] = useState<Participant | null>(null);
  const [shareMessage, setShareMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!groupId) return;
    const unsubG = subscribeGroup(groupId, setGroup);
    const unsubP = subscribeParticipants(groupId, setParticipants);
    const unsubE = subscribeGroupExpenses(groupId, setExpenses);
    return () => {
      unsubG();
      unsubP();
      unsubE();
    };
  }, [groupId]);

  const admins = useMemo(() => (group ? groupAdminIds(group) : []), [group]);
  const isAdmin = useMemo(
    () => (user && group ? admins.includes(user.uid) : false),
    [user, group, admins],
  );

  const total = useMemo(() => expenses.reduce((s, e) => s + e.amount, 0), [expenses]);
  const balances = useMemo(
    () => computeBalances(participants, expenses),
    [participants, expenses],
  );
  const transfers = useMemo(() => settleTransfers(balances), [balances]);

  const inviteUrl = useMemo(() => {
    if (!group || typeof window === "undefined") return "";
    return `${window.location.origin}/g/${group.inviteToken}`;
  }, [group]);

  async function handleShare() {
    if (!inviteUrl) return;
    try {
      if (navigator.share) {
        await navigator.share({ title: group?.name, url: inviteUrl });
      } else {
        await navigator.clipboard.writeText(inviteUrl);
        setShareMessage("Link copied to clipboard");
        window.setTimeout(() => setShareMessage(null), 2500);
      }
    } catch {
      await navigator.clipboard.writeText(inviteUrl);
      setShareMessage("Link copied to clipboard");
    }
  }

  async function handleAddExpense(values: Omit<GroupExpense, "id" | "updatedAt">) {
    await createGroupExpense(groupId, values);
    setExpenseSheetOpen(false);

    const myParticipant = user ? participantForUser(participants, user.uid) : undefined;
    if (myParticipant && values.paidByParticipantId === myParticipant.id) {
      setPendingPersonalExpense(values);
      setPersonalPromptOpen(true);
    }
  }

  function closePersonalPrompt() {
    setPersonalPromptOpen(false);
    setPendingPersonalExpense(null);
  }

  async function handleAddToPersonal() {
    if (!user || !pendingPersonalExpense || !group) return;
    const baseNote = pendingPersonalExpense.note?.trim() || pendingPersonalExpense.category;
    await createPersonalExpense({
      ownerId: user.uid,
      amount: pendingPersonalExpense.amount,
      currency: pendingPersonalExpense.currency,
      category: pendingPersonalExpense.category,
      date: pendingPersonalExpense.date,
      note: `${baseNote} · Group: ${group.name}`,
    });
  }

  async function handleRemoveParticipant() {
    if (!removeTarget) return;
    await removeParticipant(groupId, removeTarget);
    setRemoveTarget(null);
  }

  if (!group) {
    return (
      <AppShell title="Group">
        <Card>
          <p className="text-sm text-slate-500">Loading group… (offline cache may apply)</p>
        </Card>
      </AppShell>
    );
  }

  const soleAdmin = isAdmin && admins.length === 1 && user && admins[0] === user.uid;

  return (
    <>
      <AppShell
        title={group.name}
        action={
          <Sheet open={expenseSheetOpen} onOpenChange={setExpenseSheetOpen}>
            <SheetTrigger asChild>
              <Button size="icon" aria-label="Add group expense">
                <Plus className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent title="Add group expense">
              <GroupExpenseForm
                currency={group.currency}
                participants={participants}
                onSubmit={handleAddExpense}
                onCancel={() => setExpenseSheetOpen(false)}
              />
            </SheetContent>
          </Sheet>
        }
      >
        <div className="space-y-4">
          {isAdmin ? (
            <Card className="space-y-3">
              <CardTitle>Group settings</CardTitle>
              <GroupSettingsForm
                group={group}
                onSubmit={async (values) => {
                  await updateGroupSettings(groupId, values);
                }}
              />
            </Card>
          ) : null}

          <Card>
            <div className="flex items-start justify-between gap-2">
              <div>
                <CardTitle>Total spent</CardTitle>
                <p className="mt-1 text-2xl font-bold tabular-nums">
                  {formatMoney(total, group.currency)}
                </p>
              </div>
              <Button variant="secondary" size="sm" onClick={handleShare}>
                <Share2 className="mr-1 h-4 w-4" />
                Share
              </Button>
            </div>
            {shareMessage ? <p className="mt-2 text-xs text-teal-700">{shareMessage}</p> : null}
            <p className="mt-2 break-all text-xs text-slate-500">{inviteUrl}</p>
          </Card>

          <Card className="space-y-3">
            <CardTitle>People</CardTitle>
            <ul className="space-y-2">
              {participants.map((p) => {
                const isParticipantAdmin =
                  (p.userId != null && admins.includes(p.userId)) || admins.includes(p.id);
                const isSelf =
                  user != null &&
                  (p.id === user.uid || p.userId === user.uid || p.claimedByUserId === user.uid);
                const canRemove = isAdmin && !(isSelf && soleAdmin);

                return (
                  <li key={p.id} className="flex items-center justify-between gap-2 text-sm">
                    <span className="min-w-0">
                      <span className="font-medium">{p.displayName}</span>
                      {p.email ? (
                        <span className="block truncate text-xs text-slate-500">{p.email}</span>
                      ) : null}
                      <span className="mt-0.5 flex flex-wrap gap-1">
                        {p.kind === "guest" ? (
                          <Badge variant="secondary">Guest</Badge>
                        ) : (
                          <Badge variant="default">Member</Badge>
                        )}
                        {isParticipantAdmin ? (
                          <Badge variant="warning">Admin</Badge>
                        ) : null}
                      </span>
                    </span>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      {canClaimGuest(p, user?.email ?? null) && user ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            void claimGuestParticipant(
                              groupId,
                              p.id,
                              user.uid,
                              user.displayName || user.email?.split("@")[0] || "Member",
                              user.email,
                            )
                          }
                        >
                          Claim (me)
                        </Button>
                      ) : null}
                      {canRemove ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-600"
                          onClick={() => setRemoveTarget(p)}
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
              <AddParticipantForm
                onSubmit={async (values) => {
                  await addParticipantByEmail(groupId, values);
                }}
              />
            ) : (
              <p className="text-xs text-slate-500">Only admins can add or remove people.</p>
            )}
          </Card>

          <Card>
            <CardTitle>Balances</CardTitle>
            <ul className="mt-3 space-y-2 text-sm">
              {balances.map((b) => (
                <li key={b.participantId} className="flex justify-between">
                  <span>{b.displayName}</span>
                  <span className={b.net >= 0 ? "text-teal-700" : "text-red-600"}>
                    {b.net >= 0 ? "+" : ""}
                    {formatMoney(b.net, group.currency)}
                  </span>
                </li>
              ))}
            </ul>
            {transfers.length > 0 ? (
              <div className="mt-4 border-t border-slate-200 pt-3 dark:border-slate-800">
                <p className="text-xs font-semibold uppercase text-slate-500">Settle up</p>
                <ul className="mt-2 space-y-1 text-sm">
                  {transfers.map((t, i) => (
                    <li key={i}>
                      {t.fromName} → {t.toName}: {formatMoney(t.amount, group.currency)}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </Card>

          <section>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
              Expenses
            </h2>
            {expenses.length === 0 ? (
              <Card>
                <p className="text-sm text-slate-500">No group expenses yet.</p>
              </Card>
            ) : (
              <div className="space-y-2">
                {expenses.map((e) => {
                  const payer = participants.find((p) => p.id === e.paidByParticipantId);
                  return (
                    <ExpenseListItem
                      key={e.id}
                      title={e.note || e.category}
                      subtitle={`${e.category} · ${e.date} · paid by ${payer?.displayName ?? "?"}`}
                      amount={e.amount}
                      currency={e.currency}
                      onDelete={
                        isAdmin ? () => deleteGroupExpense(groupId, e.id) : undefined
                      }
                      deleteConfirm={
                        isAdmin
                          ? {
                              title: "Delete group expense?",
                              description:
                                "This removes the expense for everyone in the group. This can't be undone.",
                            }
                          : undefined
                      }
                    />
                  );
                })}
              </div>
            )}
            {!isAdmin ? (
              <p className="mt-2 text-xs text-slate-500">
                Anyone in the group can add expenses. Only admins can delete them.
              </p>
            ) : null}
          </section>
        </div>
      </AppShell>
      {pendingPersonalExpense ? (
        <ConfirmDialog
          open={personalPromptOpen}
          onOpenChange={(open) => {
            if (!open) closePersonalPrompt();
          }}
          title="Add to personal expenses?"
          description={`You paid ${formatMoney(pendingPersonalExpense.amount, pendingPersonalExpense.currency)}. Add this to your personal tracker? (Splits stay in the group only.)`}
          confirmLabel="Add to personal"
          cancelLabel="Group only"
          variant="default"
          onConfirm={async () => {
            await handleAddToPersonal();
            closePersonalPrompt();
          }}
        />
      ) : null}
      {removeTarget ? (
        <ConfirmDialog
          open={removeTarget !== null}
          onOpenChange={(open) => {
            if (!open) setRemoveTarget(null);
          }}
          title="Remove from group?"
          description={`Remove ${removeTarget.displayName} from this group? Their past expenses stay in the history.`}
          confirmLabel="Remove"
          onConfirm={handleRemoveParticipant}
        />
      ) : null}
    </>
  );
}

export default function GroupDetailPage() {
  return (
    <RequireAuth>
      <GroupDetailContent />
    </RequireAuth>
  );
}
