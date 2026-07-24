/**
 * Client-side video → audio extraction.
 *
 * Videos can be 10-100x larger than the audio they contain. Since the backend
 * pipeline (backend/pipeline/loader.py) only ever needs the audio track — and
 * immediately downsamples it to 16kHz via ffmpeg anyway — we do that same
 * extraction + downsampling here in the browser *before* upload. This avoids
 * ever sending or storing the full video file.
 *
 * Stereo channels are preserved (not downmixed to mono) so the backend's
 * existing "smart mono" channel-selection logic in loader.py behaves exactly
 * as it does today for raw video uploads.
 */

// Must match backend/pipeline/config.py SAMPLE_RATE
const TARGET_SAMPLE_RATE = 16_000;

const VIDEO_EXTENSIONS = new Set([".mp4", ".mov", ".mkv", ".avi", ".webm", ".m4v"]);

export function isVideoFile(file: File): boolean {
  if (file.type.startsWith("video/")) return true;
  const dot = file.name.lastIndexOf(".");
  if (dot === -1) return false;
  return VIDEO_EXTENSIONS.has(file.name.slice(dot).toLowerCase());
}

/**
 * Decodes the audio track of a video file and re-encodes it as a 16kHz WAV
 * File, ready to upload in place of the original video.
 *
 * Throws if the browser can't decode the file (e.g. unsupported codec) —
 * callers should catch this and fall back to uploading the original file.
 */
export async function extractAudioFromVideo(file: File): Promise<File> {
  const AudioContextCtor =
    window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;

  const arrayBuffer = await file.arrayBuffer();
  const decodeCtx = new AudioContextCtor();
  let decoded: AudioBuffer;
  try {
    decoded = await decodeCtx.decodeAudioData(arrayBuffer);
  } finally {
    await decodeCtx.close();
  }

  const channels = decoded.numberOfChannels;
  const frameCount = Math.ceil(decoded.duration * TARGET_SAMPLE_RATE);
  const offlineCtx = new OfflineAudioContext(channels, frameCount, TARGET_SAMPLE_RATE);
  const source = offlineCtx.createBufferSource();
  source.buffer = decoded;
  source.connect(offlineCtx.destination);
  source.start();
  const rendered = await offlineCtx.startRendering();

  const wavBlob = encodeWav(rendered);
  const newName = file.name.replace(/\.[^./]+$/, "") + ".wav";
  return new File([wavBlob], newName, { type: "audio/wav" });
}

/** Encodes an AudioBuffer as a 16-bit PCM WAV Blob. */
function encodeWav(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const numFrames = buffer.length;
  const bytesPerSample = 2; // 16-bit
  const blockAlign = numChannels * bytesPerSample;
  const dataSize = numFrames * blockAlign;

  const arrayBuffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(arrayBuffer);

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };

  writeString(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true); // fmt chunk size
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true); // byte rate
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true); // bits per sample
  writeString(36, "data");
  view.setUint32(40, dataSize, true);

  const channelData: Float32Array[] = [];
  for (let ch = 0; ch < numChannels; ch++) channelData.push(buffer.getChannelData(ch));

  let offset = 44;
  for (let frame = 0; frame < numFrames; frame++) {
    for (let ch = 0; ch < numChannels; ch++) {
      const sample = Math.max(-1, Math.min(1, channelData[ch][frame]));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      offset += 2;
    }
  }

  return new Blob([arrayBuffer], { type: "audio/wav" });
}
