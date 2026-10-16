import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { NetBalanceBadge } from "@/components/settlements/net-balance-badge";
import { formatMoney } from "@/lib/utils";

export function GroupSettleHero({
  displayName,
  myNet,
  currency,
  onRecordPayment,
  showRecordCta,
}: {
  displayName?: string;
  myNet: number;
  currency: string;
  onRecordPayment?: () => void;
  showRecordCta?: boolean;
}) {
  const settled = Math.abs(myNet) <= 0.01;

  return (
    <Card>
      <CardTitle>Your balance</CardTitle>
      {displayName ? <p className="mt-1 text-sm text-slate-500">As {displayName}</p> : null}
      <div className="mt-3 flex items-end justify-between gap-3">
        <div>
          {settled ? (
            <p className="text-2xl font-bold text-slate-700 dark:text-slate-200">All settled</p>
          ) : myNet < 0 ? (
            <>
              <p className="text-sm text-slate-500">You owe</p>
              <p className="text-3xl font-bold tabular-nums text-red-600">
                {formatMoney(-myNet, currency)}
              </p>
            </>
          ) : (
            <>
              <p className="text-sm text-slate-500">You are owed</p>
              <p className="text-3xl font-bold tabular-nums text-teal-700 dark:text-teal-300">
                {formatMoney(myNet, currency)}
              </p>
            </>
          )}
        </div>
        <NetBalanceBadge net={myNet} currency={currency} />
      </div>
      {showRecordCta && onRecordPayment ? (
        <Button className="mt-4 w-full" variant="secondary" onClick={onRecordPayment}>
          Record payment
        </Button>
      ) : null}
    </Card>
  );
}
