from app.services import voice_persona


def test_contains_crisis_language_matches_known_triggers() -> None:
    assert voice_persona.contains_crisis_language("I want to kill myself")
    assert voice_persona.contains_crisis_language("There's no point going on anymore")
    assert voice_persona.contains_crisis_language("I've been thinking about self-harm")


def test_contains_crisis_language_is_case_insensitive() -> None:
    assert voice_persona.contains_crisis_language("I WANT TO DIE")


def test_contains_crisis_language_ignores_ordinary_bad_day() -> None:
    assert not voice_persona.contains_crisis_language(
        "Today was rough, I missed my deadline and felt pretty defeated"
    )


def test_build_system_prompt_includes_medication_rule_and_no_diagnosis_clause() -> None:
    prompt = voice_persona.build_system_prompt(rolling_summary="", key_facts={})
    assert "medication" in prompt.lower()
    assert "diagnose" in prompt.lower()


def test_build_system_prompt_first_session_has_no_history_claim() -> None:
    prompt = voice_persona.build_system_prompt(rolling_summary="", key_facts={})
    assert "no prior history" in prompt.lower()


def test_build_system_prompt_includes_rolling_summary_when_present() -> None:
    prompt = voice_persona.build_system_prompt(
        rolling_summary="Struggles with task initiation on Mondays.",
        key_facts={"recurring_distortions": ["catastrophizing"]},
    )
    assert "Struggles with task initiation on Mondays." in prompt
    assert "catastrophizing" in prompt
