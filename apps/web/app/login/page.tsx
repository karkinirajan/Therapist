"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle } from "lucide-react";
import { ApiError, useLogin } from "@/lib/api-client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function LoginPage() {
  const router = useRouter();
  const login = useLogin();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    login.mutate(
      { email, password },
      { onSuccess: () => router.push("/dashboard") },
    );
  }

  const errorMessage =
    login.error instanceof ApiError && login.error.status === 401
      ? "Incorrect email or password."
      : login.error
        ? "Something went wrong signing you in. Please try again."
        : null;

  return (
    <div className="max-w-md space-y-6">
      <div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">Log in</h1>
        <p className="text-sm text-muted-foreground">
          Sign in to sync your check-ins and roadmap across devices.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Welcome back</CardTitle>
          <CardDescription>Enter your email and password.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {errorMessage && (
            <Alert variant="destructive">
              <AlertCircle className="size-4" aria-hidden="true" />
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <Button type="submit" className="w-full" disabled={login.isPending}>
              {login.isPending ? "Logging in…" : "Log in"}
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">Or</span>
            </div>
          </div>

          <Button asChild variant="outline" className="w-full">
            {/* Intentional full browser navigation (not a Next.js page, not
                a fetch) — the OAuth flow needs a real top-level GET to hit
                the redirect chain to Google's consent screen. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href="/api/auth/google/start">Continue with Google</a>
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{" "}
            <a href="/signup" className="font-medium text-foreground underline underline-offset-2">
              Sign up
            </a>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
