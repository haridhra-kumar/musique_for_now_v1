import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";
import { userApi } from "../lib/api";
import { useAuthStore } from "../stores/auth";
import ScoreGauge from "../components/ScoreGauge";

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

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function Dashboard() {
  const user = useAuthStore((s) => s.user);

  const { data: history = [] } = useQuery<HistoryItem[]>({
    queryKey: ["history"],
    queryFn: async () => (await userApi.history()).data,
  });

  const { data: progress = [] } = useQuery<ProgressWeek[]>({
    queryKey: ["progress"],
    queryFn: async () => (await userApi.progress()).data,
  });

  const recentAnalyses = history.slice(0, 5);
  const totalAnalyses = history.length;
  const avgScore = totalAnalyses > 0
    ? Math.round(history.reduce((sum, h) => sum + h.overall_score, 0) / totalAnalyses)
    : 0;
  const bestScore = totalAnalyses > 0
    ? Math.max(...history.map((h) => h.overall_score))
    : 0;

  const progressData = progress.map((p) => ({
    ...p,
    week: formatDate(p.week_start),
  }));

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      {/* Welcome header */}
      <motion.div variants={item} className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">
            Welcome back, <span className="gradient-text">{user?.name?.split(" ")[0] || "there"}</span>
          </h1>
          <p className="text-text-secondary mt-1">Here's an overview of your musical journey</p>
        </div>
        <Link to="/upload">
          <motion.button
            className="btn-primary flex items-center gap-2"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            New Analysis
          </motion.button>
        </Link>
      </motion.div>

      {/* Quick stats */}
      <motion.div variants={item} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Analyses", value: totalAnalyses, icon: "chart", color: "#6366f1" },
          { label: "Average Score", value: avgScore || "--", icon: "target", color: "#a855f7" },
          { label: "Best Score", value: bestScore || "--", icon: "trophy", color: "#22c55e" },
          { label: "Credits Left", value: user?.credits ?? 0, icon: "coin", color: "#22d3ee" },
        ].map((stat) => (
          <div key={stat.label} className="glass rounded-2xl p-4 md:p-5 glow-border-hover transition-all">
            <div className="flex items-center gap-3 mb-2">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: `${stat.color}20` }}
              >
                {stat.icon === "chart" && (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={stat.color} strokeWidth="2">
                    <path d="M18 20V10M12 20V4M6 20v-6" strokeLinecap="round" />
                  </svg>
                )}
                {stat.icon === "target" && (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={stat.color} strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <circle cx="12" cy="12" r="6" />
                    <circle cx="12" cy="12" r="2" />
                  </svg>
                )}
                {stat.icon === "trophy" && (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={stat.color} strokeWidth="2">
                    <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6M18 9h1.5a2.5 2.5 0 0 0 0-5H18M4 22h16M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20 7 22M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20 17 22M18 2H6v7a6 6 0 0 0 12 0V2Z" />
                  </svg>
                )}
                {stat.icon === "coin" && (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={stat.color} strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 6v12M15 9.5c-.8-.8-3.5-1.3-4.5 0s1 3 2 3.5 3 1 2 2.5-3.7.8-4.5 0" />
                  </svg>
                )}
              </div>
            </div>
            <p className="text-2xl font-bold">{stat.value}</p>
            <p className="text-xs text-text-muted mt-0.5">{stat.label}</p>
          </div>
        ))}
      </motion.div>

      {/* Progress chart + recent */}
      <div className="grid lg:grid-cols-5 gap-6">
        {/* Progress chart */}
        <motion.div variants={item} className="lg:col-span-3 glass rounded-2xl p-4 md:p-6">
          <h2 className="text-lg font-semibold mb-4 gradient-text-blue">Weekly Progress</h2>
          {progressData.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={progressData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                  <defs>
                    <linearGradient id="overallGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="pitchGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#22d3ee" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="week" stroke="rgba(255,255,255,0.3)" tick={{ fontSize: 11, fill: "#64748b" }} />
                  <YAxis domain={[0, 100]} stroke="rgba(255,255,255,0.3)" tick={{ fontSize: 11, fill: "#64748b" }} />
                  <Tooltip
                    contentStyle={{
                      background: "rgba(17, 17, 40, 0.95)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: "12px",
                      color: "#f1f5f9",
                      fontSize: "13px",
                    }}
                  />
                  <Area type="monotone" dataKey="avg_overall" stroke="#6366f1" fill="url(#overallGrad)" strokeWidth={2} name="Overall" />
                  <Area type="monotone" dataKey="avg_pitch" stroke="#22d3ee" fill="url(#pitchGrad)" strokeWidth={2} name="Pitch" />
                  <Line type="monotone" dataKey="avg_rhythm" stroke="#a855f7" strokeWidth={2} dot={false} name="Rhythm" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-3"
                style={{ background: "rgba(99, 102, 241, 0.1)" }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2">
                  <path d="M18 20V10M12 20V4M6 20v-6" strokeLinecap="round" />
                </svg>
              </div>
              <p className="text-text-secondary font-medium">No progress data yet</p>
              <p className="text-text-muted text-sm mt-1">Upload your first recording to get started</p>
            </div>
          )}
        </motion.div>

        {/* Latest score */}
        <motion.div variants={item} className="lg:col-span-2 glass rounded-2xl p-4 md:p-6 flex flex-col items-center justify-center">
          <h2 className="text-lg font-semibold mb-4 gradient-text-blue w-full">Latest Score</h2>
          {recentAnalyses.length > 0 ? (
            <div className="flex flex-col items-center">
              <ScoreGauge score={recentAnalyses[0].overall_score} label="Overall" size={180} />
              <div className="grid grid-cols-3 gap-4 mt-6 w-full">
                <ScoreGauge score={recentAnalyses[0].pitch_score} label="Pitch" size={90} />
                <ScoreGauge score={recentAnalyses[0].rhythm_score} label="Rhythm" size={90} />
                <ScoreGauge score={recentAnalyses[0].tempo_score} label="Tempo" size={90} />
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8">
              <ScoreGauge score={0} label="No data" size={140} />
              <p className="text-text-muted text-sm mt-4">Upload a recording to see your score</p>
            </div>
          )}
        </motion.div>
      </div>

      {/* Recent analyses */}
      <motion.div variants={item} className="glass rounded-2xl p-4 md:p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold gradient-text-blue">Recent Analyses</h2>
          {history.length > 5 && (
            <Link to="/history" className="text-sm text-accent-blue hover:text-accent-purple transition-colors">
              View all
            </Link>
          )}
        </div>

        {recentAnalyses.length > 0 ? (
          <div className="space-y-2">
            {recentAnalyses.map((analysis, i) => (
              <motion.div
                key={analysis.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Link
                  to={`/results/${analysis.id}`}
                  className="flex items-center gap-4 p-3 rounded-xl hover:bg-white/[0.03] transition-all group"
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-sm font-bold"
                    style={{
                      background:
                        analysis.overall_score >= 80
                          ? "rgba(34, 197, 94, 0.15)"
                          : analysis.overall_score >= 60
                          ? "rgba(234, 179, 8, 0.15)"
                          : "rgba(239, 68, 68, 0.15)",
                      color:
                        analysis.overall_score >= 80
                          ? "#22c55e"
                          : analysis.overall_score >= 60
                          ? "#eab308"
                          : "#ef4444",
                    }}
                  >
                    {analysis.overall_score}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate group-hover:text-accent-blue transition-colors">
                      {analysis.file_name}
                    </p>
                    <p className="text-xs text-text-muted">
                      {formatDate(analysis.created_at)} &middot; {formatDuration(analysis.duration_seconds)}
                    </p>
                  </div>
                  <div className="hidden md:flex items-center gap-3 text-xs text-text-muted">
                    <span>P: {analysis.pitch_score}</span>
                    <span>R: {analysis.rhythm_score}</span>
                    <span>T: {analysis.tempo_score}</span>
                  </div>
                  <svg
                    width="16" height="16" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2"
                    className="text-text-muted group-hover:text-accent-blue transition-colors shrink-0"
                  >
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </Link>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div
              className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
              style={{ background: "rgba(99, 102, 241, 0.1)" }}
            >
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2">
                <path d="M9 18V5l12-2v13" />
                <circle cx="6" cy="18" r="3" />
                <circle cx="18" cy="16" r="3" />
              </svg>
            </div>
            <p className="text-text-secondary font-medium">No analyses yet</p>
            <p className="text-text-muted text-sm mt-1 mb-4">
              Upload your first audio or video recording to get AI-powered feedback
            </p>
            <Link to="/upload">
              <motion.button
                className="btn-primary"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                Upload Recording
              </motion.button>
            </Link>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
