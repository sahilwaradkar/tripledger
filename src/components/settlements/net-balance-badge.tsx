import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/utils";

export function NetBalanceBadge({
  net,
  currency,
  compact,
}: {
  net: number;
  currency: string;
  compact?: boolean;
}) {
  if (Math.abs(net) <= 0.01) {
    return (
      <Badge variant="secondary" className={compact ? "shrink-0" : undefined}>
        Settled
      </Badge>
    );
  }
  const positive = net > 0;
  return (
    <span
      className={
        compact
          ? `shrink-0 text-xs font-semibold tabular-nums ${positive ? "text-teal-700 dark:text-teal-300" : "text-red-600"}`
          : `text-sm font-semibold tabular-nums ${positive ? "text-teal-700 dark:text-teal-300" : "text-red-600"}`
      }
    >
      {positive ? "+" : ""}
      {formatMoney(net, currency)}
    </span>
  );
}
