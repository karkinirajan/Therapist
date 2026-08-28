"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { AlertCircle, Loader2 } from "lucide-react";
import { authKeys, exchangeGoogleCode, setAccessToken } from "@/lib/api-client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

type Status = "loading" | "error" | "missing-code";

function GoogleCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const code = searchParams.get("code");
  const [status, setStatus] = useState<Status>(code ? "loading" : "missing-code");

  useEffect(() => {
    if (!code) return;

    let cancelled = false;
    exchangeGoogleCode(code)
      .then((data) => {
        if (cancelled) return;
        setAccessToken(data.access_token);
        queryClient.setQueryData(authKeys.me, data.user);
        router.replace("/dashboard");
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });

    return () => {
      cancelled = true;
    };
  }, [router, code, queryClient]);

  return (
    <div className="max-w-md space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Signing you in with Google</CardTitle>
          <CardDescription>Finishing the sign-in you started with Google.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {status === "loading" && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              <span>Completing sign-in…</span>
            </div>
          )}

          {(status === "error" || status === "missing-code") && (
            <>
              <Alert variant="destructive">
                <AlertCircle className="size-4" aria-hidden="true" />
                <AlertDescription>
                  {status === "missing-code"
                    ? "No sign-in code was returned by Google. Please try again."
                    : "We couldn't complete Google sign-in. Please try again."}
                </AlertDescription>
              </Alert>
              <Button asChild variant="outline" className="w-full">
                <a href="/login">Back to log in</a>
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function GoogleCallbackPage() {
  return (
    <Suspense fallback={null}>
      <GoogleCallbackContent />
    </Suspense>
  );
}
