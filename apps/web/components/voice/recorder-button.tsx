"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

// The Web Speech API has no official TypeScript lib types - minimal shape
// for what this component actually uses.
interface SpeechRecognitionResultLike {
  isFinal: boolean;
  0: { transcript: string };
}
interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
}
interface SpeechRecognitionLike extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
}

function getSpeechRecognitionCtor(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function RecorderButton({
  onFinalTranscript,
  disabled,
}: {
  onFinalTranscript: (text: string) => void;
  disabled?: boolean;
}) {
  const [supported, setSupported] = useState(true);
  const [listening, setListening] = useState(false);
  const [fallbackText, setFallbackText] = useState("");
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  useEffect(() => {
    // Browser feature detection can only run after mount (SSR has no
    // `window`) - deliberately deviates from the "don't setState directly
    // in an effect" rule for this one, unavoidable case.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSupported(getSpeechRecognitionCtor() !== null);
  }, []);

  function toggleListening() {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) return;

    if (listening) {
      recognitionRef.current?.stop();
      return;
    }

    const recognition = new Ctor();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = "en-US";
    recognition.onresult = (event) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          const text = result[0].transcript.trim();
          if (text) onFinalTranscript(text);
        }
      }
    };
    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);

    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  }

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
    };
  }, []);

  if (!supported) {
    return (
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const text = fallbackText.trim();
          if (!text) return;
          onFinalTranscript(text);
          setFallbackText("");
        }}
      >
        <Textarea
          value={fallbackText}
          onChange={(e) => setFallbackText(e.target.value)}
          placeholder="Your browser doesn't support speech input — type instead."
          disabled={disabled}
          className="min-h-[44px]"
        />
        <Button type="submit" disabled={disabled || !fallbackText.trim()} size="icon">
          <Send className="size-4" />
        </Button>
      </form>
    );
  }

  return (
    <Button
      type="button"
      onClick={toggleListening}
      disabled={disabled}
      variant={listening ? "destructive" : "default"}
      size="lg"
      className="w-full gap-2"
      aria-pressed={listening}
    >
      {listening ? <MicOff className="size-4" /> : <Mic className="size-4" />}
      {listening ? "Stop" : "Start talking"}
    </Button>
  );
}
