"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  computeBalances,
  computePairwiseDebts,
  netDebtsForParticipant,
  settleTransfers,
} from "@/lib/money/settle";
import { participantForUser } from "@/lib/participants";
import {
  subscribeGroup,
  subscribeGroupExpenses,
  subscribeParticipants,
} from "@/lib/repo/groups";
import { subscribeGroupSettlements, syncMutualSettlements } from "@/lib/repo/settlements";
import type { Group, GroupExpense, GroupSettlement, Participant } from "@/lib/types";

export function useGroupLedger(groupId: string | undefined, userId: string | undefined) {
  const [group, setGroup] = useState<Group | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [expenses, setExpenses] = useState<GroupExpense[]>([]);
  const [settlements, setSettlements] = useState<GroupSettlement[]>([]);
  const [loaded, setLoaded] = useState(false);
  const syncInFlight = useRef(false);

  useEffect(() => {
    if (!groupId) return;
    setLoaded(false);
    const got = new Set<string>();
    const mark = (key: string) => {
      got.add(key);
      if (got.size >= 4) setLoaded(true);
    };
    const unsubG = subscribeGroup(groupId, (g) => {
      setGroup(g);
      mark("g");
    });
    const unsubP = subscribeParticipants(groupId, (p) => {
      setParticipants(p);
      mark("p");
    });
    const unsubE = subscribeGroupExpenses(groupId, (e) => {
      setExpenses(e);
      mark("e");
    });
    const unsubS = subscribeGroupSettlements(groupId, (s) => {
      setSettlements(s);
      mark("s");
    });
    return () => {
      unsubG();
      unsubP();
      unsubE();
      unsubS();
    };
  }, [groupId]);

  useEffect(() => {
    if (!groupId || !group || !userId || !loaded || participants.length < 2) return;

    const timer = window.setTimeout(() => {
      if (syncInFlight.current) return;
      syncInFlight.current = true;
      void syncMutualSettlements(groupId, {
        participants,
        expenses,
        settlements,
        currency: group.currency,
        userId,
      }).finally(() => {
        syncInFlight.current = false;
      });
    }, 300);

    return () => window.clearTimeout(timer);
  }, [groupId, group, userId, loaded, participants, expenses, settlements]);

  const balances = useMemo(
    () => computeBalances(participants, expenses, settlements),
    [participants, expenses, settlements],
  );

  const pairwise = useMemo(
    () => computePairwiseDebts(participants, expenses, settlements),
    [participants, expenses, settlements],
  );

  const transfers = useMemo(() => settleTransfers(balances), [balances]);

  const myParticipant = useMemo(
    () => (userId ? participantForUser(participants, userId) : undefined),
    [participants, userId],
  );

  const myBalance = useMemo(
    () => balances.find((b) => b.participantId === myParticipant?.id),
    [balances, myParticipant],
  );

  const myNet = myBalance?.net ?? 0;

  const myNetDebts = useMemo(
    () => (myParticipant ? netDebtsForParticipant(myParticipant.id, pairwise) : []),
    [myParticipant, pairwise],
  );

  return {
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
    loading: !loaded && !!groupId,
  };
}
