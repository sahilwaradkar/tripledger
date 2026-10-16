"use client";

import { useEffect, useMemo, useState } from "react";
import { computeBalances, computePairwiseDebts, debtsForParticipant } from "@/lib/money/settle";
import { participantForUser } from "@/lib/participants";
import { subscribeGroupExpenses, subscribeGroups, subscribeParticipants } from "@/lib/repo/groups";
import { subscribeGroupSettlements } from "@/lib/repo/settlements";
import type { Group, GroupExpense, GroupSettlement, Participant } from "@/lib/types";

export interface GroupSettleRow {
  group: Group;
  myNet: number;
  currency: string;
  topOwe?: { displayName: string; participantId: string; amount: number };
  loading: boolean;
}

export interface SettleActionItem {
  groupId: string;
  groupName: string;
  currency: string;
  toParticipantId: string;
  toDisplayName: string;
  amount: number;
}

interface GroupLedgerSnapshot {
  participants: Participant[];
  expenses: GroupExpense[];
  settlements: GroupSettlement[];
  hasParticipants: boolean;
  hasExpenses: boolean;
  hasSettlements: boolean;
}

export function useMyGroupsSettleSummary(userId: string | undefined) {
  const [groups, setGroups] = useState<Group[]>([]);
  const [ledgers, setLedgers] = useState<Record<string, GroupLedgerSnapshot>>({});

  useEffect(() => {
    if (!userId) return;
    return subscribeGroups(userId, setGroups);
  }, [userId]);

  useEffect(() => {
    if (!userId || groups.length === 0) {
      setLedgers({});
      return;
    }

    const unsubs: (() => void)[] = [];

    for (const g of groups) {
      const groupId = g.id;
      const touch = (patch: Partial<GroupLedgerSnapshot>) => {
        setLedgers((prev) => {
          const current = prev[groupId] ?? {
            participants: [],
            expenses: [],
            settlements: [],
            hasParticipants: false,
            hasExpenses: false,
            hasSettlements: false,
          };
          return {
            ...prev,
            [groupId]: { ...current, ...patch },
          };
        });
      };

      unsubs.push(
        subscribeParticipants(groupId, (participants) => {
          touch({ participants, hasParticipants: true });
        }),
      );
      unsubs.push(
        subscribeGroupExpenses(groupId, (expenses) => {
          touch({ expenses, hasExpenses: true });
        }),
      );
      unsubs.push(
        subscribeGroupSettlements(groupId, (settlements) => {
          touch({ settlements, hasSettlements: true });
        }),
      );
    }

    return () => {
      for (const u of unsubs) u();
    };
  }, [userId, groups]);

  const rows = useMemo((): GroupSettleRow[] => {
    if (!userId) return [];
    return groups.map((group) => {
      const snap = ledgers[group.id];
      const ready =
        snap?.hasParticipants && snap?.hasExpenses && snap?.hasSettlements;
      if (!snap || !ready) {
        return { group, myNet: 0, currency: group.currency, loading: true };
      }
      const me = participantForUser(snap.participants, userId);
      if (!me) {
        return { group, myNet: 0, currency: group.currency, loading: false };
      }
      const balances = computeBalances(snap.participants, snap.expenses, snap.settlements);
      const myNet = balances.find((b) => b.participantId === me.id)?.net ?? 0;
      const pairwise = computePairwiseDebts(snap.participants, snap.expenses, snap.settlements);
      const { owes } = debtsForParticipant(me.id, pairwise);
      const top = owes[0];
      const topParticipant = top
        ? snap.participants.find((p) => p.id === top.participantId)
        : undefined;
      return {
        group,
        myNet,
        currency: group.currency,
        topOwe: top
          ? {
              displayName: topParticipant?.displayName ?? "?",
              participantId: top.participantId,
              amount: top.amount,
            }
          : undefined,
        loading: false,
      };
    });
  }, [groups, ledgers, userId]);

  const totalsByCurrency = useMemo(() => {
    const owe = new Map<string, number>();
    const owed = new Map<string, number>();
    for (const row of rows) {
      if (row.loading) continue;
      if (row.myNet < -0.01) {
        owe.set(row.currency, (owe.get(row.currency) ?? 0) + -row.myNet);
      } else if (row.myNet > 0.01) {
        owed.set(row.currency, (owed.get(row.currency) ?? 0) + row.myNet);
      }
    }
    return { owe, owed };
  }, [rows]);

  const actionItems = useMemo((): SettleActionItem[] => {
    if (!userId) return [];
    const items: SettleActionItem[] = [];
    for (const row of rows) {
      if (row.loading || !row.topOwe) continue;
      items.push({
        groupId: row.group.id,
        groupName: row.group.name,
        currency: row.currency,
        toParticipantId: row.topOwe.participantId,
        toDisplayName: row.topOwe.displayName,
        amount: row.topOwe.amount,
      });
    }
    items.sort((a, b) => b.amount - a.amount);
    return items.slice(0, 3);
  }, [rows, userId]);

  const allSettled =
    rows.length > 0 &&
    rows.every((r) => r.loading || Math.abs(r.myNet) <= 0.01);

  return { groups, rows, totalsByCurrency, actionItems, allSettled, loading: groups.length > 0 && rows.some((r) => r.loading) };
}
