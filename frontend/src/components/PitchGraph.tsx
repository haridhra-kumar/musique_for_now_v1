import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

interface PitchDataPoint {
  time: number;
  freq: number;
  confidence: number;
  note: string;
}

interface PitchGraphProps {
  data: PitchDataPoint[];
  mistakes?: { time_seconds: number; type: string }[];
}

const noteFreqs: Record<string, number> = {
  C2: 65.41, D2: 73.42, E2: 82.41, F2: 87.31, G2: 98.0, A2: 110.0, B2: 123.47,
  C3: 130.81, D3: 146.83, E3: 164.81, F3: 174.61, G3: 196.0, A3: 220.0, B3: 246.94,
  C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.0, A4: 440.0, B4: 493.88,
  C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46, G5: 783.99, A5: 880.0, B5: 987.77,
  C6: 1046.5,
};

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function PitchGraph({ data, mistakes = [] }: PitchGraphProps) {
  if (!data || data.length === 0) {
    return (
      <div className="glass rounded-2xl p-6 flex items-center justify-center h-64">
        <p className="text-text-muted">No pitch data available</p>
      </div>
    );
  }

  // Downsample for performance if too many points
  const maxPoints = 500;
  const step = Math.max(1, Math.floor(data.length / maxPoints));
  const sampled = data.filter((_, i) => i % step === 0);

  const freqs = sampled.map((d) => d.freq).filter((f) => f > 0);
  const minFreq = Math.max(50, Math.min(...freqs) * 0.8);
  const maxFreq = Math.min(1200, Math.max(...freqs) * 1.2);

  // Pick note reference lines within range
  const refNotes = Object.entries(noteFreqs)
    .filter(([, f]) => f >= minFreq && f <= maxFreq)
    .filter((_, i) => i % 2 === 0); // every other note to avoid clutter

  const chartData = sampled.map((d) => ({
    time: d.time,
    freq: d.freq > 0 ? d.freq : null,
    confidence: d.confidence,
    note: d.note,
    timeLabel: formatTime(d.time),
  }));

  const mistakeTimes = new Set(mistakes.filter((m) => m.type === "pitch").map((m) => m.time_seconds));

  return (
    <div className="glass rounded-2xl p-4 md:p-6">
      <h3 className="text-lg font-semibold mb-4 gradient-text-blue">Pitch Analysis</h3>
      <div className="h-72 md:h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <defs>
              <linearGradient id="pitchGradient" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#22d3ee" />
                <stop offset="50%" stopColor="#6366f1" />
                <stop offset="100%" stopColor="#a855f7" />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis
              dataKey="time"
              tickFormatter={formatTime}
              stroke="rgba(255,255,255,0.3)"
              tick={{ fontSize: 11, fill: "#64748b" }}
              axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
            />
            <YAxis
              domain={[minFreq, maxFreq]}
              stroke="rgba(255,255,255,0.3)"
              tick={{ fontSize: 11, fill: "#64748b" }}
              axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
              tickFormatter={(v: number) => `${Math.round(v)}Hz`}
              width={55}
            />
            <Tooltip
              contentStyle={{
                background: "rgba(17, 17, 40, 0.95)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "12px",
                backdropFilter: "blur(20px)",
                color: "#f1f5f9",
                fontSize: "13px",
              }}
              formatter={(value: unknown, name: string) => {
                if (name === "freq" && typeof value === "number") return [`${Math.round(value)} Hz`, "Frequency"];
                return [String(value ?? ""), name];
              }}
              labelFormatter={(label: number) => formatTime(label)}
            />
            {refNotes.map(([note, freq]) => (
              <ReferenceLine
                key={note}
                y={freq}
                stroke="rgba(99, 102, 241, 0.15)"
                strokeDasharray="4 4"
                label={{
                  value: note,
                  position: "left",
                  fill: "#64748b",
                  fontSize: 10,
                }}
              />
            ))}
            {/* Mistake markers */}
            {[...mistakeTimes].map((t) => (
              <ReferenceLine
                key={`mistake-${t}`}
                x={t}
                stroke="rgba(239, 68, 68, 0.4)"
                strokeDasharray="3 3"
              />
            ))}
            <Line
              type="monotone"
              dataKey="freq"
              stroke="url(#pitchGradient)"
              strokeWidth={2}
              dot={false}
              connectNulls={false}
              animationDuration={2000}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
