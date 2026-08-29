import type { Metadata } from "next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "What data this tool collects, how it's stored, and what rights you have over it.",
  robots: { index: true, follow: true },
};

export default function PolicyPage() {
  return (
    <div className="-mx-4 -my-8 bg-grid px-4 py-12 sm:px-6 sm:py-16">
      <div className="max-w-3xl space-y-6">
        <div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
            Privacy Policy
          </h1>
          <p className="text-base leading-relaxed text-muted-foreground">
            Plain-language summary of what we collect, how it&apos;s stored, and what you can do
            about it.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">What we collect</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-base leading-relaxed text-foreground">
            <ul className="list-inside list-disc space-y-1.5">
              <li>Your email address, used to create and secure your account.</li>
              <li>
                Account and authentication data — including data from Google sign-in, if you use
                it, limited to your name, email, and profile identifier.
              </li>
              <li>
                The tracking and check-in data you enter yourself: mood, sleep, medication
                adherence notes, roadmap progress, and any free-text you write into intake or
                check-in fields. This is health-adjacent information, and we treat it as
                sensitive by default.
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">How it&apos;s stored</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-base leading-relaxed text-foreground">
            <p>
              This is a change from an earlier version of this tool, which kept all data
              client-side in your browser&apos;s local storage and sent nothing to a server.
              That is no longer the case: this version uses a real account system, and your
              data — including the check-in and tracking data above — is now stored server-side
              in a PostgreSQL database. We want to be direct about that, since it&apos;s
              health-adjacent information and the change is meaningful.
            </p>
            <p>
              Data at rest is encrypted by our hosting provider&apos;s infrastructure. We do not
              sell your data, and we do not share it with third parties for advertising or
              marketing purposes, ever. Access is limited to what&apos;s needed to operate the
              service.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Your rights</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-base leading-relaxed text-foreground">
            <ul className="list-inside list-disc space-y-1.5">
              <li>
                You can request an export of your data — your account details and everything
                you&apos;ve tracked.
              </li>
              <li>
                You can request deletion of your account and all associated data at any time.
                Once processed, this is permanent and cannot be undone.
              </li>
              <li>
                You can stop using the tool at any point without losing anything before you
                choose to delete it.
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">What this is not</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-base leading-relaxed text-foreground">
            <p>
              This product does not provide medical or clinical services, and it is not a
              HIPAA-covered entity — we are not a healthcare provider, health plan, or
              clearinghouse, and this policy should not be read as a claim of HIPAA or any other
              clinical-data compliance certification. It is a self-tracking and accountability
              tool. If you have clinical needs, an active crisis, or questions about diagnosis or
              medication, those belong with your actual prescriber or therapist — not with this
              tool or this policy.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Questions about this policy</CardTitle>
          </CardHeader>
          <CardContent className="text-base leading-relaxed text-foreground">
            <p>
              If you have questions about this policy or want to exercise any of the rights
              above, reach out through the contact channel listed in your account, or via the
              details on the{" "}
              <a href="/terms" className="underline underline-offset-2 hover:text-link">
                Terms
              </a>{" "}
              page.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
