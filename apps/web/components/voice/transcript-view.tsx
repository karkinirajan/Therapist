import { cn } from "@/lib/utils";

export interface TranscriptTurnView {
  role: "user" | "assistant";
  text: string;
  isCrisis?: boolean;
}

export function TranscriptView({ turns }: { turns: TranscriptTurnView[] }) {
  if (turns.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Press the microphone and start talking whenever you&apos;re ready.
      </p>
    );
  }

  return (
    <div className="space-y-3" role="log" aria-live="polite">
      {turns.map((turn, i) => (
        <div
          key={i}
          className={cn(
            "max-w-[85%] rounded-sm border px-3 py-2 text-sm leading-relaxed",
            turn.role === "user"
              ? "ml-auto border-border bg-muted text-foreground"
              : "border-border bg-card text-card-foreground",
            turn.isCrisis && "border-destructive/40 bg-destructive/10",
          )}
        >
          {turn.text}
        </div>
      ))}
    </div>
  );
}
