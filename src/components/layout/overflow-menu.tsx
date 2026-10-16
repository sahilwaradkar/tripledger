"use client";

import type { LucideIcon } from "lucide-react";
import { ChevronRight, MoreVertical } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export type OverflowMenuItem = {
  label: string;
  icon?: LucideIcon;
  onClick: () => void;
  destructive?: boolean;
};

export function OverflowMenu({ items, title = "Menu" }: { items: OverflowMenuItem[]; title?: string }) {
  const [open, setOpen] = useState(false);

  if (items.length === 0) return null;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button size="icon" variant="ghost" aria-label="Open menu" className="h-9 w-9 shrink-0">
          <MoreVertical className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent title={title}>
        <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.label}>
                <button
                  type="button"
                  className={cn(
                    "flex w-full items-center gap-3 px-4 py-3.5 text-left text-sm font-medium transition hover:bg-background",
                    item.destructive ? "text-red-600" : "text-foreground",
                  )}
                  onClick={() => {
                    item.onClick();
                    setOpen(false);
                  }}
                >
                  {Icon ? <Icon className="h-5 w-5 shrink-0 opacity-70" /> : <span className="w-5" />}
                  <span className="flex-1">{item.label}</span>
                  <ChevronRight className="h-4 w-4 text-muted" />
                </button>
              </li>
            );
          })}
        </ul>
      </SheetContent>
    </Sheet>
  );
}
