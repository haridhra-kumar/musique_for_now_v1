"""
test_audio_loader.py
Person 1 — Audio Pipeline

Batch tester for audio_loader.py. Drop any WAV or MP3 files into the
test_recordings/ folder (next to this script) and run:

    python test_audio_loader.py

For every file, it will:
  1. Run it through load_and_clean_audio() (noise reduction + silence trim)
  2. Print a noise-level measurement before/after, as an objective number
  3. SAVE the cleaned result as a playable .wav file in
     test_recordings/cleaned_output/ — so you can actually open and
     listen to it yourself, side by side with the original.

One bad file won't crash the whole batch — failures are reported and
the script keeps going.
"""

import os
import numpy as np
import soundfile as sf
import librosa
from musique_for_now_v1.backend.audio_loader import load_and_clean_audio

TEST_FOLDER = "test_recordings"
OUTPUT_FOLDER = "test_recordings/cleaned_output"
SUPPORTED_EXTENSIONS = (".wav", ".mp3")


def estimate_noise_floor_db(audio: np.ndarray, frame_length: int = 2048, hop_length: int = 512) -> float:
    """
    Estimate how loud the background noise is, in decibels.

    How it works: it chops the audio into short frames and measures the
    volume of each one. The quietest 10% of frames are assumed to be
    "background noise" rather than singing (since even a sustained note
    has tiny natural dips). A LOWER number (more negative) means quieter
    background noise, which is what we want after cleaning.

    This isn't a lab-grade SNR measurement, but it's a real, objective
    number that goes down when noise reduction actually works — much
    more reliable than judging it by ear.
    """
    frames = librosa.util.frame(audio, frame_length=frame_length, hop_length=hop_length)
    rms_per_frame = np.sqrt(np.mean(frames ** 2, axis=0))
    quietest_10_percent = np.percentile(rms_per_frame, 10)
    return 20 * np.log10(quietest_10_percent + 1e-10)


def get_test_files(folder: str) -> list[str]:
    if not os.path.isdir(folder):
        print(f"Folder not found: {folder}")
        return []

    files = [
        os.path.join(folder, f)
        for f in sorted(os.listdir(folder))
        if f.lower().endswith(SUPPORTED_EXTENSIONS)
    ]
    return files


def run_batch_test():
    files = get_test_files(TEST_FOLDER)

    if not files:
        print(f"No .wav or .mp3 files found in '{TEST_FOLDER}/'.")
        print("Drop some audio files in there and run this again.")
        return

    os.makedirs(OUTPUT_FOLDER, exist_ok=True)

    print(f"Found {len(files)} file(s) to test.\n")
    header = f"{'File':<28} {'Duration':>9} {'Noise before':>13} {'Noise after':>12} {'Quieter by':>11}  Status"
    print(header)
    print("-" * len(header))

    passed = 0
    failed = 0

    for path in files:
        filename = os.path.basename(path)
        try:
            # Load the RAW, unprocessed audio
            raw_audio, sr = librosa.load(path, sr=22050, mono=True)

            # Trim silence from the raw audio too (WITHOUT denoising) so we're
            # comparing the same stretch of audio in both measurements. If we
            # measured "before" on the full raw file (silence padding and all)
            # and "after" on the trimmed+cleaned file, a file with long silent
            # padding would look artificially noisy "before" just because that
            # silence got cut — not because denoising did anything. Trimming
            # both sides the same way isolates what noisereduce actually did.
            raw_trimmed, _ = librosa.effects.trim(raw_audio, top_db=30)
            noise_before = estimate_noise_floor_db(raw_trimmed)

            # Run it through the actual loader (denoise + trim)
            cleaned_audio, cleaned_sr, trim_start = load_and_clean_audio(path)
            noise_after = estimate_noise_floor_db(cleaned_audio)
            cleaned_duration = len(cleaned_audio) / cleaned_sr

            improvement_db = noise_before - noise_after  # positive = got quieter = good

            # Save the cleaned result so it can actually be listened to
            name_without_ext = os.path.splitext(filename)[0]
            output_path = os.path.join(OUTPUT_FOLDER, f"{name_without_ext}_CLEANED.wav")
            sf.write(output_path, cleaned_audio, cleaned_sr)

            print(
                f"{filename:<28} {cleaned_duration:>8.2f}s {noise_before:>11.1f}dB "
                f"{noise_after:>10.1f}dB {improvement_db:>9.1f}dB   OK  (trimmed {trim_start:.2f}s from start)"
            )
            passed += 1

        except Exception as e:
            print(f"{filename:<28} {'--':>9} {'--':>13} {'--':>12} {'--':>11}   FAILED: {e}")
            failed += 1

    print("-" * len(header))
    print(f"{passed} passed, {failed} failed out of {len(files)} total.")
    print(
        "\n'Quieter by' is how much the background noise level dropped after cleaning, "
        "in decibels. A positive number means noise reduction worked — the bigger it is, "
        "the more noise got removed. A number near zero on an already-clean recording is "
        "expected and fine; it just means there wasn't much noise to remove."
    )
    print(f"\nCleaned, listenable versions saved to: {OUTPUT_FOLDER}/")
    print("Open them with any media player and compare against your originals.")


if __name__ == "__main__":
    run_batch_test()
