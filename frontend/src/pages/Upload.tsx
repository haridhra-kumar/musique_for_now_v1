import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useDropzone } from "react-dropzone";
import { motion, AnimatePresence } from "framer-motion";
import { analyzeApi } from "../lib/api";

type UploadState = "idle" | "uploading" | "processing" | "done" | "error";

const ACCEPTED_FORMATS: Record<string, string[]> = {
  "audio/*": [".mp3", ".wav", ".flac", ".ogg", ".aac", ".m4a", ".wma"],
  "video/*": [".mp4", ".mov", ".avi", ".mkv", ".webm"],
};

export default function Upload() {
  const navigate = useNavigate();
  const [state, setState] = useState<UploadState>("idle");
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [jobId, setJobId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const onDrop = useCallback((accepted: File[]) => {
    if (accepted.length > 0) {
      setFile(accepted[0]);
      setError("");
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_FORMATS,
    maxFiles: 1,
    maxSize: 100 * 1024 * 1024, // 100MB
    onDropRejected: (rejections) => {
      const firstError = rejections[0]?.errors[0];
      if (firstError?.code === "file-too-large") {
        setError("File is too large. Maximum size is 100MB.");
      } else if (firstError?.code === "file-invalid-type") {
        setError("Unsupported file format. Please upload an audio or video file.");
      } else {
        setError("Invalid file. Please try again.");
      }
    },
  });

  const pollStatus = async (jid: string) => {
    const maxAttempts = 300; // 5 min at 1s intervals
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const res = await analyzeApi.status(jid);
        const { status, progress: pct } = res.data;
        setProgress(pct || 0);

        if (status === "completed") {
          setState("done");
          setTimeout(() => navigate(`/results/${jid}`), 800);
          return;
        }
        if (status === "failed") {
          setState("error");
          setError("Analysis failed. Please try again with a different file.");
          return;
        }
      } catch {
        // Ignore transient polling errors
      }
      await new Promise((r) => setTimeout(r, 1000));
    }
    setState("error");
    setError("Analysis timed out. Please try again.");
  };

  const handleUpload = async () => {
    if (!file) return;
    setState("uploading");
    setProgress(0);
    setError("");

    try {
      const res = await analyzeApi.upload(file);
      const jid = res.data.job_id;
      setJobId(jid);
      setState("processing");
      pollStatus(jid);
    } catch (err: unknown) {
      setState("error");
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        "Upload failed. Please try again.";
      setError(msg);
    }
  };

  const resetUpload = () => {
    setState("idle");
    setFile(null);
    setProgress(0);
    setJobId(null);
    setError("");
  };

  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="max-w-2xl mx-auto space-y-6"
    >
      <div>
        <h1 className="text-2xl md:text-3xl font-bold gradient-text">Upload Recording</h1>
        <p className="text-text-secondary mt-1">
          Upload your audio or video file for AI-powered performance analysis
        </p>
      </div>

      <AnimatePresence mode="wait">
        {/* Idle / file selected */}
        {state === "idle" && (
          <motion.div
            key="idle"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="space-y-4"
          >
            {/* Dropzone */}
            <div
              {...getRootProps()}
              className={`glass rounded-2xl p-8 md:p-12 text-center cursor-pointer transition-all duration-300 ${
                isDragActive
                  ? "border-accent-blue bg-accent-blue/5 shadow-[0_0_30px_rgba(99,102,241,0.2)]"
                  : "glow-border-hover"
              }`}
              style={{
                border: isDragActive
                  ? "2px dashed rgba(99, 102, 241, 0.6)"
                  : "2px dashed rgba(255, 255, 255, 0.1)",
              }}
            >
              <input {...getInputProps()} />
              <motion.div
                animate={isDragActive ? { scale: 1.1, y: -5 } : { scale: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <div
                  className="inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-4"
                  style={{
                    background: isDragActive
                      ? "rgba(99, 102, 241, 0.2)"
                      : "linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(168, 85, 247, 0.15))",
                  }}
                >
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke={isDragActive ? "#818cf8" : "#6366f1"} strokeWidth="2" strokeLinecap="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                </div>
                <p className="text-lg font-medium">
                  {isDragActive ? "Drop your file here" : "Drag & drop your file here"}
                </p>
                <p className="text-text-muted text-sm mt-1">or click to browse</p>
              </motion.div>
            </div>

            {/* Selected file info */}
            {file && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass rounded-2xl p-4 flex items-center gap-4"
              >
                <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: "linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(168, 85, 247, 0.2))" }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="2">
                    <path d="M9 18V5l12-2v13" />
                    <circle cx="6" cy="18" r="3" />
                    <circle cx="18" cy="16" r="3" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{file.name}</p>
                  <p className="text-xs text-text-muted">{formatSize(file.size)}</p>
                </div>
                <button onClick={resetUpload} className="p-2 rounded-lg hover:bg-white/5 transition-colors text-text-muted hover:text-text-primary">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </motion.div>
            )}

            {/* Upload button */}
            <motion.button
              onClick={handleUpload}
              disabled={!file}
              className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed"
              whileHover={file ? { scale: 1.01 } : {}}
              whileTap={file ? { scale: 0.99 } : {}}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
              Start Analysis
            </motion.button>
          </motion.div>
        )}

        {/* Uploading */}
        {state === "uploading" && (
          <motion.div
            key="uploading"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="glass rounded-2xl p-8 md:p-12 text-center"
          >
            <motion.div
              className="w-20 h-20 mx-auto mb-6 rounded-2xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(168, 85, 247, 0.2))" }}
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <svg className="w-10 h-10 animate-spin text-accent-blue" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.2" />
                <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
              </svg>
            </motion.div>
            <p className="text-lg font-medium">Uploading your file...</p>
            <p className="text-text-muted text-sm mt-1">Please wait while we upload your recording</p>
          </motion.div>
        )}

        {/* Processing */}
        {state === "processing" && (
          <motion.div
            key="processing"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="glass rounded-2xl p-8 md:p-12 text-center"
          >
            {/* Animated music icon */}
            <motion.div
              className="w-24 h-24 mx-auto mb-6 rounded-2xl flex items-center justify-center relative"
              style={{ background: "linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(168, 85, 247, 0.2))" }}
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 rounded-2xl"
                style={{
                  border: "2px solid transparent",
                  borderTopColor: "#6366f1",
                  borderRightColor: "#a855f7",
                }}
              />
              <span className="text-4xl">&#9835;</span>
            </motion.div>

            <p className="text-xl font-semibold gradient-text mb-2">Analyzing your performance...</p>
            <p className="text-text-muted text-sm mb-6">
              Our AI is listening to every note, beat, and rhythm
            </p>

            {/* Progress bar */}
            <div className="max-w-md mx-auto">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-text-secondary">Progress</span>
                <span className="text-accent-blue font-medium">{progress}%</span>
              </div>
              <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{
                    background: "linear-gradient(90deg, #6366f1, #a855f7, #ec4899)",
                  }}
                  initial={{ width: "0%" }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>

              {/* Processing steps */}
              <div className="mt-6 space-y-2 text-left">
                {[
                  { label: "Audio extraction", threshold: 10 },
                  { label: "Pitch detection", threshold: 30 },
                  { label: "Rhythm analysis", threshold: 50 },
                  { label: "Tempo tracking", threshold: 70 },
                  { label: "Generating feedback", threshold: 90 },
                ].map((step) => (
                  <div key={step.label} className="flex items-center gap-3 text-sm">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                      progress >= step.threshold
                        ? "bg-success/20 text-success"
                        : progress >= step.threshold - 15
                        ? "bg-accent-blue/20 text-accent-blue"
                        : "bg-white/5 text-text-muted"
                    }`}>
                      {progress >= step.threshold ? (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      ) : progress >= step.threshold - 15 ? (
                        <motion.div
                          className="w-2 h-2 rounded-full bg-accent-blue"
                          animate={{ scale: [1, 1.5, 1] }}
                          transition={{ duration: 1, repeat: Infinity }}
                        />
                      ) : (
                        <div className="w-1.5 h-1.5 rounded-full bg-text-muted" />
                      )}
                    </div>
                    <span className={progress >= step.threshold - 15 ? "text-text-primary" : "text-text-muted"}>
                      {step.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* Done */}
        {state === "done" && (
          <motion.div
            key="done"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="glass rounded-2xl p-8 md:p-12 text-center"
          >
            <motion.div
              className="w-20 h-20 mx-auto mb-4 rounded-2xl flex items-center justify-center"
              style={{ background: "rgba(34, 197, 94, 0.15)" }}
              initial={{ scale: 0 }}
              animate={{ scale: 1, rotate: [0, -10, 10, 0] }}
              transition={{ type: "spring", stiffness: 200 }}
            >
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </motion.div>
            <p className="text-xl font-semibold text-success">Analysis Complete!</p>
            <p className="text-text-muted text-sm mt-1">Redirecting to your results...</p>
          </motion.div>
        )}

        {/* Error */}
        {state === "error" && (
          <motion.div
            key="error"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="glass rounded-2xl p-8 md:p-12 text-center"
          >
            <div className="w-20 h-20 mx-auto mb-4 rounded-2xl flex items-center justify-center"
              style={{ background: "rgba(239, 68, 68, 0.15)" }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
            </div>
            <p className="text-xl font-semibold text-error">Something went wrong</p>
            <p className="text-text-muted text-sm mt-1 mb-6">{error}</p>
            <motion.button
              onClick={resetUpload}
              className="btn-primary"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              Try Again
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Supported formats info */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="glass rounded-2xl p-4 md:p-6"
      >
        <h3 className="text-sm font-semibold text-text-secondary mb-3">Supported Formats</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-text-muted mb-2">Audio</p>
            <div className="flex flex-wrap gap-1.5">
              {["MP3", "WAV", "FLAC", "OGG", "AAC", "M4A"].map((fmt) => (
                <span key={fmt} className="px-2 py-1 rounded-md text-xs bg-accent-blue/10 text-accent-blue font-mono">
                  .{fmt.toLowerCase()}
                </span>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs text-text-muted mb-2">Video</p>
            <div className="flex flex-wrap gap-1.5">
              {["MP4", "MOV", "AVI", "MKV", "WebM"].map((fmt) => (
                <span key={fmt} className="px-2 py-1 rounded-md text-xs bg-accent-purple/10 text-accent-purple font-mono">
                  .{fmt.toLowerCase()}
                </span>
              ))}
            </div>
          </div>
        </div>
        <p className="text-xs text-text-muted mt-3">Maximum file size: 100MB. Longer recordings yield more detailed analysis.</p>
      </motion.div>
    </motion.div>
  );
}
