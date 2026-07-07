"""
audio_loader.py
Person 1 — Audio Pipeline

First stage of the pipeline: takes a raw audio file path and returns a
clean, analysis-ready waveform.

What it does, in order:
    1. Load the file (WAV or MP3) as a mono waveform
    2. Run noise reduction on it
    3. Trim silence off the start and end

Anything downstream (CREPE, pYIN, librosa beat tracking) should receive
its audio through this function, not by loading files directly.
"""

import librosa
import numpy as np
import noisereduce as nr


def load_and_clean_audio(
    file_path: str,
    target_sr: int = 22050,
    noise_reduction_strength: float = 1.0,
) -> tuple[np.ndarray, int, float]:
    """
    Load an audio file, denoise it, and trim silence from both ends.

    Args:
        file_path: path to a WAV or MP3 file.
        target_sr: sample rate to resample to. 22050 Hz is librosa's
                   default and is plenty for pitch/rhythm analysis —
                   no need for full 44.1kHz here.
        noise_reduction_strength: how aggressively to remove noise, from
                   0.0 (off) to 1.0 (maximum). Currently set to 1.0 to
                   prioritize fully removing background noise.
                   KNOWN TRADEOFF (tested, not theoretical): at full
                   strength on heavily noisy recordings, this can crush
                   actual singing volume down to single digits of its
                   original loudness, AND introduce sharp processing
                   artifacts ("musical noise") that make simple
                   post-hoc volume normalization ineffective. Revisit
                   this value once real (not synthetic) noisy test
                   recordings come in from Person 4.

    Returns:
        (waveform, sample_rate, trim_start_seconds)

        waveform is a 1D numpy array of float32 samples, mono.

        trim_start_seconds is how many seconds were cut from the FRONT
        of the original file during silence trimming. CRITICAL: every
        downstream timestamp (pitch problems, rhythm problems) is
        measured relative to the TRIMMED audio. To report a timestamp
        the user can trust — one that lines up with their original
        uploaded file — add trim_start_seconds back on before showing
        it. Example: if trim_start_seconds is 2.3 and a mistake is
        detected at 0:10 in the trimmed audio, the real timestamp to
        show the user is 0:12.3, not 0:10.
    """
    # mono=True collapses stereo to a single channel — pitch/rhythm
    # analysis doesn't need stereo separation
    waveform, sample_rate = librosa.load(file_path, sr=target_sr, mono=True)

    if len(waveform) == 0:
        raise ValueError(f"Loaded audio is empty: {file_path}")

    # Clean background noise before anything else touches the signal.
    # noisereduce estimates a noise profile from the audio itself.
    waveform = nr.reduce_noise(y=waveform, sr=sample_rate, prop_decrease=noise_reduction_strength)

    # Strip silence from start/end. top_db=30 means anything quieter than
    # 30dB below the loudest point in the clip counts as "silence."
    # This is a sane default for vocal recordings — tune later if Person 4's
    # test recordings show it's too aggressive or too lenient.
    #
    # librosa.effects.trim also returns `trim_indices`: [start_sample, end_sample]
    # marking where in the INPUT array the kept audio started/ended. We need
    # the start of that range to know how much got cut from the front.
    waveform, trim_indices = librosa.effects.trim(waveform, top_db=30)

    if len(waveform) == 0:
        raise ValueError(
            f"Audio was entirely trimmed as silence — check recording: {file_path}"
        )

    trim_start_samples = trim_indices[0]
    trim_start_seconds = trim_start_samples / sample_rate

    return waveform, sample_rate, trim_start_seconds


if __name__ == "__main__":
    # Quick manual test — run `python audio_loader.py <path_to_audio_file>`
    import sys

    if len(sys.argv) < 2:
        print("Usage: python audio_loader.py <path_to_audio_file>")
        sys.exit(1)

    path = sys.argv[1]
    audio, sr, trim_start = load_and_clean_audio(path)
    duration = len(audio) / sr
    print(f"Loaded: {path}")
    print(f"Sample rate: {sr} Hz")
    print(f"Trimmed from start: {trim_start:.2f} seconds")
    print(f"Duration after cleaning/trimming: {duration:.2f} seconds")
    print(f"Samples: {len(audio)}")
