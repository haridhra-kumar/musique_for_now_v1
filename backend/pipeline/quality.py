"""
Recording quality assessment: SNR estimation and quality warning.
Uses the lowest-energy frames as a noise-floor estimate.
"""
from __future__ import annotations

from dataclasses import dataclass

import numpy as np

from . import config as cfg


@dataclass
class QualityResult:
    snr: float
    quality_warning: bool
    noise_floor_db: float
    signal_level_db: float


def check_quality(y: np.ndarray, sr: int) -> QualityResult:
    frame_length = int(0.025 * sr)  # 25ms frames
    hop_length = int(0.010 * sr)    # 10ms hop

    n_frames = 1 + (len(y) - frame_length) // hop_length
    if n_frames < 10:
        return QualityResult(snr=0.0, quality_warning=True,
                             noise_floor_db=-60.0, signal_level_db=-60.0)

    frame_energies = np.array([
        np.mean(y[i * hop_length: i * hop_length + frame_length] ** 2)
        for i in range(n_frames)
    ])

    noise_floor = float(np.percentile(frame_energies, cfg.NOISE_FLOOR_PERCENTILE))
    signal_level = float(np.mean(frame_energies[frame_energies > noise_floor]))

    noise_floor = max(noise_floor, 1e-12)
    signal_level = max(signal_level, 1e-12)

    snr_db = round(10 * np.log10(signal_level / noise_floor), 2)
    noise_floor_db = round(10 * np.log10(noise_floor), 2)
    signal_level_db = round(10 * np.log10(signal_level), 2)

    return QualityResult(
        snr=snr_db,
        quality_warning=snr_db < cfg.SNR_WARNING_THRESHOLD,
        noise_floor_db=noise_floor_db,
        signal_level_db=signal_level_db,
    )
