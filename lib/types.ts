// Data model for the CBT Recovery & Life-Systems tool.
// Everything here is stored client-side only (see storage.ts) — this is a
// single-user personal tool, not multi-tenant CMS content.

export type Cadence = "daily" | "every-other-day" | "weekly";

export type MedsAdherence2wk =
  | "consistent"
  | "missed-1-2"
  | "missed-several"
  | "inconsistent";

export type SleepQuality = "poor" | "fair" | "good" | "great";

export interface BaselineSnapshot {
  createdAt: string; // ISO date — also treated as the 6-month program start date
  mood: number; // 1-10
  anxiety: number; // 1-10
  sleepQuality: SleepQuality;
  energy: number; // 1-10
  medsAdherence2wk: MedsAdherence2wk;
  careerExample: string;
  structureExample: string;
  lifeExample: string;
  whatWorks: string;
  nonNegotiables: string;
  cadence: Cadence;
}

export type HomeworkStatus = "done" | "partial" | "missed" | "n/a";

export type CbtToolId =
  | "thought-record"
  | "behavioral-activation"
  | "exposure-hierarchy"
  | "behavioral-experiment";

export interface ThoughtRecordData {
  situation: string;
  automaticThought: string;
  distortion: string;
  evidenceFor: string;
  evidenceAgainst: string;
  balancedThought: string;
}

export interface BehavioralActivationData {
  activity: string;
  scheduledFor: string;
  valuesLink: string;
  predictedMood: string;
}

export interface ExposureData {
  hierarchyItem: string;
  sudsBefore: string;
  sudsAfter: string;
  outcome: string;
}

export interface BehavioralExperimentData {
  belief: string;
  prediction: string;
  experiment: string;
  actualOutcome: string;
  whatItMeans: string;
}

export type CbtToolData =
  | ({ tool: "thought-record" } & ThoughtRecordData)
  | ({ tool: "behavioral-activation" } & BehavioralActivationData)
  | ({ tool: "exposure-hierarchy" } & ExposureData)
  | ({ tool: "behavioral-experiment" } & BehavioralExperimentData);

export interface CheckinLog {
  id: string;
  date: string; // ISO date of the check-in
  mood: number;
  anxiety: number;
  meds: boolean;
  sleep: string;
  lastHomeworkStatus: HomeworkStatus;
  lastHomeworkNote: string;
  gapReflection: string; // filled only when a check-in gap was flagged
  whatWorked: string;
  whatDidnt: string;
  toolData: CbtToolData | null;
  patternFlagged: string;
  roadmapPhaseName: string;
  nextHomework: string;
  nextHomeworkDue: string;
  streakAtLogging: number;
}

export interface ExposureHierarchyItem {
  id: string;
  label: string;
  suds: number; // 0-100 subjective units of distress
  climbed: boolean;
}

export interface PhaseAdvanceRecord {
  fromPhase: number;
  toPhase: number;
  date: string;
  earned: boolean; // false = advanced without meeting the success metric
}

export interface RecoveryData {
  baseline: BaselineSnapshot | null;
  logs: CheckinLog[];
  hierarchy: ExposureHierarchyItem[];
  phaseIndex: number; // 0-based index into ROADMAP_PHASES
  phaseHistory: PhaseAdvanceRecord[];
  introAcknowledged: boolean;
}
