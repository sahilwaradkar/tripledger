"use client";

import { format, startOfMonth } from "date-fns";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { RequireAuth } from "@/components/auth/require-auth";
import { ExpenseListItem } from "@/components/expenses/expense-list-item";
import { AppShell } from "@/components/layout/app-shell";
import { ListRow, ListRowAvatar } from "@/components/layout/list-row";
import { NetBalanceBadge } from "@/components/settlements/net-balance-badge";
import { useAuth } from "@/components/providers/auth-provider";
import { Card } from "@/components/ui/card";
import { useMyGroupsSettleSummary } from "@/hooks/use-my-groups-settle-summary";
import { subscribePersonalExpenses } from "@/lib/repo/expenses";
import type { PersonalExpense } from "@/lib/types";
import { formatMoney } from "@/lib/utils";

function HomeContent() {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState<PersonalExpense[]>([]);
  const { rows, totalsByCurrency, actionItems, allSettled, loading: settleLoading } =
    useMyGroupsSettleSummary(user?.uid);

  useEffect(() => {
    if (!user) return;
    return subscribePersonalExpenses(user.uid, setExpenses);
  }, [user]);

  const monthStart = format(startOfMonth(new Date()), "yyyy-MM-dd");
  const monthTotal = useMemo(
    () =>
      expenses
        .filter((e) => e.date >= monthStart)
        .reduce((sum, e) => sum + e.amount, 0),
    [expenses, monthStart],
  );

  const currency = expenses[0]?.currency ?? "INR";
  const recent = expenses.slice(0, 5);
  const oweEntries = [...totalsByCurrency.owe.entries()];
  const owedEntries = [...totalsByCurrency.owed.entries()];
  const hasGroups = rows.length > 0;

  return (
    <AppShell title="Home">
      <div className="space-y-3">
        <Card className="space-y-3">
          <div>
            <p className="text-sm text-muted">This month (personal)</p>
            <p className="text-3xl font-bold tabular-nums">{formatMoney(monthTotal, currency)}</p>
            <p className="text-xs text-muted">{format(new Date(), "MMMM yyyy")}</p>
          </div>

          {hasGroups ? (
            <div className="border-t border-border pt-3">
              <p className="text-sm font-medium">Settle up</p>
              {settleLoading ? (
                <p className="mt-1 text-sm text-muted">Loading…</p>
              ) : allSettled ? (
                <p className="mt-1 text-sm text-muted">All settled in your groups.</p>
              ) : (
                <div className="mt-2 space-y-1 text-sm">
                  {oweEntries.map(([cur, total]) => (
                    <p key={`owe-${cur}`}>
                      You owe{" "}
                      <span className="font-semibold text-red-600">{formatMoney(total, cur)}</span>
                    </p>
                  ))}
                  {owedEntries.map(([cur, total]) => (
                    <p key={`owed-${cur}`}>
                      You are owed{" "}
                      <span className="font-semibold text-teal-700 dark:text-teal-300">
                        {formatMoney(total, cur)}
                      </span>
                    </p>
                  ))}
                </div>
              )}
              {actionItems.length > 0 ? (
                <ul className="mt-3 space-y-1 border-t border-border pt-2">
                  {actionItems.map((item) => (
                    <li key={`${item.groupId}-${item.toParticipantId}`}>
                      <Link
                        href={`/groups/${item.groupId}?settle=1&to=${item.toParticipantId}`}
                        className="text-sm text-accent hover:underline"
                      >
                        {item.groupName}: pay {item.toDisplayName}{" "}
                        {formatMoney(item.amount, item.currency)}
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}
        </Card>

        {hasGroups ? (
          <section>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-medium">Groups</p>
              <Link href="/groups" className="text-xs text-accent">
                See all
              </Link>
            </div>
            <div className="overflow-hidden rounded-xl border border-border bg-surface">
              {rows.slice(0, 4).map((row) => (
                <ListRow key={row.group.id} href={`/groups/${row.group.id}`}>
                  <ListRowAvatar>{row.group.name.slice(0, 1).toUpperCase()}</ListRowAvatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{row.group.name}</p>
                    <p className="text-xs text-muted">{row.group.currency}</p>
                  </div>
                  {!row.loading ? (
                    <NetBalanceBadge net={row.myNet} currency={row.currency} compact />
                  ) : null}
                </ListRow>
              ))}
            </div>
          </section>
        ) : (
          <Card>
            <p className="text-sm text-muted">Create a group to split trip costs.</p>
            <Link href="/groups" className="mt-2 inline-block text-sm text-accent">
              Go to Groups →
            </Link>
          </Card>
        )}

        <section>
          <p className="mb-2 text-sm font-medium">Recent personal</p>
          {recent.length === 0 ? (
            <p className="text-sm text-muted">No expenses yet.</p>
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
