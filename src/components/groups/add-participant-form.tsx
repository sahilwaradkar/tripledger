"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AddParticipantForm({
  onSubmit,
}: {
  onSubmit: (values: { email: string; displayName?: string }) => Promise<void>;
}) {
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await onSubmit({
        email,
        displayName: displayName.trim() || undefined,
      });
      setEmail("");
      setDisplayName("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add person");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="space-y-3" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <Label htmlFor="participant-email">Email</Label>
        <Input
          id="participant-email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="friend@example.com"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="participant-name">Display name (guests only)</Label>
        <Input
          id="participant-name"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Required if they have no account"
        />
      </div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <Button type="submit" variant="secondary" className="w-full" disabled={saving}>
        {saving ? "Adding…" : "Add person"}
      </Button>
    </form>
  );
}
