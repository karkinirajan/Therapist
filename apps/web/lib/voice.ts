"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from "@tanstack/react-query";
import { ApiError, fetchJson, getAccessToken } from "@/lib/api-client";

/**
 * Typed client + React Query hooks for the voice therapy feature's proxy
 * routes (/api/voice/*). Follows the exact conventions of lib/api.ts:
 * same-origin relative fetches, `auth: true` for the in-memory access
 * token, React Query for caching/mutations. The live conversation itself
 * goes over a WebSocket (see lib/voice-ws.ts) — fetchJson only covers the
 * non-streaming parts (start/end a session, quota, history, TTS).
 */

export type TherapySessionStatus = "active" | "ended";

export interface TherapyTranscriptTurn {
  role: "user" | "assistant";
  text: string;
  at: string;
  crisis_flagged: boolean;
}

export interface TherapySessionOut {
  id: string;
  user_id: string;
  status: TherapySessionStatus;
  transcript: TherapyTranscriptTurn[];
  started_at: string;
  ended_at: string | null;
  crisis_flagged: boolean;
}

export interface UserMemoryProfileOut {
  rolling_summary: string;
  key_facts: Record<string, unknown>;
  session_count: number;
  updated_at: string;
}

export interface VoiceQuotaOut {
  sessions_used_today: number;
  sessions_remaining_today: number;
  turns_used_today: number;
  turns_remaining_today: number;
}

export const voiceKeys = {
  quota: ["voice", "quota"] as const,
  sessions: (params?: { offset?: number; limit?: number }) =>
    ["voice", "sessions", params ?? {}] as const,
  session: (id: string) => ["voice", "sessions", id] as const,
  memoryProfile: ["voice", "memory-profile"] as const,
};

export function useVoiceQuota(): UseQueryResult<VoiceQuotaOut, ApiError> {
  return useQuery({
    queryKey: voiceKeys.quota,
    queryFn: () => fetchJson<VoiceQuotaOut>("/api/voice/quota", {}, { auth: true }),
    staleTime: 10_000,
  });
}

export function useVoiceSessions(
  params?: { offset?: number; limit?: number },
): UseQueryResult<TherapySessionOut[], ApiError> {
  return useQuery({
    queryKey: voiceKeys.sessions(params),
    queryFn: () => {
      const search = new URLSearchParams();
      if (params?.offset != null) search.set("offset", String(params.offset));
      if (params?.limit != null) search.set("limit", String(params.limit));
      const qs = search.toString();
      return fetchJson<TherapySessionOut[]>(
        `/api/voice/sessions${qs ? `?${qs}` : ""}`,
        {},
        { auth: true },
      );
    },
  });
}

export function useVoiceSession(sessionId: string | null): UseQueryResult<TherapySessionOut, ApiError> {
  return useQuery({
    queryKey: voiceKeys.session(sessionId ?? ""),
    queryFn: () => fetchJson<TherapySessionOut>(`/api/voice/sessions/${sessionId}`, {}, { auth: true }),
    enabled: sessionId != null,
  });
}

export function useMemoryProfile(): UseQueryResult<UserMemoryProfileOut | null, ApiError> {
  return useQuery({
    queryKey: voiceKeys.memoryProfile,
    queryFn: () =>
      fetchJson<UserMemoryProfileOut | null>("/api/voice/memory-profile", {}, { auth: true }),
    staleTime: 30_000,
  });
}

export function useStartVoiceSession(): UseMutationResult<TherapySessionOut, ApiError, void> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      fetchJson<TherapySessionOut>("/api/voice/sessions", { method: "POST" }, { auth: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: voiceKeys.quota });
    },
  });
}

export function useEndVoiceSession(): UseMutationResult<TherapySessionOut, ApiError, string> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (sessionId) =>
      fetchJson<TherapySessionOut>(
        `/api/voice/sessions/${sessionId}/end`,
        { method: "POST" },
        { auth: true },
      ),
    onSuccess: (data) => {
      queryClient.setQueryData(voiceKeys.session(data.id), data);
      queryClient.invalidateQueries({ queryKey: voiceKeys.memoryProfile });
    },
  });
}

export function useDeleteMemoryProfile(): UseMutationResult<void, ApiError, void> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => fetchJson<void>("/api/voice/memory-profile", { method: "DELETE" }, { auth: true }),
    onSuccess: () => {
      queryClient.setQueryData(voiceKeys.memoryProfile, null);
    },
  });
}

/** ElevenLabs audio, or `null` if the caller should fall back to
 * `window.speechSynthesis` instead (free-tier quota exhausted, or TTS not
 * configured at all). Not a React Query hook — called imperatively per
 * assistant turn once its full text has arrived over the WebSocket. */
export async function synthesizeSpeech(text: string): Promise<Blob | null> {
  const token = getAccessToken();
  const response = await fetch("/api/voice/tts", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ text }),
  });
  if (!response.ok) return null;
  if (response.headers.get("content-type")?.includes("application/json")) return null;
  return await response.blob();
}
