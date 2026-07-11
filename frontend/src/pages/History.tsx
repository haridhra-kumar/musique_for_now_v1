import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
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

type SortKey = "created_at" | "overall_score" | "pitch_score" | "rhythm_score" | "tempo_score" | "duration_seconds";
type SortDir = "asc" | "desc";

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function getScoreStyle(score: number) {
  if (score >= 80) return { bg: "rgba(34, 197, 94, 0.15)", color: "#22c55e" };
  if (score >= 60) return { bg: "rgba(234, 179, 8, 0.15)", color: "#eab308" };
  if (score >= 40) return { bg: "rgba(249, 115, 22, 0.15)", color: "#f97316" };
  return { bg: "rgba(239, 68, 68, 0.15)", color: "#ef4444" };
}

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
};

const item = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

export default function History() {
  const [sortKey, setSortKey] = useState<SortKey>("created_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const { data: history = [], isLoading } = useQuery<HistoryItem[]>({
    queryKey: ["history"],
    queryFn: async () => (await userApi.history()).data,
  });

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const sorted = [...history].sort((a, b) => {
    let aVal: number | string;
    let bVal: number | string;

    if (sortKey === "created_at") {
      aVal = new Date(a.created_at).getTime();
      bVal = new Date(b.created_at).getTime();
    } else {
      aVal = a[sortKey];
      bVal = b[sortKey];
    }

    if (sortDir === "asc") return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
    return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
  });

  const SortIcon = ({ active, dir }: { active: boolean; dir: SortDir }) => (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke={active ? "#6366f1" : "#64748b"}
      strokeWidth="2"
      className={`transition-transform ${active && dir === "asc" ? "rotate-180" : ""}`}
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );

  const SortButton = ({ label, sortKeyVal }: { label: string; sortKeyVal: SortKey }) => (
    <button
      onClick={() => handleSort(sortKeyVal)}
      className={`flex items-center gap-1 text-xs font-medium transition-colors ${
        sortKey === sortKeyVal ? "text-accent-blue" : "text-text-muted hover:text-text-secondary"
      }`}
    >
      {label}
      <SortIcon active={sortKey === sortKeyVal} dir={sortDir} />
    </button>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold gradient-text">Analysis History</h1>
          <p className="text-text-secondary mt-1">
            {history.length} {history.length === 1 ? "analysis" : "analyses"} recorded
          </p>
        </div>
        <Link to="/upload">
          <motion.button className="btn-primary flex items-center gap-2" whileHover={{ scale: 1.03 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            New Analysis
          </motion.button>
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass rounded-2xl p-4 h-20 animate-pulse" />
          ))}
        </div>
      ) : history.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center"
            style={{ background: "rgba(99, 102, 241, 0.1)" }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <p className="text-text-secondary font-medium">No analyses yet</p>
          <p className="text-text-muted text-sm mt-1 mb-4">Your analysis history will appear here</p>
          <Link to="/upload">
            <motion.button className="btn-primary" whileHover={{ scale: 1.03 }}>
              Upload Your First Recording
            </motion.button>
          </Link>
        </div>
      ) : (
        <>
          {/* Sort controls */}
          <div className="glass rounded-xl px-4 py-3 flex items-center gap-4 overflow-x-auto">
            <span className="text-xs text-text-muted shrink-0">Sort by:</span>
            <SortButton label="Date" sortKeyVal="created_at" />
            <SortButton label="Overall" sortKeyVal="overall_score" />
            <SortButton label="Pitch" sortKeyVal="pitch_score" />
            <SortButton label="Rhythm" sortKeyVal="rhythm_score" />
            <SortButton label="Tempo" sortKeyVal="tempo_score" />
            <SortButton label="Duration" sortKeyVal="duration_seconds" />
          </div>

          {/* List */}
          <motion.div variants={container} initial="hidden" animate="show" className="space-y-2">
            {sorted.map((analysis) => {
              const scoreStyle = getScoreStyle(analysis.overall_score);
              return (
                <motion.div key={analysis.id} variants={item}>
                  <Link
                    to={`/results/${analysis.id}`}
                    className="glass rounded-2xl p-4 flex items-center gap-4 transition-all hover:bg-bg-card-hover glow-border-hover group"
                  >
                    {/* Score badge */}
                    <div
                      className="w-14 h-14 rounded-xl flex flex-col items-center justify-center shrink-0"
                      style={{ background: scoreStyle.bg }}
                    >
                      <span className="text-lg font-bold" style={{ color: scoreStyle.color }}>
                        {analysis.overall_score}
                      </span>
                      <span className="text-[10px] text-text-muted">score</span>
                    </div>

                    {/* File info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate group-hover:text-accent-blue transition-colors">
                        {analysis.file_name}
                      </p>
                      <p className="text-xs text-text-muted mt-0.5">
                        {formatDate(analysis.created_at)} &middot; {formatDuration(analysis.duration_seconds)}
                      </p>
                    </div>

                    {/* Subscores */}
                    <div className="hidden md:flex items-center gap-3">
                      {[
                        { label: "P", score: analysis.pitch_score },
                        { label: "R", score: analysis.rhythm_score },
                        { label: "T", score: analysis.tempo_score },
                      ].map((s) => {
                        const st = getScoreStyle(s.score);
                        return (
                          <div
                            key={s.label}
                            className="w-10 h-10 rounded-lg flex flex-col items-center justify-center"
                            style={{ background: st.bg }}
                          >
                            <span className="text-xs font-bold" style={{ color: st.color }}>
                              {s.score}
                            </span>
                            <span className="text-[9px] text-text-muted">{s.label}</span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Arrow */}
                    <svg
                      width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                      className="text-text-muted group-hover:text-accent-blue transition-colors shrink-0"
                    >
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </Link>
                </motion.div>
              );
            })}
          </motion.div>
        </>
      )}
    </motion.div>
  );
}
