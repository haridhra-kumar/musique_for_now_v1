import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, ReferenceArea,
} from "recharts";

interface PitchDataPoint {
  time: number;
  freq: number;
  confidence: number;
  note: string;
}

interface PitchGraphProps {
  data: PitchDataPoint[];
  mistakes?: { time_seconds: number; end_time_seconds?: number; type: string; severity?: string }[];
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
      <div className="card p-5 flex items-center justify-center h-56">
        <p className="text-sm text-text-muted">No pitch data available</p>
      </div>
    );
  }

  const maxPoints = 500;
  const step = Math.max(1, Math.floor(data.length / maxPoints));
  const sampled = data.filter((_, i) => i % step === 0);

  const freqs = sampled.map((d) => d.freq).filter((f) => f > 0);
  const minFreq = Math.max(50, Math.min(...freqs) * 0.8);
  const maxFreq = Math.min(1200, Math.max(...freqs) * 1.2);

  const refNotes = Object.entries(noteFreqs)
    .filter(([, f]) => f >= minFreq && f <= maxFreq)
    .filter((_, i) => i % 2 === 0);

  const chartData = sampled.map((d) => ({
    time: d.time,
    freq: d.freq > 0 ? d.freq : null,
    confidence: d.confidence,
    note: d.note,
    timeLabel: formatTime(d.time),
  }));

  const pitchMistakes = mistakes.filter((m) => m.type === "pitch");

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <p className="card-title !mb-0">Timestamped pitch map</p>
        <div className="flex items-center gap-4 text-[11px] text-text-muted">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ background: "#c9a84c" }} />
            Your voice
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ background: "#2a2520" }} />
            Reference notes
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-4 h-1.5 rounded-sm" style={{ background: "#8a3020" }} />
            Drift zone
          </span>
        </div>
      </div>
      <div className="h-[340px] md:h-[440px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 10, right: 16, left: 4, bottom: 8 }}>
            <CartesianGrid stroke="#1a1a1a" />
            <XAxis dataKey="time" tickFormatter={formatTime} stroke="#1a1a1a"
              tick={{ fontSize: 11, fill: "#3a3530" }} axisLine={{ stroke: "#1a1a1a" }} minTickGap={30} />
            <YAxis domain={[minFreq, maxFreq]} stroke="#1a1a1a"
              tick={{ fontSize: 11, fill: "#3a3530" }} axisLine={{ stroke: "#1a1a1a" }}
              tickFormatter={(v: number) => `${Math.round(v)}Hz`} width={52} />
            <Tooltip contentStyle={{
              background: "#111", border: "1px solid #1e1e1e", borderRadius: "6px", color: "#e8e0d0", fontSize: "11px",
            }} formatter={(value: unknown, name: string) => {
              if (name === "freq" && typeof value === "number") return [`${Math.round(value)} Hz`, "Frequency"];
              return [String(value ?? ""), name];
            }} labelFormatter={(label: number) => formatTime(label)} />
            {refNotes.map(([note, freq]) => (
              <ReferenceLine key={note} y={freq} stroke="#2a2520" strokeDasharray="4 4"
                label={{ value: note, position: "left", fill: "#3a3530", fontSize: 9 }} />
            ))}
            {pitchMistakes.map((m, i) => (
              <ReferenceArea
                key={`drift-${i}`}
                x1={m.time_seconds}
                x2={m.end_time_seconds ?? m.time_seconds + 0.3}
                fill="#e06040"
                fillOpacity={m.severity === "high" ? 0.4 : 0.22}
                stroke="#e06040"
                strokeOpacity={0.6}
              />
            ))}
            <Line type="monotone" dataKey="freq" stroke="#c9a84c" strokeWidth={1.5}
              dot={false} connectNulls={false} animationDuration={2000} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      {pitchMistakes.length === 0 && (
        <p className="text-[11px] text-text-faint mt-3">No pitch drift detected — you stayed on the notes.</p>
      )}
    </div>
  );
}