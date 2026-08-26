import type { Metadata } from "next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Terms of Use",
  description: "Acceptable use, the medical disclaimer, and account responsibilities.",
};

export default function TermsPage() {
  return (
    <div className="-mx-4 -my-8 bg-grid px-4 py-12 sm:px-6 sm:py-16">
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Terms of Use
          </h1>
          <p className="text-sm text-muted-foreground">
            Short and specific on purpose — this is a small tool, not an enterprise product.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Medical disclaimer</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-relaxed text-foreground">
            <p>
              This tool does not diagnose ADHD, OCD, or anything else, and it does not prescribe
              or manage medication. Never start, stop, or change the dose or timing of any
              psychiatric medication based on anything in this app. Decisions about your
              treatment belong to your prescriber or therapist — use this tool to support that
              relationship, not to override it. If you are in crisis, go to the{" "}
              <a href="/safety" className="underline underline-offset-2 hover:text-primary">
                Safety
              </a>{" "}
              page, not this workflow.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Acceptable use</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-relaxed text-foreground">
            <p>
              Use this tool for your own personal tracking and CBT-based accountability. Don&apos;t
              use it to store or transmit anything unlawful, don&apos;t try to break, scrape, or
              overload the service, and don&apos;t use it in place of professional medical or
              mental health care.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Account responsibilities</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-relaxed text-foreground">
            <ul className="list-inside list-disc space-y-1.5">
              <li>Give accurate information when you create your account.</li>
              <li>One account per person — don&apos;t share logins or create accounts for others.</li>
              <li>
                Keep your credentials secure. You&apos;re responsible for activity that happens
                under your account.
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Limitation of liability</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-relaxed text-foreground">
            <p>
              This tool is provided as-is, without warranties of any kind. We work to keep it
              reliable and your data safe, but we can&apos;t guarantee the service will be
              uninterrupted or error-free. To the extent the law allows, we&apos;re not liable
              for indirect or consequential damages arising from your use of this tool. Nothing
              here limits liability where the law doesn&apos;t allow it to be limited.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Contact</CardTitle>
          </CardHeader>
          <CardContent className="text-sm leading-relaxed text-foreground">
            <p>
              Questions about these terms can be sent through the contact channel listed in your
              account settings once you&apos;re signed in.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
