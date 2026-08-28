"use client";

import { useRouter } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { useCurrentUser, useLogout } from "@/lib/api-client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function AccountPage() {
  const router = useRouter();
  const currentUser = useCurrentUser();
  const logout = useLogout();

  function handleLogout() {
    logout.mutate(undefined, { onSuccess: () => router.push("/login") });
  }

  return (
    <div className="max-w-md space-y-6">
      <div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">Account</h1>
        <p className="text-sm text-muted-foreground">Manage your sign-in.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Signed in as</CardTitle>
          <CardDescription>
            {currentUser.isPending && "Loading…"}
            {currentUser.isError && "Couldn't load your account."}
            {currentUser.data === null && "Not signed in."}
            {currentUser.data && currentUser.data.email}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {currentUser.isError && (
            <Alert variant="destructive">
              <AlertTriangle />
              <AlertTitle>Couldn&apos;t load your account</AlertTitle>
              <AlertDescription>{currentUser.error.message}</AlertDescription>
            </Alert>
          )}

          {logout.isError && (
            <Alert variant="destructive">
              <AlertTriangle />
              <AlertDescription>
                Couldn&apos;t log out cleanly, but you&apos;ve been signed out locally. Refresh if
                anything looks off.
              </AlertDescription>
            </Alert>
          )}

          <Button
            variant="destructive"
            onClick={handleLogout}
            disabled={logout.isPending || !currentUser.data}
            className="w-full"
          >
            {logout.isPending ? "Logging out…" : "Log out"}
          </Button>

          <p className="text-xs text-muted-foreground">
            Settings, theme preference, and data export are coming in a follow-up.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
