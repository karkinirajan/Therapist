"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useRecoveryData } from "@/lib/storage";
import {
  CADENCE_OPTIONS,
  MEDS_2WK_OPTIONS,
  SLEEP_OPTIONS,
} from "@/lib/constants";
import type { BaselineSnapshot, Cadence, MedsAdherence2wk, SleepQuality } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect } from "@/components/native-select";
import { ScaleInput } from "@/components/scale-input";
import { formatDate } from "@/lib/utils";

const EMPTY: Omit<BaselineSnapshot, "createdAt"> = {
  mood: 5,
  anxiety: 5,
  sleepQuality: "fair",
  energy: 5,
  medsAdherence2wk: "consistent",
  careerExample: "",
  structureExample: "",
  lifeExample: "",
  whatWorks: "",
  nonNegotiables: "",
  cadence: "weekly",
};

export default function IntakePage() {
  const { data, update, ready } = useRecoveryData();
  const router = useRouter();
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState(false);

  if (!ready) return null;

  const existing = data.baseline;

  if (existing && !editing) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Baseline Snapshot</h1>
          <p className="text-sm text-muted-foreground">
            Recorded {formatDate(existing.createdAt)}. This runs once — your roadmap and phase
            tracking are built from it.
          </p>
        </div>

        <Card>
          <CardContent className="grid gap-4 p-6 sm:grid-cols-2">
            <Field label="Mood at intake" value={`${existing.mood}/10`} />
            <Field label="Anxiety at intake" value={`${existing.anxiety}/10`} />
            <Field label="Sleep quality" value={existing.sleepQuality} />
            <Field label="Energy" value={`${existing.energy}/10`} />
            <Field
              label="Meds adherence (last 2 weeks)"
              value={MEDS_2WK_OPTIONS.find((o) => o.value === existing.medsAdherence2wk)?.label ?? ""}
            />
            <Field
              label="Check-in cadence"
              value={CADENCE_OPTIONS.find((o) => o.value === existing.cadence)?.label ?? ""}
            />
            <Field label="Career/work example" value={existing.careerExample} full />
            <Field label="Daily structure/time example" value={existing.structureExample} full />
            <Field label="General life example" value={existing.lifeExample} full />
            <Field label="What's already working" value={existing.whatWorks} full />
            <Field label="Non-negotiables" value={existing.nonNegotiables} full />
          </CardContent>
        </Card>

        <Button
          variant="outline"
          onClick={() => {
            setForm({ ...existing });
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
    update((d) => ({
      ...d,
      baseline: {
        ...form,
        createdAt: existing?.createdAt ?? new Date().toISOString().slice(0, 10),
      },
    }));
    router.push("/");
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          First-session intake
        </h1>
        <p className="text-sm text-muted-foreground">
          Runs once. Your answers build the Baseline Snapshot and the first draft of your
          6-month roadmap.
        </p>
      </div>

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
            <Label>Sleep quality</Label>
            <NativeSelect
              value={form.sleepQuality}
              onChange={(e) => setForm((f) => ({ ...f, sleepQuality: e.target.value as SleepQuality }))}
            >
              {SLEEP_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </NativeSelect>
          </div>
          <div className="space-y-1.5">
            <Label>Medication adherence, last 2 weeks</Label>
            <NativeSelect
              value={form.medsAdherence2wk}
              onChange={(e) =>
                setForm((f) => ({ ...f, medsAdherence2wk: e.target.value as MedsAdherence2wk }))
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
              value={form.careerExample}
              onChange={(e) => setForm((f) => ({ ...f, careerExample: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="structure">Daily structure / time</Label>
            <Textarea
              id="structure"
              required
              placeholder="A recent, specific example."
              value={form.structureExample}
              onChange={(e) => setForm((f) => ({ ...f, structureExample: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="life">General life — relationships, health, environment</Label>
            <Textarea
              id="life"
              required
              placeholder="Whatever you'd name here."
              value={form.lifeExample}
              onChange={(e) => setForm((f) => ({ ...f, lifeExample: e.target.value }))}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">3. What&apos;s already working</CardTitle>
          <CardDescription>
            From the last 6 years of treatment — so nothing solid gets rebuilt from scratch.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            required
            aria-label="What's already working"
            value={form.whatWorks}
            onChange={(e) => setForm((f) => ({ ...f, whatWorks: e.target.value }))}
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
            value={form.nonNegotiables}
            onChange={(e) => setForm((f) => ({ ...f, nonNegotiables: e.target.value }))}
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
            value={form.cadence}
            onChange={(e) => setForm((f) => ({ ...f, cadence: e.target.value as Cadence }))}
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
        <Button type="submit">Save baseline &amp; build roadmap</Button>
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
