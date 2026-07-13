"""
Pitch detection using CREPE (primary) with pYIN cross-validation.
Returns per-frame pitch data with confidence scores that incorporate
agreement between the two detectors.
"""
from __future__ import annotations

from dataclasses import dataclass

import crepe
import librosa
import numpy as np

from . import config as cfg


@dataclass
class PitchFrame:
    time: float
    freq: float
    confidence: float
    cents_deviation: float  # deviation from nearest note in cents
    nearest_note: str
    is_voiced: bool


NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]


def _hz_to_midi(freq: float) -> float:
    if freq <= 0:
        return 0.0
    return 69 + 12 * np.log2(freq / 440.0)


def _midi_to_note_name(midi: float) -> str:
    midi_int = int(round(midi))
    octave = (midi_int // 12) - 1
    note = NOTE_NAMES[midi_int % 12]
    return f"{note}{octave}"


def _cents_from_nearest(freq: float) -> tuple[float, str]:
    if freq <= 0:
        return 0.0, ""
    midi = _hz_to_midi(freq)
    nearest_midi = round(midi)
    cents = (midi - nearest_midi) * 100
    note_name = _midi_to_note_name(nearest_midi)
    return round(cents, 1), note_name


def detect_pitch(y: np.ndarray, sr: int) -> list[PitchFrame]:
    time_crepe, freq_crepe, conf_crepe, _ = crepe.predict(
        y, sr,
        model_capacity=cfg.CREPE_MODEL_CAPACITY,
        step_size=cfg.CREPE_STEP_SIZE,
        viterbi=True,
    )

    f0_pyin, voiced_pyin, _ = librosa.pyin(
        y, fmin=cfg.PYIN_FMIN, fmax=cfg.PYIN_FMAX, sr=sr,
        frame_length=2048, hop_length=int(sr * cfg.CREPE_STEP_SIZE / 1000),
    )
    time_pyin = librosa.times_like(f0_pyin, sr=sr,
                                    hop_length=int(sr * cfg.CREPE_STEP_SIZE / 1000))

    frames: list[PitchFrame] = []
    for i in range(len(time_crepe)):
        t = float(time_crepe[i])
        f = float(freq_crepe[i])
        c = float(conf_crepe[i])
        is_voiced = c >= cfg.CREPE_CONFIDENCE_THRESHOLD

        pyin_idx = _find_nearest_idx(time_pyin, t)
        if pyin_idx is not None and voiced_pyin[pyin_idx]:
            pyin_f = float(f0_pyin[pyin_idx])
            if pyin_f > 0 and f > 0:
                diff_cents = abs(1200 * np.log2((f + 1e-10) / (pyin_f + 1e-10)))
                if diff_cents < cfg.PYIN_AGREEMENT_CENTS:
                    c = min(1.0, c * 1.15)
                elif diff_cents > 100:
                    c *= 0.7
                    is_voiced = c >= cfg.CREPE_CONFIDENCE_THRESHOLD

        if f > 0 and is_voiced:
            f = _fix_octave_jump(frames, f)

        cents_dev, note = _cents_from_nearest(f)

        frames.append(PitchFrame(
            time=round(t, 4),
            freq=round(f, 2),
            confidence=round(c, 4),
            cents_deviation=cents_dev,
            nearest_note=note,
            is_voiced=is_voiced,
        ))

    return frames


def _find_nearest_idx(arr: np.ndarray, val: float) -> int | None:
    if len(arr) == 0:
        return None
    idx = int(np.argmin(np.abs(arr - val)))
    if abs(arr[idx] - val) < 0.02:
        return idx
    return None


def _fix_octave_jump(prev_frames: list[PitchFrame], freq: float) -> float:
    """Fix single-frame octave jumps from the pitch tracker."""
    if len(prev_frames) < 3:
        return freq

    recent_voiced = [f for f in prev_frames[-5:] if f.is_voiced and f.freq > 0]
    if len(recent_voiced) < 2:
        return freq

    median_freq = float(np.median([f.freq for f in recent_voiced]))
    if median_freq <= 0:
        return freq

    ratio = freq / median_freq
    if 1.8 < ratio < 2.2:
        return freq / 2
    if 0.45 < ratio < 0.55:
        return freq * 2

    return freq
