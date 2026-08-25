"use client";

import { useCallback, useSyncExternalStore } from "react";
import { CADENCE_OPTIONS, ROADMAP_PHASES, STORAGE_KEY } from "./constants";
import type { CheckinLog, RecoveryData } from "./types";

export const DEFAULT_DATA: RecoveryData = {
  baseline: null,
  logs: [],
  hierarchy: [],
  phaseIndex: 0,
  phaseHistory: [],
  introAcknowledged: false,
};

export function loadData(): RecoveryData {
  if (typeof window === "undefined") return DEFAULT_DATA;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_DATA;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_DATA, ...parsed };
  } catch {
    return DEFAULT_DATA;
  }
}

export function saveData(data: RecoveryData) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// Module-level cache backing useSyncExternalStore — keeps snapshot identity
// stable across renders so React doesn't loop re-rendering, and lets every
// page share one source of truth for the same localStorage document.
let cache: RecoveryData = DEFAULT_DATA;
let cacheRaw: string | null | undefined;
const listeners = new Set<() => void>();

function getSnapshot(): RecoveryData {
  if (typeof window === "undefined") return DEFAULT_DATA;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (raw === cacheRaw) return cache;
  cacheRaw = raw;
  cache = loadData();
  return cache;
}

function getServerSnapshot(): RecoveryData {
  return DEFAULT_DATA;
}

function subscribe(callback: () => void) {
  listeners.add(callback);
  window.addEventListener("storage", callback);
  return () => {
    listeners.delete(callback);
    window.removeEventListener("storage", callback);
  };
}

function commit(next: RecoveryData) {
  saveData(next);
  cache = next;
  cacheRaw = JSON.stringify(next);
  listeners.forEach((l) => l());
}

/** Client-only hook backing every page with a single localStorage document. */
export function useRecoveryData() {
  const data = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const update = useCallback((updater: (prev: RecoveryData) => RecoveryData) => {
    commit(updater(getSnapshot()));
  }, []);

  return { data, update, ready: true };
}

export function newId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

// ─── Streaks & adherence (Section 6 log "Streak" field, Section 8 accountability engine) ───

export interface StreakStats {
  current: number;
  longest: number;
  medsAdherencePct: number; // all-time
  medsAdherencePctRecent: number; // last up-to-8 logs
  homeworkAttemptRate: number; // done+partial / total
}

export function computeStreaks(logs: CheckinLog[]): StreakStats {
  if (logs.length === 0) {
    return { current: 0, longest: 0, medsAdherencePct: 0, medsAdherencePctRecent: 0, homeworkAttemptRate: 0 };
  }

  const sorted = [...logs].sort((a, b) => a.date.localeCompare(b.date));

  const hitsStreak = (log: CheckinLog) =>
    log.meds && (log.lastHomeworkStatus === "done" || log.lastHomeworkStatus === "partial" || log.lastHomeworkStatus === "n/a");

  let longest = 0;
  let running = 0;
  for (const log of sorted) {
    if (hitsStreak(log)) {
      running += 1;
      longest = Math.max(longest, running);
    } else {
      running = 0;
    }
  }

  let current = 0;
  for (let i = sorted.length - 1; i >= 0; i -= 1) {
    if (hitsStreak(sorted[i])) current += 1;
    else break;
  }

  const medsCount = sorted.filter((l) => l.meds).length;
  const medsAdherencePct = Math.round((medsCount / sorted.length) * 100);

  const recent = sorted.slice(-8);
  const medsAdherencePctRecent = Math.round(
    (recent.filter((l) => l.meds).length / recent.length) * 100,
  );

  const homeworkAttempted = sorted.filter(
    (l) => l.lastHomeworkStatus === "done" || l.lastHomeworkStatus === "partial",
  ).length;
  const homeworkAttemptRate = Math.round((homeworkAttempted / sorted.length) * 100);

  return { current, longest, medsAdherencePct, medsAdherencePctRecent, homeworkAttemptRate };
}

// ─── Phase computation (Section 7) ───

export function weeksSinceStart(startIso: string, now: Date = new Date()): number {
  const start = new Date(startIso);
  const ms = now.getTime() - start.getTime();
  return Math.max(0, Math.floor(ms / (7 * 24 * 60 * 60 * 1000)) + 1);
}

/** Whether the current phase's success metric looks met, from logged data (Phase 1 metric only is auto-checkable; later phases need self-report). */
export function phaseMetricMet(phaseIndex: number, logs: CheckinLog[]): boolean {
  if (logs.length === 0) return false;
  const sorted = [...logs].sort((a, b) => a.date.localeCompare(b.date));

  if (phaseIndex === 0) {
    // 4 consecutive weeks of logged check-ins with meds adherence >= 90%.
    if (sorted.length < 4) return false;
    const last = sorted.slice(-4);
    const adherence = last.filter((l) => l.meds).length / last.length;
    return adherence >= 0.9;
  }

  if (phaseIndex === 1) {
    // A repeatable weekly structure held 3+ consecutive weeks without a full collapse-week
    // (approximated: 3+ consecutive logs with homework attempted, not missed).
    const last = sorted.slice(-3);
    if (last.length < 3) return false;
    return last.every((l) => l.lastHomeworkStatus === "done" || l.lastHomeworkStatus === "partial");
  }

  // Phases 3-4 rely on self-reported career actions / relapse-prevention plan —
  // not fully derivable from numbers, so this always requires manual confirmation.
  return false;
}

export function phaseMetricLabel(phaseIndex: number): string {
  return ROADMAP_PHASES[phaseIndex]?.successMetric ?? "";
}

// ─── Check-in gap detection (Section 8) ───

export function isCheckinOverdue(
  lastLogDate: string | null,
  cadence: string,
  now: Date = new Date(),
): { overdue: boolean; daysSince: number; expectedDays: number } {
  const opt = CADENCE_OPTIONS.find((c) => c.value === cadence) ?? CADENCE_OPTIONS[2];
  if (!lastLogDate) return { overdue: false, daysSince: 0, expectedDays: opt.days };
  const daysSince = Math.floor((now.getTime() - new Date(lastLogDate).getTime()) / (24 * 60 * 60 * 1000));
  return { overdue: daysSince >= opt.days * 2, daysSince, expectedDays: opt.days };
}

// ─── CBT-LOG block formatter (Section 6, exact format contract) ───

export function formatLogBlock(log: CheckinLog): string {
  const homeworkLine =
    log.lastHomeworkStatus === "n/a"
      ? "n/a — first check-in"
      : `${log.lastHomeworkStatus}${log.lastHomeworkNote ? ` — ${log.lastHomeworkNote}` : ""}`;

  return [
    `CBT-LOG | ${log.date}`,
    `Mood: ${log.mood}/10 | Anxiety: ${log.anxiety}/10 | Meds: ${log.meds ? "Y" : "N"} | Sleep: ${log.sleep || "—"}`,
    `Last homework: ${homeworkLine}`,
    `Pattern flagged this session: ${log.patternFlagged || "none"}`,
    `Roadmap phase: ${log.roadmapPhaseName}`,
    `Next homework: ${log.nextHomework}${log.nextHomeworkDue ? ` — due by ${log.nextHomeworkDue}` : ""}`,
    `Streak: ${log.streakAtLogging}`,
  ].join("\n");
}

// ─── Export / import / reset ───

export function exportJson(data: RecoveryData): string {
  return JSON.stringify(data, null, 2);
}

export function downloadJson(data: RecoveryData) {
  const blob = new Blob([exportJson(data)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `cbt-recovery-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function parseImportedJson(raw: string): RecoveryData | null {
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return null;
    return { ...DEFAULT_DATA, ...parsed };
  } catch {
    return null;
  }
}
