"use client";

import { format, startOfMonth } from "date-fns";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { RequireAuth } from "@/components/auth/require-auth";
import { ExpenseListItem } from "@/components/expenses/expense-list-item";
import { AppShell } from "@/components/layout/app-shell";
import { useAuth } from "@/components/providers/auth-provider";
import { Card, CardTitle } from "@/components/ui/card";
import { subscribePersonalExpenses } from "@/lib/repo/expenses";
import { subscribeGroups } from "@/lib/repo/groups";
import type { Group, PersonalExpense } from "@/lib/types";
import { formatMoney } from "@/lib/utils";

function HomeContent() {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState<PersonalExpense[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);

  useEffect(() => {
    if (!user) return;
    const unsubExpenses = subscribePersonalExpenses(user.uid, setExpenses);
    const unsubGroups = subscribeGroups(user.uid, setGroups);
    return () => {
      unsubExpenses();
      unsubGroups();
    };
  }, [user]);

  const monthStart = format(startOfMonth(new Date()), "yyyy-MM-dd");
  const monthTotal = useMemo(
    () =>
      expenses
        .filter((e) => e.date >= monthStart)
        .reduce((sum, e) => sum + e.amount, 0),
    [expenses, monthStart],
  );

  const byCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of expenses.filter((x) => x.date >= monthStart)) {
      map.set(e.category, (map.get(e.category) ?? 0) + e.amount);
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [expenses, monthStart]);

  const currency = expenses[0]?.currency ?? "INR";
  const recent = expenses.slice(0, 5);

  return (
    <AppShell title="Home">
      <div className="space-y-4">
        <Card>
          <CardTitle>This month (personal)</CardTitle>
          <p className="mt-2 text-3xl font-bold tabular-nums">{formatMoney(monthTotal, currency)}</p>
          <p className="text-sm text-slate-500">{format(new Date(), "MMMM yyyy")}</p>
        </Card>

        {byCategory.length > 0 ? (
          <Card>
            <CardTitle>By category</CardTitle>
            <ul className="mt-3 space-y-2">
              {byCategory.map(([cat, total]) => (
                <li key={cat} className="flex justify-between text-sm">
                  <span>{cat}</span>
                  <span className="font-medium tabular-nums">{formatMoney(total, currency)}</span>
                </li>
              ))}
            </ul>
          </Card>
        ) : null}

        <Card>
          <div className="flex items-center justify-between">
            <CardTitle>Groups</CardTitle>
            <Link href="/groups" className="text-sm text-teal-700">
              View all
            </Link>
          </div>
          {groups.length === 0 ? (
            <p className="mt-2 text-sm text-slate-500">No group trips yet. Create one to split costs.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {groups.slice(0, 3).map((g) => (
                <li key={g.id}>
                  <Link href={`/groups/${g.id}`} className="block rounded-lg px-2 py-2 hover:bg-slate-50 dark:hover:bg-slate-900">
                    <p className="font-medium">{g.name}</p>
                    <p className="text-xs text-slate-500">{g.memberIds.length} members · {g.currency}</p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <section>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Recent personal
          </h2>
          {recent.length === 0 ? (
            <Card>
              <p className="text-sm text-slate-500">No expenses yet.</p>
              <Link href="/personal" className="mt-2 inline-block text-sm text-teal-700">
                Add your first expense →
              </Link>
            </Card>
          ) : (
            <div className="space-y-2">
              {recent.map((e) => (
                <ExpenseListItem
                  key={e.id}
                  title={e.note || e.category}
                  subtitle={`${e.category} · ${e.date}`}
                  amount={e.amount}
                  currency={e.currency}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}

export default function HomePage() {
  return (
    <RequireAuth>
      <HomeContent />
    </RequireAuth>
  );
}
