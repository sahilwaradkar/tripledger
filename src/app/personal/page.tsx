"use client";

import { SlidersHorizontal } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { RequireAuth } from "@/components/auth/require-auth";
import { ExpenseListItem } from "@/components/expenses/expense-list-item";
import { PersonalExpenseForm } from "@/components/expenses/personal-expense-form";
import { AppShell } from "@/components/layout/app-shell";
import { OverflowMenu } from "@/components/layout/overflow-menu";
import { StickyActionBar } from "@/components/layout/sticky-action-bar";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent } from "@/components/ui/sheet";
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
  const [filtersOpen, setFiltersOpen] = useState(false);
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

  const activeTripName = trips.find((t) => t.id === tripFilter)?.name;

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
    <>
      <AppShell
        title="Personal"
        menu={
          <OverflowMenu
            title="Personal"
            items={[
              {
                label: "Filters & trips",
                icon: SlidersHorizontal,
                onClick: () => setFiltersOpen(true),
              },
            ]}
          />
        }
        footer={
          <StickyActionBar
            primary={{
              label: "Add expense",
              onClick: () => setSheetOpen(true),
            }}
          />
        }
      >
        {tripFilter && activeTripName ? (
          <p className="mb-2 text-xs text-muted">Showing: {activeTripName}</p>
        ) : null}

        {filtered.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted">
            No personal expenses yet. Tap Add expense below.
          </p>
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
                  description: "This removes the expense from your personal list.",
                }}
              />
            ))}
          </div>
        )}
      </AppShell>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent title="Add expense">
          <PersonalExpenseForm trips={trips} onSubmit={handleAdd} onCancel={() => setSheetOpen(false)} />
        </SheetContent>
      </Sheet>

      <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
        <SheetContent title="Filters & trips">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="trip-filter">Filter by trip</Label>
              <Select
                id="trip-filter"
                value={tripFilter}
                onChange={(e) => setTripFilter(e.target.value)}
              >
                <option value="">All expenses</option>
                {trips.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-trip">New trip label</Label>
              <div className="flex gap-2">
                <Input
                  id="new-trip"
                  placeholder="Trip name"
                  value={newTripName}
                  onChange={(e) => setNewTripName(e.target.value)}
                />
                <Button type="button" variant="secondary" onClick={handleCreateTrip}>
                  Add
                </Button>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

export default function PersonalPage() {
  return (
    <RequireAuth>
      <PersonalContent />
    </RequireAuth>
  );
}
