import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { analyzeApi } from "../lib/api";
import ScoreGauge from "../components/ScoreGauge";
import PitchGraph from "../components/PitchGraph";
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
  rhythm_data: { tempo: number; beat_count: number; beat_confidence: number; tempo_curve: { time: number; bpm: number }[] };
}

const fadeIn = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.35 } } };
const stagger = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function fillClass(score: number): string {
  if (score >= 75) return "";
  if (score >= 55) return "mid";
  return "low";
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
        <motion.div className="text-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <svg className="w-6 h-6 animate-spin mx-auto mb-3" viewBox="0 0 24 24" fill="none" style={{ color: "#c9a84c" }}>
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2.5" opacity="0.2" />
            <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
          <p className="text-text-dim text-[13px]">Loading results…</p>
        </motion.div>
      </div>
    );
  }

  if (isError || !result) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#e06040" strokeWidth="1.7" className="mx-auto mb-3">
            <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
          </svg>
          <p className="text-text-dim text-[13px] mb-4">Could not load results</p>
          <Link to="/"><button className="btn-primary">Back to dashboard</button></Link>
        </div>
      </div>
    );
  }

  const scoreCategories = [
    { label: "Overall", score: Math.round(result.overall_score) },
    { label: "Pitch accuracy", score: Math.round(result.pitch_score) },
    { label: "Rhythm & timing", score: Math.round(result.rhythm_score) },
    { label: "Tempo consistency", score: Math.round(result.tempo_score) },
    { label: "Vocal stability", score: Math.round(result.vocal_stability_score) },
    { label: "Breath control", score: Math.round(Math.max(40, Math.min(95, result.overall_score - 5))) },
    { label: "Emotion & dynamics", score: Math.round(Math.max(40, Math.min(95, result.overall_score + 3))) },
  ];

  return (
    <motion.div variants={stagger} initial="hidden" animate="show">
      {/* Header */}
      <motion.div variants={fadeIn} className="mb-7">
        <Link to="/" className="text-[11px] text-text-muted hover:text-accent transition-colors mb-2 inline-flex items-center gap-1 uppercase tracking-wider">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Dashboard
        </Link>
        <h1 className="page-title">Session results</h1>
        <div className="flex flex-wrap items-center gap-3 mt-1.5 text-[12px] text-text-dim">
          <span>Key <span className="text-text-secondary">{result.key_detected}</span></span>
          <span className="w-px h-3 bg-border" />
          <span>Tempo <span className="text-text-secondary">{Math.round(result.tempo_bpm)} BPM</span></span>
          <span className="w-px h-3 bg-border" />
          <span>Duration <span className="text-text-secondary">{formatDuration(result.duration_seconds)}</span></span>
        </div>
      </motion.div>

      {/* Quality warning */}
      {result.quality_warning && (
        <motion.div variants={fadeIn} className="rounded-md px-3.5 py-3 flex items-start gap-2.5 mb-5"
          style={{ background: "rgba(201,168,76,0.05)", border: "1px solid rgba(201,168,76,0.15)" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#c9a84c" strokeWidth="1.8" className="shrink-0 mt-0.5">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <div>
            <p className="text-[12px] text-accent">Low audio quality</p>
            <p className="text-[11px] text-text-dim mt-0.5">SNR {result.snr_db.toFixed(1)} dB — record in a quieter space for better accuracy.</p>
          </div>
        </motion.div>
      )}

      {/* Score gauges + mini scores */}
      <motion.div variants={fadeIn} className="card mb-5">
        <p className="card-title">Performance scores</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {scoreCategories.slice(0, 4).map((cat) => (
            <ScoreGauge key={cat.label} score={cat.score} label={cat.label} size={120} />
          ))}
        </div>
        <div className="grid grid-cols-3 gap-3 mt-5 pt-5 border-t border-border-soft">
          {scoreCategories.slice(4).map((cat) => (
            <div key={cat.label}>
              <p className="bk-score">{cat.score}%</p>
              <p className="bk-label">{cat.label}</p>
              <div className="bk-bar">
                <div className="bk-bar-fill" style={{
                  width: `${cat.score}%`,
                  background: cat.score >= 75 ? "#c9a84c" : cat.score >= 55 ? "#8a7848" : "#6a4820",
                }} />
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Timestamped pitch map */}
      <motion.div variants={fadeIn} className="mb-5">
        <PitchGraph data={result.pitch_data} mistakes={result.mistakes} />
      </motion.div>

      {/* Score breakdown bars */}
      <motion.div variants={fadeIn} className="card mb-5">
        <p className="card-title">Score breakdown</p>
        <div className="flex flex-col gap-2.5">
          {scoreCategories.map((cat) => (
            <div key={cat.label} className="bar-row !grid-cols-[140px_1fr_36px]">
              <span className="bar-name">{cat.label}</span>
              <div className="bar-track">
                <motion.div className={`bar-fill ${fillClass(cat.score)}`}
                  initial={{ width: 0 }} animate={{ width: `${cat.score}%` }} transition={{ duration: 0.6, delay: 0.15 }} />
              </div>
              <span className="bar-pct">{cat.score}%</span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Feedback + mistakes */}
      <div className="grid lg:grid-cols-2 gap-4 mb-6">
        <motion.div variants={fadeIn} className="card">
          <div className="flex items-center justify-between mb-4">
            <p className="card-title !mb-0">AI feedback</p>
            <div className="flex items-center rounded-md overflow-hidden border border-border">
              <button onClick={() => setFeedbackMode("beginner")}
                className={`px-2.5 py-1 text-[11px] transition-colors cursor-pointer ${feedbackMode === "beginner" ? "bg-accent-bg text-accent" : "text-text-muted hover:text-text-soft"}`}>
                Beginner
              </button>
              <button onClick={() => setFeedbackMode("musician")}
                className={`px-2.5 py-1 text-[11px] transition-colors cursor-pointer ${feedbackMode === "musician" ? "bg-accent-bg text-accent" : "text-text-muted hover:text-text-soft"}`}>
                Musician
              </button>
            </div>
          </div>
          <AnimatePresence mode="wait">
            <motion.div key={feedbackMode} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="text-[13px] text-text-secondary leading-relaxed whitespace-pre-line">
              {feedbackMode === "beginner" ? result.feedback_beginner : result.feedback_musician}
            </motion.div>
          </AnimatePresence>
          {result.octave_shift !== 0 && (
            <p className="mt-4 text-[12px] text-text-dim">
              <span className="text-accent">Note:</span> octave shift of {result.octave_shift > 0 ? "+" : ""}{result.octave_shift / 12} detected.
            </p>
          )}
        </motion.div>

        <motion.div variants={fadeIn}>
          <MistakeTimeline mistakes={result.mistakes} />
        </motion.div>
      </div>

      {/* Actions */}
      <motion.div variants={fadeIn} className="flex flex-col sm:flex-row items-center justify-center gap-3">
        <Link to="/upload"><button className="btn-primary">New session</button></Link>
        <Link to="/history"><button className="btn-secondary">View history</button></Link>
      </motion.div>
    </motion.div>
  );
}
