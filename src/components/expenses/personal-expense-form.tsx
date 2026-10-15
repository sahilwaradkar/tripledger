"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { EXPENSE_CATEGORIES, type PersonalExpense, type Trip } from "@/lib/types";

export function PersonalExpenseForm({
  trips,
  defaultCurrency = "INR",
  initial,
  onSubmit,
  onCancel,
}: {
  trips: Trip[];
  defaultCurrency?: string;
  initial?: PersonalExpense;
  onSubmit: (values: {
    amount: number;
    currency: string;
    category: PersonalExpense["category"];
    date: string;
    note?: string;
    tripId?: string;
  }) => Promise<void>;
  onCancel?: () => void;
}) {
  const [amount, setAmount] = useState(initial ? String(initial.amount) : "");
  const [currency, setCurrency] = useState(initial?.currency ?? defaultCurrency);
  const [category, setCategory] = useState<PersonalExpense["category"]>(
    initial?.category ?? "Food",
  );
  const [date, setDate] = useState(initial?.date ?? new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState(initial?.note ?? "");
  const [tripId, setTripId] = useState(initial?.tripId ?? "");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = Number(amount);
    if (!parsed || parsed <= 0) return;
    setSaving(true);
    try {
      await onSubmit({
        amount: parsed,
        currency,
        category,
        date,
        note: note.trim() || undefined,
        tripId: tripId || undefined,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="amount">Amount</Label>
          <Input
            id="amount"
            inputMode="decimal"
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="currency">Currency</Label>
          <Input id="currency" value={currency} onChange={(e) => setCurrency(e.target.value)} />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="category">Category</Label>
        <Select id="category" value={category} onChange={(e) => setCategory(e.target.value as PersonalExpense["category"])}>
          {EXPENSE_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="date">Date</Label>
        <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="trip">Trip (optional)</Label>
        <Select id="trip" value={tripId} onChange={(e) => setTripId(e.target.value)}>
          <option value="">No trip</option>
          {trips.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="note">Note</Label>
        <Input id="note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="What was this for?" />
      </div>
      <div className="flex gap-2 pt-2">
        {onCancel ? (
          <Button type="button" variant="secondary" className="flex-1" onClick={onCancel}>
            Cancel
          </Button>
        ) : null}
        <Button type="submit" className="flex-1" disabled={saving}>
          {saving ? "Saving…" : initial ? "Update expense" : "Add expense"}
        </Button>
      </div>
    </form>
  );
}
