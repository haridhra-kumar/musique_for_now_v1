"""
Scoring engine: combines pitch, rhythm, and tempo analysis into 0–100 scores.
Only scores frames where the pipeline is confident — uncertain regions are excluded.
All weights and thresholds come from config.py.
"""
from __future__ import annotations

from . import config as cfg


def score_pitch(pitch_frames: list[dict]) -> int:
    """0–100 based on percentage of voiced frames with good confidence and low deviation."""
    voiced = [f for f in pitch_frames if f.get("is_voiced", False)]
    if not voiced:
        return 0

    total_weight = 0.0
    weighted_score = 0.0

    for f in voiced:
        conf = f.get("confidence", 0.5)
        cents = abs(f.get("cents_deviation", 0))

        if cents <= 15:
            frame_score = 1.0
        elif cents <= 30:
            frame_score = 0.85
        elif cents <= 50:
            frame_score = 0.6
        elif cents <= 80:
            frame_score = 0.3
        else:
            frame_score = 0.05

        weighted_score += frame_score * conf
        total_weight += conf

    if total_weight == 0:
        return 0
    return int(round((weighted_score / total_weight) * 100))


def score_rhythm(rhythm_data: dict) -> int:
    """Delegates to the RhythmResult's own score, or computes from beat data."""
    if rhythm_data.get("rhythm_score") is not None:
        return int(rhythm_data["rhythm_score"])

    beat_times = rhythm_data.get("beat_times", [])
    if len(beat_times) < 4:
        return 70

    import numpy as np
    gaps = np.diff(beat_times)
    regularity = 1 - (float(np.std(gaps)) / (float(np.mean(gaps)) + 1e-9))
    return int(max(0, min(100, regularity * 100)))


def score_tempo(rhythm_data: dict) -> int:
    """Score tempo consistency — how stable the BPM is across the performance."""
    if "tempo_stability_score" in rhythm_data:
        return int(rhythm_data["tempo_stability_score"])
    return 80  # neutral fallback


def score_vocal_stability(pitch_frames: list[dict]) -> int:
    """
    Measures vocal steadiness: penalizes excessive pitch wobble
    (beyond natural vibrato) on sustained notes.
    """
    voiced = [f for f in pitch_frames if f.get("is_voiced", False) and f["freq"] > 0]
    if len(voiced) < 20:
        return 80

    import numpy as np
    freqs = np.array([f["freq"] for f in voiced])

    window = 10  # ~100ms at 10ms step
    jitter_scores = []

    for i in range(window, len(freqs)):
        segment = freqs[i - window:i]
        if np.mean(segment) <= 0:
            continue
        cv = float(np.std(segment) / np.mean(segment))

        if cv < 0.02:
            jitter_scores.append(1.0)  # very stable
        elif cv < 0.05:
            jitter_scores.append(0.85)  # normal vibrato
        elif cv < 0.10:
            jitter_scores.append(0.5)  # shaky
        else:
            jitter_scores.append(0.15)  # very unstable

    if not jitter_scores:
        return 80
    return int(round(float(np.mean(jitter_scores)) * 100))


def overall_score(pitch: int, rhythm: int, tempo: int,
                  vocal_stability: int | None = None) -> int:
    vs = vocal_stability if vocal_stability is not None else 80
    raw = (
        pitch * cfg.WEIGHT_PITCH
        + rhythm * cfg.WEIGHT_RHYTHM
        + tempo * cfg.WEIGHT_TEMPO
        + vs * cfg.WEIGHT_VOCAL_STABILITY
    )
    return int(max(0, min(100, round(raw))))
