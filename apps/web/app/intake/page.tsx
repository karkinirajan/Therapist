"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import {
  ApiError,
  type BaselineCadence,
  type BaselineInput,
  type MedsAdherence2wk,
  type SleepQuality,
  useBaseline,
  useCreateBaseline,
  useUpdateBaseline,
} from "@/lib/api";
import { CADENCE_OPTIONS, MEDS_2WK_OPTIONS, SLEEP_OPTIONS } from "@/lib/constants";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { NativeSelect } from "@/components/native-select";
import { ScaleInput } from "@/components/scale-input";
import { formatDate } from "@/lib/utils";

const EMPTY: BaselineInput = {
  mood: 5,
  anxiety: 5,
  energy: 5,
  sleep_quality: "fair",
  meds_adherence_2wk: "consistent",
  career_example: "",
  structure_example: "",
  life_example: "",
  what_works: "",
  non_negotiables: "",
  cadence: "weekly",
};

export default function IntakePage() {
  const router = useRouter();
  const baseline = useBaseline();
  const createBaseline = useCreateBaseline();
  const updateBaseline = useUpdateBaseline();

  const [form, setForm] = useState<BaselineInput>(EMPTY);
  const [editing, setEditing] = useState(false);

  if (baseline.isPending) {
    return (
      <div className="mx-auto max-w-2xl space-y-4" role="status" aria-label="Loading intake">
        <div className="h-8 w-64 animate-pulse rounded bg-muted" />
        <div className="h-48 animate-pulse rounded-lg border border-border bg-muted/40" />
      </div>
    );
  }

  if (baseline.isError) {
    return (
      <Alert variant="destructive">
        <AlertTriangle />
        <AlertTitle>Couldn&apos;t load your intake</AlertTitle>
        <AlertDescription>{baseline.error.message}</AlertDescription>
      </Alert>
    );
  }

  const existing = baseline.data;
  const mutation = existing ? updateBaseline : createBaseline;

  const mutationErrorMessage =
    mutation.error instanceof ApiError
      ? mutation.error.message
      : mutation.error
        ? "Something went wrong saving your intake. Please try again."
        : null;

  if (existing && !editing) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Baseline Snapshot</h1>
          <p className="text-sm text-muted-foreground">
            Recorded {formatDate(existing.created_at)}. This runs once — your roadmap and tracking
            are built from it.
          </p>
        </div>

        <Card>
          <CardContent className="grid gap-4 p-6 sm:grid-cols-2">
            <Field label="Mood at intake" value={`${existing.mood}/10`} />
            <Field label="Anxiety at intake" value={`${existing.anxiety}/10`} />
            <Field label="Sleep quality" value={existing.sleep_quality} />
            <Field label="Energy" value={`${existing.energy}/10`} />
            <Field
              label="Meds adherence (last 2 weeks)"
              value={MEDS_2WK_OPTIONS.find((o) => o.value === existing.meds_adherence_2wk)?.label ?? ""}
            />
            <Field
              label="Check-in cadence"
              value={CADENCE_OPTIONS.find((o) => o.value === existing.cadence)?.label ?? ""}
            />
            <Field label="Career/work example" value={existing.career_example} full />
            <Field label="Daily structure/time example" value={existing.structure_example} full />
            <Field label="General life example" value={existing.life_example} full />
            <Field label="What's already working" value={existing.what_works} full />
            <Field label="Non-negotiables" value={existing.non_negotiables ?? ""} full />
          </CardContent>
        </Card>

        <Button
          variant="outline"
          onClick={() => {
            setForm(existing);
            setEditing(true);
          }}
        >
          Redo intake
        </Button>
      </div>
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    mutation.mutate(form, {
      onSuccess: () => {
        setEditing(false);
        router.push("/dashboard");
      },
    });
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          First-session intake
        </h1>
        <p className="text-sm text-muted-foreground">
          Runs once. Your answers build the Baseline Snapshot that unlocks tracking, check-ins, and
          the 6-month roadmap.
        </p>
      </div>

      {mutationErrorMessage && (
        <Alert variant="destructive">
          <AlertTriangle />
          <AlertTitle>Couldn&apos;t save your intake</AlertTitle>
          <AlertDescription>{mutationErrorMessage}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">1. Current baseline</CardTitle>
          <CardDescription>Mood, anxiety, sleep, energy, medication adherence.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <ScaleInput label="Mood right now" value={form.mood} onChange={(v) => setForm((f) => ({ ...f, mood: v }))} lowLabel="Low" highLabel="High" />
          <ScaleInput label="Anxiety right now" value={form.anxiety} onChange={(v) => setForm((f) => ({ ...f, anxiety: v }))} lowLabel="Calm" highLabel="High" />
          <ScaleInput label="Energy" value={form.energy} onChange={(v) => setForm((f) => ({ ...f, energy: v }))} lowLabel="Depleted" highLabel="High" />
          <div className="space-y-1.5">
            <Label htmlFor="sleep-quality">Sleep quality</Label>
            <NativeSelect
              id="sleep-quality"
              value={form.sleep_quality}
              onChange={(e) => setForm((f) => ({ ...f, sleep_quality: e.target.value as SleepQuality }))}
            >
              {SLEEP_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </NativeSelect>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="meds-adherence">Medication adherence, last 2 weeks</Label>
            <NativeSelect
              id="meds-adherence"
              value={form.meds_adherence_2wk}
              onChange={(e) =>
                setForm((f) => ({ ...f, meds_adherence_2wk: e.target.value as MedsAdherence2wk }))
              }
            >
              {MEDS_2WK_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </NativeSelect>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">2. The three areas that feel off-track</CardTitle>
          <CardDescription>One concrete recent example for each.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="career">Career / work</Label>
            <Textarea
              id="career"
              required
              placeholder="A recent, specific example — not a general feeling."
              value={form.career_example}
              onChange={(e) => setForm((f) => ({ ...f, career_example: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="structure">Daily structure / time</Label>
            <Textarea
              id="structure"
              required
              placeholder="A recent, specific example."
              value={form.structure_example}
              onChange={(e) => setForm((f) => ({ ...f, structure_example: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="life">General life — relationships, health, environment</Label>
            <Textarea
              id="life"
              required
              placeholder="Whatever you'd name here."
              value={form.life_example}
              onChange={(e) => setForm((f) => ({ ...f, life_example: e.target.value }))}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">3. What&apos;s already working</CardTitle>
          <CardDescription>
            From past treatment — so nothing solid gets rebuilt from scratch.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            required
            aria-label="What's already working"
            value={form.what_works}
            onChange={(e) => setForm((f) => ({ ...f, what_works: e.target.value }))}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">4. Non-negotiables</CardTitle>
          <CardDescription>
            Topics or approaches that have backfired before — generic positivity, over-scheduling
            that led to burnout, whatever applies.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            aria-label="Non-negotiables"
            value={form.non_negotiables ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, non_negotiables: e.target.value }))}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">5. Check-in cadence</CardTitle>
          <CardDescription>Pick something realistic given the job.</CardDescription>
        </CardHeader>
        <CardContent>
          <NativeSelect
            aria-label="Check-in cadence"
            value={form.cadence}
            onChange={(e) => setForm((f) => ({ ...f, cadence: e.target.value as BaselineCadence }))}
          >
            {CADENCE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </NativeSelect>
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? "Saving…" : "Save baseline & build roadmap"}
        </Button>
        {editing && (
          <Button type="button" variant="outline" onClick={() => setEditing(false)}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}

function Field({ label, value, full }: { label: string; value: string; full?: boolean }) {
  return (
    <div className={full ? "sm:col-span-2" : undefined}>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm text-foreground">{value || "—"}</p>
    </div>
  );
}
