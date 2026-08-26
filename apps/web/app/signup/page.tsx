"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle } from "lucide-react";
import { ApiError, useSignup } from "@/lib/api-client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

const MIN_PASSWORD_LENGTH = 8;

export default function SignupPage() {
  const router = useRouter();
  const signup = useSignup();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [touched, setTouched] = useState(false);

  const passwordTooShort = password.length > 0 && password.length < MIN_PASSWORD_LENGTH;
  const showPasswordError = touched && passwordTooShort;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (password.length < MIN_PASSWORD_LENGTH) return;
    signup.mutate(
      { email, password },
      { onSuccess: () => router.push("/dashboard") },
    );
  }

  const errorMessage =
    signup.error instanceof ApiError && signup.error.status === 409
      ? "An account with this email already exists."
      : signup.error
        ? "Something went wrong creating your account. Please try again."
        : null;

  return (
    <div className="mx-auto max-w-md space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Sign up</h1>
        <p className="text-sm text-muted-foreground">
          Create an account to sync your check-ins and roadmap across devices.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Create your account</CardTitle>
          <CardDescription>It only takes a minute.</CardDescription>
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
                autoComplete="new-password"
                required
                minLength={MIN_PASSWORD_LENGTH}
                aria-invalid={showPasswordError}
                aria-describedby={showPasswordError ? "password-error" : undefined}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onBlur={() => setTouched(true)}
              />
              {showPasswordError && (
                <p id="password-error" className="text-xs font-medium text-destructive">
                  Password must be at least {MIN_PASSWORD_LENGTH} characters.
                </p>
              )}
            </div>
            <Button type="submit" className="w-full" disabled={signup.isPending}>
              {signup.isPending ? "Creating account…" : "Sign up"}
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
            Already have an account?{" "}
            <a href="/login" className="font-medium text-foreground underline underline-offset-2">
              Log in
            </a>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
