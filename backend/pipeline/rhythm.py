"""
Rhythm and tempo analysis using librosa (primary) with optional madmom cross-validation.
Measures beat regularity and tempo consistency relative to the singer's own tempo
(not an external BPM reference).
"""
from __future__ import annotations

from dataclasses import dataclass, field

import librosa
import numpy as np

from . import config as cfg


@dataclass
class RhythmResult:
    tempo: float                     # BPM (median from recording itself)
    beat_times: list[float]          # seconds of each detected beat
    beat_confidence: float           # 0–1 agreement between trackers
    onset_times: list[float]         # vocal onset times
    tempo_curve: list[dict]          # [{time, bpm}] — local tempo over time
    rhythm_score: int                # 0–100 from beat regularity
    tempo_stability_score: int       # 0–100 from tempo consistency


def detect_rhythm(y: np.ndarray, sr: int) -> RhythmResult:
    tempo_librosa, beats_librosa = librosa.beat.beat_track(y=y, sr=sr, units="time")
    if isinstance(tempo_librosa, np.ndarray):
        tempo_librosa = float(tempo_librosa[0]) if len(tempo_librosa) > 0 else 120.0
    beats_librosa = list(beats_librosa.astype(float)) if len(beats_librosa) > 0 else []

    onset_env = librosa.onset.onset_strength(y=y, sr=sr)
    onset_frames = librosa.onset.onset_detect(y=y, sr=sr, onset_envelope=onset_env)
    onset_times = list(librosa.frames_to_time(onset_frames, sr=sr).astype(float))

    beat_times = beats_librosa
    beat_confidence = 0.7
    tempo = tempo_librosa

    if cfg.USE_MADMOM:
        try:
            import madmom
            proc = madmom.features.beats.DBNBeatTrackingProcessor(fps=100)
            act = madmom.features.beats.RNNBeatProcessor()(
                madmom.audio.signal.Signal(y, sample_rate=sr)
            )
            beats_madmom = list(proc(act).astype(float))

            if len(beats_madmom) > 3 and len(beats_librosa) > 3:
                agreement = _beat_agreement(beats_librosa, beats_madmom,
                                            cfg.BEAT_AGREEMENT_TOLERANCE)
                beat_confidence = agreement

                if agreement > 0.6:
                    beat_times = beats_madmom  # madmom generally more accurate
                    if len(beats_madmom) > 1:
                        intervals = np.diff(beats_madmom)
                        tempo = float(60.0 / np.median(intervals))
        except (ImportError, Exception):
            pass

    tempo_curve = _compute_tempo_curve(beat_times)
    rhythm_score = _score_beat_regularity(beat_times)
    tempo_stability = _score_tempo_stability(tempo_curve, tempo)

    return RhythmResult(
        tempo=round(tempo, 1),
        beat_times=[round(t, 3) for t in beat_times],
        beat_confidence=round(beat_confidence, 2),
        onset_times=[round(t, 3) for t in onset_times],
        tempo_curve=tempo_curve,
        rhythm_score=rhythm_score,
        tempo_stability_score=tempo_stability,
    )


def _beat_agreement(beats_a: list[float], beats_b: list[float],
                    tolerance: float) -> float:
    if not beats_a or not beats_b:
        return 0.0
    matched = 0
    b_arr = np.array(beats_b)
    for t in beats_a:
        diffs = np.abs(b_arr - t)
        if np.min(diffs) < tolerance:
            matched += 1
    return matched / max(len(beats_a), len(beats_b))


def _compute_tempo_curve(beat_times: list[float]) -> list[dict]:
    if len(beat_times) < 3:
        return []

    curve = []
    intervals = np.diff(beat_times)
    window = cfg.TEMPO_DRIFT_WINDOW

    for i in range(len(intervals)):
        start = max(0, i - window // 2)
        end = min(len(intervals), i + window // 2 + 1)
        local_bpm = 60.0 / float(np.median(intervals[start:end]))
        curve.append({
            "time": round(beat_times[i], 3),
            "bpm": round(local_bpm, 1),
        })
    return curve


def _score_beat_regularity(beat_times: list[float]) -> int:
    if len(beat_times) < 4:
        return 70

    gaps = np.diff(beat_times)
    if len(gaps) < 3:
        return 70

    regularity = 1 - (float(np.std(gaps)) / (float(np.mean(gaps)) + 1e-9))
    return int(max(0, min(100, regularity * 100)))


def _score_tempo_stability(tempo_curve: list[dict], global_tempo: float) -> int:
    if not tempo_curve or global_tempo <= 0:
        return 80

    deviations = [abs(p["bpm"] - global_tempo) / global_tempo for p in tempo_curve]
    mean_deviation = float(np.mean(deviations))

    score = 100 * (1 - min(mean_deviation * 5, 1.0))
    return int(max(0, min(100, score)))
