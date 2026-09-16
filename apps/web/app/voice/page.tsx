"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Loader2 } from "lucide-react";
import { useBaseline } from "@/lib/api";
import {
  useEndVoiceSession,
  useStartVoiceSession,
  useVoiceQuota,
  synthesizeSpeech,
  type TherapySessionOut,
} from "@/lib/voice";
import { VoiceWebSocket, type VoiceServerMessage } from "@/lib/voice-ws";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { RequireBaselineNotice } from "@/components/require-baseline";
import { AiDisclosureBanner } from "@/components/voice/ai-disclosure-banner";
import { RecorderButton } from "@/components/voice/recorder-button";
import { TranscriptView, type TranscriptTurnView } from "@/components/voice/transcript-view";

function playAudioBlob(blob: Blob) {
  const url = URL.createObjectURL(blob);
  const audio = new Audio(url);
  audio.onended = () => URL.revokeObjectURL(url);
  void audio.play().catch(() => {
    // Autoplay can be blocked before the first user gesture - not fatal,
    // the transcript is still visible either way.
  });
}

function speakWithBrowserVoice(text: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  window.speechSynthesis.speak(new SpeechSynthesisUtterance(text));
}

async function speak(text: string) {
  const audio = await synthesizeSpeech(text);
  if (audio) {
    playAudioBlob(audio);
  } else {
    speakWithBrowserVoice(text);
  }
}

export default function VoicePage() {
  const baseline = useBaseline();
  const quota = useVoiceQuota();
  const startSession = useStartVoiceSession();
  const endSession = useEndVoiceSession();

  const [session, setSession] = useState<TherapySessionOut | null>(null);
  const [turns, setTurns] = useState<TranscriptTurnView[]>([]);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [crisisFlagged, setCrisisFlagged] = useState(false);
  const wsRef = useRef<VoiceWebSocket | null>(null);
  const currentReplyRef = useRef("");

  const handleServerMessage = useCallback((message: VoiceServerMessage) => {
    if (message.type === "reply_token") {
      currentReplyRef.current += message.text;
      setTurns((prev) => {
        const next = [...prev];
        const last = next[next.length - 1];
        if (last && last.role === "assistant" && !last.isCrisis) {
          next[next.length - 1] = { ...last, text: currentReplyRef.current };
        } else {
          next.push({ role: "assistant", text: currentReplyRef.current });
        }
        return next;
      });
    } else if (message.type === "reply_done") {
      const finalText = currentReplyRef.current;
      currentReplyRef.current = "";
      if (finalText) void speak(finalText);
    } else if (message.type === "crisis_flag") {
      setCrisisFlagged(true);
      setTurns((prev) => [...prev, { role: "assistant", text: message.text, isCrisis: true }]);
      void speak(message.text);
    } else if (message.type === "error") {
      setConnectionError(message.detail);
    }
  }, []);

  useEffect(() => {
    return () => {
      wsRef.current?.close();
    };
  }, []);

  async function handleStart() {
    const newSession = await startSession.mutateAsync();
    setSession(newSession);
    setTurns([]);
    setCrisisFlagged(false);
    setConnectionError(null);

    const ws = new VoiceWebSocket();
    wsRef.current = ws;
    ws.connect(newSession.id, {
      onMessage: handleServerMessage,
      onError: () => setConnectionError("Lost connection to the conversation. Try starting a new session."),
    });
  }

  function handleTranscriptChunk(text: string) {
    setTurns((prev) => [...prev, { role: "user", text }]);
    wsRef.current?.sendTranscriptChunk(text);
  }

  async function handleEnd() {
    wsRef.current?.close();
    wsRef.current = null;
    if (session) {
      await endSession.mutateAsync(session.id);
    }
    setSession(null);
    setTurns([]);
  }

  if (baseline.isPending) {
    return (
      <div className="mx-auto max-w-2xl space-y-4" role="status" aria-label="Loading">
        <div className="h-8 w-40 animate-pulse rounded-sm bg-muted" />
        <div className="h-64 animate-pulse rounded-sm border border-border bg-muted/40" />
      </div>
    );
  }

  if (!baseline.data) {
    return <RequireBaselineNotice />;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
          Voice Check-In
        </h1>
        <p className="text-sm text-muted-foreground">
          A spoken conversation, grounded in the same CBT framework as the rest of this app.
        </p>
      </div>

      <AiDisclosureBanner />

      {crisisFlagged && (
        <Alert variant="destructive">
          <AlertTriangle className="size-4" aria-hidden="true" />
          <AlertTitle>This needs more than a conversation</AlertTitle>
          <AlertDescription>
            Go to{" "}
            <Link href="/safety" className="underline underline-offset-2">
              Crisis Support
            </Link>{" "}
            now.
          </AlertDescription>
        </Alert>
      )}

      {connectionError && (
        <Alert variant="destructive">
          <AlertTriangle className="size-4" aria-hidden="true" />
          <AlertDescription>{connectionError}</AlertDescription>
        </Alert>
      )}

      {quota.data && quota.data.sessions_remaining_today <= 0 && !session && (
        <Alert variant="warning">
          <AlertTriangle className="size-4" aria-hidden="true" />
          <AlertDescription>
            You&apos;ve used today&apos;s conversation limit. Come back tomorrow.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle as="h2" className="text-base">
            {session ? "Conversation in progress" : "Start a conversation"}
          </CardTitle>
          {quota.data && (
            <CardDescription>
              {quota.data.sessions_remaining_today} session{quota.data.sessions_remaining_today === 1 ? "" : "s"} left today
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <TranscriptView turns={turns} />

          {session ? (
            <div className="space-y-3">
              <RecorderButton onFinalTranscript={handleTranscriptChunk} disabled={!!connectionError} />
              <Button variant="outline" className="w-full" onClick={handleEnd} disabled={endSession.isPending}>
                {endSession.isPending ? <Loader2 className="size-4 animate-spin" /> : "End conversation"}
              </Button>
            </div>
          ) : (
            <Button
              className="w-full"
              onClick={handleStart}
              disabled={startSession.isPending || (quota.data?.sessions_remaining_today ?? 1) <= 0}
            >
              {startSession.isPending ? <Loader2 className="size-4 animate-spin" /> : "Start talking"}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
