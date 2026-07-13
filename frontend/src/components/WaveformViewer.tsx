import { useEffect, useRef } from "react";

interface Mistake {
  time_seconds: number;
  severity: "low" | "medium" | "high";
  type: string;
}

interface WaveformViewerProps {
  duration: number;
  mistakes: Mistake[];
  pitchData?: { time: number; freq: number }[];
}

export default function WaveformViewer({ duration, mistakes, pitchData = [] }: WaveformViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;
    ctx.clearRect(0, 0, w, h);

    const bgGrad = ctx.createLinearGradient(0, 0, w, 0);
    bgGrad.addColorStop(0, "rgba(212,168,67,0.02)");
    bgGrad.addColorStop(0.5, "rgba(212,168,67,0.04)");
    bgGrad.addColorStop(1, "rgba(212,168,67,0.02)");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    const severityColors: Record<string, string> = {
      low: "rgba(212,168,67,0.1)", medium: "rgba(212,168,67,0.15)", high: "rgba(192,57,43,0.15)",
    };

    mistakes.forEach((m) => {
      const x = (m.time_seconds / duration) * w;
      const regionW = Math.max(8, (2 / duration) * w);
      ctx.fillStyle = severityColors[m.severity] || severityColors.low;
      ctx.fillRect(x - regionW / 2, 0, regionW, h);
      ctx.strokeStyle = m.severity === "high" ? "rgba(192,57,43,0.4)" : "rgba(212,168,67,0.3)";
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    });

    const centerY = h / 2;
    const points: { x: number; y: number }[] = [];
    const numPoints = Math.max(200, Math.min(w, 600));

    if (pitchData.length > 0) {
      const maxFreq = Math.max(...pitchData.map((p) => p.freq).filter((f) => f > 0), 1);
      for (let i = 0; i < numPoints; i++) {
        const t = (i / numPoints) * duration;
        let nearest = pitchData[0];
        let minDist = Infinity;
        for (const p of pitchData) { const d = Math.abs(p.time - t); if (d < minDist) { minDist = d; nearest = p; } }
        const amplitude = nearest.freq > 0 ? (nearest.freq / maxFreq) * (h * 0.35) : h * 0.05;
        const noise = Math.sin(t * 15) * 0.4 + Math.sin(t * 31) * 0.3 + Math.sin(t * 67) * 0.2;
        points.push({ x: (i / numPoints) * w, y: centerY + noise * amplitude });
      }
    } else {
      for (let i = 0; i < numPoints; i++) {
        const t = i / numPoints;
        const noise = Math.sin(t * 50) * 0.5 + Math.sin(t * 120) * 0.3 + Math.sin(t * 200) * 0.15;
        const envelope = Math.sin(t * Math.PI) * 0.8 + 0.2;
        points.push({ x: t * w, y: centerY + noise * (h * 0.3) * envelope });
      }
    }

    const waveGrad = ctx.createLinearGradient(0, 0, w, 0);
    waveGrad.addColorStop(0, "rgba(184,150,58,0.5)");
    waveGrad.addColorStop(0.5, "rgba(212,168,67,0.6)");
    waveGrad.addColorStop(1, "rgba(232,197,90,0.5)");

    ctx.beginPath(); ctx.moveTo(0, centerY);
    points.forEach((p) => ctx.lineTo(p.x, p.y));
    ctx.lineTo(w, centerY); ctx.closePath();
    ctx.fillStyle = waveGrad; ctx.globalAlpha = 0.6; ctx.fill();

    ctx.beginPath(); ctx.moveTo(0, centerY);
    points.forEach((p) => ctx.lineTo(p.x, 2 * centerY - p.y));
    ctx.lineTo(w, centerY); ctx.closePath(); ctx.fill();
    ctx.globalAlpha = 1;

    ctx.strokeStyle = "rgba(212,168,67,0.2)"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, centerY); ctx.lineTo(w, centerY); ctx.stroke();

    ctx.fillStyle = "rgba(255,255,255,0.25)";
    ctx.font = "10px Inter, sans-serif";
    const interval = duration > 120 ? 30 : duration > 60 ? 15 : duration > 30 ? 10 : 5;
    for (let t = 0; t <= duration; t += interval) {
      const x = (t / duration) * w;
      ctx.fillText(`${Math.floor(t / 60)}:${(t % 60).toString().padStart(2, "0")}`, x + 2, h - 4);
      ctx.strokeStyle = "rgba(255,255,255,0.03)";
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    }
  }, [duration, mistakes, pitchData]);

  return (
    <div className="card p-5">
      <p className="section-label mb-3">Waveform Overview</p>
      <canvas ref={canvasRef} className="w-full rounded-lg" style={{ height: "100px" }} />
      <div className="flex items-center gap-4 mt-2.5 text-[10px] text-text-muted">
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-sm" style={{ background: "rgba(212,168,67,0.3)" }} /> Low
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-sm" style={{ background: "rgba(212,168,67,0.5)" }} /> Medium
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-sm" style={{ background: "rgba(192,57,43,0.5)" }} /> High
        </span>
      </div>
    </div>
  );
}
