"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function CreateGroupForm({
  onSubmit,
}: {
  onSubmit: (values: {
    name: string;
    currency: string;
    startDate?: string;
    endDate?: string;
  }) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [currency, setCurrency] = useState("INR");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      await onSubmit({
        name: name.trim(),
        currency: currency.trim() || "INR",
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });
      setName("");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="space-y-3" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <Label htmlFor="group-name">Trip / group name</Label>
        <Input id="group-name" value={name} onChange={(e) => setName(e.target.value)} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="group-currency">Currency</Label>
        <Input id="group-currency" value={currency} onChange={(e) => setCurrency(e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="group-start">Start</Label>
          <Input id="group-start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="group-end">End</Label>
          <Input id="group-end" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>
      </div>
      <Button type="submit" className="w-full" disabled={saving}>
        {saving ? "Creating…" : "Create group"}
      </Button>
    </form>
  );
}
