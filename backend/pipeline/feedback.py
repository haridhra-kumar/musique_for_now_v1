"""
Feedback generation: converts scores + mistakes into human-readable text.
Two modes: beginner (plain English, encouraging) and musician (technical detail).
Tone rule: never say "you are wrong" — say "this section may need attention."
"""
from __future__ import annotations

from . import config as cfg


def generate_feedback(scores: dict, mistakes: list[dict] | None = None) -> dict:
    p = scores.get("pitch_score", 0)
    r = scores.get("rhythm_score", 0)
    t = scores.get("tempo_score", 0)
    o = scores.get("overall_score", 0)
    vs = scores.get("vocal_stability_score", 80)
    key = scores.get("key_detected", "")
    n_mistakes = len(mistakes) if mistakes else 0

    beginner = _beginner_feedback(p, r, t, o, vs, n_mistakes)
    musician = _musician_feedback(p, r, t, o, vs, key, mistakes)
    exercises = _suggest_exercises(p, vs, r)

    return {
        "feedback_beginner": beginner,
        "feedback_musician": musician,
        "exercises": exercises,
    }


def _suggest_exercises(p: int, vs: int, r: int) -> list[dict]:
    """Suggest a small set of vocal exercises based on which score areas
    are weak. These are informational only — nothing to complete or track,
    just concrete next steps shown alongside the scores.
    """
    exercises: list[dict] = []

    if vs < cfg.SCORE_GOOD:
        exercises.append({
            "name": "Lip trills",
            "why": "Steadies airflow and smooths out pitch wobble on sustained notes.",
            "how": "5 minutes a day — slide up and down a 5-note scale while trilling your lips.",
        })
        exercises.append({
            "name": "Straw phonation",
            "why": "Builds consistent breath support, which reduces vocal shakiness.",
            "how": "Hum a simple melody through a straw for 3–5 minutes, keeping the tone even throughout.",
        })

    if p < cfg.SCORE_GOOD:
        exercises.append({
            "name": "5-tone pitch matching",
            "why": "Directly trains accuracy landing on target notes.",
            "how": "Play a note on a piano or app, match it with your voice, then move up/down by a step and repeat.",
        })
        exercises.append({
            "name": "Tongue trills",
            "why": "Relaxes jaw and tongue tension, which is a common cause of pitch instability.",
            "how": "Roll an 'rrr' through a full major scale, ascending then descending, staying relaxed throughout.",
        })

    if r < cfg.SCORE_GOOD:
        exercises.append({
            "name": "Metronome clapping",
            "why": "Rebuilds a steady internal sense of timing before adding pitch back in.",
            "how": "Clap on every beat along with a metronome at 60–80 BPM for 5 minutes, then try subdividing.",
        })

    return exercises


def _beginner_feedback(p: int, r: int, t: int, o: int, vs: int,
                       n_mistakes: int) -> str:
    parts: list[str] = []

    # Overall opening
    if o >= cfg.SCORE_EXCELLENT:
        parts.append("Excellent performance! You're singing with great accuracy and control.")
    elif o >= cfg.SCORE_GOOD:
        parts.append("Nice work! Your singing is solid with just a few areas to polish.")
    elif o >= cfg.SCORE_FAIR:
        parts.append("Good effort! There are some spots that could use a bit more practice.")
    elif o >= cfg.SCORE_NEEDS_WORK:
        parts.append("You're on the right track! With some focused practice, you'll see real improvement.")
    else:
        parts.append("Keep practicing! Every singer starts somewhere, and consistent practice is what matters most.")

    # Pitch detail
    if p >= cfg.SCORE_EXCELLENT:
        parts.append("Your pitch accuracy is impressive — you're hitting the notes really well.")
    elif p >= cfg.SCORE_GOOD:
        parts.append("Your pitch is mostly on target with just a few slips.")
    elif p >= cfg.SCORE_FAIR:
        parts.append("Some notes are landing a bit off — try singing more slowly and listening carefully to each note.")
    else:
        parts.append("Pitch needs some attention — try humming the melody first before singing with full voice.")

    # Rhythm
    if r >= cfg.SCORE_GOOD:
        parts.append("Your timing feels natural and well-paced.")
    elif r >= cfg.SCORE_FAIR:
        parts.append("Your rhythm is mostly steady, with a few spots where the timing drifts.")
    else:
        parts.append("Try tapping along to the beat while you sing — it can help lock in your timing.")

    # Tempo
    if t < cfg.SCORE_FAIR:
        parts.append("Your tempo varies quite a bit — try practicing with a metronome or backing track.")

    # Vocal stability
    if vs < cfg.SCORE_FAIR:
        parts.append("Some notes sound a bit shaky — focus on breathing support to hold notes steadier.")

    # Mistakes count
    if n_mistakes > 10:
        parts.append(f"We spotted {n_mistakes} areas to review — check the timestamps to see exactly where.")
    elif n_mistakes > 3:
        parts.append(f"There are {n_mistakes} spots worth reviewing in the detailed breakdown.")
    elif n_mistakes > 0:
        parts.append("Just a couple of small things to work on — check the timestamps below.")

    return " ".join(parts)


def _musician_feedback(p: int, r: int, t: int, o: int, vs: int,
                       key: str, mistakes: list[dict] | None) -> str:
    parts: list[str] = []

    parts.append(f"Overall: {o}/100 | Pitch: {p}/100 | Rhythm: {r}/100 | Tempo: {t}/100 | Stability: {vs}/100")

    if key:
        parts.append(f"Detected key: {key}")

    # Pitch analysis
    if p >= cfg.SCORE_EXCELLENT:
        parts.append("Strong intonation throughout. Pitch accuracy is well above average.")
    elif p >= cfg.SCORE_GOOD:
        parts.append(f"Pitch score {p}/100 — generally accurate with minor deviations on some frames.")
    elif p >= cfg.SCORE_FAIR:
        parts.append(f"Pitch score {p}/100 — several frames showed >30 cent deviation. Check flagged timestamps for specific notes.")
    else:
        parts.append(f"Pitch score {p}/100 — significant intonation issues detected across multiple sections.")

    # Rhythm
    if r < cfg.SCORE_GOOD:
        parts.append(f"Rhythm regularity score {r}/100 — beat onset timing shows inconsistency. Consider practicing with a click track.")

    # Tempo
    if t < cfg.SCORE_FAIR:
        parts.append(f"Tempo stability {t}/100 — noticeable rushing/dragging detected. Check tempo curve for drift points.")

    # Vocal stability
    if vs < cfg.SCORE_FAIR:
        parts.append(f"Vocal stability {vs}/100 — excessive pitch wobble detected on sustained notes beyond typical vibrato range.")

    # Top mistakes summary
    if mistakes:
        high_sev = [m for m in mistakes if m.get("severity") == "high"]
        if high_sev:
            top_3 = high_sev[:3]
            timestamps = ", ".join(m["timestamp"] for m in top_3)
            parts.append(f"Priority review points: {timestamps}")

    return "\n".join(parts)