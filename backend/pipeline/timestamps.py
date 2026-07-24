"""
Timestamp mapping: converts low-confidence / off-pitch frames into
user-facing mistake entries with MM:SS timestamps.
Applies the silence-trim offset so timestamps match the original file.
Merges nearby mistakes into single events.
"""
from __future__ import annotations

from dataclasses import dataclass

from . import config as cfg


@dataclass
class Mistake:
    timestamp: str       # "M:SS" in original file time
    time_seconds: float  # raw seconds in original file
    type: str            # "pitch" | "rhythm" | "tempo" | "unclear"
    severity: str        # "low" | "medium" | "high"
    description: str     # human-readable
    confidence: float    # how sure are we this is real


def map_mistakes(
    pitch_frames: list[dict],
    rhythm_data: dict | None = None,
    trim_offset: float = 0.0,
) -> list[dict]:
    mistakes: list[Mistake] = []

    # ── Pitch mistakes ───────────────────────────────────────
    _extract_pitch_mistakes(pitch_frames, trim_offset, mistakes)

    # ── Rhythm mistakes ──────────────────────────────────────
    if rhythm_data:
        _extract_rhythm_mistakes(rhythm_data, trim_offset, mistakes)

    # ── Merge nearby mistakes of the same type ───────────────
    merged = _merge_nearby(mistakes, cfg.MISTAKE_MERGE_WINDOW)

    merged.sort(key=lambda m: m.time_seconds)

    return [
        {
            "timestamp": m.timestamp,
            "time_seconds": round(m.time_seconds, 2),
            "type": m.type,
            "severity": m.severity,
            "description": m.description,
            "confidence": round(m.confidence, 2),
        }
        for m in merged
    ]


def _extract_pitch_mistakes(
    frames: list[dict], trim_offset: float, out: list[Mistake]
) -> None:
    """Flag only *sustained* off-pitch stretches, not individual frames.

    A single 10 ms frame drifting sharp/flat is normal (vibrato, expression).
    We only report a mistake when the singer stays off the note for at least
    PITCH_SUSTAINED_MIN_SEC, and we collapse each such stretch into one event
    keyed on its worst moment. This keeps the pitch map's drift markers
    meaningful instead of striping the whole track red.
    """
    last_flagged_time = -999.0

    # State for the current off-pitch run
    run_start: float | None = None
    run_worst_cents = 0.0
    run_worst_note = ""
    run_conf = 0.0

    def flush(run_end: float) -> None:
        nonlocal last_flagged_time, run_start, run_worst_cents, run_worst_note, run_conf
        if run_start is None:
            return
        duration = run_end - run_start
        long_enough = duration >= cfg.PITCH_SUSTAINED_MIN_SEC
        spaced_out = (run_start - last_flagged_time) > cfg.MISTAKE_MERGE_WINDOW
        if long_enough and spaced_out:
            if run_worst_cents >= cfg.PITCH_DEVIATION_HIGH:
                severity = "high"
                desc = (
                    f"Pitch noticeably off from {run_worst_note} here"
                    if run_worst_note else "Pitch significantly off-key in this section"
                )
                mistake_conf = min(run_conf, 0.9)
            else:
                severity = "medium"
                desc = "Pitch drifts slightly here — ease back onto the note"
                mistake_conf = min(run_conf * 0.85, 0.8)
            orig_time = run_start + trim_offset
            out.append(Mistake(
                timestamp=_format_time(orig_time),
                time_seconds=orig_time,
                type="pitch",
                severity=severity,
                description=desc,
                confidence=mistake_conf,
            ))
            last_flagged_time = run_start
        # reset run
        run_start = None
        run_worst_cents = 0.0
        run_worst_note = ""
        run_conf = 0.0

    step = cfg.CREPE_STEP_SIZE / 1000.0  # ms → seconds

    for f in frames:
        t = f.get("time", 0)
        conf = f.get("confidence", 0)
        cents = abs(f.get("cents_deviation", 0))
        is_voiced = f.get("is_voiced", False)

        # Unreliable or in-tune frame ends any active off-pitch run
        if not is_voiced or conf < cfg.CREPE_CONFIDENCE_THRESHOLD or cents < cfg.PITCH_DEVIATION_MEDIUM:
            flush(t)
            continue

        # Frame is voiced, confident, and off-pitch → extend the run
        if run_start is None:
            run_start = t
        if cents > run_worst_cents:
            run_worst_cents = cents
            run_worst_note = f.get("nearest_note", "") or run_worst_note
        run_conf = max(run_conf, conf)

    # Flush a run still open at the end of the file
    if frames:
        flush(frames[-1].get("time", 0) + step)


def _extract_rhythm_mistakes(
    rhythm_data: dict, trim_offset: float, out: list[Mistake]
) -> None:
    tempo_curve = rhythm_data.get("tempo_curve", [])
    global_tempo = rhythm_data.get("tempo", 0)
    if not tempo_curve or global_tempo <= 0:
        return

    for point in tempo_curve:
        t = point["time"]
        bpm = point["bpm"]
        deviation = abs(bpm - global_tempo) / global_tempo

        if deviation < 0.08:
            continue

        orig_time = t + trim_offset
        if deviation > 0.15:
            severity = "high"
            direction = "rushing" if bpm > global_tempo else "dragging"
            desc = f"Tempo {direction} significantly here"
        else:
            severity = "medium"
            direction = "speeding up" if bpm > global_tempo else "slowing down"
            desc = f"Tempo {direction} slightly in this section"

        out.append(Mistake(
            timestamp=_format_time(orig_time),
            time_seconds=orig_time,
            type="tempo",
            severity=severity,
            description=desc,
            confidence=0.65,
        ))


def _merge_nearby(mistakes: list[Mistake], window: float) -> list[Mistake]:
    if not mistakes:
        return []

    mistakes.sort(key=lambda m: m.time_seconds)
    merged: list[Mistake] = [mistakes[0]]

    for m in mistakes[1:]:
        prev = merged[-1]
        if m.type == prev.type and (m.time_seconds - prev.time_seconds) < window:
            if _severity_rank(m.severity) > _severity_rank(prev.severity):
                merged[-1] = m
        else:
            merged.append(m)

    return merged


def _severity_rank(s: str) -> int:
    return {"low": 0, "medium": 1, "high": 2}.get(s, 0)


def _format_time(seconds: float) -> str:
    seconds = max(0, seconds)
    mins = int(seconds // 60)
    secs = int(seconds % 60)
    return f"{mins}:{secs:02d}"
