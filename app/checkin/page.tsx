"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import {
  computeStreaks,
  formatLogBlock,
  isCheckinOverdue,
  newId,
  useRecoveryData,
} from "@/lib/storage";
import { CBT_TOOLS, DISTORTIONS, ROADMAP_PHASES } from "@/lib/constants";
import type { CbtToolData, CbtToolId, CheckinLog, HomeworkStatus } from "@/lib/types";
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

const HOMEWORK_OPTIONS: { value: HomeworkStatus; label: string }[] = [
  { value: "done", label: "Done" },
  { value: "partial", label: "Partial" },
  { value: "missed", label: "Missed" },
];

export default function CheckinPage() {
  const { data, update, ready } = useRecoveryData();

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

  const lastLog = useMemo(
    () => [...data.logs].sort((a, b) => b.date.localeCompare(a.date))[0] ?? null,
    [data.logs],
  );
  const overdue = useMemo(
    () => (data.baseline ? isCheckinOverdue(lastLog?.date ?? null, data.baseline.cadence) : null),
    [data.baseline, lastLog],
  );

  if (!ready) return null;
  if (!data.baseline) {
    return <RequireBaselineNotice />;
  }

  function setField(key: string, value: string) {
    setToolFields((f) => ({ ...f, [key]: value }));
  }

  function buildToolData(): CbtToolData {
    switch (tool) {
      case "thought-record":
        return {
          tool: "thought-record",
          situation: toolFields.situation ?? "",
          automaticThought: toolFields.automaticThought ?? "",
          distortion: toolFields.distortion ?? "",
          evidenceFor: toolFields.evidenceFor ?? "",
          evidenceAgainst: toolFields.evidenceAgainst ?? "",
          balancedThought: toolFields.balancedThought ?? "",
        };
      case "behavioral-activation":
        return {
          tool: "behavioral-activation",
          activity: toolFields.activity ?? "",
          scheduledFor: toolFields.scheduledFor ?? "",
          valuesLink: toolFields.valuesLink ?? "",
          predictedMood: toolFields.predictedMood ?? "",
        };
      case "exposure-hierarchy":
        return {
          tool: "exposure-hierarchy",
          hierarchyItem: toolFields.hierarchyItem ?? "",
          sudsBefore: toolFields.sudsBefore ?? "",
          sudsAfter: toolFields.sudsAfter ?? "",
          outcome: toolFields.outcome ?? "",
        };
      case "behavioral-experiment":
        return {
          tool: "behavioral-experiment",
          belief: toolFields.belief ?? "",
          prediction: toolFields.prediction ?? "",
          experiment: toolFields.experiment ?? "",
          actualOutcome: toolFields.actualOutcome ?? "",
          whatItMeans: toolFields.whatItMeans ?? "",
        };
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!data.baseline) return;

    const phase = ROADMAP_PHASES[data.phaseIndex];
    const date = new Date().toISOString().slice(0, 10);

    const draft: CheckinLog = {
      id: newId(),
      date,
      mood,
      anxiety,
      meds,
      sleep,
      lastHomeworkStatus: data.logs.length === 0 ? "n/a" : homeworkStatus,
      lastHomeworkNote: homeworkNote,
      gapReflection,
      whatWorked,
      whatDidnt,
      toolData: buildToolData(),
      patternFlagged,
      roadmapPhaseName: `${phase.index + 1} — ${phase.name}`,
      nextHomework,
      nextHomeworkDue,
      streakAtLogging: 0,
    };

    const streaks = computeStreaks([...data.logs, draft]);
    draft.streakAtLogging = streaks.current;

    const block = formatLogBlock(draft);
    update((d) => ({ ...d, logs: [...d.logs, draft] }));
    setSavedBlock(block);
  }

  if (savedBlock) {
    return (
      <div className="mx-auto max-w-xl space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Check-in saved</h1>
          <p className="text-sm text-muted-foreground">
            Save this block — paste it back at the start of your next check-in.
          </p>
        </div>
        <LogBlock text={savedBlock} />
        <div className="flex gap-3">
          <Button asChild>
            <Link href="/">Back to dashboard</Link>
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
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Check-in</h1>
        <p className="text-sm text-muted-foreground">
          Phase {data.phaseIndex + 1} — {ROADMAP_PHASES[data.phaseIndex].name} · Cadence:{" "}
          {data.baseline.cadence}
        </p>
      </div>

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
          {data.logs.length > 0 && (
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
                  tool === t.id
                    ? "border-primary bg-primary/10"
                    : "border-border hover:bg-muted",
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
                value={toolFields.automaticThought}
                onChange={(v) => setField("automaticThought", v)}
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
                value={toolFields.evidenceFor}
                onChange={(v) => setField("evidenceFor", v)}
              />
              <TextField
                label="Evidence against the thought"
                value={toolFields.evidenceAgainst}
                onChange={(v) => setField("evidenceAgainst", v)}
              />
              <TextField
                label="Balanced / replacement thought"
                value={toolFields.balancedThought}
                onChange={(v) => setField("balancedThought", v)}
              />
            </div>
          )}

          {tool === "behavioral-activation" && (
            <div className="space-y-4">
              <TextField label="Activity" value={toolFields.activity} onChange={(v) => setField("activity", v)} />
              <TextField
                label="Scheduled for"
                value={toolFields.scheduledFor}
                onChange={(v) => setField("scheduledFor", v)}
                placeholder="Date / time slot"
              />
              <TextField
                label="Why it matters (values link)"
                value={toolFields.valuesLink}
                onChange={(v) => setField("valuesLink", v)}
              />
              <TextField
                label="Predicted mood before doing it"
                value={toolFields.predictedMood}
                onChange={(v) => setField("predictedMood", v)}
              />
            </div>
          )}

          {tool === "exposure-hierarchy" && (
            <div className="space-y-4">
              <TextField
                label="Hierarchy item / rung"
                value={toolFields.hierarchyItem}
                onChange={(v) => setField("hierarchyItem", v)}
                placeholder="See the Tools page to build your full hierarchy"
              />
              <div className="grid grid-cols-2 gap-4">
                <TextField
                  label="SUDS before (0-100)"
                  value={toolFields.sudsBefore}
                  onChange={(v) => setField("sudsBefore", v)}
                />
                <TextField
                  label="SUDS after (0-100)"
                  value={toolFields.sudsAfter}
                  onChange={(v) => setField("sudsAfter", v)}
                />
              </div>
              <TextField label="Outcome" value={toolFields.outcome} onChange={(v) => setField("outcome", v)} />
            </div>
          )}

          {tool === "behavioral-experiment" && (
            <div className="space-y-4">
              <TextField
                label="Belief being tested"
                value={toolFields.belief}
                onChange={(v) => setField("belief", v)}
              />
              <TextField label="Prediction" value={toolFields.prediction} onChange={(v) => setField("prediction", v)} />
              <TextField
                label="Smallest real-world experiment"
                value={toolFields.experiment}
                onChange={(v) => setField("experiment", v)}
              />
              <TextField
                label="Actual outcome"
                value={toolFields.actualOutcome}
                onChange={(v) => setField("actualOutcome", v)}
              />
              <TextField
                label="What it means for the belief"
                value={toolFields.whatItMeans}
                onChange={(v) => setField("whatItMeans", v)}
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
            <Input
              id="hw"
              required
              value={nextHomework}
              onChange={(e) => setNextHomework(e.target.value)}
            />
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

      <Button type="submit" size="lg" className="w-full">
        Save check-in
      </Button>
    </form>
  );
}

let textFieldCounter = 0;

function TextField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value?: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const [id] = useState(() => `field-${(textFieldCounter += 1)}`);
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Textarea
        id={id}
        value={value ?? ""}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
