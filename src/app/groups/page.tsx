"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { RequireAuth } from "@/components/auth/require-auth";
import { CreateGroupForm } from "@/components/groups/create-group-form";
import { AppShell } from "@/components/layout/app-shell";
import { useAuth } from "@/components/providers/auth-provider";
import { Card, CardTitle } from "@/components/ui/card";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { createGroup, subscribeGroups } from "@/lib/repo/groups";
import type { Group } from "@/lib/types";

function GroupsContent() {
  const { user } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    return subscribeGroups(user.uid, setGroups);
  }, [user]);

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
            <Button size="icon" aria-label="Create group">
              <Plus className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent title="New group trip">
            <CreateGroupForm onSubmit={handleCreate} />
          </SheetContent>
        </Sheet>
      }
    >
      {groups.length === 0 ? (
        <Card>
          <CardTitle>No groups yet</CardTitle>
          <p className="mt-2 text-sm text-slate-500">
            Create a trip group and share the link so friends can join. You can also add guest friends
            who never sign up.
          </p>
          <Button className="mt-4 w-full" onClick={() => setOpen(true)}>
            Create your first group
          </Button>
        </Card>
      ) : (
        <div className="space-y-2">
          {groups.map((g) => (
            <Link key={g.id} href={`/groups/${g.id}`}>
              <Card className="transition hover:border-teal-300">
                <p className="font-semibold">{g.name}</p>
                <p className="text-sm text-slate-500">
                  {g.memberIds.length} members · {g.currency}
                </p>
              </Card>
            </Link>
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
