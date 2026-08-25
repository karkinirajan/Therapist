"use client";

import { useMemo, useRef, useState } from "react";
import { Download, Upload } from "lucide-react";
import {
  computeStreaks,
  downloadJson,
  formatLogBlock,
  parseImportedJson,
  useRecoveryData,
  weeksSinceStart,
} from "@/lib/storage";
import { ROADMAP_PHASES } from "@/lib/constants";
import type { RecoveryData } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { StatCard } from "@/components/stat-card";
import { TrendChart } from "@/components/trend-chart";
import { LogBlock } from "@/components/log-block";
import { RequireBaselineNotice } from "@/components/require-baseline";
import { cn, formatDate } from "@/lib/utils";

export default function ProgressPage() {
  const { data, update, ready } = useRecoveryData();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingImport, setPendingImport] = useState<RecoveryData | null>(null);
  const [confirmingReset, setConfirmingReset] = useState(false);

  const sortedLogs = useMemo(() => [...data.logs].sort((a, b) => a.date.localeCompare(b.date)), [data.logs]);
  const streaks = useMemo(() => computeStreaks(data.logs), [data.logs]);
  const weeksElapsed = data.baseline ? weeksSinceStart(data.baseline.createdAt) : 0;

  if (!ready) return null;
  if (!data.baseline) return <RequireBaselineNotice />;

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const parsed = parseImportedJson(String(reader.result));
      if (parsed) setPendingImport(parsed);
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  function confirmImport() {
    if (!pendingImport) return;
    update(() => pendingImport);
    setPendingImport(null);
  }

  const half = Math.floor(sortedLogs.length / 2);
  const showReview = sortedLogs.length >= 20 || weeksElapsed >= 24;
  const firstHalf = sortedLogs.slice(0, half);
  const secondHalf = sortedLogs.slice(half);
  const avg = (arr: typeof sortedLogs, key: "mood" | "anxiety") =>
    arr.length ? arr.reduce((s, l) => s + l[key], 0) / arr.length : 0;

  const careerPhaseLogs = data.logs.filter((l) => l.roadmapPhaseName.startsWith(`${ROADMAP_PHASES[2].index + 1}`));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Progress</h1>
        <p className="text-sm text-muted-foreground">{data.logs.length} check-ins logged.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard label="Current streak" value={String(streaks.current)} />
        <StatCard label="Longest streak" value={String(streaks.longest)} />
        <StatCard label="Meds adherence" value={`${streaks.medsAdherencePct}%`} sub="All-time" />
        <StatCard label="Meds adherence" value={`${streaks.medsAdherencePctRecent}%`} sub="Last 8" />
        <StatCard label="Homework attempted" value={`${streaks.homeworkAttemptRate}%`} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Mood &amp; anxiety trend</CardTitle>
        </CardHeader>
        <CardContent>
          <TrendChart points={sortedLogs.map((l) => ({ date: l.date, mood: l.mood, anxiety: l.anxiety }))} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Phase timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            {ROADMAP_PHASES.map((phase) => (
              <div key={phase.index} className="flex flex-1 items-center gap-2">
                <div
                  className={cn(
                    "flex size-8 shrink-0 items-center justify-center rounded-full border text-xs font-semibold",
                    phase.index < data.phaseIndex && "border-success bg-success-muted text-success",
                    phase.index === data.phaseIndex && "border-primary bg-primary/10 text-primary",
                    phase.index > data.phaseIndex && "border-border text-muted-foreground",
                  )}
                >
                  {phase.index + 1}
                </div>
                {phase.index < ROADMAP_PHASES.length - 1 && (
                  <div
                    className={cn(
                      "h-px flex-1",
                      phase.index < data.phaseIndex ? "bg-success" : "bg-border",
                    )}
                  />
                )}
              </div>
            ))}
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            Currently Phase {Math.min(data.phaseIndex + 1, ROADMAP_PHASES.length)} —{" "}
            {ROADMAP_PHASES[Math.min(data.phaseIndex, ROADMAP_PHASES.length - 1)].name}
          </p>
        </CardContent>
      </Card>

      {showReview && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">6-month review — cold, numbers-first</CardTitle>
            <CardDescription>
              First half vs. second half of the logged period, plus adherence and career-phase
              activity.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <Field label="Mood: first half avg" value={avg(firstHalf, "mood").toFixed(1)} />
            <Field label="Mood: second half avg" value={avg(secondHalf, "mood").toFixed(1)} />
            <Field label="Anxiety: first half avg" value={avg(firstHalf, "anxiety").toFixed(1)} />
            <Field label="Anxiety: second half avg" value={avg(secondHalf, "anxiety").toFixed(1)} />
            <Field label="Longest adherence + homework streak" value={String(streaks.longest)} />
            <Field label="Check-ins during Phase 3 (career traction)" value={String(careerPhaseLogs.length)} />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Log history</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {sortedLogs.length === 0 && <p className="text-sm text-muted-foreground">No check-ins yet.</p>}
          {[...sortedLogs].reverse().map((log) => (
            <details key={log.id} className="rounded-md border border-border">
              <summary className="flex cursor-pointer items-center justify-between px-3 py-2 text-sm">
                <span>{formatDate(log.date)}</span>
                <span className="text-muted-foreground">
                  Mood {log.mood}/10 · Anxiety {log.anxiety}/10 · Meds {log.meds ? "Y" : "N"}
                </span>
              </summary>
              <div className="space-y-3 border-t border-border p-3">
                <LogBlock text={formatLogBlock(log)} />
                {log.whatWorked && (
                  <p className="text-sm"><strong>Worked:</strong> {log.whatWorked}</p>
                )}
                {log.whatDidnt && (
                  <p className="text-sm"><strong>Didn&apos;t:</strong> {log.whatDidnt}</p>
                )}
              </div>
            </details>
          ))}
        </CardContent>
      </Card>

      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="text-base">Data</CardTitle>
          <CardDescription>
            Everything lives only in this browser&apos;s local storage. Export a backup
            periodically — clearing browser data clears this too.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <Button type="button" variant="outline" onClick={() => downloadJson(data)}>
              <Download className="size-4" /> Export backup
            </Button>
            <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
              <Upload className="size-4" /> Import backup
            </Button>
            <input ref={fileInputRef} type="file" accept="application/json" className="hidden" onChange={handleFile} />
          </div>

          {pendingImport && (
            <Alert variant="warning">
              <AlertTitle>Replace current data?</AlertTitle>
              <AlertDescription className="space-y-3">
                <p>
                  This file has {pendingImport.logs.length} check-ins
                  {pendingImport.baseline ? " and a baseline snapshot" : ""}. Importing replaces
                  everything currently stored in this browser.
                </p>
                <div className="flex gap-2">
                  <Button size="sm" variant="destructive" onClick={confirmImport}>
                    Replace
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setPendingImport(null)}>
                    Cancel
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {!confirmingReset ? (
            <Button type="button" variant="destructive" onClick={() => setConfirmingReset(true)}>
              Reset all data
            </Button>
          ) : (
            <Alert variant="destructive">
              <AlertTitle>This permanently deletes everything</AlertTitle>
              <AlertDescription className="flex flex-col gap-3">
                <p>Baseline, every check-in, roadmap progress, and hierarchy — all of it.</p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => {
                      update(() => ({
                        baseline: null,
                        logs: [],
                        hierarchy: [],
                        phaseIndex: 0,
                        phaseHistory: [],
                        introAcknowledged: false,
                      }));
                      setConfirmingReset(false);
                    }}
                  >
                    Yes, delete everything
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setConfirmingReset(false)}>
                    Cancel
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}
