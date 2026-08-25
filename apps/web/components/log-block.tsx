"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";

export function LogBlock({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard API unavailable — the text is still selectable manually.
    }
  }

  return (
    <div className="relative rounded-lg border border-border bg-muted/50">
      <pre className="overflow-x-auto whitespace-pre-wrap p-4 pr-14 font-mono text-xs leading-relaxed text-foreground">
        {text}
      </pre>
      <Button
        type="button"
        variant="outline"
        size="icon-sm"
        className="absolute right-2 top-2"
        onClick={handleCopy}
        aria-label="Copy log block"
      >
        {copied ? <Check className="size-3.5 text-success" /> : <Copy className="size-3.5" />}
      </Button>
    </div>
  );
}
