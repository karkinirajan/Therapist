"use client";

import { useState } from "react";
import { AlertTriangle, CheckCircle2, Lock } from "lucide-react";
import { ApiError, useAdvanceRoadmap, useBaseline, useRoadmapState } from "@/lib/api";
import { weeksSinceStart } from "@/lib/storage";
import { ROADMAP_PHASES } from "@/lib/constants";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { RequireBaselineNotice } from "@/components/require-baseline";
import { cn } from "@/lib/utils";

export default function RoadmapPage() {
  const baseline = useBaseline();
  const roadmapState = useRoadmapState();
  const advance = useAdvanceRoadmap();
  const [confirmingAdvance, setConfirmingAdvance] = useState(false);

  if (baseline.isPending || (baseline.data && roadmapState.isPending)) {
    return (
      <div className="space-y-4" role="status" aria-label="Loading roadmap">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded-lg border border-border bg-muted/40" />
        ))}
      </div>
    );
  }

  if (baseline.isError) {
    return (
      <Alert variant="destructive">
        <AlertTriangle />
        <AlertTitle>Couldn&apos;t load your baseline</AlertTitle>
        <AlertDescription>{baseline.error.message}</AlertDescription>
      </Alert>
    );
  }

  if (!baseline.data) {
    return <RequireBaselineNotice />;
  }

  if (roadmapState.isError) {
    return (
      <Alert variant="destructive">
        <AlertTriangle />
        <AlertTitle>Couldn&apos;t load your roadmap</AlertTitle>
        <AlertDescription>{roadmapState.error.message}</AlertDescription>
      </Alert>
    );
  }

  if (!roadmapState.data) return null;

  const { phase_index: phaseIndex } = roadmapState.data;
  const weeks = weeksSinceStart(baseline.data.created_at);
  const atFinalPhase = phaseIndex >= ROADMAP_PHASES.length - 1;
  const currentPhase = ROADMAP_PHASES[phaseIndex] ?? ROADMAP_PHASES[ROADMAP_PHASES.length - 1];
  const aheadOfSchedule = weeks < currentPhase.startWeek;

  const advanceError =
    advance.error instanceof ApiError && advance.error.status !== 409
      ? advance.error.message
      : null;

  function requestAdvance(confirmEarly: boolean) {
    advance.mutate(
      { confirm_early: confirmEarly },
      {
        onSuccess: () => setConfirmingAdvance(false),
        onError: (err) => {
          if (err instanceof ApiError && err.status === 409 && !confirmEarly) {
            setConfirmingAdvance(true);
          }
        },
      },
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">6-month roadmap</h1>
        <p className="text-sm text-muted-foreground">
          Started {baseline.data.created_at} · Week {weeks} of 24. Phased and gradual — phases
          don&apos;t compress just because you want to move faster.
        </p>
      </div>

      {advanceError && (
        <Alert variant="destructive">
          <AlertTriangle />
          <AlertTitle>Couldn&apos;t advance</AlertTitle>
          <AlertDescription>{advanceError}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-4">
        {ROADMAP_PHASES.map((phase) => {
          const status =
            phase.index < phaseIndex ? "completed" : phase.index === phaseIndex ? "current" : "locked";

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
                {status === "completed" && <Badge variant="success">Complete</Badge>}
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
                    {aheadOfSchedule && (
                      <Alert variant="warning">
                        <AlertTitle>Ahead of the calendar</AlertTitle>
                        <AlertDescription>
                          You&apos;re at week {weeks}, and this phase doesn&apos;t normally start
                          until week {currentPhase.startWeek}. Wanting to move faster isn&apos;t a
                          reason to compress a phase.
                        </AlertDescription>
                      </Alert>
                    )}

                    {atFinalPhase && (
                      <p className="text-sm text-muted-foreground">
                        This is the final phase of the current 6-month cycle.
                      </p>
                    )}

                    {!atFinalPhase && !confirmingAdvance && (
                      <Button onClick={() => requestAdvance(false)} disabled={advance.isPending}>
                        {advance.isPending ? "Advancing…" : "Advance to next phase"}
                      </Button>
                    )}

                    {confirmingAdvance && (
                      <Alert variant="destructive">
                        <AlertTitle>This is the pattern to name, not skip</AlertTitle>
                        <AlertDescription className="space-y-3">
                          <p>
                            This phase&apos;s success metric hasn&apos;t been met yet from your
                            logged check-ins. Rushing ahead here is exactly the kind of avoidance
                            this tool is built to catch — if you advance anyway, it gets flagged
                            in your roadmap history.
                          </p>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => requestAdvance(true)}
                              disabled={advance.isPending}
                            >
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
    </div>
  );
}
