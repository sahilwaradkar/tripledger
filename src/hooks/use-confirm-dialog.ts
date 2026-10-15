"use client";

import { useCallback, useMemo, useState } from "react";
import type { ComponentProps } from "react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

type ConfirmOptions = {
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "destructive" | "default";
  onConfirm: () => void | Promise<void>;
};

type DialogProps = Pick<
  ComponentProps<typeof ConfirmDialog>,
  "open" | "onOpenChange" | "title" | "description" | "confirmLabel" | "cancelLabel" | "variant" | "onConfirm"
>;

export function useConfirmDialog() {
  const [state, setState] = useState<ConfirmOptions | null>(null);

  const confirm = useCallback((options: ConfirmOptions) => {
    setState(options);
  }, []);

  const dialogProps: DialogProps = useMemo(
    () => ({
      open: state !== null,
      onOpenChange: (open) => {
        if (!open) setState(null);
      },
      title: state?.title ?? "",
      description: state?.description ?? "",
      confirmLabel: state?.confirmLabel,
      cancelLabel: state?.cancelLabel,
      variant: state?.variant,
      onConfirm: async () => {
        if (state) await state.onConfirm();
      },
    }),
    [state],
  );

  return { confirm, dialogProps, ConfirmDialog };
}
