"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  maxSettlementAmount,
  settlementOverage,
  type PairwiseDebts,
} from "@/lib/money/settle";
import { canUserRecordSettlement } from "@/lib/participants";
import type { Group, GroupSettlement, Participant } from "@/lib/types";
import { formatMoney } from "@/lib/utils";

export type SettlementFormPrefill = {
  fromParticipantId?: string;
  toParticipantId?: string;
  amount?: number;
};

export function RecordSettlementForm({
  group,
  participants,
  pairwise,
  userId,
  prefill,
  onSubmit,
  onCancel,
}: {
  group: Group;
  participants: Participant[];
  pairwise: PairwiseDebts;
  userId: string;
  prefill?: SettlementFormPrefill;
  onSubmit: (values: Omit<GroupSettlement, "id" | "updatedAt">) => Promise<void>;
  onCancel?: () => void;
}) {
  const [fromParticipantId, setFromParticipantId] = useState(
    prefill?.fromParticipantId ?? participants[0]?.id ?? "",
  );
  const [toParticipantId, setToParticipantId] = useState(prefill?.toParticipantId ?? "");
  const [amount, setAmount] = useState(prefill?.amount != null ? String(prefill.amount) : "");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [overpayConfirmOpen, setOverpayConfirmOpen] = useState(false);
  const [pendingAmount, setPendingAmount] = useState<number | null>(null);

  const maxAmount = useMemo(
    () => maxSettlementAmount(fromParticipantId, toParticipantId, pairwise),
    [fromParticipantId, toParticipantId, pairwise],
  );

  const parsedAmount = Number(amount);
  const overage = useMemo(() => {
    if (!toParticipantId || !parsedAmount || parsedAmount <= 0) return 0;
    return settlementOverage(fromParticipantId, toParticipantId, parsedAmount, pairwise);
  }, [fromParticipantId, toParticipantId, parsedAmount, pairwise, toParticipantId]);

  const fromName =
    participants.find((p) => p.id === fromParticipantId)?.displayName ?? "Payer";
  const toName = participants.find((p) => p.id === toParticipantId)?.displayName ?? "Payee";

  useEffect(() => {
    if (prefill?.fromParticipantId) setFromParticipantId(prefill.fromParticipantId);
    if (prefill?.toParticipantId) setToParticipantId(prefill.toParticipantId);
    if (prefill?.amount != null) setAmount(String(prefill.amount));
  }, [prefill]);

  useEffect(() => {
    if (!toParticipantId) return;
    if (
      prefill?.fromParticipantId === fromParticipantId &&
      prefill?.toParticipantId === toParticipantId &&
      prefill.amount != null
    ) {
      setAmount(String(prefill.amount));
      return;
    }
    if (maxAmount > 0) setAmount(String(maxAmount));
    else setAmount("");
  }, [fromParticipantId, toParticipantId, maxAmount, prefill, toParticipantId]);

  const canRecord = useMemo(
    () =>
      canUserRecordSettlement(group, participants, userId, fromParticipantId, toParticipantId),
    [group, participants, userId, fromParticipantId, toParticipantId],
  );

  async function savePayment(parsed: number) {
    setSaving(true);
    try {
      await onSubmit({
        fromParticipantId,
        toParticipantId,
        amount: Math.round(parsed * 100) / 100,
        currency: group.currency,
        date,
        note: note.trim() || undefined,
        recordedByUserId: userId,
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const parsed = Number(amount);
    if (!fromParticipantId || !toParticipantId || fromParticipantId === toParticipantId) {
      setError("Choose different payer and payee.");
      return;
    }
    if (!parsed || parsed <= 0) {
      setError("Enter a positive amount.");
      return;
    }
    if (!canRecord) {
      setError("You can only record payments you are part of, unless you are a group admin.");
      return;
    }

    const payOverage = settlementOverage(
      fromParticipantId,
      toParticipantId,
      parsed,
      pairwise,
    );
    if (payOverage > 0.01) {
      setPendingAmount(parsed);
      setOverpayConfirmOpen(true);
      return;
    }

    await savePayment(parsed);
  }

  const overpayDescription =
    pendingAmount != null
      ? `You're paying ${formatMoney(pendingAmount, group.currency)}, which is ${formatMoney(
          settlementOverage(fromParticipantId, toParticipantId, pendingAmount, pairwise),
          group.currency,
        )} more than the ${formatMoney(maxAmount, group.currency)} owed. After this payment, ${toName} will owe ${fromName} ${formatMoney(
          settlementOverage(fromParticipantId, toParticipantId, pendingAmount, pairwise),
          group.currency,
        )}.`
      : "";

  if (participants.length < 2) {
    return <p className="text-sm text-slate-500">Need at least two people to record a payment.</p>;
  }

  return (
    <>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <Label htmlFor="settle-from">From (payer)</Label>
          <Select
            id="settle-from"
            value={fromParticipantId}
            onChange={(e) => setFromParticipantId(e.target.value)}
          >
            {participants.map((p) => (
              <option key={p.id} value={p.id}>
                {p.displayName}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="settle-to">To (received by)</Label>
          <Select
            id="settle-to"
            value={toParticipantId}
            onChange={(e) => setToParticipantId(e.target.value)}
          >
            <option value="">Select person</option>
            {participants
              .filter((p) => p.id !== fromParticipantId)
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.displayName}
                </option>
              ))}
          </Select>
        </div>
        {toParticipantId ? (
          <p className="text-xs text-slate-500">
            Outstanding: {formatMoney(maxAmount, group.currency)}
            {maxAmount <= 0.01 ? " (nothing owed in this direction)" : ""}
          </p>
        ) : null}
        {toParticipantId && overage > 0.01 ? (
          <p className="text-xs text-amber-800 dark:text-amber-200">
            Overpayment: {toName} will owe {fromName} {formatMoney(overage, group.currency)} after
            this payment.
          </p>
        ) : null}
        <div className="space-y-2">
          <Label htmlFor="settle-amount">Amount</Label>
          <Input
            id="settle-amount"
            type="number"
            min={0}
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="settle-date">Date</Label>
          <Input
            id="settle-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="settle-note">Note (optional)</Label>
          <Input id="settle-note" value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        {!canRecord ? (
          <p className="text-xs text-amber-700 dark:text-amber-200">
            You must be the payer, payee, or a group admin to save this payment.
          </p>
        ) : null}
        <div className="flex gap-2">
          <Button
            type="submit"
            className="flex-1"
            disabled={saving || !canRecord || !toParticipantId}
          >
            {saving ? "Saving…" : "Record payment"}
          </Button>
          {onCancel ? (
            <Button type="button" variant="ghost" onClick={onCancel}>
              Cancel
            </Button>
          ) : null}
        </div>
      </form>
      <ConfirmDialog
        open={overpayConfirmOpen}
        onOpenChange={(open) => {
          setOverpayConfirmOpen(open);
          if (!open) setPendingAmount(null);
        }}
        title="Overpayment?"
        description={overpayDescription}
        confirmLabel="Record payment"
        variant="default"
        onConfirm={async () => {
          if (pendingAmount == null) return;
          await savePayment(pendingAmount);
          setPendingAmount(null);
        }}
      />
    </>
  );
}
