import { motion } from "framer-motion";

interface Mistake {
  timestamp: string;
  time_seconds: number;
  type: "pitch" | "rhythm" | "tempo" | "unclear";
  severity: "low" | "medium" | "high";
  description: string;
  confidence: number;
}

interface MistakeTimelineProps {
  mistakes: Mistake[];
}

const typeColors: Record<string, { bg: string; text: string; border: string }> = {
  pitch: { bg: "rgba(201,168,76,0.1)", text: "#c9a84c", border: "rgba(201,168,76,0.18)" },
  rhythm: { bg: "rgba(138,120,72,0.1)", text: "#8a7848", border: "rgba(138,120,72,0.18)" },
  tempo: { bg: "rgba(138,104,48,0.1)", text: "#8a6830", border: "rgba(138,104,48,0.18)" },
  unclear: { bg: "rgba(90,82,72,0.1)", text: "#7a7268", border: "rgba(90,82,72,0.18)" },
};

const severityConfig: Record<string, { label: string; color: string; bg: string }> = {
  low: { label: "Low", color: "#7a8a5a", bg: "rgba(122,138,90,0.1)" },
  medium: { label: "Medium", color: "#c9a84c", bg: "rgba(201,168,76,0.1)" },
  high: { label: "High", color: "#e06040", bg: "rgba(224,96,64,0.1)" },
};

export default function MistakeTimeline({ mistakes }: MistakeTimelineProps) {
  if (!mistakes || mistakes.length === 0) {
    return (
      <div className="card h-full">
        <p className="card-title">Detected issues</p>
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#c9a84c" strokeWidth="1.8" className="mb-3">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
          </svg>
          <p className="text-[13px] text-text-secondary">No issues detected</p>
          <p className="text-[11px] text-text-faint mt-1">Great performance!</p>
        </div>
      </div>
    );
  }

  const sorted = [...mistakes].sort((a, b) => a.time_seconds - b.time_seconds);

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <p className="card-title !mb-0">Detected issues</p>
        <span className="text-[11px] text-text-faint">{mistakes.length} found</span>
      </div>
      <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
        {sorted.map((mistake, index) => {
          const tc = typeColors[mistake.type] || typeColors.unclear;
          const sc = severityConfig[mistake.severity] || severityConfig.low;

          return (
            <motion.div key={index} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.04 }}
              className="flex gap-2.5 p-2.5 rounded-lg hover:bg-bg-card-hover transition-colors"
              style={{ border: `1px solid ${tc.border}` }}>
              <div className="flex flex-col items-center pt-0.5">
                <div className="w-7 h-7 rounded-md flex items-center justify-center shrink-0" style={{ background: tc.bg, color: tc.text }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    {mistake.type === "pitch" ? <><path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /></>
                    : mistake.type === "rhythm" ? <><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 8 14" /></>
                    : mistake.type === "tempo" ? <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                    : <><circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" /></>}
                  </svg>
                </div>
                {index < sorted.length - 1 && <div className="w-px flex-1 mt-1.5" style={{ background: tc.border }} />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                  <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded" style={{ background: tc.bg, color: tc.text }}>{mistake.timestamp}</span>
                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded capitalize" style={{ background: tc.bg, color: tc.text }}>{mistake.type}</span>
                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded" style={{ background: sc.bg, color: sc.color }}>{sc.label}</span>
                </div>
                <p className="text-[12px] text-text-secondary leading-relaxed">{mistake.description}</p>
                <div className="mt-1 flex items-center gap-1">
                  <div className="h-0.5 flex-1 max-w-[60px] bg-bg-secondary rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${mistake.confidence * 100}%`, background: tc.text }} />
                  </div>
                  <span className="text-[9px] text-text-muted">{Math.round(mistake.confidence * 100)}%</span>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
