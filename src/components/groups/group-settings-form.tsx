"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Group } from "@/lib/types";

export function GroupSettingsForm({
  group,
  onSubmit,
}: {
  group: Group;
  onSubmit: (values: Pick<Group, "name" | "currency" | "startDate" | "endDate">) => Promise<void>;
}) {
  const [name, setName] = useState(group.name);
  const [currency, setCurrency] = useState(group.currency);
  const [startDate, setStartDate] = useState(group.startDate ?? "");
  const [endDate, setEndDate] = useState(group.endDate ?? "");
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
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="space-y-3" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <Label htmlFor="settings-name">Group name</Label>
        <Input id="settings-name" value={name} onChange={(e) => setName(e.target.value)} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="settings-currency">Currency</Label>
        <Input id="settings-currency" value={currency} onChange={(e) => setCurrency(e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="settings-start">Start</Label>
          <Input
            id="settings-start"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="settings-end">End</Label>
          <Input
            id="settings-end"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
      </div>
      <Button type="submit" className="w-full" disabled={saving}>
        {saving ? "Saving…" : "Save settings"}
      </Button>
    </form>
  );
}
