import type { Metadata } from "next";
import { Phone } from "lucide-react";
import {
  CRISIS,
  CRISIS_STEPS,
  CRISIS_TRIGGERS,
  MEDICATION_RULE,
  NOT_A_CRISIS_NOTE,
} from "@/lib/constants";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export const metadata: Metadata = {
  title: "Safety",
};

// Styled to match buttonVariants({ variant: "destructive", size: "xl" }) without importing
// from components/ui/button.tsx — that module is a Client Component, and this page stays a
// Server Component so it can export page-specific metadata.
const CALL_BUTTON_CLASS =
  "inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-xl border border-transparent bg-destructive px-8 py-3 text-center text-base leading-tight font-medium text-white transition-all outline-none select-none hover:bg-destructive/90 focus-visible:ring-2 focus-visible:ring-ring/50 active:translate-y-px min-h-12 [&_svg]:pointer-events-none [&_svg]:shrink-0";

export default function SafetyPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Safety</h1>
        <p className="text-sm text-muted-foreground">
          This overrides every other part of this tool, including check-ins and homework.
        </p>
      </div>

      <Card className="border-destructive/40 bg-destructive/5">
        <CardHeader>
          <CardTitle className="text-destructive">Call now</CardTitle>
          <CardDescription>{CRISIS.helplineNote}</CardDescription>
        </CardHeader>
        <CardContent>
          <a href={CRISIS.helplineTel} className={CALL_BUTTON_CLASS}>
            <Phone className="size-5" /> Call {CRISIS.helplineNumber} — {CRISIS.helplineName}
          </a>
          <p className="mt-3 text-sm text-muted-foreground">
            Also call the doctor who manages your medication, and a trusted person if there is
            one you&apos;d loop in.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">When this page is for you</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="list-inside list-disc space-y-1.5 text-sm text-foreground">
            {CRISIS_TRIGGERS.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Alert>
        <AlertTitle>Not every bad day belongs here</AlertTitle>
        <AlertDescription>{NOT_A_CRISIS_NOTE}</AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">What happens on a genuine trigger</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="list-inside list-decimal space-y-2 text-sm text-foreground">
            {CRISIS_STEPS.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Medication</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-foreground">{MEDICATION_RULE}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">What this tool is</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-foreground">
            A structured behavioral coaching tool built around CBT technique — not a
            psychiatrist, not a crisis service. It doesn&apos;t diagnose, prescribe, or adjust
            medication. It&apos;s an accountability layer around existing treatment, for
            stable-but-stuck days. Genuine risk goes to the call above, not to a thought record.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
