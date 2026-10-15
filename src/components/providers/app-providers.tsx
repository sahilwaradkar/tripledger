"use client";

import { AuthProvider } from "@/components/providers/auth-provider";
import { SerwistRegister } from "@/components/providers/serwist-register";
import { SyncProvider } from "@/components/providers/sync-provider";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <SyncProvider>
        <SerwistRegister />
        {children}
      </SyncProvider>
    </AuthProvider>
  );
}
