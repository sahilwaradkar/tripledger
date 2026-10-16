"use client";

import { AuthProvider } from "@/components/providers/auth-provider";
import { SerwistRegister } from "@/components/providers/serwist-register";
import { SyncProvider } from "@/components/providers/sync-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <SyncProvider>
          <SerwistRegister />
          {children}
        </SyncProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
