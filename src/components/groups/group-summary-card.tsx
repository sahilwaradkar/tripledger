import { Card } from "@/components/ui/card";
import { NetBalanceBadge } from "@/components/settlements/net-balance-badge";
import { formatMoney } from "@/lib/utils";

export function GroupSummaryCard({
  myNet,
  currency,
  totalSpent,
  oweHint,
  owedHint,
}: {
  myNet: number;
  currency: string;
  totalSpent: number;
  oweHint?: string;
  owedHint?: string;
}) {
  const settled = Math.abs(myNet) <= 0.01;

  return (
    <Card className="space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm text-muted">Your balance</p>
          {settled ? (
            <p className="text-xl font-bold">All settled</p>
          ) : myNet < 0 ? (
            <p className="text-2xl font-bold tabular-nums text-red-600">
              {formatMoney(-myNet, currency)}
              <span className="ml-1 text-sm font-normal text-muted">you owe</span>
            </p>
          ) : (
            <p className="text-2xl font-bold tabular-nums text-teal-700 dark:text-teal-300">
              {formatMoney(myNet, currency)}
              <span className="ml-1 text-sm font-normal text-muted">owed to you</span>
            </p>
          )}
        </div>
        <NetBalanceBadge net={myNet} currency={currency} />
      </div>
      {(oweHint || owedHint) && !settled ? (
        <p className="text-xs text-muted">
          {oweHint}
          {oweHint && owedHint ? " · " : null}
          {owedHint}
        </p>
      ) : null}
      <div className="border-t border-border pt-3">
        <p className="text-sm text-muted">Total group spend</p>
        <p className="text-lg font-semibold tabular-nums">{formatMoney(totalSpent, currency)}</p>
      </div>
    </Card>
  );
}
