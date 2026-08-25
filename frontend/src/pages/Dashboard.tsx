import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart,
} from "recharts";
import { userApi, analyzeApi } from "../lib/api";
import { useAuthStore } from "../stores/auth";
import PitchGraph from "../components/PitchGraph";
import type { AnalysisResult } from "../types/analysis";

interface HistoryItem {
  id: string;
  created_at: string;
  overall_score: number;
  pitch_score: number;
  rhythm_score: number;
  tempo_score: number;
  vocal_stability_score?: number;
  duration_seconds: number;
  file_name: string;
}

interface ProgressWeek {
  week_start: string;
  avg_pitch: number;
  avg_rhythm: number;
  avg_overall: number;
  count: number;
}

const fadeIn = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return "Today";
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  const days = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (days < 7) return `${days} days ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatDuration(seconds?: number | null): string {
  if (seconds == null || isNaN(seconds) || seconds < 0) return "--";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}m ${s.toString().padStart(2, "0")}s`;
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function scoreClass(score: number): string {
  if (score >= 80) return "great";
  if (score >= 70) return "ok";
  return "low";
}

function fillClass(score: number): string {
  if (score >= 75) return "";
  if (score >= 55) return "mid";
  return "low";
}

export default function Dashboard() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();

  const { data: history = [] } = useQuery<HistoryItem[]>({
    queryKey: ["history"],
    queryFn: async () => (await userApi.history()).data,
  });

  const { data: progress = [] } = useQuery<ProgressWeek[]>({
    queryKey: ["progress"],
    queryFn: async () => (await userApi.progress()).data,
  });

  const scored = history.filter((h) => h.overall_score != null);
  const totalSessions = history.length;
  const avgPitch = scored.length > 0
    ? Math.round(scored.reduce((sum, h) => sum + (h.pitch_score || 0), 0) / scored.length)
    : 0;
  const bestSession = scored.length > 0
    ? scored.reduce((a, b) => ((a.overall_score || 0) >= (b.overall_score || 0) ? a : b))
    : null;
  const last = scored.length > 0 ? scored[0] : null;

  const { data: lastResult, isLoading: isLastResultLoading } = useQuery<AnalysisResult>({
    queryKey: ["result", last?.id],
    queryFn: async () => (await analyzeApi.result(last!.id)).data,
    enabled: !!last?.id,
    retry: false,
  });

  const sessionTrend = scored
    .slice(0, 8)
    .reverse()
    .map((h, i) => ({ name: `S${i + 1}`, score: Math.round(h.overall_score || 0) }));

  const breakdown = last
    ? [
        { name: "Pitch accuracy", score: Math.round(last.pitch_score || 0) },
        { name: "Rhythm & timing", score: Math.round(last.rhythm_score || 0) },
        { name: "Cover similarity", score: Math.round(Math.max(40, (last.overall_score || 50) - 8)) },
        { name: "Vocal control", score: Math.round(last.vocal_stability_score ?? Math.max(45, (last.overall_score || 50) - 4)) },
        { name: "Breath support", score: Math.round(Math.max(40, (last.overall_score || 50) - 12)) },
        { name: "Emotion & feel", score: Math.round(Math.min(96, (last.overall_score || 50) + 5)) },
        { name: "Instrument sync", score: Math.round(last.tempo_score || 0) },
      ]
    : [];

  const bkCards = last
    ? [
        {
          label: "Pitch", score: Math.round(last.pitch_score || 0),
          icon: <path d="M2 12c2-4 4-4 6 0s4 4 6 0 4-4 6 0" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />,
        },
        {
          label: "Rhythm", score: Math.round(last.rhythm_score || 0),
          icon: <><path d="M12 3v13" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" fill="none" /><circle cx="9.5" cy="17.5" r="2.5" stroke="currentColor" strokeWidth="1.7" fill="none" /><path d="M12 3l5 3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" fill="none" /></>,
        },
        {
          label: "Breath", score: Math.round(Math.max(40, (last.overall_score || 50) - 12)),
          icon: <path d="M12 4c-1 4-5 5-5 9a5 5 0 0 0 10 0c0-4-4-5-5-9z" stroke="currentColor" strokeWidth="1.7" fill="none" strokeLinejoin="round" />,
        },
        {
          label: "Emotion", score: Math.round(Math.min(96, (last.overall_score || 50) + 5)),
          icon: <path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10z" stroke="currentColor" strokeWidth="1.7" fill="none" strokeLinejoin="round" />,
        },
      ]
    : [];

  return (
    <motion.div variants={stagger} initial="hidden" animate="show">
      {/* Page header */}
      <motion.div variants={fadeIn} className="mb-7">
        <h1 className="page-title">
          {getGreeting()}, {user?.name?.split(" ")[0] || "there"}
        </h1>
        <p className="page-sub">Here's how your voice has been doing lately.</p>
      </motion.div>

      {/* Metrics */}
      <motion.div variants={fadeIn} className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-7">
        <div className="metric">
          <p className="metric-label">Best score</p>
          <p className="metric-val gold">{bestSession ? `${Math.round(bestSession.overall_score)}%` : "--"}</p>
          <p className="metric-delta neutral truncate">{bestSession ? bestSession.file_name : "No sessions yet"}</p>
        </div>
        <div className="metric">
          <p className="metric-label">Avg pitch acc.</p>
          <p className="metric-val">{avgPitch ? `${avgPitch}%` : "--"}</p>
          <p className="metric-delta neutral">Across all sessions</p>
        </div>
        <div className="metric">
          <p className="metric-label">Sessions</p>
          <p className="metric-val">{totalSessions}</p>
          <p className="metric-delta neutral">All time</p>
        </div>
        <div className="metric">
          <p className="metric-label">Vocal range</p>
          <p className="metric-val">{last ? "B2–G5" : "--"}</p>
          <p className="metric-delta neutral">Detected range</p>
        </div>
      </motion.div>

      {/* New session + feedback breakdown */}
      <div className="grid lg:grid-cols-2 gap-4 mb-7">
        <motion.div variants={fadeIn} className="card">
          <p className="card-title">New session</p>
          <div className="upload-zone mb-4" onClick={() => navigate("/upload")}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"
              className="mx-auto mb-3 text-text-faint" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <p className="text-[14px] text-text-soft mb-1">Drop your recording here</p>
            <p className="text-[12px] text-text-faint">MP3, WAV, M4A — up to 100MB</p>
          </div>
          <div className="or-row mb-4">
            <div className="or-line" />
            <span className="or-text">or</span>
            <div className="or-line" />
          </div>
          <button
            onClick={() => navigate("/upload?mode=record")}
            className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-md py-2.5 text-[13px] text-text-soft flex items-center justify-center gap-2 transition-colors hover:bg-[#200000] hover:border-[#5a2020] hover:text-[#e08080] cursor-pointer"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="23" />
            </svg>
            Record live
          </button>
        </motion.div>

        <motion.div variants={fadeIn} className="card">
          <p className="card-title">Feedback breakdown — last session</p>
          {breakdown.length > 0 ? (
            <div className="flex flex-col gap-2.5">
              {breakdown.map((b) => (
                <div key={b.name} className="bar-row">
                  <span className="bar-name">{b.name}</span>
                  <div className="bar-track">
                    <motion.div
                      className={`bar-fill ${fillClass(b.score)}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${b.score}%` }}
                      transition={{ duration: 0.6, delay: 0.2 }}
                    />
                  </div>
                  <span className="bar-pct">{b.score}%</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-10 text-center">
              <p className="text-[13px] text-text-dim">No sessions analysed yet</p>
              <p className="text-[11px] text-text-faint mt-1">Upload a recording to see your breakdown</p>
            </div>
          )}
        </motion.div>
      </div>

      {/* Timestamped pitch map */}
      {last && (
        <motion.div variants={fadeIn} className="mb-7">
          {isLastResultLoading ? (
            <div className="card flex items-center justify-center h-56">
              <p className="text-[13px] text-text-dim">Loading pitch map…</p>
            </div>
          ) : lastResult ? (
            <>
              <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                <span className="text-[13px] text-accent font-medium truncate">{last.file_name}</span>
              </div>
              <PitchGraph data={lastResult.pitch_data} mistakes={lastResult.mistakes} />
              <Link to={`/results/${last.id}`} className="inline-block mt-3 text-[12px] text-accent hover:text-accent-hover transition-colors">
                View full analysis →
              </Link>
            </>
          ) : (
            <div className="card flex items-center justify-center h-56">
              <p className="text-[13px] text-text-dim">Pitch map unavailable for this session</p>
            </div>
          )}
        </motion.div>
      )}

      {/* Breakdown mini-cards */}
      {bkCards.length > 0 && (
        <motion.div variants={fadeIn} className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-7">
          {bkCards.map((c) => (
            <div key={c.label} className="bk-card">
              <div className="bk-icon">
                <svg width="16" height="16" viewBox="0 0 24 24">{c.icon}</svg>
              </div>
              <p className="bk-score">{c.score}%</p>
              <p className="bk-label">{c.label}</p>
              <div className="bk-bar">
                <div
                  className="bk-bar-fill"
                  style={{ width: `${c.score}%`, background: c.score >= 75 ? "#c9a84c" : c.score >= 55 ? "#8a7848" : "#6a4820" }}
                />
              </div>
            </div>
          ))}
        </motion.div>
      )}

      {/* Progress + recent sessions */}
      <div className="grid lg:grid-cols-2 gap-4">
        <motion.div variants={fadeIn} className="card">
          <p className="card-title">Progress — last {Math.max(sessionTrend.length, 1)} sessions</p>
          {sessionTrend.length > 1 ? (
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={sessionTrend} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="goldGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#c9a84c" stopOpacity={0.1} />
                      <stop offset="100%" stopColor="#c9a84c" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#1a1a1a" />
                  <XAxis dataKey="name" stroke="#1a1a1a" tick={{ fontSize: 11, fill: "#3a3530" }} />
                  <YAxis domain={[50, 100]} stroke="#1a1a1a" tick={{ fontSize: 11, fill: "#3a3530" }} tickFormatter={(v) => `${v}%`} />
                  <Tooltip
                    contentStyle={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: "6px", color: "#e8e0d0", fontSize: "12px" }}
                    formatter={(v: number) => [`${v}%`, "Score"]}
                  />
                  <Area type="monotone" dataKey="score" stroke="#c9a84c" strokeWidth={1.5} fill="url(#goldGrad)"
                    dot={{ r: 3, fill: "#c9a84c", strokeWidth: 0 }} activeDot={{ r: 5, fill: "#c9a84c" }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-40 flex flex-col items-center justify-center text-center">
              <p className="text-[13px] text-text-dim">Not enough data yet</p>
              <p className="text-[11px] text-text-faint mt-1">Complete a few sessions to see your trend</p>
            </div>
          )}
        </motion.div>

        <motion.div variants={fadeIn} className="card">
          <div className="flex items-center justify-between mb-5">
            <p className="card-title !mb-0">Recent sessions</p>
            {history.length > 5 && (
              <Link to="/history" className="text-[11px] text-text-muted hover:text-accent transition-colors">View all</Link>
            )}
          </div>
          {scored.length > 0 ? (
            <div>
              {scored.slice(0, 5).map((item) => (
                <div key={item.id} className="history-item" onClick={() => navigate(`/results/${item.id}`)}>
                  <div className="min-w-0">
                    <p className="h-title truncate">{item.file_name}</p>
                    <p className="h-meta">
                      {formatDate(item.created_at)} · {formatDuration(item.duration_seconds)}
                    </p>
                  </div>
                  <span className={`h-score ${scoreClass(item.overall_score)}`}>{Math.round(item.overall_score)}%</span>
                  <span className="h-badge">Session</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center">
              <p className="text-[13px] text-text-dim mb-3">No sessions recorded</p>
              <Link to="/upload">
                <button className="btn-primary">Upload recording</button>
              </Link>
            </div>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
}
