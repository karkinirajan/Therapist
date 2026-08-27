"use client";

import { use, useState } from "react";
import Link from "next/link";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import {
  ApiError,
  useCreateTrackingEntry,
  useTrackingCategories,
  useTrackingEntries,
  type TrackingCadence,
} from "@/lib/api";
import { DISTORTIONS } from "@/lib/constants";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { NativeSelect } from "@/components/native-select";
import { ScaleInput } from "@/components/scale-input";
import { cn, formatDate } from "@/lib/utils";

// --- per-(category, cadence) form field configuration ---------------------
// Mirrors the discriminated payload shapes in apps/api/app/schemas/tracking.py.
// There's no server-provided field-schema endpoint (categories only carry
// id/key/label/description/sort_order/is_blocking), so this structure has to
// live client-side — but the category list itself is always fetched, never
// hardcoded.

type FieldDef =
  | { kind: "text"; name: string; label: string; placeholder?: string; optional?: boolean }
  | { kind: "textarea"; name: string; label: string; placeholder?: string; optional?: boolean }
  | { kind: "int"; name: string; label: string; min?: number; optional?: boolean }
  | { kind: "float"; name: string; label: string; min?: number; max?: number; optional?: boolean }
  | { kind: "pct"; name: string; label: string; optional?: boolean }
  | { kind: "scale"; name: string; label: string; min: number; max: number }
  | { kind: "bool"; name: string; label: string }
  | { kind: "select"; name: string; label: string; options: { value: string; label: string }[] }
  | { kind: "distortions"; name: string; label: string }
  | { kind: "stringlist"; name: string; label: string; placeholder?: string };

const SLEEP_Q_OPTIONS = [
  { value: "poor", label: "Poor" },
  { value: "fair", label: "Fair" },
  { value: "good", label: "Good" },
  { value: "great", label: "Great" },
];

const CATEGORY_FORMS: Record<string, Record<TrackingCadence, FieldDef[]>> = {
  executive_function: {
    daily: [
      { kind: "bool", name: "task_initiated", label: "Initiated the planned task today" },
      { kind: "int", name: "planned_count", label: "Tasks planned", min: 0 },
      { kind: "int", name: "completed_count", label: "Tasks completed", min: 0 },
      { kind: "bool", name: "took_longer_than_planned", label: "Took longer than planned" },
    ],
    weekly: [
      { kind: "pct", name: "planning_accuracy_pct", label: "Planning accuracy" },
      { kind: "textarea", name: "blocker_note", label: "Biggest blocker this week" },
    ],
    monthly: [
      {
        kind: "select",
        name: "completion_rate_trend",
        label: "Completion-rate trend",
        options: [
          { value: "up", label: "Up" },
          { value: "flat", label: "Flat" },
          { value: "down", label: "Down" },
        ],
      },
      { kind: "textarea", name: "scaffolding_usage_note", label: "Scaffolding usage note" },
    ],
  },
  compulsion_erp: {
    daily: [
      { kind: "int", name: "compulsions_resisted", label: "Compulsions resisted", min: 0 },
      { kind: "int", name: "compulsions_performed", label: "Compulsions performed", min: 0 },
      { kind: "pct", name: "suds_before", label: "SUDS before (optional)", optional: true },
      { kind: "pct", name: "suds_after", label: "SUDS after (optional)", optional: true },
      {
        kind: "select",
        name: "intrusive_thought_band",
        label: "Intrusive thought intensity",
        options: [
          { value: "none", label: "None" },
          { value: "low", label: "Low" },
          { value: "moderate", label: "Moderate" },
          { value: "high", label: "High" },
        ],
      },
    ],
    weekly: [
      { kind: "textarea", name: "hierarchy_progress_note", label: "Hierarchy progress note" },
      { kind: "textarea", name: "suds_decay_note", label: "SUDS decay note" },
    ],
    monthly: [
      { kind: "pct", name: "hierarchy_completion_pct", label: "Hierarchy completion" },
      { kind: "textarea", name: "new_themes_note", label: "New themes note" },
    ],
  },
  mood_anxiety: {
    daily: [
      { kind: "scale", name: "mood", label: "Mood", min: 1, max: 10 },
      { kind: "scale", name: "anxiety", label: "Anxiety", min: 1, max: 10 },
      { kind: "select", name: "sleep_quality", label: "Sleep quality", options: SLEEP_Q_OPTIONS },
      { kind: "bool", name: "panic_or_shutdown", label: "Panic or shutdown episode today" },
    ],
    weekly: [
      { kind: "float", name: "mood_avg", label: "Average mood (1-10)", min: 1, max: 10 },
      { kind: "float", name: "anxiety_avg", label: "Average anxiety (1-10)", min: 1, max: 10 },
      { kind: "textarea", name: "volatility_note", label: "Volatility note" },
    ],
    monthly: [{ kind: "textarea", name: "trend_note", label: "Trend note" }],
  },
  behavioral_activation: {
    daily: [
      { kind: "text", name: "activity", label: "Activity" },
      { kind: "text", name: "value_link", label: "Value it connects to" },
      { kind: "int", name: "predicted_mood_delta", label: "Predicted mood delta" },
      {
        kind: "int",
        name: "actual_mood_delta",
        label: "Actual mood delta (optional)",
        optional: true,
      },
    ],
    weekly: [
      {
        kind: "stringlist",
        name: "domains_covered",
        label: "Domains covered",
        placeholder: "One per line, e.g. Work, Social, Health",
      },
      {
        kind: "stringlist",
        name: "neglected_domains",
        label: "Neglected domains",
        placeholder: "One per line",
      },
    ],
    monthly: [{ kind: "textarea", name: "neglect_trend_note", label: "Neglect trend note" }],
  },
  sleep_meds: {
    daily: [
      { kind: "select", name: "sleep_quality", label: "Sleep quality", options: SLEEP_Q_OPTIONS },
      { kind: "float", name: "sleep_hours", label: "Sleep hours (optional)", min: 0, max: 24, optional: true },
      { kind: "bool", name: "meds_taken", label: "Meds taken" },
      { kind: "text", name: "meds_time", label: "Meds time (optional)", optional: true, placeholder: "e.g. 9:00 PM" },
    ],
    weekly: [
      { kind: "pct", name: "adherence_pct", label: "Adherence" },
      { kind: "textarea", name: "routine_consistency_note", label: "Routine consistency note" },
    ],
    monthly: [
      { kind: "textarea", name: "adherence_trend_note", label: "Adherence trend note" },
      { kind: "bool", name: "raise_with_prescriber", label: "Raise with prescriber" },
    ],
  },
  distortion_awareness: {
    daily: [{ kind: "distortions", name: "distortions", label: "Distortions noticed today" }],
    weekly: [
      { kind: "text", name: "most_frequent", label: "Most frequent distortion (optional)", optional: true },
      { kind: "int", name: "thought_records_completed", label: "Thought records completed", min: 0 },
    ],
    monthly: [{ kind: "textarea", name: "frequency_trend_note", label: "Frequency trend note" }],
  },
};

const CADENCES: TrackingCadence[] = ["daily", "weekly", "monthly"];

function defaultValueFor(field: FieldDef): unknown {
  switch (field.kind) {
    case "bool":
      return false;
    case "scale":
      return Math.round((field.min + field.max) / 2);
    case "pct":
      return field.optional ? "" : 0;
    case "int":
    case "float":
      return field.optional ? "" : 0;
    case "select":
      return field.options[0]?.value ?? "";
    case "stringlist":
    case "distortions":
      return [] as string[];
    case "text":
    case "textarea":
    default:
      return "";
  }
}

function buildInitialState(fields: FieldDef[]): Record<string, unknown> {
  return Object.fromEntries(fields.map((f) => [f.name, defaultValueFor(f)]));
}

function buildPayload(fields: FieldDef[], state: Record<string, unknown>): Record<string, unknown> {
  const payload: Record<string, unknown> = {};
  for (const field of fields) {
    const raw = state[field.name];
    switch (field.kind) {
      case "int":
      case "pct":
        payload[field.name] = raw === "" || raw === null || raw === undefined ? null : Number(raw);
        break;
      case "float":
        payload[field.name] = raw === "" || raw === null || raw === undefined ? null : Number(raw);
        break;
      case "bool":
        payload[field.name] = Boolean(raw);
        break;
      case "text":
      case "textarea":
        payload[field.name] = field.optional && raw === "" ? null : String(raw ?? "");
        break;
      case "select":
      case "scale":
        payload[field.name] = field.kind === "scale" ? Number(raw) : String(raw ?? "");
        break;
      case "stringlist":
      case "distortions":
        payload[field.name] = Array.isArray(raw) ? raw : [];
        break;
    }
  }
  return payload;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function periodStartFor(cadence: TrackingCadence): string {
  const now = new Date();
  if (cadence === "daily") return todayIso();
  if (cadence === "monthly") {
    return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  }
  // weekly: most recent Monday
  const day = now.getDay(); // 0 = Sunday
  const diff = (day + 6) % 7; // days since Monday
  const monday = new Date(now);
  monday.setDate(now.getDate() - diff);
  return monday.toISOString().slice(0, 10);
}

export default function TrackingCategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category: categoryKey } = use(params);
  const categories = useTrackingCategories();
  const [cadence, setCadence] = useState<TrackingCadence>("daily");

  if (categories.isPending) {
    return (
      <div className="space-y-4" role="status" aria-label="Loading category">
        <div className="h-8 w-56 animate-pulse rounded bg-muted" />
        <div className="h-64 animate-pulse rounded-lg border border-border bg-muted/40" />
      </div>
    );
  }

  if (categories.isError) {
    return (
      <Alert variant="destructive">
        <AlertTriangle />
        <AlertTitle>Couldn&apos;t load tracking categories</AlertTitle>
        <AlertDescription>{categories.error.message}</AlertDescription>
      </Alert>
    );
  }

  const category = categories.data?.find((c) => c.key === categoryKey);

  if (!category) {
    return (
      <Alert variant="destructive">
        <AlertTriangle />
        <AlertTitle>Unknown tracking category</AlertTitle>
        <AlertDescription>
          &quot;{categoryKey}&quot; isn&apos;t a recognized tracking category.{" "}
          <Link href="/dashboard" className="font-medium underline underline-offset-2">
            Back to dashboard
          </Link>
        </AlertDescription>
      </Alert>
    );
  }

  const fields = CATEGORY_FORMS[category.key]?.[cadence] ?? [];

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{category.label}</h1>
        <p className="text-sm text-muted-foreground">{category.description}</p>
      </div>

      <div className="flex gap-2" role="tablist" aria-label="Cadence">
        {CADENCES.map((c) => (
          <button
            key={c}
            type="button"
            role="tab"
            aria-selected={cadence === c}
            onClick={() => setCadence(c)}
            className={cn(
              "rounded-md border px-3 py-1.5 text-sm font-medium capitalize transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
              cadence === c
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:bg-muted",
            )}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Keyed by cadence so switching tabs remounts the form with fresh
          per-cadence defaults instead of syncing state in an effect. */}
      <CategoryEntryForm key={cadence} categoryKey={category.key} cadence={cadence} fields={fields} />

      <RecentEntries categoryKey={category.key} cadence={cadence} />
    </div>
  );
}

function CategoryEntryForm({
  categoryKey,
  cadence,
  fields,
}: {
  categoryKey: string;
  cadence: TrackingCadence;
  fields: FieldDef[];
}) {
  const createEntry = useCreateTrackingEntry();
  const [state, setState] = useState<Record<string, unknown>>(() => buildInitialState(fields));
  const [savedAt, setSavedAt] = useState<number | null>(null);

  function setField(name: string, value: unknown) {
    setState((s) => ({ ...s, [name]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = buildPayload(fields, state);
    createEntry.mutate(
      { category_key: categoryKey, cadence, period_start: periodStartFor(cadence), payload },
      { onSuccess: () => setSavedAt(Date.now()) },
    );
  }

  const errorMessage =
    createEntry.error instanceof ApiError
      ? createEntry.error.message
      : createEntry.error
        ? "Something went wrong saving this entry. Please try again."
        : null;

  if (fields.length === 0) {
    return (
      <Alert>
        <AlertTitle>No form defined for this cadence yet</AlertTitle>
        <AlertDescription>Try a different cadence tab.</AlertDescription>
      </Alert>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base capitalize">{cadence} entry</CardTitle>
        <CardDescription>
          Period start: {formatDate(periodStartFor(cadence))}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {errorMessage && (
          <Alert variant="destructive" className="mb-4">
            <AlertTriangle />
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        )}
        {savedAt && !createEntry.isPending && (
          <Alert variant="success" className="mb-4">
            <CheckCircle2 />
            <AlertDescription>Entry saved.</AlertDescription>
          </Alert>
        )}
        <form onSubmit={handleSubmit} className="space-y-5">
          {fields.map((field) => (
            <FieldInput key={field.name} field={field} value={state[field.name]} onChange={(v) => setField(field.name, v)} />
          ))}
          <Button type="submit" className="w-full" disabled={createEntry.isPending}>
            {createEntry.isPending ? "Saving…" : "Save entry"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function FieldInput({
  field,
  value,
  onChange,
}: {
  field: FieldDef;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  const id = `field-${field.name}`;

  switch (field.kind) {
    case "bool":
      return (
        <div className="flex items-center justify-between">
          <Label htmlFor={id}>{field.label}</Label>
          <Switch id={id} checked={Boolean(value)} onCheckedChange={onChange} />
        </div>
      );
    case "scale":
      return (
        <ScaleInput
          label={field.label}
          min={field.min}
          max={field.max}
          value={Number(value)}
          onChange={onChange}
        />
      );
    case "pct":
      return (
        <ScaleInput
          label={field.label}
          min={0}
          max={100}
          value={value === "" || value === null ? 0 : Number(value)}
          onChange={onChange}
        />
      );
    case "int":
    case "float":
      return (
        <div className="space-y-1.5">
          <Label htmlFor={id}>{field.label}</Label>
          <Input
            id={id}
            type="number"
            inputMode="numeric"
            min={field.min}
            max={field.kind === "float" ? field.max : undefined}
            step={field.kind === "float" ? "any" : 1}
            required={!field.optional}
            value={value === null || value === undefined ? "" : String(value)}
            onChange={(e) => onChange(e.target.value)}
          />
        </div>
      );
    case "select":
      return (
        <div className="space-y-1.5">
          <Label htmlFor={id}>{field.label}</Label>
          <NativeSelect id={id} value={String(value ?? "")} onChange={(e) => onChange(e.target.value)}>
            {field.options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </NativeSelect>
        </div>
      );
    case "text":
      return (
        <div className="space-y-1.5">
          <Label htmlFor={id}>{field.label}</Label>
          <Input
            id={id}
            required={!field.optional}
            placeholder={field.placeholder}
            value={String(value ?? "")}
            onChange={(e) => onChange(e.target.value)}
          />
        </div>
      );
    case "textarea":
      return (
        <div className="space-y-1.5">
          <Label htmlFor={id}>{field.label}</Label>
          <Textarea
            id={id}
            required={!field.optional}
            placeholder={field.placeholder}
            value={String(value ?? "")}
            onChange={(e) => onChange(e.target.value)}
          />
        </div>
      );
    case "stringlist": {
      const list = Array.isArray(value) ? (value as string[]) : [];
      return (
        <div className="space-y-1.5">
          <Label htmlFor={id}>{field.label}</Label>
          <Textarea
            id={id}
            placeholder={field.placeholder}
            value={list.join("\n")}
            onChange={(e) =>
              onChange(
                e.target.value
                  .split("\n")
                  .map((s) => s.trim())
                  .filter(Boolean),
              )
            }
          />
        </div>
      );
    }
    case "distortions": {
      const selected = Array.isArray(value) ? (value as string[]) : [];
      return (
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium text-foreground">{field.label}</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {DISTORTIONS.map((d) => {
              const checked = selected.includes(d.name);
              const checkboxId = `${id}-${d.id}`;
              return (
                <label
                  key={d.id}
                  htmlFor={checkboxId}
                  className="flex cursor-pointer items-start gap-2 rounded-md border border-border p-2 text-sm"
                >
                  <Checkbox
                    id={checkboxId}
                    checked={checked}
                    onCheckedChange={(next) =>
                      onChange(
                        next ? [...selected, d.name] : selected.filter((n) => n !== d.name),
                      )
                    }
                  />
                  <span>{d.name}</span>
                </label>
              );
            })}
          </div>
        </fieldset>
      );
    }
    default:
      return null;
  }
}

function RecentEntries({ categoryKey, cadence }: { categoryKey: string; cadence: TrackingCadence }) {
  const entries = useTrackingEntries({ category_key: categoryKey, cadence });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Recent {cadence} entries</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {entries.isPending && <p className="text-sm text-muted-foreground">Loading…</p>}
        {entries.isError && (
          <p className="text-sm text-destructive">Couldn&apos;t load entries: {entries.error.message}</p>
        )}
        {entries.data && entries.data.length === 0 && (
          <p className="text-sm text-muted-foreground">No {cadence} entries logged yet.</p>
        )}
        {entries.data && entries.data.length > 0 && (
          <ul className="space-y-2">
            {[...entries.data]
              .sort((a, b) => b.period_start.localeCompare(a.period_start))
              .slice(0, 5)
              .map((entry) => (
                <li
                  key={entry.id}
                  className="rounded-md border border-border px-3 py-2 text-sm"
                >
                  <p className="font-medium text-foreground">{formatDate(entry.period_start)}</p>
                  <pre className="mt-1 overflow-x-auto whitespace-pre-wrap text-xs text-muted-foreground">
                    {JSON.stringify(entry.payload, null, 2)}
                  </pre>
                </li>
              ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
