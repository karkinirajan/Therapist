"""One-off: wipe all user data and seed a single, fully-populated account
for Nirajan Karki (kneeraazon@gmail.com). Not a general demo seed — run
once, by hand, then edit the account through the app.

Usage (from the api container):
    uv run python scripts/seed_kneeraazon.py
"""
import asyncio
import hashlib
import secrets
import uuid
from datetime import UTC, datetime, timedelta
from zoneinfo import ZoneInfo

from sqlalchemy import delete, select

from app.core.security import hash_password
from app.db.session import async_session_factory
from app.models.baseline import Baseline, Cadence, MedsAdherence, SleepQuality
from app.models.checkin_log import CheckinLog, HomeworkStatus
from app.models.exposure_hierarchy_item import ExposureHierarchyItem
from app.models.oauth_identity import OAuthIdentity
from app.models.refresh_token import RefreshToken
from app.models.roadmap_phase_history import RoadmapPhaseHistory
from app.models.therapy_session import TherapySession, TherapySessionStatus
from app.models.tracking_category import TrackingCategory
from app.models.tracking_entry import TrackingCadence, TrackingEntry
from app.models.user import User
from app.models.user_memory_profile import UserMemoryProfile
from app.models.user_roadmap_state import UserRoadmapState
from app.models.voice_socket_ticket import VoiceSocketTicket

EMAIL = "kneeraazon@gmail.com"
FULL_NAME = "Nirajan Karki"
PHONE = "9844395719"
USERNAME = "kneeraazon"
PASSWORD = "karki12345@#"
TIMEZONE = "Asia/Kathmandu"

USER_OWNED_MODELS = [
    VoiceSocketTicket,
    TherapySession,
    UserMemoryProfile,
    RoadmapPhaseHistory,
    UserRoadmapState,
    TrackingEntry,
    ExposureHierarchyItem,
    CheckinLog,
    Baseline,
    RefreshToken,
    OAuthIdentity,
    User,
]


async def main() -> None:
    async with async_session_factory() as db:
        for model in USER_OWNED_MODELS:
            await db.execute(delete(model))

        user = User(
            id=uuid.uuid4(),
            email=EMAIL,
            password_hash=hash_password(PASSWORD),
            email_verified=True,
            timezone=TIMEZONE,
            full_name=FULL_NAME,
            phone=PHONE,
            username=USERNAME,
        )
        db.add(user)
        await db.flush()

        db.add(
            Baseline(
                user_id=user.id,
                mood=5,
                anxiety=6,
                energy=4,
                sleep_quality=SleepQuality.fair,
                meds_adherence_2wk=MedsAdherence.consistent,
                career_example=(
                    "I keep missing deadlines at work because I start a task, "
                    "get pulled into something else, and forget to come back to it."
                ),
                structure_example=(
                    "Weekday mornings fall apart without a written plan — I end up "
                    "reacting to whatever shows up first instead of what matters."
                ),
                life_example=(
                    "I avoid opening mail and bills until they become urgent, "
                    "then scramble to catch up."
                ),
                what_works=(
                    "Short, timed work blocks with a visible timer, and checking "
                    "in with someone at the end of the day."
                ),
                non_negotiables="Take evening medication, sleep by midnight.",
                cadence=Cadence.daily,
            )
        )

        today = datetime.now(ZoneInfo(TIMEZONE)).date()
        db.add(
            CheckinLog(
                user_id=user.id,
                date=today,
                mood=6,
                anxiety=5,
                meds=True,
                sleep="6.5 hours, woke up once",
                last_homework_status=HomeworkStatus.partial,
                last_homework_note="Did the exposure practice but skipped the evening review.",
                gap_reflection=(
                    "The gap between planning and doing shows up most in the evening, "
                    "when motivation drops."
                ),
                what_worked="Breaking the exposure into two shorter sessions.",
                what_didnt="Tried to do it all in one long session and gave up halfway.",
                tool_data={
                    "tool": "exposure-hierarchy",
                    "item_label": "Touching a doorknob without washing hands immediately after",
                    "suds_before": 60,
                    "suds_after": 35,
                    "notes": "Anxiety dropped faster than expected once I waited it out.",
                },
                pattern_flagged="Avoidance spikes in the evening, not the morning.",
                roadmap_phase_name="Phase 1: Building the daily habit",
                next_homework="Repeat the same exposure tomorrow, add a second item to the hierarchy.",
                next_homework_due=today + timedelta(days=1),
                streak_at_logging=1,
            )
        )

        db.add(
            ExposureHierarchyItem(
                user_id=user.id,
                label="Touching a doorknob without washing hands immediately after",
                initial_suds=60,
                current_suds=35,
                climbed=False,
                order=0,
            )
        )

        categories = (await db.execute(select(TrackingCategory))).scalars().all()
        by_key = {c.key: c for c in categories}
        week_start = today - timedelta(days=today.weekday())

        daily_payloads = {
            "executive_function": {
                "task_initiated": True,
                "planned_count": 5,
                "completed_count": 3,
                "took_longer_than_planned": True,
            },
            "compulsion_erp": {
                "compulsions_resisted": 4,
                "compulsions_performed": 1,
                "suds_before": 60,
                "suds_after": 35,
                "intrusive_thought_band": "moderate",
            },
            "mood_anxiety": {
                "mood": 6,
                "anxiety": 5,
                "sleep_quality": "fair",
                "panic_or_shutdown": False,
            },
            "sleep_meds": {
                "sleep_quality": "fair",
                "sleep_hours": 6.5,
                "meds_taken": True,
                "meds_time": "21:30",
            },
        }
        weekly_payloads = {
            "executive_function": {
                "planning_accuracy_pct": 62,
                "blocker_note": "Evening fatigue is the main reason planned tasks slip.",
            },
            "compulsion_erp": {
                "hierarchy_progress_note": "First hierarchy item showing steady SUDS decay.",
                "suds_decay_note": "60 -> 35 within the same session, faster than week one.",
            },
            "mood_anxiety": {
                "mood_avg": 5.8,
                "anxiety_avg": 5.4,
                "volatility_note": "Mood dips noticeably on days without a morning routine.",
            },
            "sleep_meds": {
                "adherence_pct": 85,
                "routine_consistency_note": "Medication consistent; bedtime drifts on weekends.",
            },
        }

        for key, payload in daily_payloads.items():
            db.add(
                TrackingEntry(
                    user_id=user.id,
                    category_id=by_key[key].id,
                    cadence=TrackingCadence.daily,
                    period_start=today,
                    payload=payload,
                )
            )
        for key, payload in weekly_payloads.items():
            db.add(
                TrackingEntry(
                    user_id=user.id,
                    category_id=by_key[key].id,
                    cadence=TrackingCadence.weekly,
                    period_start=week_start,
                    payload=payload,
                )
            )

        db.add(UserRoadmapState(user_id=user.id, phase_index=1, intro_acknowledged=True))
        db.add(
            RoadmapPhaseHistory(
                user_id=user.id,
                from_phase=0,
                to_phase=1,
                date=today,
                earned=False,
            )
        )

        session = TherapySession(
            user_id=user.id,
            status=TherapySessionStatus.ended,
            transcript=[
                {
                    "role": "user",
                    "text": "I keep putting off the exposure exercises even when I plan for them.",
                    "at": datetime.now(UTC).isoformat(),
                    "crisis_flagged": False,
                },
                {
                    "role": "assistant",
                    "text": (
                        "That's a common pattern — the anticipation of discomfort is often "
                        "worse than the exposure itself. Let's break tomorrow's session into "
                        "two shorter attempts instead of one long one."
                    ),
                    "at": datetime.now(UTC).isoformat(),
                    "crisis_flagged": False,
                },
            ],
            ended_at=datetime.now(UTC),
            crisis_flagged=False,
            llm_input_tokens=180,
            llm_output_tokens=96,
        )
        db.add(session)
        await db.flush()

        db.add(
            UserMemoryProfile(
                user_id=user.id,
                rolling_summary=(
                    "Nirajan is working on ERP for contamination-related OCD and building "
                    "consistent daily structure for ADHD-related task follow-through. "
                    "Breaking exposures into shorter sessions has worked better than one "
                    "long attempt. Evenings are the highest-risk window for both avoidance "
                    "and skipped homework."
                ),
                key_facts={
                    "primary_focus": ["OCD/ERP", "ADHD executive function"],
                    "effective_strategies": ["shorter exposure sessions", "timed work blocks"],
                    "risk_window": "evening",
                },
                session_count=1,
            )
        )

        raw_ticket = secrets.token_urlsafe(32)
        db.add(
            VoiceSocketTicket(
                session_id=session.id,
                user_id=user.id,
                token_hash=hashlib.sha256(raw_ticket.encode()).hexdigest(),
                expires_at=datetime.now(UTC) - timedelta(hours=1),
                used_at=datetime.now(UTC) - timedelta(hours=1, minutes=-1),
            )
        )

        raw_token = secrets.token_urlsafe(32)
        db.add(
            RefreshToken(
                user_id=user.id,
                token_hash=hashlib.sha256(raw_token.encode()).hexdigest(),
                family_id=uuid.uuid4(),
                expires_at=datetime.now(UTC) + timedelta(days=30),
                revoked_at=None,
                user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) seed-script",
                ip="127.0.0.1",
            )
        )

        await db.commit()
        print(f"Seeded {EMAIL} ({user.id}) with one full row per table.")


if __name__ == "__main__":
    asyncio.run(main())
