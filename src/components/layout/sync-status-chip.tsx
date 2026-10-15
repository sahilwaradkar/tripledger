"use client";

import { Badge } from "@/components/ui/badge";
import { useSyncStatus } from "@/components/providers/sync-provider";

export function SyncStatusChip() {
  const { status } = useSyncStatus();
  if (status === "offline") {
    return <Badge variant="offline">Offline</Badge>;
  }
  if (status === "syncing") {
    return <Badge variant="warning">Syncing</Badge>;
  }
  return <Badge variant="default">Synced</Badge>;
}
