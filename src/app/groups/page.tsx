"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import { RequireAuth } from "@/components/auth/require-auth";
import { CreateGroupForm } from "@/components/groups/create-group-form";
import { AppShell } from "@/components/layout/app-shell";
import { ListRow, ListRowAvatar } from "@/components/layout/list-row";
import { NetBalanceBadge } from "@/components/settlements/net-balance-badge";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useMyGroupsSettleSummary } from "@/hooks/use-my-groups-settle-summary";
import { createGroup } from "@/lib/repo/groups";
import { formatMoney } from "@/lib/utils";

function GroupsContent() {
  const { user } = useAuth();
  const { rows } = useMyGroupsSettleSummary(user?.uid);
  const [open, setOpen] = useState(false);

  async function handleCreate(values: {
    name: string;
    currency: string;
    startDate?: string;
    endDate?: string;
  }) {
    if (!user) return;
    await createGroup({
      ...values,
      createdById: user.uid,
      creatorDisplayName: user.displayName || user.email?.split("@")[0] || "Member",
      creatorEmail: user.email ?? undefined,
    });
    setOpen(false);
  }

  return (
    <AppShell
      title="Groups"
      action={
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button size="icon" variant="ghost" aria-label="Create group" className="h-9 w-9">
              <Plus className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent title="New group trip">
            <CreateGroupForm onSubmit={handleCreate} />
          </SheetContent>
        </Sheet>
      }
    >
      {rows.length === 0 ? (
        <Card>
          <CardTitle>No groups yet</CardTitle>
          <p className="mt-2 text-sm text-muted">
            Create a trip group and share the link so friends can join.
          </p>
          <Button className="mt-4 w-full" onClick={() => setOpen(true)}>
            Create your first group
          </Button>
        </Card>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-surface">
          {rows.map((row) => (
            <ListRow key={row.group.id} href={`/groups/${row.group.id}`}>
              <ListRowAvatar>{row.group.name.slice(0, 1).toUpperCase()}</ListRowAvatar>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{row.group.name}</p>
                <p className="truncate text-xs text-muted">
                  {row.loading
                    ? "Loading…"
                    : row.topOwe
                      ? `You owe ${row.topOwe.displayName} ${formatMoney(row.topOwe.amount, row.currency)}`
                      : `${row.group.memberIds.length} members · ${row.group.currency}`}
                </p>
              </div>
              {row.loading ? null : (
                <NetBalanceBadge net={row.myNet} currency={row.currency} compact />
              )}
            </ListRow>
          ))}
        </div>
      )}
    </AppShell>
  );
}

export default function GroupsPage() {
  return (
    <RequireAuth>
      <GroupsContent />
    </RequireAuth>
  );
}
