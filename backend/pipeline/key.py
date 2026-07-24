"""
Musical key detection using chroma features with Krumhansl-Kessler profiles.
More accurate than simple argmax — handles major/relative-minor disambiguation.
Also provides octave-shift detection for pitch-tracker error cleanup.
"""
from __future__ import annotations

import librosa
import numpy as np

from . import config as cfg

KEYS = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]

# Krumhansl-Kessler key profiles (empirically derived tonal weights)
_MAJOR_PROFILE = np.array([6.35, 2.23, 3.48, 2.33, 4.38, 4.09,
                           2.52, 5.19, 2.39, 3.66, 2.29, 2.88])
_MINOR_PROFILE = np.array([6.33, 2.68, 3.52, 5.38, 2.60, 3.53,
                           2.54, 4.75, 3.98, 2.69, 3.34, 3.17])


def detect_key(y: np.ndarray, sr: int) -> str:
    duration = len(y) / sr
    if duration < cfg.MIN_DURATION_FOR_KEY:
        return "unknown"

    chroma = librosa.feature.chroma_cqt(y=y, sr=sr)
    chroma_mean = chroma.mean(axis=1)

    best_corr = -1.0
    best_key = "C major"

    for shift in range(12):
        rotated = np.roll(chroma_mean, -shift)

        corr_major = float(np.corrcoef(rotated, _MAJOR_PROFILE)[0, 1])
        if corr_major > best_corr:
            best_corr = corr_major
            best_key = f"{KEYS[shift]} major"

        corr_minor = float(np.corrcoef(rotated, _MINOR_PROFILE)[0, 1])
        if corr_minor > best_corr:
            best_corr = corr_minor
            best_key = f"{KEYS[shift]} minor"

    return best_key


def detect_octave_shift(pitch_frames: list[dict], key: str) -> int:
    """
    Detect if the singer's overall register suggests an octave shift.
    Returns 0 (normal), -12 (sang octave low), or +12 (sang octave high).
    An octave shift is NOT penalized — it's informational.
    """
    voiced_freqs = [
        f["freq"] for f in pitch_frames
        if f.get("is_voiced", f.get("confidence", 0) > 0.5) and f.get("freq", 0) > 0
    ]
    if not voiced_freqs:
        return 0

    median_freq = float(np.median(voiced_freqs))

    # Typical vocal ranges:
    #   Bass:    80–330 Hz
    #   Tenor:   130–500 Hz
    #   Alto:    175–700 Hz
    #   Soprano: 250–1000 Hz
    # If median is below bass range, likely an octave-tracking error
    if median_freq < 75:
        return -12
    if median_freq > 900:
        return 12

    return 0
