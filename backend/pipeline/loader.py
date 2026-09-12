"""
Audio ingestion: load any format → clean mono numpy array at a fixed sample rate.
Handles FFmpeg conversion, noise reduction, and silence trimming.
Returns the trim offset so downstream timestamps can be corrected.
"""
from __future__ import annotations

import os
import subprocess
import tempfile
from dataclasses import dataclass

from . import numpy_compat  # noqa: F401 # isort: skip
import librosa
import noisereduce as nr
import numpy as np

from . import config as cfg


@dataclass
class LoadResult:
    audio: np.ndarray
    sr: int
    trim_offset: float     # seconds trimmed from the start
    original_duration: float


_VIDEO_EXTENSIONS = {".mp4", ".mov", ".mkv", ".avi", ".webm", ".m4v"}
_AUDIO_EXTENSIONS = {".wav", ".mp3", ".flac", ".ogg", ".aac", ".m4a", ".wma"}
_ALL_EXTENSIONS = _VIDEO_EXTENSIONS | _AUDIO_EXTENSIONS


def load_audio(path: str) -> LoadResult:
    if not os.path.isfile(path):
        raise FileNotFoundError(f"File not found: {path}")

    ext = os.path.splitext(path)[1].lower()
    if ext not in _ALL_EXTENSIONS:
        raise ValueError(f"Unsupported format: {ext}")

    wav_path = path
    tmp_path: str | None = None

    try:
        if ext in _VIDEO_EXTENSIONS:
            tmp_path = _extract_audio_ffmpeg(path)
            wav_path = tmp_path
            y, sr = librosa.load(wav_path, sr=cfg.SAMPLE_RATE, mono=False)
        else:
            try:
                y, sr = librosa.load(wav_path, sr=cfg.SAMPLE_RATE, mono=False)
            except Exception as load_err:
                try:
                    tmp_path = _extract_audio_ffmpeg(path)
                    wav_path = tmp_path
                    y, sr = librosa.load(wav_path, sr=cfg.SAMPLE_RATE, mono=False)
                except Exception:
                    raise RuntimeError(
                        f"Could not load audio file ({load_err}). "
                        "If this format requires FFmpeg, install it: "
                        "brew install ffmpeg (Mac) / sudo apt install ffmpeg (Linux) / "
                        "choco install ffmpeg (Windows)"
                    )

        if y.ndim == 2:
            y = _smart_mono(y)

        original_duration = float(len(y)) / sr

        y = nr.reduce_noise(
            y=y, sr=sr,
            prop_decrease=cfg.NOISE_REDUCE_PROP_DECREASE,
            stationary=cfg.NOISE_REDUCE_STATIONARY,
        )

        y_trimmed, trim_indices = librosa.effects.trim(y, top_db=cfg.SILENCE_TRIM_TOP_DB)
        trim_offset = float(trim_indices[0]) / sr

        return LoadResult(
            audio=y_trimmed,
            sr=sr,
            trim_offset=trim_offset,
            original_duration=original_duration,
        )
    finally:
        if tmp_path and os.path.exists(tmp_path):
            os.unlink(tmp_path)


def _extract_audio_ffmpeg(input_path: str) -> str:
    fd, out_path = tempfile.mkstemp(suffix=".wav")
    os.close(fd)
    try:
        subprocess.run(
            [
                "ffmpeg", "-i", input_path,
                "-vn",                         # drop video
                "-ar", str(cfg.SAMPLE_RATE),   # target sample rate
                "-sample_fmt", "s16",          # 16-bit PCM
                "-y",                          # overwrite
                out_path,
            ],
            check=True,
            capture_output=True,
        )
    except FileNotFoundError:
        raise RuntimeError(
            "FFmpeg not found. Install it: "
            "brew install ffmpeg (Mac) / sudo apt install ffmpeg (Linux) / "
            "choco install ffmpeg (Windows)"
        )
    except subprocess.CalledProcessError as e:
        raise RuntimeError(f"FFmpeg failed: {e.stderr.decode()[:500]}")
    return out_path


def _smart_mono(y_stereo: np.ndarray) -> np.ndarray:
    """
    If one channel has significantly more vocal-like energy, use that channel
    instead of naively averaging (which mixes backing tracks into the vocal).
    """
    if y_stereo.shape[0] != 2:
        return librosa.to_mono(y_stereo)

    energy_0 = float(np.mean(y_stereo[0] ** 2))
    energy_1 = float(np.mean(y_stereo[1] ** 2))

    ratio = max(energy_0, energy_1) / (min(energy_0, energy_1) + 1e-10)
    if ratio > 3.0:
        return y_stereo[0] if energy_0 > energy_1 else y_stereo[1]

    return librosa.to_mono(y_stereo)
