"use client";

import { onSnapshotsInSync } from "firebase/firestore";
import React, { createContext, useContext, useEffect, useState } from "react";
import { getFirestoreDb } from "@/lib/firebase";
import type { SyncStatus } from "@/lib/types";

interface SyncContextValue {
  status: SyncStatus;
  lastSyncedAt: number | null;
}

const SyncContext = createContext<SyncContextValue>({ status: "synced", lastSyncedAt: null });

export function SyncProvider({ children }: { children: React.ReactNode }) {
  const [online, setOnline] = useState(true);
  const [pendingWrites, setPendingWrites] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null);

  useEffect(() => {
    const updateOnline = () => setOnline(navigator.onLine);
    updateOnline();
    window.addEventListener("online", updateOnline);
    window.addEventListener("offline", updateOnline);
    return () => {
      window.removeEventListener("online", updateOnline);
      window.removeEventListener("offline", updateOnline);
    };
  }, []);

  useEffect(() => {
    const db = getFirestoreDb();
    const unsub = onSnapshotsInSync(db, () => {
      setPendingWrites(false);
      setLastSyncedAt(Date.now());
    });

    const interval = window.setInterval(async () => {
      try {
        const { waitForPendingWrites } = await import("firebase/firestore");
        await waitForPendingWrites(db);
        setPendingWrites(false);
      } catch {
        setPendingWrites(true);
      }
    }, 3000);

    return () => {
      unsub();
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (!online) return;
    const db = getFirestoreDb();
    import("firebase/firestore").then(({ waitForPendingWrites }) => {
      waitForPendingWrites(db)
        .then(() => setPendingWrites(false))
        .catch(() => setPendingWrites(true));
    });
  }, [online]);

  let status: SyncStatus = "synced";
  if (!online) status = "offline";
  else if (pendingWrites) status = "syncing";

  return (
    <SyncContext.Provider value={{ status, lastSyncedAt }}>{children}</SyncContext.Provider>
  );
}

export function useSyncStatus() {
  return useContext(SyncContext);
}
