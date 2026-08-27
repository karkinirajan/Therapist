"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from "@tanstack/react-query";
import { ApiError, fetchJson } from "@/lib/api-client";

export { ApiError } from "@/lib/api-client";

/**
 * Typed client + React Query hooks for the app-domain proxy routes
 * (/api/baseline, /api/tracking/*, /api/checkins/*, /api/roadmap/*,
 * /api/hierarchy, /api/me/gate-state). Follows the exact same conventions as
 * lib/api-client.ts: same-origin relative fetches, `auth: true` to attach the
 * in-memory access token, React Query for caching/mutations.
 */

// --- shared enums -----------------------------------------------------------

export type SleepQuality = "poor" | "fair" | "good" | "great";
export type MedsAdherence2wk = "consistent" | "missed-1-2" | "missed-several" | "inconsistent";
export type BaselineCadence = "daily" | "every-other-day" | "weekly";
export type TrackingCadence = "daily" | "weekly" | "monthly";
export type HomeworkStatus = "done" | "partial" | "missed" | "n/a";

// --- baseline ----------------------------------------------------------------

export interface BaselineInput {
  mood: number;
  anxiety: number;
  energy: number;
  sleep_quality: SleepQuality;
  meds_adherence_2wk: MedsAdherence2wk;
  career_example: string;
  structure_example: string;
  life_example: string;
  what_works: string;
  non_negotiables?: string | null;
  cadence: BaselineCadence;
}

export interface BaselineOut extends BaselineInput {
  id: string;
  user_id: string;
  created_at: string;
}

// --- gate state ----------------------------------------------------------------

export interface GateStateOut {
  has_baseline: boolean;
  today_blocking_categories_complete: boolean;
  this_week_rollup_complete: boolean;
  missing_blocking_categories: string[];
}

// --- tracking ----------------------------------------------------------------

export interface TrackingCategoryOut {
  id: string;
  key: string;
  label: string;
  description: string;
  sort_order: number;
  is_blocking: boolean;
}

export interface TrackingEntryOut {
  id: string;
  user_id: string;
  category_id: string;
  cadence: TrackingCadence;
  period_start: string;
  // The payload shape is one of 18 discriminated (category, cadence) shapes
  // defined server-side in app/schemas/tracking.py; the client only builds
  // one shape at a time (per the category+cadence form in view) and never
  // needs to introspect an arbitrary one, so a loose index type here (rather
  // than `any`) is enough to round-trip it through forms/JSON.
  payload: Record<string, unknown>;
  created_at: string;
  updated_at: string | null;
}

export interface TrackingEntryInput {
  category_key: string;
  cadence: TrackingCadence;
  period_start: string;
  payload: Record<string, unknown>;
}

// --- checkins ----------------------------------------------------------------

export interface CheckinToolData {
  tool: "thought-record" | "behavioral-activation" | "exposure-hierarchy" | "behavioral-experiment";
  [key: string]: unknown;
}

export interface CheckinInput {
  date: string;
  mood: number;
  anxiety: number;
  meds: boolean;
  sleep: string;
  last_homework_status: HomeworkStatus;
  last_homework_note: string;
  gap_reflection: string;
  what_worked: string;
  what_didnt: string;
  tool_data: CheckinToolData | null;
  pattern_flagged: string;
  roadmap_phase_name: string;
  next_homework: string;
  next_homework_due: string | null;
}

export interface CheckinOut extends Omit<CheckinInput, "tool_data"> {
  id: string;
  user_id: string;
  tool_data: Record<string, unknown> | null;
  streak_at_logging: number;
  created_at: string;
}

export interface StreakSummary {
  current_streak: number;
  longest_streak: number;
  all_time_meds_adherence_pct: number;
  last_8_meds_adherence_pct: number;
  homework_attempt_rate_pct: number;
}

// --- roadmap ----------------------------------------------------------------

export interface RoadmapStateOut {
  id: string;
  user_id: string;
  phase_index: number;
  intro_acknowledged: boolean;
}

export interface RoadmapPhaseHistoryOut {
  id: string;
  user_id: string;
  from_phase: number;
  to_phase: number;
  date: string;
  earned: boolean;
}

export interface RoadmapAdvanceResponse {
  state: RoadmapStateOut;
  history: RoadmapPhaseHistoryOut;
}

// --- query keys ----------------------------------------------------------------

export const apiKeys = {
  gateState: ["gate-state"] as const,
  baseline: ["baseline"] as const,
  categories: ["tracking", "categories"] as const,
  entries: (params?: { category_key?: string; cadence?: string }) =>
    ["tracking", "entries", params ?? {}] as const,
  checkins: (params?: { offset?: number; limit?: number }) =>
    ["checkins", params ?? {}] as const,
  streaks: ["checkins", "streaks"] as const,
  roadmapState: ["roadmap", "state"] as const,
};

// --- gate state ----------------------------------------------------------------

export function useGateState(): UseQueryResult<GateStateOut, ApiError> {
  return useQuery({
    queryKey: apiKeys.gateState,
    queryFn: () => fetchJson<GateStateOut>("/api/me/gate-state", {}, { auth: true }),
    staleTime: 15_000,
  });
}

// --- baseline ----------------------------------------------------------------

async function fetchBaseline(): Promise<BaselineOut | null> {
  try {
    return await fetchJson<BaselineOut>("/api/baseline", {}, { auth: true });
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}

/** null = no baseline recorded yet (not an error) vs. undefined/isError = a real fetch failure. */
export function useBaseline(): UseQueryResult<BaselineOut | null, ApiError> {
  return useQuery({
    queryKey: apiKeys.baseline,
    queryFn: fetchBaseline,
    staleTime: 30_000,
  });
}

export function useCreateBaseline(): UseMutationResult<BaselineOut, ApiError, BaselineInput> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body) =>
      fetchJson<BaselineOut>("/api/baseline", { method: "POST", body: JSON.stringify(body) }, { auth: true }),
    onSuccess: (data) => {
      queryClient.setQueryData(apiKeys.baseline, data);
      queryClient.invalidateQueries({ queryKey: apiKeys.gateState });
    },
  });
}

export function useUpdateBaseline(): UseMutationResult<BaselineOut, ApiError, BaselineInput> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body) =>
      fetchJson<BaselineOut>("/api/baseline", { method: "PUT", body: JSON.stringify(body) }, { auth: true }),
    onSuccess: (data) => {
      queryClient.setQueryData(apiKeys.baseline, data);
      queryClient.invalidateQueries({ queryKey: apiKeys.gateState });
    },
  });
}

// --- tracking ----------------------------------------------------------------

export function useTrackingCategories(): UseQueryResult<TrackingCategoryOut[], ApiError> {
  return useQuery({
    queryKey: apiKeys.categories,
    queryFn: () => fetchJson<TrackingCategoryOut[]>("/api/tracking/categories", {}, { auth: true }),
    staleTime: 5 * 60_000,
  });
}

export function useTrackingEntries(params?: {
  category_key?: string;
  cadence?: TrackingCadence;
  date_from?: string;
  date_to?: string;
}): UseQueryResult<TrackingEntryOut[], ApiError> {
  const search = new URLSearchParams();
  if (params?.category_key) search.set("category_key", params.category_key);
  if (params?.cadence) search.set("cadence", params.cadence);
  if (params?.date_from) search.set("from", params.date_from);
  if (params?.date_to) search.set("to", params.date_to);
  const qs = search.toString();

  return useQuery({
    queryKey: apiKeys.entries({ category_key: params?.category_key, cadence: params?.cadence }),
    queryFn: () =>
      fetchJson<TrackingEntryOut[]>(`/api/tracking/entries${qs ? `?${qs}` : ""}`, {}, { auth: true }),
    enabled: !!params?.category_key,
    staleTime: 10_000,
  });
}

export function useCreateTrackingEntry(): UseMutationResult<TrackingEntryOut, ApiError, TrackingEntryInput> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body) =>
      fetchJson<TrackingEntryOut>(
        "/api/tracking/entries",
        { method: "POST", body: JSON.stringify(body) },
        { auth: true },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tracking", "entries"] });
      queryClient.invalidateQueries({ queryKey: apiKeys.gateState });
    },
  });
}

// --- checkins ----------------------------------------------------------------

export function useCheckins(params?: {
  offset?: number;
  limit?: number;
}): UseQueryResult<CheckinOut[], ApiError> {
  const search = new URLSearchParams();
  if (params?.offset) search.set("offset", String(params.offset));
  if (params?.limit) search.set("limit", String(params.limit));
  const qs = search.toString();

  return useQuery({
    queryKey: apiKeys.checkins(params),
    queryFn: () => fetchJson<CheckinOut[]>(`/api/checkins${qs ? `?${qs}` : ""}`, {}, { auth: true }),
    staleTime: 10_000,
  });
}

export function useStreaks(): UseQueryResult<StreakSummary, ApiError> {
  return useQuery({
    queryKey: apiKeys.streaks,
    queryFn: () => fetchJson<StreakSummary>("/api/checkins/streaks", {}, { auth: true }),
    staleTime: 10_000,
  });
}

export function useCreateCheckin(): UseMutationResult<CheckinOut, ApiError, CheckinInput> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body) =>
      fetchJson<CheckinOut>("/api/checkins", { method: "POST", body: JSON.stringify(body) }, { auth: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["checkins"] });
      queryClient.invalidateQueries({ queryKey: apiKeys.gateState });
    },
  });
}

// --- roadmap ----------------------------------------------------------------

export function useRoadmapState(): UseQueryResult<RoadmapStateOut, ApiError> {
  return useQuery({
    queryKey: apiKeys.roadmapState,
    queryFn: () => fetchJson<RoadmapStateOut>("/api/roadmap/state", {}, { auth: true }),
    staleTime: 10_000,
  });
}

export function useAdvanceRoadmap(): UseMutationResult<RoadmapAdvanceResponse, ApiError, { confirm_early: boolean }> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body) =>
      fetchJson<RoadmapAdvanceResponse>(
        "/api/roadmap/advance",
        { method: "POST", body: JSON.stringify(body) },
        { auth: true },
      ),
    onSuccess: (data) => {
      queryClient.setQueryData(apiKeys.roadmapState, data.state);
    },
  });
}
