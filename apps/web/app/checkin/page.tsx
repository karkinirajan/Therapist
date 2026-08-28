"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import {
  ApiError,
  useBaseline,
  useCheckins,
  useCreateCheckin,
  useGateState,
  useRoadmapState,
  type CheckinInput,
  type CheckinToolData,
  type HomeworkStatus,
} from "@/lib/api";
import { isCheckinOverdue } from "@/lib/storage";
import { CBT_TOOLS, DISTORTIONS, ROADMAP_PHASES } from "@/lib/constants";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { NativeSelect } from "@/components/native-select";
import { ScaleInput } from "@/components/scale-input";
import { LogBlock } from "@/components/log-block";
import { RequireBaselineNotice } from "@/components/require-baseline";
import { cn } from "@/lib/utils";

type CbtToolId = "thought-record" | "behavioral-activation" | "exposure-hierarchy" | "behavioral-experiment";

const HOMEWORK_OPTIONS: { value: HomeworkStatus; label: string }[] = [
  { value: "done", label: "Done" },
  { value: "partial", label: "Partial" },
  { value: "missed", label: "Missed" },
];

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function CheckinPage() {
  const baseline = useBaseline();
  const gateState = useGateState();
  const roadmapState = useRoadmapState();
  const lastCheckins = useCheckins({ limit: 1 });
  const createCheckin = useCreateCheckin();

  const [mood, setMood] = useState(5);
  const [anxiety, setAnxiety] = useState(5);
  const [meds, setMeds] = useState(true);
  const [sleep, setSleep] = useState("");
  const [homeworkStatus, setHomeworkStatus] = useState<HomeworkStatus>("done");
  const [homeworkNote, setHomeworkNote] = useState("");
  const [gapReflection, setGapReflection] = useState("");
  const [whatWorked, setWhatWorked] = useState("");
  const [whatDidnt, setWhatDidnt] = useState("");
  const [tool, setTool] = useState<CbtToolId>("thought-record");
  const [toolFields, setToolFields] = useState<Record<string, string>>({});
  const [patternFlagged, setPatternFlagged] = useState("");
  const [nextHomework, setNextHomework] = useState("");
  const [nextHomeworkDue, setNextHomeworkDue] = useState("");
  const [savedBlock, setSavedBlock] = useState<string | null>(null);

  const lastCheckin = lastCheckins.data?.[0] ?? null;
  const overdue = useMemo(
    () => (baseline.data ? isCheckinOverdue(lastCheckin?.date ?? null, baseline.data.cadence) : null),
    [baseline.data, lastCheckin],
  );

  if (baseline.isPending) {
    return (
      <div className="mx-auto max-w-2xl space-y-4" role="status" aria-label="Loading check-in">
        <div className="h-8 w-40 animate-pulse rounded bg-muted" />
        <div className="h-64 animate-pulse rounded-lg border border-border bg-muted/40" />
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

  if (gateState.data && !gateState.data.today_blocking_categories_complete) {
    return (
      <Alert variant="warning">
        <AlertTriangle />
        <AlertTitle>Log today&apos;s tracking first</AlertTitle>
        <AlertDescription className="space-y-2">
          <p>
            Check-in unlocks once today&apos;s entries for every blocking tracking category are
            logged. Missing: {gateState.data.missing_blocking_categories.join(", ")}.
          </p>
          <Button asChild size="sm">
            <Link href="/dashboard">Go log them</Link>
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  function setField(key: string, value: string) {
    setToolFields((f) => ({ ...f, [key]: value }));
  }

  function buildToolData(): CheckinToolData {
    switch (tool) {
      case "thought-record":
        return {
          tool: "thought-record",
          situation: toolFields.situation ?? "",
          automatic_thought: toolFields.automatic_thought ?? "",
          distortion: toolFields.distortion ?? "",
          evidence_for: toolFields.evidence_for ?? "",
          evidence_against: toolFields.evidence_against ?? "",
          balanced_thought: toolFields.balanced_thought ?? "",
        };
      case "behavioral-activation":
        return {
          tool: "behavioral-activation",
          activity: toolFields.activity ?? "",
          value_link: toolFields.value_link ?? "",
          predicted_mood_delta: Number(toolFields.predicted_mood_delta || 0),
          actual_mood_delta:
            toolFields.actual_mood_delta === undefined || toolFields.actual_mood_delta === ""
              ? null
              : Number(toolFields.actual_mood_delta),
        };
      case "exposure-hierarchy":
        return {
          tool: "exposure-hierarchy",
          item_label: toolFields.item_label ?? "",
          suds_before: Number(toolFields.suds_before || 0),
          suds_after: Number(toolFields.suds_after || 0),
          notes: toolFields.notes ?? "",
        };
      case "behavioral-experiment":
        return {
          tool: "behavioral-experiment",
          prediction: toolFields.prediction ?? "",
          experiment: toolFields.experiment ?? "",
          outcome: toolFields.outcome ?? "",
          what_it_means: toolFields.what_it_means ?? "",
        };
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const phaseIndex = roadmapState.data?.phase_index ?? 0;
    const phase = ROADMAP_PHASES[phaseIndex] ?? ROADMAP_PHASES[0];
    const isFirstCheckin = (lastCheckins.data?.length ?? 0) === 0;

    const body: CheckinInput = {
      date: todayIso(),
      mood,
      anxiety,
      meds,
      sleep,
      last_homework_status: isFirstCheckin ? "n/a" : homeworkStatus,
      last_homework_note: homeworkNote,
      gap_reflection: gapReflection,
      what_worked: whatWorked,
      what_didnt: whatDidnt,
      tool_data: buildToolData(),
      pattern_flagged: patternFlagged,
      roadmap_phase_name: `${phase.index + 1} — ${phase.name}`,
      next_homework: nextHomework,
      next_homework_due: nextHomeworkDue || null,
    };

    createCheckin.mutate(body, {
      onSuccess: (saved) => {
        setSavedBlock(formatLogBlock(saved));
      },
    });
  }

  const mutationError =
    createCheckin.error instanceof ApiError
      ? createCheckin.error.message
      : createCheckin.error
        ? "Something went wrong saving your check-in. Please try again."
        : null;

  if (savedBlock) {
    return (
      <div className="mx-auto max-w-xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Check-in saved</h1>
          <p className="text-sm text-muted-foreground">
            Save this block — paste it back at the start of your next check-in.
          </p>
        </div>
        <LogBlock text={savedBlock} />
        <div className="flex gap-3">
          <Button asChild>
            <Link href="/dashboard">Back to dashboard</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/progress">View progress</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Check-in</h1>
        <p className="text-sm text-muted-foreground">
          Cadence: {baseline.data.cadence}
          {roadmapState.data ? ` · Phase ${roadmapState.data.phase_index + 1}` : ""}
        </p>
      </div>

      {mutationError && (
        <Alert variant="destructive">
          <AlertTriangle />
          <AlertTitle>Couldn&apos;t save your check-in</AlertTitle>
          <AlertDescription>{mutationError}</AlertDescription>
        </Alert>
      )}

      {overdue?.overdue && (
        <Alert variant="warning">
          <AlertTriangle />
          <AlertTitle>It&apos;s been {overdue.daysSince} days</AlertTitle>
          <AlertDescription className="space-y-2">
            <p>
              That&apos;s past your cadence. Before the numbers — what happened? Treat the gap
              itself as material, not an aside.
            </p>
            <Textarea
              placeholder="What got in the way of checking in?"
              value={gapReflection}
              onChange={(e) => setGapReflection(e.target.value)}
            />
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Quick numbers</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <ScaleInput label="Mood" value={mood} onChange={setMood} lowLabel="Low" highLabel="High" />
          <ScaleInput label="Anxiety" value={anxiety} onChange={setAnxiety} lowLabel="Calm" highLabel="High" />
          <div className="flex items-center justify-between">
            <Label htmlFor="meds">Meds taken today</Label>
            <Switch id="meds" checked={meds} onCheckedChange={setMeds} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sleep">Sleep</Label>
            <Input
              id="sleep"
              placeholder="e.g. 6.5h, restless"
              value={sleep}
              onChange={(e) => setSleep(e.target.value)}
            />
          </div>
          {(lastCheckins.data?.length ?? 0) > 0 && (
            <div className="space-y-1.5">
              <Label>Last homework</Label>
              <div className="flex gap-2">
                {HOMEWORK_OPTIONS.map((o) => (
                  <button
                    type="button"
                    key={o.value}
                    onClick={() => setHomeworkStatus(o.value)}
                    className={cn(
                      "flex-1 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors",
                      homeworkStatus === o.value
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:bg-muted",
                    )}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
              <Input
                placeholder="One-line note"
                value={homeworkNote}
                onChange={(e) => setHomeworkNote(e.target.value)}
              />
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">One thing worked, one thing didn&apos;t</CardTitle>
          <CardDescription>Pull one real event from the gap since last time.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="worked">Worked</Label>
            <Textarea id="worked" value={whatWorked} onChange={(e) => setWhatWorked(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="didnt">Didn&apos;t</Label>
            <Textarea id="didnt" value={whatDidnt} onChange={(e) => setWhatDidnt(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Apply one CBT tool</CardTitle>
          <CardDescription>Exactly one technique per check-in — not several.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-2 gap-2">
            {CBT_TOOLS.map((t) => (
              <button
                type="button"
                key={t.id}
                onClick={() => setTool(t.id)}
                className={cn(
                  "rounded-md border p-3 text-left text-sm transition-colors",
                  tool === t.id ? "border-primary bg-primary/10" : "border-border hover:bg-muted",
                )}
              >
                <p className="font-medium text-foreground">{t.name}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{t.use}</p>
              </button>
            ))}
          </div>

          {tool === "thought-record" && (
            <div className="space-y-4">
              <TextField label="Situation" value={toolFields.situation} onChange={(v) => setField("situation", v)} />
              <TextField
                label="Automatic thought"
                value={toolFields.automatic_thought}
                onChange={(v) => setField("automatic_thought", v)}
              />
              <div className="space-y-1.5">
                <Label>Distortion</Label>
                <NativeSelect
                  value={toolFields.distortion ?? ""}
                  onChange={(e) => setField("distortion", e.target.value)}
                >
                  <option value="">Select one</option>
                  {DISTORTIONS.map((d) => (
                    <option key={d.id} value={d.name}>
                      {d.name}
                    </option>
                  ))}
                </NativeSelect>
              </div>
              <TextField
                label="Evidence for the thought"
                value={toolFields.evidence_for}
                onChange={(v) => setField("evidence_for", v)}
              />
              <TextField
                label="Evidence against the thought"
                value={toolFields.evidence_against}
                onChange={(v) => setField("evidence_against", v)}
              />
              <TextField
                label="Balanced / replacement thought"
                value={toolFields.balanced_thought}
                onChange={(v) => setField("balanced_thought", v)}
              />
            </div>
          )}

          {tool === "behavioral-activation" && (
            <div className="space-y-4">
              <TextField label="Activity" value={toolFields.activity} onChange={(v) => setField("activity", v)} />
              <TextField
                label="Why it matters (value it connects to)"
                value={toolFields.value_link}
                onChange={(v) => setField("value_link", v)}
              />
              <TextField
                label="Predicted mood delta (e.g. -2 to +2)"
                value={toolFields.predicted_mood_delta}
                onChange={(v) => setField("predicted_mood_delta", v)}
                type="number"
              />
              <TextField
                label="Actual mood delta (fill in once you've done it)"
                value={toolFields.actual_mood_delta}
                onChange={(v) => setField("actual_mood_delta", v)}
                type="number"
              />
            </div>
          )}

          {tool === "exposure-hierarchy" && (
            <div className="space-y-4">
              <TextField
                label="Hierarchy item / rung"
                value={toolFields.item_label}
                onChange={(v) => setField("item_label", v)}
              />
              <div className="grid grid-cols-2 gap-4">
                <TextField
                  label="SUDS before (0-100)"
                  value={toolFields.suds_before}
                  onChange={(v) => setField("suds_before", v)}
                  type="number"
                />
                <TextField
                  label="SUDS after (0-100)"
                  value={toolFields.suds_after}
                  onChange={(v) => setField("suds_after", v)}
                  type="number"
                />
              </div>
              <TextField label="Notes" value={toolFields.notes} onChange={(v) => setField("notes", v)} />
            </div>
          )}

          {tool === "behavioral-experiment" && (
            <div className="space-y-4">
              <TextField label="Prediction" value={toolFields.prediction} onChange={(v) => setField("prediction", v)} />
              <TextField
                label="Smallest real-world experiment"
                value={toolFields.experiment}
                onChange={(v) => setField("experiment", v)}
              />
              <TextField label="Actual outcome" value={toolFields.outcome} onChange={(v) => setField("outcome", v)} />
              <TextField
                label="What it means for the belief"
                value={toolFields.what_it_means}
                onChange={(v) => setField("what_it_means", v)}
              />
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pattern flagged this session</CardTitle>
          <CardDescription>Distortion or avoidance behavior, if any. Leave blank if none.</CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder='e.g. "third week deferring the same task — that&apos;s not a scheduling problem"'
            value={patternFlagged}
            onChange={(e) => setPatternFlagged(e.target.value)}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Next homework</CardTitle>
          <CardDescription>One thing. Small, specific, time-bound.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="hw">Action</Label>
            <Input id="hw" required value={nextHomework} onChange={(e) => setNextHomework(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="hwdue">Due by</Label>
            <Input
              id="hwdue"
              type="date"
              value={nextHomeworkDue}
              onChange={(e) => setNextHomeworkDue(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Button type="submit" size="lg" className="w-full" disabled={createCheckin.isPending}>
        {createCheckin.isPending ? "Saving…" : "Save check-in"}
      </Button>
    </form>
  );
}

function formatLogBlock(log: {
  date: string;
  mood: number;
  anxiety: number;
  meds: boolean;
  sleep: string;
  last_homework_status: HomeworkStatus;
  last_homework_note: string;
  pattern_flagged: string;
  roadmap_phase_name: string;
  next_homework: string;
  next_homework_due: string | null;
  streak_at_logging: number;
}): string {
  const homeworkLine =
    log.last_homework_status === "n/a"
      ? "n/a — first check-in"
      : `${log.last_homework_status}${log.last_homework_note ? ` — ${log.last_homework_note}` : ""}`;

  return [
    `CBT-LOG | ${log.date}`,
    `Mood: ${log.mood}/10 | Anxiety: ${log.anxiety}/10 | Meds: ${log.meds ? "Y" : "N"} | Sleep: ${log.sleep || "—"}`,
    `Last homework: ${homeworkLine}`,
    `Pattern flagged this session: ${log.pattern_flagged || "none"}`,
    `Roadmap phase: ${log.roadmap_phase_name}`,
    `Next homework: ${log.next_homework}${log.next_homework_due ? ` — due by ${log.next_homework_due}` : ""}`,
    `Streak: ${log.streak_at_logging}`,
  ].join("\n");
}

function TextField({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value?: string;
  onChange: (v: string) => void;
  type?: "text" | "number";
}) {
  const [id] = useState(() => `field-${label.replace(/\s+/g, "-").toLowerCase()}`);
  if (type === "number") {
    return (
      <div className="space-y-1.5">
        <Label htmlFor={id}>{label}</Label>
        <Input id={id} type="number" value={value ?? ""} onChange={(e) => onChange(e.target.value)} />
      </div>
    );
  }
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Textarea id={id} value={value ?? ""} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
