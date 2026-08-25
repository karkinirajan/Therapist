"use client";

import { useState } from "react";
import { CheckCircle2, Lock } from "lucide-react";
import { phaseMetricMet, useRecoveryData, weeksSinceStart } from "@/lib/storage";
import { ROADMAP_PHASES } from "@/lib/constants";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { RequireBaselineNotice } from "@/components/require-baseline";
import { cn } from "@/lib/utils";

export default function RoadmapPage() {
  const { data, update, ready } = useRecoveryData();
  const [confirmingAdvance, setConfirmingAdvance] = useState(false);

  if (!ready) return null;
  if (!data.baseline) return <RequireBaselineNotice />;

  const { baseline, phaseIndex, logs, phaseHistory } = data;
  const weeks = weeksSinceStart(baseline.createdAt);
  const complete = phaseIndex >= ROADMAP_PHASES.length;
  const currentPhase = !complete ? ROADMAP_PHASES[phaseIndex] : null;
  const autoCheckable = phaseIndex <= 1;
  const metricMet = !complete && phaseMetricMet(phaseIndex, logs);
  const aheadOfSchedule = currentPhase ? weeks < currentPhase.startWeek : false;

  function advance(earned: boolean) {
    update((d) => ({
      ...d,
      phaseIndex: d.phaseIndex + 1,
      phaseHistory: [
        ...d.phaseHistory,
        {
          fromPhase: d.phaseIndex,
          toPhase: d.phaseIndex + 1,
          date: new Date().toISOString().slice(0, 10),
          earned,
        },
      ],
    }));
    setConfirmingAdvance(false);
  }

  function startNextCycle() {
    update((d) => ({
      ...d,
      phaseIndex: 0,
      phaseHistory: [
        ...d.phaseHistory,
        { fromPhase: d.phaseIndex, toPhase: 0, date: new Date().toISOString().slice(0, 10), earned: true },
      ],
    }));
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          6-month roadmap
        </h1>
        <p className="text-sm text-muted-foreground">
          Started {baseline.createdAt} · Week {weeks} of 24. Phased and gradual — phases don&apos;t
          compress just because you want to move faster.
        </p>
      </div>

      {complete && (
        <Card className="border-success/30 bg-success-muted">
          <CardHeader>
            <CardTitle className="text-base text-success">6-month cycle complete</CardTitle>
            <CardDescription>
              Review the full trend on the Progress page — cold, numbers-first — then decide the
              next cycle.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={startNextCycle}>Start next 6-month cycle</Button>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {ROADMAP_PHASES.map((phase) => {
          const status =
            phase.index < phaseIndex || complete
              ? "completed"
              : phase.index === phaseIndex
                ? "current"
                : "locked";
          const advanceRecord = phaseHistory.find((h) => h.fromPhase === phase.index);

          return (
            <Card
              key={phase.index}
              className={cn(
                status === "locked" && "opacity-60",
                status === "current" && "border-primary/40 ring-1 ring-primary/20",
              )}
            >
              <CardHeader className="flex-row items-start justify-between space-y-0">
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base">
                      Phase {phase.index + 1} — {phase.name}
                    </CardTitle>
                    {status === "completed" && <CheckCircle2 className="size-4 text-success" />}
                    {status === "locked" && <Lock className="size-3.5 text-muted-foreground" />}
                  </div>
                  <CardDescription>{phase.weekRange}</CardDescription>
                </div>
                {status === "current" && <Badge>Current</Badge>}
                {status === "completed" && (
                  <Badge variant="success">
                    {advanceRecord && !advanceRecord.earned ? "Advanced early" : "Complete"}
                  </Badge>
                )}
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-foreground">{phase.goal}</p>
                <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
                  {phase.focus.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Success metric
                </p>
                <p className="text-sm text-foreground">{phase.successMetric}</p>

                {status === "current" && (
                  <div className="space-y-3 border-t border-border pt-3">
                    {autoCheckable && (
                      <p className={cn("text-sm", metricMet ? "text-success" : "text-warning")}>
                        {metricMet
                          ? "Metric met from your logged check-ins."
                          : "Not met yet from your logged check-ins."}
                      </p>
                    )}
                    {!autoCheckable && (
                      <p className="text-sm text-muted-foreground">
                        This metric is self-reported — check it honestly against what&apos;s
                        actually in your log history, not what you wish were true.
                      </p>
                    )}

                    {aheadOfSchedule && (
                      <Alert variant="warning">
                        <AlertTitle>Ahead of the calendar</AlertTitle>
                        <AlertDescription>
                          You&apos;re at week {weeks}, and this phase doesn&apos;t normally start
                          until week {currentPhase!.startWeek}. Wanting to move faster isn&apos;t a
                          reason to compress a phase.
                        </AlertDescription>
                      </Alert>
                    )}

                    {!confirmingAdvance && (
                      <Button
                        onClick={() => (autoCheckable && !metricMet ? setConfirmingAdvance(true) : advance(true))}
                        variant={autoCheckable && !metricMet ? "outline" : "default"}
                      >
                        {autoCheckable && !metricMet
                          ? "Advance anyway"
                          : phase.index === ROADMAP_PHASES.length - 1
                            ? "Confirm phase complete & finish cycle"
                            : "Advance to next phase"}
                      </Button>
                    )}

                    {confirmingAdvance && (
                      <Alert variant="destructive">
                        <AlertTitle>This is the pattern to name, not skip</AlertTitle>
                        <AlertDescription className="space-y-3">
                          <p>
                            The success metric for this phase isn&apos;t met yet. Rushing ahead
                            here is exactly the kind of avoidance this tool is built to catch — if
                            you advance anyway, it gets flagged in your roadmap history.
                          </p>
                          <div className="flex gap-2">
                            <Button size="sm" variant="destructive" onClick={() => advance(false)}>
                              Advance anyway
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setConfirmingAdvance(false)}>
                              Stay in this phase
                            </Button>
                          </div>
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {phaseIndex > 0 && !complete && (
        <button
          type="button"
          className="text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground"
          onClick={() => update((d) => ({ ...d, phaseIndex: Math.max(0, d.phaseIndex - 1) }))}
        >
          Go back a phase
        </button>
      )}
    </div>
  );
}
