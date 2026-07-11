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
  pitch: { bg: "rgba(99, 102, 241, 0.15)", text: "#818cf8", border: "rgba(99, 102, 241, 0.3)" },
  rhythm: { bg: "rgba(168, 85, 247, 0.15)", text: "#c084fc", border: "rgba(168, 85, 247, 0.3)" },
  tempo: { bg: "rgba(34, 211, 238, 0.15)", text: "#22d3ee", border: "rgba(34, 211, 238, 0.3)" },
  unclear: { bg: "rgba(148, 163, 184, 0.15)", text: "#94a3b8", border: "rgba(148, 163, 184, 0.3)" },
};

const severityConfig: Record<string, { label: string; color: string; bg: string }> = {
  low: { label: "Low", color: "#22c55e", bg: "rgba(34, 197, 94, 0.15)" },
  medium: { label: "Medium", color: "#eab308", bg: "rgba(234, 179, 8, 0.15)" },
  high: { label: "High", color: "#ef4444", bg: "rgba(239, 68, 68, 0.15)" },
};

const typeIcons: Record<string, JSX.Element> = {
  pitch: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M9 18V5l12-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="16" r="3" />
    </svg>
  ),
  rhythm: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 8 14" />
    </svg>
  ),
  tempo: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  ),
  unclear: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  ),
};

export default function MistakeTimeline({ mistakes }: MistakeTimelineProps) {
  if (!mistakes || mistakes.length === 0) {
    return (
      <div className="glass rounded-2xl p-6">
        <h3 className="text-lg font-semibold mb-4 gradient-text-blue">Detected Mistakes</h3>
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-3"
            style={{ background: "rgba(34, 197, 94, 0.15)" }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
          <p className="text-text-secondary font-medium">No mistakes detected!</p>
          <p className="text-text-muted text-sm mt-1">Great performance</p>
        </div>
      </div>
    );
  }

  const sorted = [...mistakes].sort((a, b) => a.time_seconds - b.time_seconds);

  return (
    <div className="glass rounded-2xl p-4 md:p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold gradient-text-blue">Detected Mistakes</h3>
        <span className="text-sm text-text-muted">{mistakes.length} found</span>
      </div>
      <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
        {sorted.map((mistake, index) => {
          const tc = typeColors[mistake.type] || typeColors.unclear;
          const sc = severityConfig[mistake.severity] || severityConfig.low;

          return (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05, duration: 0.3 }}
              className="flex gap-3 p-3 rounded-xl transition-all hover:bg-white/[0.03]"
              style={{ border: `1px solid ${tc.border}` }}
            >
              {/* Timeline dot + line */}
              <div className="flex flex-col items-center pt-1">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: tc.bg, color: tc.text }}
                >
                  {typeIcons[mistake.type] || typeIcons.unclear}
                </div>
                {index < sorted.length - 1 && (
                  <div className="w-px flex-1 mt-2" style={{ background: tc.border }} />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span
                    className="text-xs font-mono font-medium px-2 py-0.5 rounded-md"
                    style={{ background: tc.bg, color: tc.text }}
                  >
                    {mistake.timestamp}
                  </span>
                  <span
                    className="text-xs font-medium px-2 py-0.5 rounded-md capitalize"
                    style={{ background: tc.bg, color: tc.text }}
                  >
                    {mistake.type}
                  </span>
                  <span
                    className="text-xs font-medium px-2 py-0.5 rounded-md"
                    style={{ background: sc.bg, color: sc.color }}
                  >
                    {sc.label}
                  </span>
                </div>
                <p className="text-sm text-text-secondary leading-relaxed">
                  {mistake.description}
                </p>
                <div className="mt-1.5 flex items-center gap-1">
                  <div className="h-1 flex-1 max-w-[80px] bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${mistake.confidence * 100}%`,
                        background: `linear-gradient(90deg, ${tc.text}, ${tc.text}80)`,
                      }}
                    />
                  </div>
                  <span className="text-[10px] text-text-muted">
                    {Math.round(mistake.confidence * 100)}% confidence
                  </span>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
