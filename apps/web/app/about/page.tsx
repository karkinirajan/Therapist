import type { Metadata } from "next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "About",
  description:
    "What this tool is, who it's for, and how it structures ADHD/OCD-focused CBT accountability alongside your existing treatment.",
  // Root layout defaults to noindex/nofollow (appropriate for the authenticated
  // app) - this and the other public marketing pages explicitly opt back in so
  // they're actually indexable, matching what app/robots.ts's robots.txt rules
  // already allow.
  robots: { index: true, follow: true },
};

export default function AboutPage() {
  return (
    <div className="-mx-4 -my-8 bg-grid px-4 py-12 sm:px-6 sm:py-16">
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">About</h1>
          <p className="text-base leading-relaxed text-muted-foreground">
            A CBT-based accountability layer for ADHD and OCD, built to work alongside real
            treatment — not instead of it.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">What this tool is</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-base leading-relaxed text-foreground">
            <p>
              This is a structured, Cognitive Behavioral Therapy (CBT) based coaching tool for
              people managing ADHD and/or OCD. It gives you a consistent place to check in,
              apply CBT technique with precision, and hold yourself accountable over a phased,
              multi-month recovery arc — instead of relying on willpower or memory alone.
            </p>
            <p>
              It is not a psychiatrist, not a therapist, and not a crisis service. It does not
              diagnose, prescribe, or adjust medication, and it never will. Every part of this
              tool is designed to sit on top of care you already have — a prescriber, a
              therapist, or both — never to replace it. If you don&apos;t currently have that
              care in place, this tool is not a substitute for getting it.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Who it&apos;s for</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-base leading-relaxed text-foreground">
            <p>
              It&apos;s built for someone who is stable but stuck: functional day to day,
              possibly already medicated or in therapy for ADHD or OCD, but with slowed
              motivation, disorganized time, avoidance loops, or a trajectory that feels off
              track. It is deliberately not built for acute crisis — if that&apos;s where you
              are right now, the{" "}
              <a href="/safety" className="underline underline-offset-2 hover:text-primary">
                Safety
              </a>{" "}
              page is the right place, not a check-in form.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">The philosophy</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-base leading-relaxed text-foreground">
            <p>
              Progress here is structured, not improvised. You track across several categories —
              sleep, medication adherence, mood, and the specific behaviors that matter for ADHD
              and OCD — on a daily or weekly cadence you choose. That data feeds a phased roadmap
              spanning several months, broken into small steps that are meant to compound rather
              than overwhelm.
            </p>
            <p>
              The roadmap is a hard gate, on purpose. You can&apos;t silently skip ahead to a
              later phase because a day felt good, and a rough stretch doesn&apos;t erase
              progress you&apos;ve already logged. Each phase has its own metric, and moving
              forward means actually meeting it — the tool is built to catch avoidance and
              premature acceleration, both common patterns in ADHD and OCD, not to make you feel
              behind.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">In its own words: not a substitute for treatment</CardTitle>
          </CardHeader>
          <CardContent className="text-base leading-relaxed text-foreground">
            <p>
              This tool does not diagnose ADHD or OCD, does not prescribe or adjust medication,
              and does not deliver therapy. It structures the accountability work that sits
              around treatment — the daily discipline, the tracking, the honest look at what
              actually happened this week — so that the time between sessions with your
              prescriber or therapist is used well. If something here ever conflicts with
              guidance from your actual provider, their guidance wins.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
