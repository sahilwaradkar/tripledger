"use client";

import { useState } from "react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { formatMoney } from "@/lib/utils";

export function ExpenseListItem({
  title,
  subtitle,
  amount,
  currency,
  onDelete,
  deleteConfirm,
}: {
  title: string;
  subtitle: string;
  amount: number;
  currency: string;
  onDelete?: () => void | Promise<void>;
  deleteConfirm?: { title: string; description: string };
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);

  function handleDeleteClick() {
    if (deleteConfirm) {
      setConfirmOpen(true);
      return;
    }
    void onDelete?.();
  }

  return (
    <>
      <div className="flex items-start justify-between gap-3 rounded-xl border border-border bg-surface p-3">
        <div className="min-w-0">
          <p className="truncate font-medium">{title}</p>
          <p className="text-sm text-slate-500">{subtitle}</p>
        </div>
        <div className="text-right">
          <p className="font-semibold tabular-nums">{formatMoney(amount, currency)}</p>
          {onDelete ? (
            <button type="button" className="text-xs text-red-600" onClick={handleDeleteClick}>
              Delete
            </button>
          ) : null}
        </div>
      </div>
      {deleteConfirm && onDelete ? (
        <ConfirmDialog
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          title={deleteConfirm.title}
          description={deleteConfirm.description}
          confirmLabel="Delete"
          onConfirm={onDelete}
        />
      ) : null}
    </>
  );
}
