"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { equalSplits } from "@/lib/money/settle";
import { EXPENSE_CATEGORIES, type GroupExpense, type Participant } from "@/lib/types";

export function GroupExpenseForm({
  currency,
  participants,
  initial,
  onSubmit,
  onCancel,
}: {
  currency: string;
  participants: Participant[];
  initial?: GroupExpense;
  onSubmit: (values: Omit<GroupExpense, "id" | "updatedAt">) => Promise<void>;
  onCancel?: () => void;
}) {
  const [amount, setAmount] = useState(initial ? String(initial.amount) : "");
  const [category, setCategory] = useState<GroupExpense["category"]>(initial?.category ?? "Food");
  const [date, setDate] = useState(initial?.date ?? new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState(initial?.note ?? "");
  const [paidByParticipantId, setPaidByParticipantId] = useState(
    initial?.paidByParticipantId ?? participants[0]?.id ?? "",
  );
  const [splitMode, setSplitMode] = useState<"equal" | "custom">("equal");
  const [customSplits, setCustomSplits] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    for (const p of participants) {
      const existing = initial?.splits.find((s) => s.participantId === p.id);
      map[p.id] = existing ? String(existing.amount) : "";
    }
    return map;
  });
  const [saving, setSaving] = useState(false);

  const participantIds = useMemo(() => participants.map((p) => p.id), [participants]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = Number(amount);
    if (!parsed || parsed <= 0 || !paidByParticipantId) return;

    const splits =
      splitMode === "equal"
        ? equalSplits(parsed, participantIds)
        : participantIds.map((id) => ({
            participantId: id,
            amount: Number(customSplits[id] ?? 0),
          }));

    const splitTotal = splits.reduce((s, x) => s + x.amount, 0);
    if (Math.abs(splitTotal - parsed) > 0.02) {
      alert("Split amounts must add up to the expense total.");
      return;
    }

    setSaving(true);
    try {
      await onSubmit({
        amount: parsed,
        currency,
        category,
        date,
        note: note.trim() || undefined,
        paidByParticipantId,
        splits,
      });
    } finally {
      setSaving(false);
    }
  }

  if (participants.length === 0) {
    return <p className="text-sm text-slate-500">Add at least one participant before logging expenses.</p>;
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <Label htmlFor="g-amount">Amount ({currency})</Label>
        <Input
          id="g-amount"
          inputMode="decimal"
          required
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="g-category">Category</Label>
          <Select
            id="g-category"
            value={category}
            onChange={(e) => setCategory(e.target.value as GroupExpense["category"])}
          >
            {EXPENSE_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="g-date">Date</Label>
          <Input id="g-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="g-paid">Paid by</Label>
        <Select
          id="g-paid"
          value={paidByParticipantId}
          onChange={(e) => setPaidByParticipantId(e.target.value)}
        >
          {participants.map((p) => (
            <option key={p.id} value={p.id}>
              {p.displayName}
              {p.kind === "guest" ? " (guest)" : ""}
            </option>
          ))}
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="g-split">Split</Label>
        <Select
          id="g-split"
          value={splitMode}
          onChange={(e) => setSplitMode(e.target.value as "equal" | "custom")}
        >
          <option value="equal">Split equally</option>
          <option value="custom">Custom amounts</option>
        </Select>
      </div>
      {splitMode === "custom" ? (
        <div className="space-y-2 rounded-xl border border-slate-200 p-3 dark:border-slate-800">
          {participants.map((p) => (
            <div key={p.id} className="flex items-center gap-2">
              <span className="w-28 truncate text-sm">{p.displayName}</span>
              <Input
                inputMode="decimal"
                placeholder="0"
                value={customSplits[p.id] ?? ""}
                onChange={(e) =>
                  setCustomSplits((prev) => ({ ...prev, [p.id]: e.target.value }))
                }
              />
            </div>
          ))}
        </div>
      ) : null}
      <div className="space-y-2">
        <Label htmlFor="g-note">Note</Label>
        <Input id="g-note" value={note} onChange={(e) => setNote(e.target.value)} />
      </div>
      <div className="flex gap-2 pt-2">
        {onCancel ? (
          <Button type="button" variant="secondary" className="flex-1" onClick={onCancel}>
            Cancel
          </Button>
        ) : null}
        <Button type="submit" className="flex-1" disabled={saving}>
          {saving ? "Saving…" : initial ? "Update" : "Add expense"}
        </Button>
      </div>
    </form>
  );
}
