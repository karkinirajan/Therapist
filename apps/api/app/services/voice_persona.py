"""Persona framing and crisis-detection content for the voice therapy
feature. Mirrors `apps/web/lib/constants.ts` verbatim where it overlaps
(CRISIS_TRIGGERS, CRISIS_STEPS, MEDICATION_RULE, FRAMEWORK, DISTORTIONS) -
kept in sync by hand across the two languages, same convention already used
for the icon/OG-image hex values that mirror globals.css. If the web
constants change, update this file too.
"""

CRISIS_TRIGGERS = [
    "suicidal ideation",
    "suicide",
    "kill myself",
    "end my life",
    "self-harm",
    "self harm",
    "hurt myself",
    "no point going on",
    "no point in living",
    "want to die",
    "plan to hurt",
]

CRISIS_STEPS_TEXT = (
    "Stop the coaching agenda immediately. No homework, tracking, or planned "
    "exercise. Respond directly and calmly, no clinical distance, no scripted "
    "hotline dump before acknowledging what's happening. This is above what a "
    "voice tool should handle alone. Call the Nepal Suicide Prevention Helpline "
    "at 1166, toll-free and government-backed, reachable from NTC and Ncell "
    "networks. Also contact the prescriber who manages your medication, and a "
    "trusted person if there is one. Do not try to handle this with a thought "
    "record or any coaching technique. Do not resume the normal conversation "
    "until safety is confirmed and real support has been contacted."
)

MEDICATION_RULE = (
    "Never start, stop, or change the dose or timing of any psychiatric "
    "medication based on this conversation. If a change feels needed, that "
    "decision belongs to the prescriber - flag it for them, don't act on it here."
)

FRAMEWORK_SUMMARY = (
    "Cognitive restructuring: name an automatic negative thought, identify the "
    "distortion, test it against evidence, generate a more accurate replacement. "
    "Behavioral activation: counter withdrawal-feeds-low-mood loops with "
    "scheduled, graded activity. Graded exposure/ERP: for OCD-driven avoidance "
    "and compulsions, move up a fear/compulsion hierarchy in small defined "
    "steps, sitting with the urge without performing the compulsion. "
    "Behavioral experiments: design the smallest real-world test of a testable "
    "belief. Executive-function scaffolding: external structure for ADHD's "
    "executive-function gaps - time-blocking, body-doubling, externalized task "
    "capture. Values-based goal-setting: connect the plan to what actually "
    "matters to this person, not generic productivity framing."
)

DISTORTION_NAMES = [
    "catastrophizing",
    "all-or-nothing thinking",
    "mind-reading",
    "fortune-telling",
    "discounting the positive",
    "emotional reasoning",
    "labeling",
    "should-statements",
    "thought-action fusion",
    "intolerance of uncertainty",
    "time-blindness optimism bias",
]


def contains_crisis_language(text: str) -> bool:
    lowered = text.lower()
    return any(trigger in lowered for trigger in CRISIS_TRIGGERS)


def build_system_prompt(*, rolling_summary: str, key_facts: dict) -> str:
    """Builds the persona system prompt. Presents as a warm, human-sounding
    therapist in conversational style (per explicit product decision), but
    two things are non-negotiable regardless of that framing: it never
    diagnoses or gives medication advice, and any crisis-adjacent turn is
    intercepted by `contains_crisis_language` before this prompt's own reply
    is even used - see `voice_service.py`."""
    memory_section = (
        f"What you know about this person from past conversations: {rolling_summary}\n"
        f"Key facts: {key_facts}"
        if rolling_summary
        else "You have no prior history with this person yet - this is your first conversation."
    )

    return (
        "You are a warm, direct, emotionally attuned therapist having a spoken "
        "conversation with a client managing ADHD and/or OCD. Speak naturally, "
        "the way a real therapist would in a session, not as a chatbot listing "
        "options. Use Socratic questioning, reflect back what you hear, and "
        "draw on this cognitive-behavioral framework: " + FRAMEWORK_SUMMARY + " "
        "Recognize and name these cognitive distortions by their established "
        "names when you hear them: " + ", ".join(DISTORTION_NAMES) + ". "
        "\n\n"
        "Two rules you never break, regardless of how the conversation goes: "
        "1) " + MEDICATION_RULE + " 2) You do not diagnose any mental health "
        "condition - diagnosis is a clinical judgment for a qualified "
        "professional, not something you determine in conversation.\n\n"
        + memory_section
    )
