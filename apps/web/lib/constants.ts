import type { Cadence, CbtToolId, MedsAdherence2wk, SleepQuality } from "./types";

export const TOOL_NAME = "CBT Recovery & Life-Systems Coach";

// ─── Identity & scope (Section 1) — shown once, in full, on first visit ───
export const IDENTITY_STATEMENT = `This is a structured behavioral coaching tool built around Cognitive Behavioral Therapy (CBT) technique — not a psychiatrist and not a crisis service. It does not diagnose, prescribe, or adjust medication. It functions as a daily/weekly accountability layer around your existing treatment: applying CBT with precision, structuring a 6-month recovery arc in small compounding steps, and holding you accountable via tracked check-ins. It is built for someone who is stable-but-stuck — functional, medicated, but with slowed motivation, disorganized time, and a trajectory that feels off-track — not for acute crisis. If you are in crisis, use the Safety page, not this workflow.`;

// ─── Crisis resources (Section 2) ───
export const CRISIS = {
  helplineName: "Nepal Suicide Prevention Helpline",
  helplineNumber: "1166",
  helplineTel: "tel:1166",
  helplineNote:
    "Toll-free, government-backed, WHO-supported. Reachable from NTC and Ncell networks.",
};

export const CRISIS_TRIGGERS = [
  "Suicidal ideation — active or passive",
  "Self-harm, or a plan or means",
  "Hopelessness framed as “no point going on”",
  "Sudden medication non-adherence combined with worsening symptoms",
  "Any statement that reads as a crisis rather than a low-mood day",
];

export const CRISIS_STEPS = [
  "Stop the coaching agenda immediately — no homework, tracking, or planned exercise.",
  "Respond directly and calmly. No clinical distance, no scripted hotline dump before acknowledging what's happening.",
  "Name it: this is above what a text-based coaching tool should handle alone. A real person needs to be in the loop right now.",
  `Call ${CRISIS.helplineNumber} — ${CRISIS.helplineName} (${CRISIS.helplineNote}). Also contact the prescriber who manages your medication, and a trusted person if there is one.`,
  "Do not try to handle it with a thought record. Cognitive restructuring is not a crisis intervention.",
  "Do not resume normal coaching cadence until safety is confirmed and real support has been contacted.",
];

export const MEDICATION_RULE =
  "Never start, stop, or change the dose or timing of any psychiatric medication based on this tool. If a change feels needed, that decision belongs to the prescriber — flag it for them, don't act on it here.";

export const NOT_A_CRISIS_NOTE =
  "A bad day, low motivation, or “I feel like giving up on this project” is not a crisis trigger — that's normal CBT material, handled in a check-in. This page is for genuine risk language, not every low mood.";

// ─── Cadence options (Section 5) ───
export const CADENCE_OPTIONS: { value: Cadence; label: string; days: number }[] = [
  { value: "daily", label: "Daily", days: 1 },
  { value: "every-other-day", label: "Every other day", days: 2 },
  { value: "weekly", label: "Weekly", days: 7 },
];

export const SLEEP_OPTIONS: { value: SleepQuality; label: string }[] = [
  { value: "poor", label: "Poor" },
  { value: "fair", label: "Fair" },
  { value: "good", label: "Good" },
  { value: "great", label: "Great" },
];

export const MEDS_2WK_OPTIONS: { value: MedsAdherence2wk; label: string }[] = [
  { value: "consistent", label: "Consistent — took it as prescribed" },
  { value: "missed-1-2", label: "Missed 1-2 doses" },
  { value: "missed-several", label: "Missed several doses" },
  { value: "inconsistent", label: "Inconsistent / hard to say" },
];

// ─── Cognitive distortions (Section 3) — use these exact names, don't paraphrase ───
export interface Distortion {
  id: string;
  name: string;
  definition: string;
  example: string;
}

export const DISTORTIONS: Distortion[] = [
  {
    id: "catastrophizing",
    name: "Catastrophizing",
    definition: "Assuming the worst-case outcome is the most likely one.",
    example: "“If I miss this deadline, I'll be fired and never find work again.”",
  },
  {
    id: "all-or-nothing",
    name: "All-or-nothing thinking",
    definition: "Seeing things in absolute, black-and-white categories with no middle ground.",
    example: "“I didn't finish everything today, so the whole day was wasted.”",
  },
  {
    id: "mind-reading",
    name: "Mind-reading",
    definition: "Assuming you know what others are thinking — usually the worst — without evidence.",
    example: "“My manager thinks I'm behind everyone else on the team.”",
  },
  {
    id: "fortune-telling",
    name: "Fortune-telling",
    definition: "Predicting the future negatively as if it were already decided, without evidence.",
    example: "“This project is going to fail no matter what I do.”",
  },
  {
    id: "discounting-positive",
    name: "Discounting the positive",
    definition: "Dismissing positive experiences or qualities as if they don't count.",
    example: "“They only liked the proposal because they were being nice.”",
  },
  {
    id: "emotional-reasoning",
    name: "Emotional reasoning",
    definition: "Assuming your feelings reflect fact — “I feel it, so it must be true.”",
    example: "“I feel like a failure, so I must actually be failing.”",
  },
  {
    id: "labeling",
    name: "Labeling",
    definition:
      "Attaching a global negative label to yourself or others instead of describing the specific behavior.",
    example: "“I'm lazy” instead of “I put off this one task today.”",
  },
  {
    id: "should-statements",
    name: "Should-statements",
    definition:
      "Rigid rules about how you or others “should” or “must” be, that produce guilt or frustration when unmet.",
    example: "“I should already be further along in my career by now.”",
  },
];

// ─── Framework overview (Section 3) ───
export interface FrameworkTechnique {
  id: string;
  name: string;
  description: string;
}

export const FRAMEWORK: FrameworkTechnique[] = [
  {
    id: "cognitive-restructuring",
    name: "Cognitive restructuring",
    description:
      "Identify an automatic negative thought, name the distortion, test the thought against evidence, and generate a more accurate replacement thought.",
  },
  {
    id: "behavioral-activation",
    name: "Behavioral activation",
    description:
      "Depression's core loop is withdrawal from reward feeding low mood feeding more withdrawal. Counter it with scheduled, graded activity — motivation follows action, not the reverse.",
  },
  {
    id: "graded-exposure",
    name: "Graded exposure",
    description:
      "For anxiety-driven avoidance: build a fear/avoidance hierarchy and move up it in small, defined steps — not leaps.",
  },
  {
    id: "behavioral-experiments",
    name: "Behavioral experiments",
    description:
      "When a belief is testable, design the smallest real-world test of it rather than debating it in the abstract.",
  },
  {
    id: "values-based-goals",
    name: "Values-based goal-setting",
    description:
      "Connect the 6-month plan to what actually matters — career stability, income, craft, autonomy — rather than generic “be productive” framing.",
  },
];

// ─── CBT tool picker (Section 6, step 4) — pick exactly one per check-in ───
export const CBT_TOOLS: { id: CbtToolId; name: string; use: string }[] = [
  {
    id: "thought-record",
    name: "Thought Record",
    use: "Cognitive restructuring for one specific automatic negative thought.",
  },
  {
    id: "behavioral-activation",
    name: "Behavioral Activation",
    use: "Schedule a reward-generating activity when motivation is low. Don't wait to feel like it.",
  },
  {
    id: "exposure-hierarchy",
    name: "Graded Exposure",
    use: "Move up one rung of an avoidance hierarchy in a small, defined step.",
  },
  {
    id: "behavioral-experiment",
    name: "Behavioral Experiment",
    use: "Design the smallest real-world test of a testable belief.",
  },
];

// ─── Six-month roadmap (Section 7) — do not compress phases ───
export interface RoadmapPhase {
  index: number; // 0-based
  name: string;
  weekRange: string;
  startWeek: number;
  endWeek: number;
  goal: string;
  focus: string[];
  successMetric: string;
}

export const ROADMAP_PHASES: RoadmapPhase[] = [
  {
    index: 0,
    name: "Stabilize",
    weekRange: "Weeks 1–4",
    startWeek: 1,
    endWeek: 4,
    goal: "Consistent basics, not ambition.",
    focus: [
      "Sleep/wake consistency",
      "Medication adherence tracking",
      "One small daily behavioral-activation task (not work-related — reintroduce reward first)",
      "No career-overhaul talk yet",
    ],
    successMetric: "4 consecutive weeks of logged check-ins with meds adherence ≥ 90%.",
  },
  {
    index: 1,
    name: "Structure",
    weekRange: "Weeks 5–10",
    startWeek: 5,
    endWeek: 10,
    goal: "Rebuild a daily/weekly time structure around actual energy patterns, not aspirational ones.",
    focus: [
      "Basic task capture system",
      "One fixed daily work block",
      "Light exposure work on the specific avoided career tasks that have been deferred",
    ],
    successMetric:
      "A repeatable weekly structure held for 3+ consecutive weeks without a full collapse-week.",
  },
  {
    index: 2,
    name: "Rebuild career traction",
    weekRange: "Weeks 11–18",
    startWeek: 11,
    endWeek: 18,
    goal: "Apply behavioral experiments and cognitive restructuring directly to career-stall beliefs.",
    focus: [
      "Impostor framing challenged with evidence",
      "Avoidance of outreach/visibility tackled via exposure",
      "Procrastination on specific deliverables addressed",
      "Named, trackable career actions per week — proposals sent, projects shipped, applications made",
    ],
    successMetric:
      "Concrete career actions completed weekly, tied to your stated career goal — not vague “get back on track.”",
  },
  {
    index: 3,
    name: "Compound & stress-test",
    weekRange: "Weeks 19–24",
    startWeek: 19,
    endWeek: 24,
    goal: "Test the new systems under real friction without full relapse into the old avoidance pattern.",
    focus: [
      "Survive a busy week, a setback, a bad mood day without full collapse",
      "Build an explicit relapse-prevention plan: early-warning signs + first three actions",
      "Review the 6-month log trend, cold, numbers-first",
    ],
    successMetric:
      "A written relapse-prevention plan, plus a completed 6-month review: mood/anxiety trend, adherence streak, career actions completed.",
  },
];

export const STORAGE_KEY = "cbt-recovery-data-v1";
