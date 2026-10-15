"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { RequireAuth } from "@/components/auth/require-auth";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { joinGroupViaInvite } from "@/lib/repo/groups";

function JoinGroupContent() {
  const params = useParams<{ token: string }>();
  const token = params.token;
  const { user } = useAuth();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    if (!user || !token) return;
    let cancelled = false;
    (async () => {
      setJoining(true);
      setError(null);
      try {
        const groupId = await joinGroupViaInvite(
          token,
          user.uid,
          user.displayName || user.email?.split("@")[0] || "Member",
        );
        if (!cancelled) router.replace(`/groups/${groupId}`);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not join group");
          setJoining(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, token, router]);

  return (
    <div className="flex min-h-dvh items-center justify-center px-4">
      <Card className="w-full max-w-md space-y-3">
        <CardTitle>Join group trip</CardTitle>
        {joining ? (
          <p className="text-sm text-slate-500">Joining… (requires network)</p>
        ) : null}
        {error ? (
          <>
            <p className="text-sm text-red-600">{error}</p>
            <Button className="w-full" onClick={() => router.push("/groups")}>
              Go to groups
            </Button>
          </>
        ) : null}
      </Card>
    </div>
  );
}

export default function JoinGroupPage() {
  return (
    <RequireAuth>
      <JoinGroupContent />
    </RequireAuth>
  );
}
