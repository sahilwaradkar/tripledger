"use client";

import { Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { RequireAuth } from "@/components/auth/require-auth";
import { ExpenseListItem } from "@/components/expenses/expense-list-item";
import { PersonalExpenseForm } from "@/components/expenses/personal-expense-form";
import { AppShell } from "@/components/layout/app-shell";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  createPersonalExpense,
  deletePersonalExpense,
  subscribePersonalExpenses,
} from "@/lib/repo/expenses";
import { createTrip, subscribeTrips } from "@/lib/repo/trips";
import type { PersonalExpense, Trip } from "@/lib/types";

function PersonalContent() {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState<PersonalExpense[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [tripFilter, setTripFilter] = useState("");
  const [newTripName, setNewTripName] = useState("");

  useEffect(() => {
    if (!user) return;
    const unsubE = subscribePersonalExpenses(user.uid, setExpenses);
    const unsubT = subscribeTrips(user.uid, setTrips);
    return () => {
      unsubE();
      unsubT();
    };
  }, [user]);

  const filtered = useMemo(() => {
    if (!tripFilter) return expenses;
    return expenses.filter((e) => e.tripId === tripFilter);
  }, [expenses, tripFilter]);

  async function handleAdd(values: {
    amount: number;
    currency: string;
    category: PersonalExpense["category"];
    date: string;
    note?: string;
    tripId?: string;
  }) {
    if (!user) return;
    await createPersonalExpense({ ...values, ownerId: user.uid });
    setSheetOpen(false);
  }

  async function handleCreateTrip() {
    if (!user || !newTripName.trim()) return;
    await createTrip({ ownerId: user.uid, name: newTripName.trim() });
    setNewTripName("");
  }

  return (
    <AppShell
      title="Personal"
      action={
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger asChild>
            <Button size="icon" aria-label="Add expense">
              <Plus className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent title="Add expense">
            <PersonalExpenseForm trips={trips} onSubmit={handleAdd} onCancel={() => setSheetOpen(false)} />
          </SheetContent>
        </Sheet>
      }
    >
      <div className="space-y-4">
        <Card className="space-y-3">
          <p className="text-sm font-medium">Trips (optional labels)</p>
          <div className="flex gap-2">
            <Input
              placeholder="New trip name"
              value={newTripName}
              onChange={(e) => setNewTripName(e.target.value)}
            />
            <Button type="button" variant="secondary" onClick={handleCreateTrip}>
              Add
            </Button>
          </div>
          <div className="space-y-2">
            <Label htmlFor="trip-filter">Filter by trip</Label>
            <select
              id="trip-filter"
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 dark:border-slate-700 dark:bg-slate-900"
              value={tripFilter}
              onChange={(e) => setTripFilter(e.target.value)}
            >
              <option value="">All expenses</option>
              {trips.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
        </Card>

        {filtered.length === 0 ? (
          <Card>
            <p className="text-sm text-slate-500">No personal expenses yet. Tap + to add one — works offline too.</p>
          </Card>
        ) : (
          <div className="space-y-2">
            {filtered.map((e) => (
              <ExpenseListItem
                key={e.id}
                title={e.note || e.category}
                subtitle={`${e.category} · ${e.date}${e.tripId ? ` · ${trips.find((t) => t.id === e.tripId)?.name ?? "Trip"}` : ""}`}
                amount={e.amount}
                currency={e.currency}
                onDelete={() => deletePersonalExpense(e.id)}
                deleteConfirm={{
                  title: "Delete expense?",
                  description:
                    "This removes the expense from your personal list. This can't be undone.",
                }}
              />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}

export default function PersonalPage() {
  return (
    <RequireAuth>
      <PersonalContent />
    </RequireAuth>
  );
}
