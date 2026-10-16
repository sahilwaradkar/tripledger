"use client";

import { ArrowRightLeft, GitMerge } from "lucide-react";
import { useState } from "react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import type { SettlementKind } from "@/lib/types";
import { formatMoney } from "@/lib/utils";

export function SettlementListItem({
  fromName,
  toName,
  amount,
  currency,
  date,
  note,
  kind,
  referenceKey,
  onDelete,
}: {
  fromName: string;
  toName: string;
  amount: number;
  currency: string;
  date: string;
  note?: string;
  kind?: SettlementKind;
  referenceKey?: string;
  onDelete?: () => void | Promise<void>;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const isAuto = kind === "auto_offset";

  return (
    <>
      <div className="flex items-start justify-between gap-3 rounded-xl border border-border bg-surface p-3">
        <div className="flex min-w-0 gap-2">
          {isAuto ? (
            <GitMerge className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
          ) : (
            <ArrowRightLeft className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
          )}
          <div className="min-w-0">
            <p className="truncate font-medium">
              {isAuto ? "Mutual offset" : `${fromName} → ${toName}`}
            </p>
            <p className="text-sm text-muted">
              {isAuto ? `${fromName} ↔ ${toName}` : "Payment"} · {date}
              {referenceKey ? ` · ${referenceKey}` : ""}
              {note ? ` · ${note}` : ""}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="font-semibold tabular-nums text-accent">{formatMoney(amount, currency)}</p>
          {onDelete && !isAuto ? (
            <button type="button" className="text-xs text-red-600" onClick={() => setConfirmOpen(true)}>
              Delete
            </button>
          ) : null}
        </div>
      </div>
      {onDelete && !isAuto ? (
        <ConfirmDialog
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          title="Delete payment record?"
          description="This removes the settlement from history and balances will update for everyone."
          confirmLabel="Delete"
          onConfirm={onDelete}
        />
      ) : null}
    </>
  );
}
