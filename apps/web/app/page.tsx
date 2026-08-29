import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Brain,
  Calendar,
  ClipboardCheck,
  ListChecks,
  Moon,
  ShieldCheck,
  Target,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Therapist — CBT Accountability for ADHD & OCD",
  description:
    "A structured CBT-based accountability platform for ADHD and OCD: intake, daily/weekly tracking across 6 categories, and a gated 6-month roadmap — built to work alongside your existing treatment.",
  robots: { index: true, follow: true },
};

const CATEGORIES: { icon: React.ComponentType<{ className?: string }>; name: string; description: string }[] = [
  {
    icon: Moon,
    name: "Sleep & medication",
    description: "Timing-sensitive tracking — missed or shifted doses show up fast in focus and mood.",
  },
  {
    icon: Zap,
    name: "Executive function",
    description: "Task initiation, externalized capture, and time-blocking scaffolds for ADHD.",
  },
  {
    icon: ShieldCheck,
    name: "Compulsion & ERP",
    description: "Move up a fear/compulsion hierarchy in small, defined exposure steps.",
  },
  {
    icon: Brain,
    name: "Mood & anxiety",
    description: "Daily numbers that make a trend visible instead of relying on memory.",
  },
  {
    icon: Target,
    name: "Behavioral activation",
    description: "Scheduled, graded reward-generating activity — motivation follows action.",
  },
  {
    icon: ListChecks,
    name: "Distortion awareness",
    description: "Name the cognitive distortion, test it against evidence, replace it.",
  },
];

const LOOP_STEPS: { icon: React.ComponentType<{ className?: string }>; title: string; description: string }[] = [
  {
    icon: ClipboardCheck,
    title: "Intake",
    description: "A one-time baseline snapshot that builds your tracking setup and roadmap.",
  },
  {
    icon: Calendar,
    title: "Daily tracking",
    description: "Quick, structured check-ins across the categories that matter for your patterns.",
  },
  {
    icon: Target,
    title: "Gated roadmap",
    description: "A phased 6-month plan — each phase has a real metric, and skipping ahead isn't allowed.",
  },
];

export default function LandingPage() {
  return (
    <div className="-mx-4 -my-8">
      {/* ─── Hero ─── */}
      <section className="bg-grid px-4 py-16 sm:px-6 sm:py-24">
        <div className="max-w-3xl space-y-6">
          <span className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-link">
            CBT-based accountability, built for ADHD &amp; OCD
          </span>
          <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-6xl">
            Structure the days willpower alone can&apos;t carry.
          </h1>
          <p className="max-w-2xl text-lg leading-relaxed text-muted-foreground">
            Therapist is a structured accountability layer for people managing ADHD and/or OCD who
            are stable but stuck — functional, maybe already medicated or in therapy, but with
            slowed motivation, disorganized time, or avoidance loops keeping a trajectory off
            track. It sits alongside your real treatment. It never replaces it.
          </p>
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Button asChild size="lg">
              <Link href="/signup">
                Get started <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/login">Log in</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ─── Core loop ─── */}
      <section className="px-4 py-14 sm:px-6">
        <div className="max-w-5xl space-y-8">
          <div className="max-w-2xl space-y-2">
            <h2 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
              One loop, repeated deliberately
            </h2>
            <p className="text-base leading-relaxed text-muted-foreground">
              No improvising. The same structure, every cycle.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {LOOP_STEPS.map((step, i) => (
              <Card key={step.title} className="relative">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <step.icon className="size-5 text-link" aria-hidden="true" />
                    <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Step {i + 1}
                    </span>
                  </div>
                  <CardTitle className="text-lg">{step.title}</CardTitle>
                  <CardDescription>{step.description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ─── 6 tracking categories ─── */}
      <section className="bg-grid px-4 py-14 sm:px-6">
        <div className="max-w-5xl space-y-8">
          <div className="max-w-2xl space-y-2">
            <h2 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
              Six categories, tracked with precision
            </h2>
            <p className="text-base leading-relaxed text-muted-foreground">
              Daily or weekly, on a cadence you choose. Each category feeds the roadmap that runs
              off your actual logged data — not vague intentions.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {CATEGORIES.map((c) => (
              <Card key={c.name}>
                <CardHeader>
                  <c.icon className="size-5 text-link" aria-hidden="true" />
                  <CardTitle className="text-base">{c.name}</CardTitle>
                  <CardDescription>{c.description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Methodology ─── */}
      <section className="px-4 py-14 sm:px-6">
        <div className="max-w-3xl space-y-6">
          <h2 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
            Built on CBT and ERP, not vibes
          </h2>
          <p className="text-base leading-relaxed text-muted-foreground">
            Every check-in applies one real Cognitive Behavioral Therapy technique with
            precision — cognitive restructuring, behavioral activation, graded exposure and
            response prevention (ERP) for OCD, and executive-function scaffolding for ADHD. The
            6-month roadmap is a hard gate: you can&apos;t silently skip ahead because a day felt
            good, and a rough stretch doesn&apos;t erase progress already logged. Each phase has
            its own metric, and moving forward means actually meeting it.
          </p>
          <p className="text-sm leading-relaxed text-muted-foreground">
            This is not a psychiatrist, a therapist, or a crisis service. It does not diagnose,
            prescribe, or adjust medication — see the{" "}
            <Link href="/about" className="underline underline-offset-2 hover:text-link">
              About
            </Link>{" "}
            page for the full picture, or{" "}
            <Link href="/safety" className="underline underline-offset-2 hover:text-link">
              Safety
            </Link>{" "}
            if you need help right now.
          </p>
        </div>
      </section>

      {/* ─── Closing CTA ─── */}
      <section className="bg-grid px-4 py-16 sm:px-6 sm:py-20">
        <div className="max-w-2xl space-y-5 text-center sm:mx-auto sm:text-center">
          <h2 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
            Start with the intake. It only runs once.
          </h2>
          <p className="text-base leading-relaxed text-muted-foreground">
            Your baseline snapshot builds the tracking and roadmap that everything else runs
            from.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg">
              <Link href="/signup">
                Create your account <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/about">Read more about it</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
