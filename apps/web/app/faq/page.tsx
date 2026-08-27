import type { Metadata } from "next";
import { Card, CardContent } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionPanel,
  AccordionTrigger,
} from "@/components/ui/accordion";

export const metadata: Metadata = {
  title: "FAQ",
  description: "Common questions about how this tool works, what it isn't, and your data.",
  robots: { index: true, follow: true },
};

const FAQS: { id: string; question: string; answer: React.ReactNode }[] = [
  {
    id: "not-a-replacement",
    question: "Is this a replacement for therapy or medication management?",
    answer: (
      <p>
        No. This tool does not diagnose, prescribe, or adjust medication, and it does not
        deliver therapy. It&apos;s an accountability layer that sits alongside your prescriber
        or therapist — never instead of them.
      </p>
    ),
  },
  {
    id: "data-if-i-stop",
    question: "What happens to my data if I stop using the app?",
    answer: (
      <p>
        Your data stays in your account exactly as you left it — nothing is deleted just because
        you stop logging in. If you want it gone, you can request account and data deletion at
        any time, and that&apos;s permanent once processed.
      </p>
    ),
  },
  {
    id: "why-hard-gates",
    question: "Why does the app sometimes block me from moving to the next step?",
    answer: (
      <p>
        The roadmap is phased on purpose: today&apos;s check-in has to be logged before the next
        thing unlocks. That&apos;s not a punishment — it&apos;s designed to catch avoidance,
        which is a common pattern with ADHD and OCD, before it turns into silently skipping
        ahead. If a phase&apos;s metric genuinely isn&apos;t met yet, the tool holds there
        instead of letting momentum outrun the work.
      </p>
    ),
  },
  {
    id: "adhd-or-ocd",
    question: "Is this specific to ADHD, OCD, or both?",
    answer: (
      <p>
        Both. The check-ins, CBT tools, and roadmap are built around the patterns common to ADHD
        and OCD — things like avoidance loops, time disorganization, and compulsive or
        distortion-driven thinking — and can be used whether you manage one condition or both.
      </p>
    ),
  },
  {
    id: "crisis-right-now",
    question: "What if I'm having a mental health crisis right now?",
    answer: (
      <p>
        Stop here and go to the{" "}
        <a href="/safety" className="underline underline-offset-2 hover:text-primary">
          Safety
        </a>{" "}
        page. It has a direct call button and steps for genuine crisis situations — this FAQ
        isn&apos;t the place for that.
      </p>
    ),
  },
  {
    id: "export-data",
    question: "Can I export my data?",
    answer: (
      <p>
        Yes. You can request an export of your account details and everything you&apos;ve
        tracked at any time.
      </p>
    ),
  },
  {
    id: "does-it-diagnose",
    question: "Does this diagnose me with anything?",
    answer: (
      <p>
        No. It doesn&apos;t diagnose ADHD, OCD, or any other condition. Diagnosis is a clinical
        judgment that belongs to a qualified professional, not to a tracking tool.
      </p>
    ),
  },
  {
    id: "data-security",
    question: "How is my data secured?",
    answer: (
      <p>
        Your account and check-in data are stored in a PostgreSQL database behind a real
        authentication system, encrypted at rest by our hosting provider. We don&apos;t sell it
        or share it with third parties for advertising. See the{" "}
        <a href="/policy" className="underline underline-offset-2 hover:text-primary">
          Privacy Policy
        </a>{" "}
        for the full picture.
      </p>
    ),
  },
  {
    id: "hipaa",
    question: "Is this HIPAA-compliant or run by a healthcare provider?",
    answer: (
      <p>
        No. This is a self-tracking and accountability tool, not a healthcare provider, and it
        isn&apos;t a HIPAA-covered entity. If you have clinical needs, those belong with your
        actual prescriber or therapist.
      </p>
    ),
  },
];

export default function FaqPage() {
  return (
    <div className="-mx-4 -my-8 bg-grid px-4 py-12 sm:px-6 sm:py-16">
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Frequently asked questions
          </h1>
          <p className="text-sm text-muted-foreground">
            If your question isn&apos;t here, the{" "}
            <a href="/about" className="underline underline-offset-2 hover:text-primary">
              About
            </a>{" "}
            and{" "}
            <a href="/policy" className="underline underline-offset-2 hover:text-primary">
              Privacy Policy
            </a>{" "}
            pages have more detail.
          </p>
        </div>

        <Card>
          <CardContent className="p-2">
            <Accordion>
              {FAQS.map((f) => (
                <AccordionItem key={f.id} value={f.id} className="px-4">
                  <AccordionTrigger>{f.question}</AccordionTrigger>
                  <AccordionPanel>
                    <AccordionContent className="space-y-1">{f.answer}</AccordionContent>
                  </AccordionPanel>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
