"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { BottomNav } from "@/components/layout/bottom-nav";
import { SyncStatusChip } from "@/components/layout/sync-status-chip";

export function AppShell({
  title,
  children,
  action,
  backHref,
  menu,
  footer,
  hideBrand,
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
  backHref?: string;
  menu?: React.ReactNode;
  footer?: React.ReactNode;
  hideBrand?: boolean;
}) {
  const mainPb = footer ? "pb-36" : "pb-24";

  return (
    <div className="min-h-dvh bg-background">
      <header className="sticky top-0 z-20 border-b border-border bg-surface/95 backdrop-blur">
        <div className="mx-auto flex max-w-lg items-center gap-2 px-3 py-2.5">
          {backHref ? (
            <Link
              href={backHref}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-foreground hover:bg-background"
              aria-label="Back"
            >
              <ChevronLeft className="h-6 w-6" />
            </Link>
          ) : null}
          <div className="min-w-0 flex-1">
            {!hideBrand ? (
              <p className="text-[10px] font-medium uppercase tracking-wide text-accent">TripLedger</p>
            ) : null}
            <h1 className="truncate text-base font-semibold leading-tight">{title}</h1>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <SyncStatusChip />
            {action}
            {menu}
          </div>
        </div>
      </header>
      <main className={`mx-auto max-w-lg px-3 py-3 ${mainPb}`}>{children}</main>
      {footer ? (
        <div className="fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-20 mx-auto max-w-lg px-3">
          {footer}
        </div>
      ) : null}
      <BottomNav />
    </div>
  );
}
