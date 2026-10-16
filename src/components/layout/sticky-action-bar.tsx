"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function StickyActionBar({
  primary,
  secondary,
  className,
}: {
  primary: { label: string; onClick: () => void; disabled?: boolean };
  secondary?: { label: string; onClick: () => void; disabled?: boolean };
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex gap-2 rounded-2xl border border-border bg-surface p-2 shadow-lg",
        className,
      )}
    >
      {secondary ? (
        <Button
          type="button"
          variant="secondary"
          className="h-11 flex-1 rounded-xl"
          onClick={secondary.onClick}
          disabled={secondary.disabled}
        >
          {secondary.label}
        </Button>
      ) : null}
      <Button
        type="button"
        className={cn(
          "h-11 rounded-xl bg-accent text-accent-foreground hover:bg-accent/90",
          secondary ? "flex-1" : "w-full",
        )}
        onClick={primary.onClick}
        disabled={primary.disabled}
      >
        {primary.label}
      </Button>
    </div>
  );
}
