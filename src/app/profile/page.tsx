"use client";

import { format } from "date-fns";
import { useSyncExternalStore } from "react";
import { RequireAuth } from "@/components/auth/require-auth";
import { AppShell } from "@/components/layout/app-shell";
import { useAuth } from "@/components/providers/auth-provider";
import { useSyncStatus } from "@/components/providers/sync-provider";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";

function ProfileContent() {
  const { user, logOut } = useAuth();
  const { status, lastSyncedAt } = useSyncStatus();
  const isStandalone = useSyncExternalStore(
    (onStoreChange) => {
      const mq = window.matchMedia("(display-mode: standalone)");
      mq.addEventListener("change", onStoreChange);
      return () => mq.removeEventListener("change", onStoreChange);
    },
    () =>
      window.matchMedia("(display-mode: standalone)").matches ||
      // @ts-expect-error iOS standalone
      window.navigator.standalone === true,
    () => false,
  );
  const installHint = isStandalone
    ? null
    : "Install this app from your browser menu (Add to Home Screen) for the best offline experience.";

  return (
    <AppShell title="Profile">
      <div className="space-y-4">
        <Card>
          <CardTitle>Account</CardTitle>
          <p className="mt-2 font-medium">{user?.displayName || "Traveler"}</p>
          <p className="text-sm text-slate-500">{user?.email}</p>
        </Card>

        <Card>
          <CardTitle>Offline & sync</CardTitle>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            TripLedger uses Firebase Firestore offline persistence. Expenses you add without signal sync
            automatically when you reconnect.
          </p>
          <p className="mt-3 text-sm">
            Status: <span className="font-medium capitalize">{status}</span>
          </p>
          {lastSyncedAt ? (
            <p className="text-xs text-slate-500">
              Last synced {format(new Date(lastSyncedAt), "PPpp")}
            </p>
          ) : null}
        </Card>

        {installHint ? (
          <Card>
            <CardTitle>Install app</CardTitle>
            <p className="mt-2 text-sm text-slate-500">{installHint}</p>
          </Card>
        ) : (
          <Card>
            <CardTitle>Installed</CardTitle>
            <p className="mt-2 text-sm text-slate-500">You are using TripLedger as an installed app.</p>
          </Card>
        )}

        <Button variant="outline" className="w-full" onClick={() => logOut()}>
          Sign out
        </Button>
      </div>
    </AppShell>
  );
}

export default function ProfilePage() {
  return (
    <RequireAuth>
      <ProfileContent />
    </RequireAuth>
  );
}
