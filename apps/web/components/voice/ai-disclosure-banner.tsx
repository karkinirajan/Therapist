import { Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

/**
 * Required, one-time-per-session AI disclosure. Kept even though the voice
 * persona otherwise speaks in first person as a therapist and doesn't break
 * character mid-conversation — this banner is the one place that framing
 * doesn't apply, because several jurisdictions have real legal disclosure
 * requirements for AI in health-adjacent contexts. Shown once before the
 * first recording of a session, not repeated every turn.
 */
export function AiDisclosureBanner() {
  return (
    <Alert>
      <Info className="size-4" aria-hidden="true" />
      <AlertDescription>
        You&apos;re talking with an AI voice tool, not a human or a licensed therapist. It
        doesn&apos;t diagnose conditions or give medical advice. If this is a crisis, use{" "}
        <a href="/safety" className="underline underline-offset-2">
          Crisis Support
        </a>{" "}
        instead.
      </AlertDescription>
    </Alert>
  );
}
