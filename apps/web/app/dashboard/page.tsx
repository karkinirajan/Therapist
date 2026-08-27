"use client";

import Link from "next/link";
import { AlertTriangle, ArrowRight, CheckCircle2, ClipboardList, Circle } from "lucide-react";
import { useBaseline, useCheckins, useGateState, useStreaks, useTrackingCategories } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/stat-card";
import { formatDate } from "@/lib/utils";

export default function DashboardPage() {
  const gateState = useGateState();
  const baseline = useBaseline();

  if (gateState.isPending || baseline.isPending) {
    return <DashboardSkeleton />;
  }

  if (gateState.isError || baseline.isError) {
    return (
      <Alert variant="destructive">
        <AlertTriangle />
        <AlertTitle>Couldn&apos;t load your dashboard</AlertTitle>
        <AlertDescription>
          {(gateState.error ?? baseline.error)?.message ?? "Something went wrong. Please try again."}
        </AlertDescription>
      </Alert>
    );
  }

  if (!baseline.data) {
    return (
      <div className="mx-auto max-w-xl space-y-6 py-8 text-center">
        <ClipboardList className="mx-auto size-10 text-primary" aria-hidden="true" />
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Start with the intake
        </h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Your baseline snapshot builds the daily/weekly tracking and 6-month roadmap that
          everything else here runs from. It only runs once.
        </p>
        <Button asChild size="lg">
          <Link href="/intake">
            Start the intake <ArrowRight className="size-4" />
          </Link>
        </Button>
      </div>
    );
  }

  if (!gateState.data) {
    // Shouldn't happen once isPending/isError are both false, but keeps the
    // component honest about the type instead of asserting it away.
    return null;
  }

  return <DashboardContent gateState={gateState.data} />;
}

function DashboardContent({
  gateState,
}: {
  gateState: NonNullable<ReturnType<typeof useGateState>["data"]>;
}) {
  const categories = useTrackingCategories();
  const streaks = useStreaks();
  const recentCheckins = useCheckins({ limit: 3 });

  const missingLabels = new Map(
    (categories.data ?? []).map((c) => [c.key, c.label] as const),
  );

  return (
    <div className="space-y-6">
      {!gateState.today_blocking_categories_complete && (
        <Alert variant="warning">
          <AlertTriangle />
          <AlertTitle>Today&apos;s required tracking isn&apos;t complete</AlertTitle>
          <AlertDescription className="space-y-2">
            <p>These categories block check-ins and the roadmap until today&apos;s entry is logged:</p>
            <ul className="flex flex-wrap gap-2 pt-1">
              {gateState.missing_blocking_categories.map((key) => (
                <li key={key}>
                  <Link href={`/tracking/${key}`}>
                    <Badge variant="warning" className="cursor-pointer hover:opacity-80">
                      {missingLabels.get(key) ?? key} <ArrowRight className="size-3" />
                    </Badge>
                  </Link>
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {gateState.today_blocking_categories_complete && (
        <Alert variant="success">
          <CheckCircle2 />
          <AlertTitle>Today&apos;s required tracking is done</AlertTitle>
          <AlertDescription>Check-in and roadmap are unlocked for today.</AlertDescription>
        </Alert>
      )}

      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          {gateState.this_week_rollup_complete
            ? "This week's rollup is complete."
            : "This week's rollup is still open."}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {streaks.isPending && (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        )}
        {streaks.isError && (
          <Card className="col-span-2 sm:col-span-3 lg:col-span-4">
            <CardContent className="p-4 text-sm text-destructive">
              Couldn&apos;t load your streak stats: {streaks.error.message}
            </CardContent>
          </Card>
        )}
        {streaks.data && (
          <>
            <StatCard
              label="Check-in streak"
              value={String(streaks.data.current_streak)}
              sub={`Longest: ${streaks.data.longest_streak}`}
              tone={streaks.data.current_streak > 0 ? "success" : "default"}
            />
            <StatCard
              label="Meds adherence"
              value={`${Math.round(streaks.data.last_8_meds_adherence_pct)}%`}
              sub="Last 8 check-ins"
              tone={streaks.data.last_8_meds_adherence_pct >= 90 ? "success" : "warning"}
            />
            <StatCard
              label="All-time meds adherence"
              value={`${Math.round(streaks.data.all_time_meds_adherence_pct)}%`}
            />
            <StatCard
              label="Homework attempt rate"
              value={`${Math.round(streaks.data.homework_attempt_rate_pct)}%`}
              tone={streaks.data.homework_attempt_rate_pct >= 70 ? "success" : "warning"}
            />
          </>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Check in</CardTitle>
            <CardDescription>Quick numbers, one CBT tool, one homework action.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link href="/checkin">Start check-in</Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Roadmap</CardTitle>
            <CardDescription>Your 6-month phased plan.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="w-full">
              <Link href="/roadmap">View roadmap</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tracking categories</CardTitle>
          <CardDescription>Daily, weekly, and monthly logs across all 6 categories.</CardDescription>
        </CardHeader>
        <CardContent>
          {categories.isPending && (
            <p className="text-sm text-muted-foreground">Loading categories…</p>
          )}
          {categories.isError && (
            <p className="text-sm text-destructive">
              Couldn&apos;t load categories: {categories.error.message}
            </p>
          )}
          {categories.data && categories.data.length === 0 && (
            <p className="text-sm text-muted-foreground">No tracking categories configured yet.</p>
          )}
          {categories.data && categories.data.length > 0 && (
            <ul className="grid gap-2 sm:grid-cols-2">
              {categories.data.map((c) => {
                const isMissingToday = gateState.missing_blocking_categories.includes(c.key);
                return (
                  <li key={c.id}>
                    <Link
                      href={`/tracking/${c.key}`}
                      className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2 text-sm transition-colors hover:bg-muted"
                    >
                      <span className="flex items-center gap-2">
                        {c.is_blocking ? (
                          isMissingToday ? (
                            <Circle className="size-3.5 text-warning" aria-hidden="true" />
                          ) : (
                            <CheckCircle2 className="size-3.5 text-success" aria-hidden="true" />
                          )
                        ) : null}
                        <span className="text-foreground">{c.label}</span>
                      </span>
                      {c.is_blocking && (
                        <Badge variant={isMissingToday ? "warning" : "success"}>
                          {isMissingToday ? "Due today" : "Logged today"}
                        </Badge>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent check-ins</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {recentCheckins.isPending && (
            <p className="text-sm text-muted-foreground">Loading…</p>
          )}
          {recentCheckins.isError && (
            <p className="text-sm text-destructive">
              Couldn&apos;t load check-ins: {recentCheckins.error.message}
            </p>
          )}
          {recentCheckins.data && recentCheckins.data.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No check-ins yet.{" "}
              <Link href="/checkin" className="font-medium underline underline-offset-2">
                Start your first one
              </Link>
              .
            </p>
          )}
          {recentCheckins.data && recentCheckins.data.length > 0 && (
            <>
              {recentCheckins.data.map((log) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm"
                >
                  <span className="text-muted-foreground">{formatDate(log.date)}</span>
                  <span>
                    Mood {log.mood}/10 · Anxiety {log.anxiety}/10 · Meds {log.meds ? "Y" : "N"}
                  </span>
                </div>
              ))}
              <Button asChild variant="link" className="px-0">
                <Link href="/progress">
                  See full history <ArrowRight className="size-3.5" />
                </Link>
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCardSkeleton() {
  return (
    <Card>
      <CardContent className="space-y-2 p-4">
        <div className="h-3 w-16 animate-pulse rounded bg-muted" />
        <div className="h-6 w-12 animate-pulse rounded bg-muted" />
      </CardContent>
    </Card>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6" role="status" aria-label="Loading dashboard">
      <div className="h-16 animate-pulse rounded-lg border border-border bg-muted/40" />
      <div className="h-8 w-40 animate-pulse rounded bg-muted" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
      </div>
    </div>
  );
}
