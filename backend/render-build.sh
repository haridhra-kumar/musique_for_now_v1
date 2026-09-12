#!/usr/bin/env bash
# Render build script for AudioCoach AI Backend / Worker
set -euo pipefail

echo "=== Starting Render build ==="

# Install static FFmpeg binary if ffmpeg is not already available in PATH
if ! command -v ffmpeg &> /dev/null; then
    echo "FFmpeg not detected in PATH. Downloading static build..."
    mkdir -p "$HOME/bin"
    FFMPEG_TMP="$(mktemp -d)"
    curl -sL "https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-amd64-static.tar.xz" | tar -xJ -C "$FFMPEG_TMP"
    cp "$FFMPEG_TMP"/ffmpeg-*-amd64-static/ffmpeg "$HOME/bin/ffmpeg"
    cp "$FFMPEG_TMP"/ffmpeg-*-amd64-static/ffprobe "$HOME/bin/ffprobe"
    chmod +x "$HOME/bin/ffmpeg" "$HOME/bin/ffprobe"
    rm -rf "$FFMPEG_TMP"
    export PATH="$HOME/bin:$PATH"
    echo "FFmpeg installed successfully to $HOME/bin"
else
    echo "FFmpeg is already installed: $(which ffmpeg)"
fi

# Upgrade pip and packaging tools
python -m pip install --upgrade pip setuptools wheel

# Install core dependencies
echo "Installing core requirements..."
python -m pip install -r requirements.txt

# Install CREPE (requires setuptools at build time)
echo "Installing crepe..."
python -m pip install --no-build-isolation crepe==0.0.16

# Install audio analysis dependencies (scipy, librosa, soundfile, noisereduce, tensorflow)
echo "Installing audio analysis libraries..."
python -m pip install -r requirements-audio.txt

echo "=== Render build completed successfully ==="
