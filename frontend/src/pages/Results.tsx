import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { analyzeApi } from "../lib/api";
import ScoreGauge from "../components/ScoreGauge";
import PitchGraph from "../components/PitchGraph";
import WaveformViewer from "../components/WaveformViewer";
import MistakeTimeline from "../components/MistakeTimeline";

interface AnalysisResult {
  overall_score: number;
  pitch_score: number;
  rhythm_score: number;
  tempo_score: number;
  vocal_stability_score: number;
  key_detected: string;
  octave_shift: number;
  tempo_bpm: number;
  quality_warning: boolean;
  snr_db: number;
  duration_seconds: number;
  mistakes: {
    timestamp: string;
    time_seconds: number;
    type: "pitch" | "rhythm" | "tempo" | "unclear";
    severity: "low" | "medium" | "high";
    description: string;
    confidence: number;
  }[];
  feedback_beginner: string;
  feedback_musician: string;
  processing_time_seconds: number;
  pitch_data: { time: number; freq: number; confidence: number; note: string }[];
  rhythm_data: {
    tempo: number;
    beat_count: number;
    beat_confidence: number;
    tempo_curve: { time: number; bpm: number }[];
  };
}

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function Results() {
  const { jobId } = useParams<{ jobId: string }>();
  const [feedbackMode, setFeedbackMode] = useState<"beginner" | "musician">("beginner");

  const { data: result, isLoading, isError } = useQuery<AnalysisResult>({
    queryKey: ["result", jobId],
    queryFn: async () => (await analyzeApi.result(jobId!)).data,
    enabled: !!jobId,
    retry: 2,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <motion.div
          className="text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <motion.div
            className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(168, 85, 247, 0.2))" }}
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <svg className="w-8 h-8 animate-spin text-accent-blue" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.2" />
              <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
            </svg>
          </motion.div>
          <p className="text-text-secondary">Loading your results...</p>
        </motion.div>
      </div>
    );
  }

  if (isError || !result) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center"
            style={{ background: "rgba(239, 68, 68, 0.15)" }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
          </div>
          <p className="text-text-secondary font-medium">Could not load results</p>
          <p className="text-text-muted text-sm mt-1 mb-4">The analysis may still be processing</p>
          <Link to="/">
            <motion.button className="btn-primary" whileHover={{ scale: 1.03 }}>
              Back to Dashboard
            </motion.button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      {/* Header */}
      <motion.div variants={item} className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <Link to="/" className="text-sm text-text-muted hover:text-accent-blue transition-colors mb-2 inline-flex items-center gap-1">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Back to Dashboard
          </Link>
          <h1 className="text-2xl md:text-3xl font-bold gradient-text">Analysis Results</h1>
        </div>
        <div className="flex items-center gap-3 text-sm text-text-muted">
          <span>Key: <strong className="text-text-primary">{result.key_detected}</strong></span>
          <span className="w-px h-4 bg-border-glass" />
          <span>Tempo: <strong className="text-text-primary">{result.tempo_bpm} BPM</strong></span>
          <span className="w-px h-4 bg-border-glass" />
          <span>Duration: <strong className="text-text-primary">{formatDuration(result.duration_seconds)}</strong></span>
        </div>
      </motion.div>

      {/* Quality warning */}
      {result.quality_warning && (
        <motion.div
          variants={item}
          className="rounded-2xl p-4 flex items-start gap-3"
          style={{
            background: "rgba(234, 179, 8, 0.08)",
            border: "1px solid rgba(234, 179, 8, 0.2)",
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#eab308" strokeWidth="2" className="shrink-0 mt-0.5">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <div>
            <p className="text-sm font-medium text-warning">Low Audio Quality Detected</p>
            <p className="text-xs text-text-muted mt-0.5">
              Signal-to-noise ratio is {result.snr_db.toFixed(1)} dB. Results may be less accurate due to background noise.
              Try recording in a quieter environment for better analysis.
            </p>
          </div>
        </motion.div>
      )}

      {/* Score gauges */}
      <motion.div variants={item} className="glass rounded-2xl p-6 md:p-8">
        <h2 className="text-lg font-semibold mb-6 gradient-text-blue">Performance Scores</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
          <ScoreGauge score={result.overall_score} label="Overall" size={150} />
          <ScoreGauge score={result.pitch_score} label="Pitch" size={150} />
          <ScoreGauge score={result.rhythm_score} label="Rhythm" size={150} />
          <ScoreGauge score={result.tempo_score} label="Tempo" size={150} />
        </div>

        {/* Extra stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-border-glass">
          <div className="text-center">
            <p className="text-2xl font-bold text-accent-cyan">{result.vocal_stability_score}</p>
            <p className="text-xs text-text-muted mt-1">Vocal Stability</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-accent-purple">{result.rhythm_data.beat_count}</p>
            <p className="text-xs text-text-muted mt-1">Beats Detected</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-accent-pink">{result.mistakes.length}</p>
            <p className="text-xs text-text-muted mt-1">Issues Found</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-accent-blue">{result.processing_time_seconds.toFixed(1)}s</p>
            <p className="text-xs text-text-muted mt-1">Processing Time</p>
          </div>
        </div>
      </motion.div>

      {/* Waveform */}
      <motion.div variants={item}>
        <WaveformViewer
          duration={result.duration_seconds}
          mistakes={result.mistakes}
          pitchData={result.pitch_data}
        />
      </motion.div>

      {/* Pitch graph */}
      <motion.div variants={item}>
        <PitchGraph data={result.pitch_data} mistakes={result.mistakes} />
      </motion.div>

      {/* Feedback + Mistakes in 2-col grid */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* AI Feedback */}
        <motion.div variants={item} className="glass rounded-2xl p-4 md:p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold gradient-text-blue">AI Feedback</h3>
            <div className="flex items-center rounded-xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.1)" }}>
              <button
                onClick={() => setFeedbackMode("beginner")}
                className={`px-3 py-1.5 text-xs font-medium transition-all ${
                  feedbackMode === "beginner"
                    ? "bg-accent-blue/20 text-accent-blue"
                    : "text-text-muted hover:text-text-secondary"
                }`}
              >
                Beginner
              </button>
              <button
                onClick={() => setFeedbackMode("musician")}
                className={`px-3 py-1.5 text-xs font-medium transition-all ${
                  feedbackMode === "musician"
                    ? "bg-accent-purple/20 text-accent-purple"
                    : "text-text-muted hover:text-text-secondary"
                }`}
              >
                Musician
              </button>
            </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={feedbackMode}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="text-sm text-text-secondary leading-relaxed whitespace-pre-line"
            >
              {feedbackMode === "beginner"
                ? result.feedback_beginner
                : result.feedback_musician}
            </motion.div>
          </AnimatePresence>

          {/* Octave shift notice */}
          {result.octave_shift !== 0 && (
            <div className="mt-4 p-3 rounded-xl text-sm" style={{ background: "rgba(99, 102, 241, 0.08)", border: "1px solid rgba(99, 102, 241, 0.15)" }}>
              <span className="text-accent-blue font-medium">Note:</span>{" "}
              <span className="text-text-secondary">
                An octave shift of {result.octave_shift > 0 ? "+" : ""}{result.octave_shift / 12} octave(s) was detected.
                The analysis has been adjusted accordingly.
              </span>
            </div>
          )}
        </motion.div>

        {/* Mistake timeline */}
        <motion.div variants={item}>
          <MistakeTimeline mistakes={result.mistakes} />
        </motion.div>
      </div>

      {/* Actions */}
      <motion.div variants={item} className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
        <Link to="/upload">
          <motion.button className="btn-primary flex items-center gap-2" whileHover={{ scale: 1.03 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            Analyze Another
          </motion.button>
        </Link>
        <Link to="/history">
          <motion.button className="btn-secondary flex items-center gap-2" whileHover={{ scale: 1.03 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            View History
          </motion.button>
        </Link>
      </motion.div>
    </motion.div>
  );
}
