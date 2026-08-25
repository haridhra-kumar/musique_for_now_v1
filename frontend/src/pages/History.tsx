import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
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

type SortKey = "created_at" | "overall_score" | "pitch_score" | "rhythm_score";
type SortDir = "asc" | "desc";

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return "Today";
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatDuration(seconds?: number | null): string {
  if (seconds == null || isNaN(seconds) || seconds < 0) return "--";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}m ${s.toString().padStart(2, "0")}s`;
}

function scoreClass(score: number): string {
  if (score >= 80) return "great";
  if (score >= 70) return "ok";
  return "low";
}

export default function History() {
  const navigate = useNavigate();
  const [sortKey, setSortKey] = useState<SortKey>("created_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const { data: history = [], isLoading } = useQuery<HistoryItem[]>({
    queryKey: ["history"],
    queryFn: async () => (await userApi.history()).data,
  });

  const scored = history.filter((h) => h.overall_score != null);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("desc"); }
  };

  const sorted = [...scored].sort((a, b) => {
    const aVal = sortKey === "created_at" ? new Date(a.created_at).getTime() : a[sortKey];
    const bVal = sortKey === "created_at" ? new Date(b.created_at).getTime() : b[sortKey];
    return sortDir === "asc" ? (aVal < bVal ? -1 : 1) : (aVal > bVal ? -1 : 1);
  });

  const SortBtn = ({ label, k }: { label: string; k: SortKey }) => (
    <button
      onClick={() => handleSort(k)}
      className={`flex items-center gap-1 text-[11px] uppercase tracking-wider transition-colors cursor-pointer ${
        sortKey === k ? "text-accent" : "text-text-muted hover:text-text-soft"
      }`}
    >
      {label}
      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
        className={`transition-transform ${sortKey === k && sortDir === "asc" ? "rotate-180" : ""}`}>
        <polyline points="6 9 12 15 18 9" />
      </svg>
    </button>
  );

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-3 mb-7">
        <div>
          <h1 className="page-title">History</h1>
          <p className="page-sub">
            {scored.length} {scored.length === 1 ? "session" : "sessions"} analysed
          </p>
        </div>
        <Link to="/upload">
          <button className="btn-primary">New session</button>
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => <div key={i} className="card h-16 animate-pulse" />)}
        </div>
      ) : scored.length === 0 ? (
        <div className="card !p-12 text-center">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"
            className="mx-auto mb-3 text-text-faint">
            <circle cx="12" cy="12" r="9" /><polyline points="12 7 12 12 15.5 13.5" />
          </svg>
          <p className="text-[13px] text-text-dim mb-4">No sessions yet</p>
          <Link to="/upload"><button className="btn-primary">Upload your first recording</button></Link>
        </div>
      ) : (
        <div className="card">
          <div className="flex items-center gap-5 pb-4 border-b border-border-soft overflow-x-auto">
            <span className="text-[11px] text-text-faint uppercase tracking-wider shrink-0">Sort by</span>
            <SortBtn label="Date" k="created_at" />
            <SortBtn label="Score" k="overall_score" />
            <SortBtn label="Pitch" k="pitch_score" />
            <SortBtn label="Rhythm" k="rhythm_score" />
          </div>

          <div>
            {sorted.map((item) => (
              <div key={item.id} className="history-item !py-3" onClick={() => navigate(`/results/${item.id}`)}>
                <div className="min-w-0">
                  <p className="h-title truncate">{item.file_name}</p>
                  <p className="h-meta">
                    {formatDate(item.created_at)} · {formatDuration(item.duration_seconds)}
                    <span className="hidden sm:inline">
                      {" "}· P {Math.round(item.pitch_score || 0)}% · R {Math.round(item.rhythm_score || 0)}% · T {Math.round(item.tempo_score || 0)}%
                    </span>
                  </p>
                </div>
                <span className={`h-score ${scoreClass(item.overall_score || 0)}`}>{Math.round(item.overall_score || 0)}%</span>
                <span className="h-badge">Session</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}
