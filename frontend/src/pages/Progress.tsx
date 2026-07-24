import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Line,
} from "recharts";
import { userApi } from "../lib/api";

interface HistoryItem {
  id: string;
  created_at: string;
  overall_score: number;
  pitch_score: number;
  rhythm_score: number;
  tempo_score: number;
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

const fadeIn = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.35 } } };
const stagger = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function Progress() {
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
  const progressData = progress.map((p) => ({ ...p, week: formatDate(p.week_start) }));
  const totalSessions = scored.length;
  const avgScore = totalSessions > 0
    ? Math.round(scored.reduce((s, h) => s + h.overall_score, 0) / totalSessions)
    : 0;
  const bestScore = totalSessions > 0 ? Math.round(Math.max(...scored.map((h) => h.overall_score))) : 0;
  const totalTime = scored.reduce((s, h) => s + (h.duration_seconds || 0), 0);

  return (
    <motion.div variants={stagger} initial="hidden" animate="show">
      <motion.div variants={fadeIn} className="mb-7">
        <h1 className="page-title">Progress</h1>
        <p className="page-sub">How your voice has been improving over time.</p>
      </motion.div>

      {/* Summary metrics */}
      <motion.div variants={fadeIn} className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-7">
        <div className="metric">
          <p className="metric-label">Total sessions</p>
          <p className="metric-val">{totalSessions}</p>
        </div>
        <div className="metric">
          <p className="metric-label">Average score</p>
          <p className="metric-val">{avgScore ? `${avgScore}%` : "--"}</p>
        </div>
        <div className="metric">
          <p className="metric-label">Best score</p>
          <p className="metric-val gold">{bestScore ? `${bestScore}%` : "--"}</p>
        </div>
        <div className="metric">
          <p className="metric-label">Total practice</p>
          <p className="metric-val">{totalTime > 0 ? `${Math.round(totalTime / 60)}m` : "--"}</p>
        </div>
      </motion.div>

      {/* Weekly trend */}
      <motion.div variants={fadeIn} className="card mb-7">
        <p className="card-title">Weekly score trend</p>
        {progressData.length > 0 ? (
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={progressData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="progGold" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#c9a84c" stopOpacity={0.1} />
                    <stop offset="100%" stopColor="#c9a84c" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#1a1a1a" />
                <XAxis dataKey="week" stroke="#1a1a1a" tick={{ fontSize: 11, fill: "#3a3530" }} />
                <YAxis domain={[0, 100]} stroke="#1a1a1a" tick={{ fontSize: 11, fill: "#3a3530" }} tickFormatter={(v) => `${v}%`} />
                <Tooltip contentStyle={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: "6px", color: "#e8e0d0", fontSize: "12px" }} />
                <Area type="monotone" dataKey="avg_overall" stroke="#c9a84c" fill="url(#progGold)" strokeWidth={1.5} name="Overall"
                  dot={{ r: 3, fill: "#c9a84c", strokeWidth: 0 }} />
                <Line type="monotone" dataKey="avg_pitch" stroke="#8a7848" strokeWidth={1.2} dot={false} name="Pitch" />
                <Line type="monotone" dataKey="avg_rhythm" stroke="#6a4820" strokeWidth={1.2} dot={false} strokeDasharray="4 4" name="Rhythm" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-52 flex flex-col items-center justify-center text-center">
            <p className="text-[13px] text-text-dim">Not enough data</p>
            <p className="text-[11px] text-text-faint mt-1">Complete more sessions to see trends</p>
          </div>
        )}
      </motion.div>

      {/* Session scores */}
      <motion.div variants={fadeIn} className="card">
        <p className="card-title">Session scores</p>
        {scored.length > 0 ? (
          <div className="flex flex-col gap-3">
            {scored.slice(0, 10).map((item, i) => (
              <div key={item.id} className="cursor-pointer group" onClick={() => navigate(`/results/${item.id}`)}>
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-[12px] text-text-soft truncate group-hover:text-accent transition-colors">
                    {item.file_name}
                  </p>
                  <span className="text-[11px] text-text-faint ml-2 shrink-0">
                    {formatDate(item.created_at)} · <span className="text-accent font-medium">{Math.round(item.overall_score)}%</span>
                  </span>
                </div>
                <div className="bar-track">
                  <motion.div className="bar-fill" initial={{ width: 0 }} animate={{ width: `${item.overall_score}%` }}
                    transition={{ duration: 0.6, delay: i * 0.04 }} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[13px] text-text-dim text-center py-6">No sessions yet</p>
        )}
      </motion.div>
    </motion.div>
  );
}
