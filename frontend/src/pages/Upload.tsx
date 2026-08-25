import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useDropzone } from "react-dropzone";
import { motion, AnimatePresence } from "framer-motion";
import { analyzeApi } from "../lib/api";
import AudioRecorder from "../components/AudioRecorder";
import { isVideoFile, extractAudioFromVideo } from "../lib/videoToAudio";

type UploadState = "idle" | "converting" | "uploading" | "processing" | "done" | "error";
type Mode = "upload" | "record";

const ACCEPTED_FORMATS: Record<string, string[]> = {
  "audio/*": [".mp3", ".wav", ".flac", ".ogg", ".aac", ".m4a", ".wma"],
  "video/*": [".mp4", ".mov", ".avi", ".mkv", ".webm"],
};

export default function Upload() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("upload");
  const [state, setState] = useState<UploadState>("idle");
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState("");
  const [error, setError] = useState("");

  const onDrop = useCallback((accepted: File[]) => {
    if (accepted.length > 0) { setFile(accepted[0]); setError(""); }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_FORMATS,
    maxFiles: 1,
    // Videos are converted to audio in-browser before upload, so they can be much
    // larger than the eventual upload size. Audio files are sent as-is, so keep
    // those in line with the backend's max_file_size_mb (see backend/app/config.py).
    maxSize: 500 * 1024 * 1024,
    onDropRejected: (rejections) => {
      const code = rejections[0]?.errors[0]?.code;
      setError(code === "file-too-large" ? "File is too large (max 500MB)." :
               code === "file-invalid-type" ? "Unsupported format." : "Invalid file.");
    },
  });

  const pollStatus = async (jid: string) => {
    let consecutiveFails = 0;
    for (let i = 0; i < 300; i++) {
      try {
        const res = await analyzeApi.status(jid);
        consecutiveFails = 0;
        const { status, progress: pct, message } = res.data;
        if (message) {
          setStatusMessage(message);
        }
        if (status === "completed") {
          setProgress(100);
          setState("done");
          setTimeout(() => navigate(`/results/${jid}`), 800);
          return;
        }
        if (status === "failed") {
          setState("error");
          setError(message || "Analysis failed. Try a different file.");
          return;
        }
        setProgress((prev) => {
          if (pct && pct > 0 && pct > prev) return pct;
          return Math.min(prev + 2, 92);
        });
      } catch {
        consecutiveFails++;
        if (consecutiveFails >= 6) {
          setState("error");
          setError("Lost connection to server. Please check your network.");
          return;
        }
      }
      await new Promise((r) => setTimeout(r, 1200));
    }
    setState("error");
    setError("Analysis timed out. Please try again with a shorter recording.");
  };


  const handleUpload = async () => {
    if (!file) return;
    setProgress(0); setError("");

    let uploadFile = file;
    if (isVideoFile(file)) {
      setState("converting");
      try {
        uploadFile = await extractAudioFromVideo(file);
      } catch {
        // Browser couldn't decode this codec — fall back to uploading the
        // original video and let the backend's ffmpeg pipeline handle it.
        uploadFile = file;
      }
    }

    setState("uploading");
    try {
      const res = await analyzeApi.upload(uploadFile);
      setState("processing");
      pollStatus(res.data.job_id);
    } catch (err: unknown) {
      setState("error");
      setError((err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || "Upload failed.");
    }
  };

  const resetUpload = () => { setState("idle"); setFile(null); setProgress(0); setError(""); };

  const switchMode = (m: Mode) => {
    if (m === mode) return;
    setMode(m);
    resetUpload();
  };

  const formatSize = (b: number) => b < 1024 * 1024 ? `${(b / 1024).toFixed(1)} KB` : `${(b / (1024 * 1024)).toFixed(1)} MB`;

  const steps = [
    { label: "Audio extraction", threshold: 10 },
    { label: "Pitch detection (CREPE)", threshold: 25 },
    { label: "Rhythm analysis", threshold: 45 },
    { label: "Key detection", threshold: 60 },
    { label: "Vocal stability", threshold: 75 },
    { label: "Scoring & feedback", threshold: 90 },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="max-w-xl mx-auto">
      <div className="mb-7">
        <h1 className="page-title">New session</h1>
        <p className="page-sub">Upload, or record live, for a full performance analysis.</p>
      </div>

      {state === "idle" && (
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => switchMode("upload")}
            className={mode === "upload" ? "btn-primary !py-1.5 !px-4 text-[12px]" : "btn-secondary !py-1.5 !px-4 text-[12px]"}
          >
            Upload file
          </button>
          <button
            onClick={() => switchMode("record")}
            className={mode === "record" ? "btn-primary !py-1.5 !px-4 text-[12px]" : "btn-secondary !py-1.5 !px-4 text-[12px]"}
          >
            Record audio
          </button>
        </div>
      )}

      <AnimatePresence mode="wait">
        {state === "idle" && mode === "upload" && (
          <motion.div key="idle-upload" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
            <div {...getRootProps()} className={`upload-zone !p-12 ${isDragActive ? "dragging" : ""}`}>
              <input {...getInputProps()} />
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"
                className={`mx-auto mb-3 ${isDragActive ? "text-accent" : "text-text-faint"}`} strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              <p className="text-[14px] text-text-soft mb-1">
                {isDragActive ? "Drop it here" : "Drop your recording here"}
              </p>
              <p className="text-[12px] text-text-faint">or click to browse — MP3, WAV, M4A, MP4 up to 500MB (video audio is extracted on your device before upload)</p>
            </div>

            {file && (
              <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="card !p-4 flex items-center gap-3">
                <div className="bk-icon !mb-0 shrink-0">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                    <path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] text-text-secondary truncate">{file.name}</p>
                  <p className="text-[11px] text-text-faint">{formatSize(file.size)}</p>
                </div>
                <button onClick={resetUpload} className="p-1.5 text-text-faint hover:text-text-secondary transition-colors cursor-pointer">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </motion.div>
            )}

            {error && (
              <p className="text-[12px]" style={{ color: "#e06040" }}>{error}</p>
            )}

            <button onClick={handleUpload} disabled={!file} className="btn-primary w-full !py-2.5">
              Start analysis
            </button>
          </motion.div>
        )}

        {state === "idle" && mode === "record" && (
          <motion.div key="idle-record" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
            <AudioRecorder
              onRecordingComplete={(recordedFile) => {
                setFile(recordedFile);
                setError("");
              }}
            />

            {error && (
              <p className="text-[12px]" style={{ color: "#e06040" }}>{error}</p>
            )}

            <button onClick={handleUpload} disabled={!file} className="btn-primary w-full !py-2.5">
              Start analysis
            </button>
          </motion.div>
        )}

        {state === "converting" && (
          <motion.div key="converting" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="card !p-12 text-center">
            <svg className="w-6 h-6 animate-spin mx-auto mb-4" viewBox="0 0 24 24" fill="none" style={{ color: "#c9a84c" }}>
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2.5" opacity="0.2" />
              <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
            <p className="text-[14px] text-text-secondary">Extracting audio from video…</p>
            <p className="text-[12px] text-text-faint mt-1">This happens on your device, so only the audio gets uploaded</p>
          </motion.div>
        )}

        {state === "uploading" && (
          <motion.div key="uploading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="card !p-12 text-center">
            <svg className="w-6 h-6 animate-spin mx-auto mb-4" viewBox="0 0 24 24" fill="none" style={{ color: "#c9a84c" }}>
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2.5" opacity="0.2" />
              <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
            <p className="text-[14px] text-text-secondary">Uploading…</p>
            <p className="text-[12px] text-text-faint mt-1">Please wait</p>
          </motion.div>
        )}

        {state === "processing" && (
          <motion.div key="processing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="card !p-8">
            <p className="card-title text-center">Analysing your performance</p>

            <div className="max-w-sm mx-auto">
              <div className="flex items-center justify-between text-[12px] mb-1.5">
                <span className="text-text-muted">{statusMessage || "Progress"}</span>
                <span className="text-accent font-medium">{progress}%</span>
              </div>
              <div className="bar-track !h-1.5">
                <motion.div className="bar-fill" initial={{ width: "0%" }} animate={{ width: `${progress}%` }} transition={{ duration: 0.5 }} />
              </div>

              <div className="mt-6 space-y-2">
                {steps.map((step) => {
                  const done = progress >= step.threshold;
                  const active = !done && progress >= step.threshold - 15;
                  return (
                    <div key={step.label} className="flex items-center gap-2.5 text-[12px]">
                      {done ? (
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#c9a84c" strokeWidth="2.5" className="shrink-0">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      ) : active ? (
                        <motion.div className="w-[13px] h-[13px] flex items-center justify-center shrink-0">
                          <motion.div className="w-1.5 h-1.5 rounded-full bg-accent"
                            animate={{ scale: [1, 1.5, 1] }} transition={{ duration: 1, repeat: Infinity }} />
                        </motion.div>
                      ) : (
                        <div className="w-[13px] h-[13px] flex items-center justify-center shrink-0">
                          <div className="w-1 h-1 rounded-full bg-[#2a2a2a]" />
                        </div>
                      )}
                      <span className={done ? "text-text-soft" : active ? "text-text-secondary" : "text-text-faint"}>
                        {step.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}

        {state === "done" && (
          <motion.div key="done" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card !p-12 text-center">
            <motion.svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#c9a84c" strokeWidth="2"
              className="mx-auto mb-3" initial={{ scale: 0 }} animate={{ scale: 1 }}>
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
            </motion.svg>
            <p className="text-[14px] text-accent font-medium">Analysis complete</p>
            <p className="text-[12px] text-text-faint mt-1">Taking you to your results…</p>
          </motion.div>
        )}

        {state === "error" && (
          <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card !p-12 text-center">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#e06040" strokeWidth="1.7" className="mx-auto mb-3">
              <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
            </svg>
            <p className="text-[14px]" style={{ color: "#e06040" }}>Something went wrong</p>
            <p className="text-[12px] text-text-faint mt-1 mb-5">{error}</p>
            <button onClick={resetUpload} className="btn-secondary">Try again</button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
