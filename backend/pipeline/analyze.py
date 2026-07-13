"""
Main entry point: analyze(audio_path) → full JSON result.
Orchestrates all pipeline modules in the correct order.
"""
from __future__ import annotations

import logging
import time

from .feedback import generate_feedback
from .key import detect_key, detect_octave_shift
from .loader import load_audio
from .pitch import detect_pitch
from .quality import check_quality
from .rhythm import detect_rhythm
from .scoring import overall_score, score_pitch, score_rhythm, score_tempo, score_vocal_stability
from .timestamps import map_mistakes

logger = logging.getLogger("audiocoach.pipeline")


def analyze(audio_path: str) -> dict:
    t0 = time.time()
    logger.info("Starting analysis: %s", audio_path)

    # Step 1–3: Load, denoise, trim
    load_result = load_audio(audio_path)
    y, sr = load_result.audio, load_result.sr
    logger.info("Loaded: %.1fs audio (trimmed %.2fs from start)",
                len(y) / sr, load_result.trim_offset)

    # Step 4: Quality check
    quality = check_quality(y, sr)
    logger.info("Quality: SNR=%.1f dB, warning=%s", quality.snr, quality.quality_warning)

    # Step 5: Pitch detection (CREPE + pYIN)
    pitch_frames = detect_pitch(y, sr)
    frames_as_dicts = [
        {
            "time": f.time, "freq": f.freq, "confidence": f.confidence,
            "cents_deviation": f.cents_deviation, "nearest_note": f.nearest_note,
            "is_voiced": f.is_voiced,
        }
        for f in pitch_frames
    ]
    voiced_count = sum(1 for f in pitch_frames if f.is_voiced)
    logger.info("Pitch: %d frames, %d voiced", len(pitch_frames), voiced_count)

    # Step 6: Key detection
    key = detect_key(y, sr)
    logger.info("Key: %s", key)

    # Step 7: Octave shift
    octave = detect_octave_shift(frames_as_dicts, key)

    # Step 8: Rhythm & tempo
    rhythm = detect_rhythm(y, sr)
    rhythm_dict = {
        "tempo": rhythm.tempo,
        "beat_times": rhythm.beat_times,
        "beat_confidence": rhythm.beat_confidence,
        "onset_times": rhythm.onset_times,
        "tempo_curve": rhythm.tempo_curve,
        "rhythm_score": rhythm.rhythm_score,
        "tempo_stability_score": rhythm.tempo_stability_score,
    }
    logger.info("Rhythm: %.1f BPM, %d beats, confidence=%.2f",
                rhythm.tempo, len(rhythm.beat_times), rhythm.beat_confidence)

    # Step 9: Scoring
    p_score = score_pitch(frames_as_dicts)
    r_score = score_rhythm(rhythm_dict)
    t_score = score_tempo(rhythm_dict)
    vs_score = score_vocal_stability(frames_as_dicts)
    o_score = overall_score(p_score, r_score, t_score, vs_score)
    logger.info("Scores: pitch=%d rhythm=%d tempo=%d stability=%d overall=%d",
                p_score, r_score, t_score, vs_score, o_score)

    # Step 10: Timestamp mapping (with trim offset correction)
    mistakes = map_mistakes(
        frames_as_dicts,
        rhythm_data=rhythm_dict,
        trim_offset=load_result.trim_offset,
    )
    logger.info("Mistakes: %d detected", len(mistakes))

    # Step 11: Feedback
    scores_dict = {
        "pitch_score": p_score,
        "rhythm_score": r_score,
        "tempo_score": t_score,
        "vocal_stability_score": vs_score,
        "overall_score": o_score,
        "key_detected": key,
    }
    fb = generate_feedback(scores_dict, mistakes)

    elapsed = time.time() - t0
    logger.info("Analysis complete in %.2fs", elapsed)

    return {
        "overall_score": o_score,
        "pitch_score": p_score,
        "rhythm_score": r_score,
        "tempo_score": t_score,
        "vocal_stability_score": vs_score,
        "key_detected": key,
        "octave_shift": octave,
        "tempo_bpm": rhythm.tempo,
        "quality_warning": quality.quality_warning,
        "snr_db": quality.snr,
        "duration_seconds": round(load_result.original_duration, 2),
        "mistakes": mistakes,
        "feedback_beginner": fb["feedback_beginner"],
        "feedback_musician": fb["feedback_musician"],
        "processing_time_seconds": round(elapsed, 2),
        "pitch_data": _summarize_pitch(frames_as_dicts),
        "rhythm_data": {
            "tempo": rhythm.tempo,
            "beat_count": len(rhythm.beat_times),
            "beat_confidence": rhythm.beat_confidence,
            "tempo_curve": rhythm.tempo_curve,
        },
    }


def _summarize_pitch(frames: list[dict]) -> list[dict]:
    """Return a downsampled pitch curve for visualization (every 50ms)."""
    step = 5  # at 10ms frames, every 5th = 50ms
    return [
        {
            "time": f["time"],
            "freq": f["freq"],
            "confidence": f["confidence"],
            "note": f["nearest_note"],
        }
        for i, f in enumerate(frames) if i % step == 0
    ]
