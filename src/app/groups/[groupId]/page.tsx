"use client";

import { Scale, Settings, Share2, Users } from "lucide-react";
import { useParams, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { RequireAuth } from "@/components/auth/require-auth";
import { ExpenseListItem } from "@/components/expenses/expense-list-item";
import { GroupExpenseForm } from "@/components/expenses/group-expense-form";
import { GroupMembersPanel } from "@/components/groups/group-members-panel";
import { GroupSettingsForm } from "@/components/groups/group-settings-form";
import { GroupSummaryCard } from "@/components/groups/group-summary-card";
import { AppShell } from "@/components/layout/app-shell";
import { OverflowMenu, type OverflowMenuItem } from "@/components/layout/overflow-menu";
import { StickyActionBar } from "@/components/layout/sticky-action-bar";
import {
  RecordSettlementForm,
  type SettlementFormPrefill,
} from "@/components/settlements/record-settlement-form";
import { SettlementListItem } from "@/components/settlements/settlement-list-item";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useGroupLedger } from "@/hooks/use-group-ledger";
import { sumSettlementsBetween } from "@/lib/money/settle";
import { canUserRecordSettlement, participantForUser } from "@/lib/participants";
import { createPersonalExpense } from "@/lib/repo/expenses";
import {
  addParticipantByEmail,
  claimGuestParticipant,
  createGroupExpense,
  deleteGroupExpense,
  removeParticipant,
  updateGroupSettings,
} from "@/lib/repo/groups";
import { createGroupSettlement, deleteGroupSettlement } from "@/lib/repo/settlements";
import type { GroupExpense, GroupSettlement, Participant } from "@/lib/types";
import { formatMoney, groupAdminIds } from "@/lib/utils";

function GroupDetailContent() {
  const params = useParams<{ groupId: string }>();
  const searchParams = useSearchParams();
  const groupId = params.groupId;
  const { user } = useAuth();

  const {
    group,
    participants,
    expenses,
    settlements,
    balances,
    pairwise,
    transfers,
    myParticipant,
    myNet,
    myNetDebts,
    loading,
  } = useGroupLedger(groupId, user?.uid);

  const topYouOwe = useMemo(
    () => myNetDebts.find((l) => l.net > 0.01),
    [myNetDebts],
  );
  const topOwedYou = useMemo(
    () => myNetDebts.find((l) => l.net < -0.01),
    [myNetDebts],
  );

  const [expenseSheetOpen, setExpenseSheetOpen] = useState(false);
  const [settleSheetOpen, setSettleSheetOpen] = useState(false);
  const [settingsSheetOpen, setSettingsSheetOpen] = useState(false);
  const [membersSheetOpen, setMembersSheetOpen] = useState(false);
  const [balancesSheetOpen, setBalancesSheetOpen] = useState(false);
  const [settlePrefill, setSettlePrefill] = useState<SettlementFormPrefill | undefined>();
  const [personalPromptOpen, setPersonalPromptOpen] = useState(false);
  const [pendingPersonalExpense, setPendingPersonalExpense] = useState<Omit<
    GroupExpense,
    "id" | "updatedAt"
  > | null>(null);
  const [settlementPersonalPromptOpen, setSettlementPersonalPromptOpen] = useState(false);
  const [pendingPersonalSettlement, setPendingPersonalSettlement] = useState<{
    amount: number;
    currency: string;
    date: string;
    toDisplayName: string;
    note?: string;
  } | null>(null);
  const [removeTarget, setRemoveTarget] = useState<Participant | null>(null);
  const [shareMessage, setShareMessage] = useState<string | null>(null);

  const openSettleSheet = useCallback((prefill?: SettlementFormPrefill) => {
    setSettlePrefill(prefill);
    setSettleSheetOpen(true);
  }, []);

  useEffect(() => {
    if (searchParams.get("settle") !== "1") return;
    const to = searchParams.get("to") ?? undefined;
    const from = searchParams.get("from") ?? undefined;
    openSettleSheet({
      toParticipantId: to,
      fromParticipantId: from ?? myParticipant?.id,
    });
  }, [searchParams, myParticipant?.id, openSettleSheet]);

  const admins = useMemo(() => (group ? groupAdminIds(group) : []), [group]);
  const isAdmin = useMemo(
    () => (user && group ? admins.includes(user.uid) : false),
    [user, group, admins],
  );

  const total = useMemo(() => expenses.reduce((s, e) => s + e.amount, 0), [expenses]);

  const inviteUrl = useMemo(() => {
    if (!group || typeof window === "undefined") return "";
    return `${window.location.origin}/g/${group.inviteToken}`;
  }, [group]);

  const canRecordAny = useMemo(() => {
    if (!user || !group) return false;
    if (isAdmin) return true;
    return !!myParticipant;
  }, [user, group, isAdmin, myParticipant]);

  const oweHint = useMemo(() => {
    if (!topYouOwe) return undefined;
    const name =
      participants.find((p) => p.id === topYouOwe.participantId)?.displayName ?? "?";
    return `Owe ${name} ${formatMoney(topYouOwe.net, group?.currency ?? "INR")}`;
  }, [topYouOwe, participants, group?.currency]);

  const owedHint = useMemo(() => {
    if (!topOwedYou) return undefined;
    const name =
      participants.find((p) => p.id === topOwedYou.participantId)?.displayName ?? "?";
    return `${name} owes you ${formatMoney(-topOwedYou.net, group?.currency ?? "INR")}`;
  }, [topOwedYou, participants, group?.currency]);

  async function handleShare() {
    if (!inviteUrl) return;
    try {
      if (navigator.share) {
        await navigator.share({ title: group?.name, url: inviteUrl });
      } else {
        await navigator.clipboard.writeText(inviteUrl);
        setShareMessage("Link copied");
        window.setTimeout(() => setShareMessage(null), 2500);
      }
    } catch {
      await navigator.clipboard.writeText(inviteUrl);
      setShareMessage("Link copied");
    }
  }

  async function handleAddExpense(values: Omit<GroupExpense, "id" | "updatedAt">) {
    await createGroupExpense(groupId, values);
    setExpenseSheetOpen(false);
    const me = user ? participantForUser(participants, user.uid) : undefined;
    if (me && values.paidByParticipantId === me.id) {
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

  function closeSettlementPersonalPrompt() {
    setSettlementPersonalPromptOpen(false);
    setPendingPersonalSettlement(null);
  }

  async function handleAddSettlementToPersonal() {
    if (!user || !pendingPersonalSettlement || !group) return;
    const detail = pendingPersonalSettlement.note?.trim()
      ? `Settle up to ${pendingPersonalSettlement.toDisplayName}: ${pendingPersonalSettlement.note.trim()}`
      : `Settle up to ${pendingPersonalSettlement.toDisplayName}`;
    await createPersonalExpense({
      ownerId: user.uid,
      amount: pendingPersonalSettlement.amount,
      currency: pendingPersonalSettlement.currency,
      category: "Other",
      date: pendingPersonalSettlement.date,
      note: `${detail} · Group: ${group.name}`,
    });
  }

  async function handleRecordSettlement(values: Omit<GroupSettlement, "id" | "updatedAt">) {
    await createGroupSettlement(groupId, values);
    setSettleSheetOpen(false);
    setSettlePrefill(undefined);
    const me = user ? participantForUser(participants, user.uid) : undefined;
    if (me && values.fromParticipantId === me.id) {
      const payee = participants.find((p) => p.id === values.toParticipantId);
      setPendingPersonalSettlement({
        amount: values.amount,
        currency: values.currency,
        date: values.date,
        toDisplayName: payee?.displayName ?? "?",
        note: values.note,
      });
      setSettlementPersonalPromptOpen(true);
    }
  }

  async function handleRemoveParticipant() {
    if (!removeTarget) return;
    await removeParticipant(groupId, removeTarget);
    setRemoveTarget(null);
  }

  const menuItems = useMemo((): OverflowMenuItem[] => {
    if (!group) return [];
    const items: OverflowMenuItem[] = [
      { label: "Invite friends", icon: Share2, onClick: () => void handleShare() },
      { label: "Members", icon: Users, onClick: () => setMembersSheetOpen(true) },
      {
        label: "All balances",
        icon: Scale,
        onClick: () => setBalancesSheetOpen(true),
      },
    ];
    if (isAdmin) {
      items.push({
        label: "Group settings",
        icon: Settings,
        onClick: () => setSettingsSheetOpen(true),
      });
    }
    return items;
  }, [group, isAdmin]);

  if (!group || loading) {
    return (
      <AppShell title="Group" hideBrand backHref="/groups">
        <Card>
          <p className="text-sm text-muted">Loading…</p>
        </Card>
      </AppShell>
    );
  }

  const soleAdmin = Boolean(isAdmin && admins.length === 1 && user && admins[0] === user.uid);

  return (
    <>
      <AppShell
        title={group.name}
        hideBrand
        backHref="/groups"
        menu={<OverflowMenu items={menuItems} title={group.name} />}
        footer={
          <StickyActionBar
            secondary={{
              label: "Record payment",
              onClick: () =>
                openSettleSheet({
                  fromParticipantId: myParticipant?.id,
                  toParticipantId: topYouOwe?.participantId,
                  amount: topYouOwe?.net,
                }),
            }}
            primary={{
              label: "Add expense",
              onClick: () => setExpenseSheetOpen(true),
            }}
          />
        }
      >
        {shareMessage ? (
          <p className="mb-2 text-center text-xs text-accent">{shareMessage}</p>
        ) : null}

        <GroupSummaryCard
          myNet={myNet}
          currency={group.currency}
          totalSpent={total}
          oweHint={oweHint}
          owedHint={owedHint}
        />

        <Tabs defaultValue="expenses" className="mt-4">
          <TabsList>
            <TabsTrigger value="expenses">Expenses</TabsTrigger>
            <TabsTrigger value="settle">Settle</TabsTrigger>
          </TabsList>

          <TabsContent value="expenses">
            {expenses.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted">No group expenses yet.</p>
            ) : (
              <div className="space-y-2">
                {expenses.map((e) => {
                  const payer = participants.find((p) => p.id === e.paidByParticipantId);
                  return (
                    <ExpenseListItem
                      key={e.id}
                      title={e.note || e.category}
                      subtitle={`${e.category} · ${e.date} · ${payer?.displayName ?? "?"}`}
                      amount={e.amount}
                      currency={e.currency}
                      onDelete={isAdmin ? () => deleteGroupExpense(groupId, e.id) : undefined}
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
          </TabsContent>

          <TabsContent value="settle">
            {myParticipant && myNetDebts.some((l) => Math.abs(l.net) > 0.01) ? (
              <Card className="mb-3">
                <p className="mb-2 text-sm font-medium">With people</p>
                <ul className="space-y-2 text-sm">
                  {myNetDebts
                    .filter((line) => Math.abs(line.net) > 0.01)
                    .map((line) => {
                      const other = participants.find((p) => p.id === line.participantId);
                      const youOweThem = line.net > 0;
                      const amount = Math.abs(line.net);
                      const canRecord =
                        user &&
                        (youOweThem
                          ? canRecordAny
                          : canUserRecordSettlement(
                              group,
                              participants,
                              user.uid,
                              line.participantId,
                              myParticipant.id,
                            ));
                      return (
                        <li
                          key={`net-${line.participantId}`}
                          className="flex items-center justify-between gap-2"
                        >
                          <span>
                            {youOweThem ? (
                              <>
                                You owe{" "}
                                <span className="font-medium">{other?.displayName ?? "?"}</span>
                              </>
                            ) : (
                              <>
                                <span className="font-medium">{other?.displayName ?? "?"}</span>{" "}
                                owes you
                              </>
                            )}
                          </span>
                          <div className="flex items-center gap-2">
                            <span
                              className={
                                youOweThem
                                  ? "font-semibold tabular-nums text-red-600"
                                  : "font-semibold tabular-nums text-teal-700 dark:text-teal-300"
                              }
                            >
                              {formatMoney(amount, group.currency)}
                            </span>
                            {canRecord ? (
                              <Button
                                size="sm"
                                variant={youOweThem ? "secondary" : "ghost"}
                                onClick={() =>
                                  openSettleSheet(
                                    youOweThem
                                      ? {
                                          fromParticipantId: myParticipant.id,
                                          toParticipantId: line.participantId,
                                          amount,
                                        }
                                      : {
                                          fromParticipantId: line.participantId,
                                          toParticipantId: myParticipant.id,
                                          amount,
                                        },
                                  )
                                }
                              >
                                {youOweThem ? "Pay" : "Record"}
                              </Button>
                            ) : null}
                          </div>
                        </li>
                      );
                    })}
                </ul>
              </Card>
            ) : null}

            {transfers.length > 0 ? (
              <Card className="mb-3">
                <p className="mb-2 text-sm font-medium">Simplified debts</p>
                <ul className="space-y-3 text-sm">
                  {transfers.map((t) => {
                    const paidSoFar = sumSettlementsBetween(
                      t.fromParticipantId,
                      t.toParticipantId,
                      settlements,
                    );
                    const canRecord =
                      user &&
                      canUserRecordSettlement(
                        group,
                        participants,
                        user.uid,
                        t.fromParticipantId,
                        t.toParticipantId,
                      );
                    return (
                      <li key={`${t.fromParticipantId}-${t.toParticipantId}`}>
                        <div className="flex justify-between gap-2">
                          <span>
                            {t.fromName} → {t.toName}
                          </span>
                          <span className="font-medium tabular-nums">
                            {formatMoney(t.amount, group.currency)}
                          </span>
                        </div>
                        {canRecord ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="mt-1 h-8 px-0"
                            onClick={() =>
                              openSettleSheet({
                                fromParticipantId: t.fromParticipantId,
                                toParticipantId: t.toParticipantId,
                                amount: t.amount,
                              })
                            }
                          >
                            Record payment
                          </Button>
                        ) : null}
                        {paidSoFar > 0 ? (
                          <p className="text-xs text-muted">
                            {formatMoney(paidSoFar, group.currency)} recorded this direction
                          </p>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              </Card>
            ) : null}

            {settlements.length > 0 ? (
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted">Payment history</p>
                {settlements.map((s) => {
                  const from = participants.find((p) => p.id === s.fromParticipantId);
                  const to = participants.find((p) => p.id === s.toParticipantId);
                  return (
                    <SettlementListItem
                      key={s.id}
                      fromName={from?.displayName ?? "?"}
                      toName={to?.displayName ?? "?"}
                      amount={s.amount}
                      currency={s.currency}
                      date={s.date}
                      note={s.note}
                      kind={s.kind}
                      referenceKey={s.referenceKey}
                      onDelete={
                        isAdmin && s.kind !== "auto_offset"
                          ? () => deleteGroupSettlement(groupId, s.id)
                          : undefined
                      }
                    />
                  );
                })}
              </div>
            ) : (
              <p className="py-4 text-center text-sm text-muted">No payments recorded yet.</p>
            )}
          </TabsContent>
        </Tabs>
      </AppShell>

      <Sheet open={expenseSheetOpen} onOpenChange={setExpenseSheetOpen}>
        <SheetContent title="Add group expense">
          <GroupExpenseForm
            currency={group.currency}
            participants={participants}
            onSubmit={handleAddExpense}
            onCancel={() => setExpenseSheetOpen(false)}
          />
        </SheetContent>
      </Sheet>

      <Sheet open={settleSheetOpen} onOpenChange={setSettleSheetOpen}>
        <SheetContent title="Record payment">
          {user ? (
            <RecordSettlementForm
              group={group}
              participants={participants}
              pairwise={pairwise}
              userId={user.uid}
              prefill={settlePrefill}
              onSubmit={handleRecordSettlement}
              onCancel={() => {
                setSettleSheetOpen(false);
                setSettlePrefill(undefined);
              }}
            />
          ) : null}
        </SheetContent>
      </Sheet>

      <Sheet open={settingsSheetOpen} onOpenChange={setSettingsSheetOpen}>
        <SheetContent title="Group settings">
          <GroupSettingsForm
            group={group}
            onSubmit={async (values) => {
              await updateGroupSettings(groupId, values);
              setSettingsSheetOpen(false);
            }}
          />
        </SheetContent>
      </Sheet>

      <Sheet open={membersSheetOpen} onOpenChange={setMembersSheetOpen}>
        <SheetContent title="Members">
          <GroupMembersPanel
            participants={participants}
            admins={admins}
            isAdmin={isAdmin}
            soleAdmin={soleAdmin}
            user={user}
            onClaimGuest={async (participantId) => {
              if (!user) return;
              await claimGuestParticipant(
                groupId,
                participantId,
                user.uid,
                user.displayName || user.email?.split("@")[0] || "Member",
                user.email,
              );
            }}
            onRemove={setRemoveTarget}
            onAddParticipant={async (values) => {
              await addParticipantByEmail(groupId, values);
            }}
          />
        </SheetContent>
      </Sheet>

      <Sheet open={balancesSheetOpen} onOpenChange={setBalancesSheetOpen}>
        <SheetContent title="All balances">
          <ul className="divide-y divide-border rounded-xl border border-border bg-surface">
            {balances.map((b) => (
              <li key={b.participantId} className="flex justify-between px-3 py-3 text-sm">
                <span>{b.displayName}</span>
                <span className={b.net >= 0 ? "text-teal-700" : "text-red-600"}>
                  {b.net >= 0 ? "+" : ""}
                  {formatMoney(b.net, group.currency)}
                </span>
              </li>
            ))}
          </ul>
        </SheetContent>
      </Sheet>

      {pendingPersonalExpense ? (
        <ConfirmDialog
          open={personalPromptOpen}
          onOpenChange={(open) => {
            if (!open) closePersonalPrompt();
          }}
          title="Add to personal expenses?"
          description={`You paid ${formatMoney(pendingPersonalExpense.amount, pendingPersonalExpense.currency)}. Add this to your personal tracker?`}
          confirmLabel="Add to personal"
          cancelLabel="Skip"
          variant="default"
          onConfirm={async () => {
            await handleAddToPersonal();
            closePersonalPrompt();
          }}
        />
      ) : null}
      {pendingPersonalSettlement ? (
        <ConfirmDialog
          open={settlementPersonalPromptOpen}
          onOpenChange={(open) => {
            if (!open) closeSettlementPersonalPrompt();
          }}
          title="Add settlement to personal expenses?"
          description={`You paid ${formatMoney(pendingPersonalSettlement.amount, pendingPersonalSettlement.currency)} to ${pendingPersonalSettlement.toDisplayName}. Add to personal tracker?`}
          confirmLabel="Add to personal"
          cancelLabel="Skip"
          variant="default"
          onConfirm={async () => {
            await handleAddSettlementToPersonal();
            closeSettlementPersonalPrompt();
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
