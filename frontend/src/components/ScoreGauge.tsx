import { motion } from "framer-motion";

interface ScoreGaugeProps {
  score: number;
  label: string;
  size?: number;
}

function getScoreColor(score: number): { start: string; end: string } {
  if (score >= 80) return { start: "#c9a84c", end: "#d9b85c" };
  if (score >= 60) return { start: "#8a7848", end: "#a8904c" };
  if (score >= 40) return { start: "#6a4820", end: "#8a6830" };
  return { start: "#6a4028", end: "#5a3020" };
}

function getScoreLabel(score: number): string {
  if (score >= 90) return "Excellent";
  if (score >= 80) return "Great";
  if (score >= 70) return "Good";
  if (score >= 60) return "Fair";
  if (score >= 40) return "Needs Work";
  return "Keep Practicing";
}

export default function ScoreGauge({ score, label, size = 130 }: ScoreGaugeProps) {
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;
  const colors = getScoreColor(score);
  const gradientId = `gauge-${label.replace(/\s/g, "")}`;

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={colors.start} />
              <stop offset="100%" stopColor={colors.end} />
            </linearGradient>
          </defs>
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#1a1a1a" strokeWidth={strokeWidth} />
          <motion.circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={`url(#${gradientId})`}
            strokeWidth={strokeWidth} strokeLinecap="round" strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }} animate={{ strokeDashoffset: circumference - progress }}
            transition={{ duration: 1.5, ease: "easeOut", delay: 0.2 }} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span className="text-[22px] font-medium" style={{ color: colors.start }}
            initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, delay: 0.8 }}>
            {Math.round(score)}
          </motion.span>
          <span className="text-[10px] text-text-faint">{getScoreLabel(score)}</span>
        </div>
      </div>
      <span className="text-[11px] uppercase tracking-wider text-text-muted">{label}</span>
    </div>
  );
}
