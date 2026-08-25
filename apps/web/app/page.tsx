"use client";

import Link from "next/link";
import { AlertTriangle, ArrowRight, X } from "lucide-react";
import { useRecoveryData, computeStreaks, isCheckinOverdue, weeksSinceStart } from "@/lib/storage";
import { IDENTITY_STATEMENT, ROADMAP_PHASES } from "@/lib/constants";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { StatCard } from "@/components/stat-card";
import { formatDate } from "@/lib/utils";

export default function DashboardPage() {
  const { data, update, ready } = useRecoveryData();

  if (!ready) return null;

  const { baseline, logs, phaseIndex, introAcknowledged } = data;

  if (!baseline) {
    return (
      <div className="mx-auto max-w-xl space-y-6 py-8 text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          CBT Recovery &amp; Life-Systems Coach
        </h1>
        <p className="text-sm leading-relaxed text-muted-foreground">{IDENTITY_STATEMENT}</p>
        <Button asChild size="lg">
          <Link href="/intake">
            Start the first-session intake <ArrowRight className="size-4" />
          </Link>
        </Button>
      </div>
    );
  }

  const sortedLogs = [...logs].sort((a, b) => b.date.localeCompare(a.date));
  const lastLog = sortedLogs[0] ?? null;
  const streaks = computeStreaks(logs);
  const phase = ROADMAP_PHASES[phaseIndex];
  const weeks = weeksSinceStart(baseline.createdAt);
  const overdue = isCheckinOverdue(lastLog?.date ?? null, baseline.cadence);

  return (
    <div className="space-y-6">
      {!introAcknowledged && (
        <Alert className="relative pr-10">
          <AlertTitle>What this tool is — and isn&apos;t</AlertTitle>
          <AlertDescription>{IDENTITY_STATEMENT}</AlertDescription>
          <button
            type="button"
            aria-label="Dismiss"
            className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
            onClick={() => update((d) => ({ ...d, introAcknowledged: true }))}
          >
            <X className="size-4" />
          </button>
        </Alert>
      )}

      {overdue.overdue && (
        <Alert variant="warning">
          <AlertTriangle />
          <AlertTitle>Check-in gap</AlertTitle>
          <AlertDescription>
            It&apos;s been {overdue.daysSince} days since your last check-in (cadence: every{" "}
            {overdue.expectedDays} day{overdue.expectedDays > 1 ? "s" : ""}). Your next check-in
            opens by addressing that gap directly — what got in the way is CBT material too.{" "}
            <Link href="/checkin" className="font-medium underline underline-offset-2">
              Check in now
            </Link>
          </AlertDescription>
        </Alert>
      )}

      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Week {weeks} · Phase {phase.index + 1} — {phase.name}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <StatCard
          label="Last mood"
          value={lastLog ? `${lastLog.mood}/10` : "—"}
          sub={lastLog ? formatDate(lastLog.date) : "No check-ins yet"}
        />
        <StatCard label="Last anxiety" value={lastLog ? `${lastLog.anxiety}/10` : "—"} />
        <StatCard
          label="Streak"
          value={String(streaks.current)}
          sub={`Longest: ${streaks.longest}`}
          tone={streaks.current > 0 ? "success" : "default"}
        />
        <StatCard
          label="Meds adherence"
          value={`${streaks.medsAdherencePctRecent}%`}
          sub="Last 8 check-ins"
          tone={streaks.medsAdherencePctRecent >= 90 ? "success" : "warning"}
        />
      </div>

      {lastLog?.nextHomework && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Current homework</CardTitle>
            <CardDescription>
              {lastLog.nextHomework}
              {lastLog.nextHomeworkDue ? ` — due by ${lastLog.nextHomeworkDue}` : ""}
            </CardDescription>
          </CardHeader>
        </Card>
      )}

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
            <CardDescription>
              Phase {phase.index + 1} of {ROADMAP_PHASES.length} — {phase.goal}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="w-full">
              <Link href="/roadmap">View roadmap</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {sortedLogs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent check-ins</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {sortedLogs.slice(0, 3).map((log) => (
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
          </CardContent>
        </Card>
      )}
    </div>
  );
}
