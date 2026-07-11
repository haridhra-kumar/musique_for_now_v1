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

    // Clear
    ctx.clearRect(0, 0, w, h);

    // Background gradient
    const bgGrad = ctx.createLinearGradient(0, 0, w, 0);
    bgGrad.addColorStop(0, "rgba(99, 102, 241, 0.03)");
    bgGrad.addColorStop(0.5, "rgba(168, 85, 247, 0.05)");
    bgGrad.addColorStop(1, "rgba(99, 102, 241, 0.03)");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // Draw mistake regions
    const severityColors: Record<string, string> = {
      low: "rgba(234, 179, 8, 0.12)",
      medium: "rgba(249, 115, 22, 0.15)",
      high: "rgba(239, 68, 68, 0.18)",
    };

    mistakes.forEach((m) => {
      const x = (m.time_seconds / duration) * w;
      const regionW = Math.max(8, (2 / duration) * w);
      ctx.fillStyle = severityColors[m.severity] || severityColors.low;
      ctx.fillRect(x - regionW / 2, 0, regionW, h);

      // Border line
      const borderColors: Record<string, string> = {
        low: "rgba(234, 179, 8, 0.4)",
        medium: "rgba(249, 115, 22, 0.5)",
        high: "rgba(239, 68, 68, 0.6)",
      };
      ctx.strokeStyle = borderColors[m.severity] || borderColors.low;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    });

    // Generate synthetic waveform from pitch data or random
    const centerY = h / 2;
    const points: { x: number; y: number }[] = [];
    const numPoints = Math.max(200, Math.min(w, 600));

    if (pitchData.length > 0) {
      // Use pitch data to modulate amplitude
      const maxFreq = Math.max(...pitchData.map((p) => p.freq).filter((f) => f > 0), 1);
      for (let i = 0; i < numPoints; i++) {
        const t = (i / numPoints) * duration;
        // Find nearest pitch data point
        let nearest = pitchData[0];
        let minDist = Infinity;
        for (const p of pitchData) {
          const dist = Math.abs(p.time - t);
          if (dist < minDist) {
            minDist = dist;
            nearest = p;
          }
        }
        const amplitude = nearest.freq > 0 ? (nearest.freq / maxFreq) * (h * 0.35) : h * 0.05;
        const noise = Math.sin(t * 15) * 0.4 + Math.sin(t * 31) * 0.3 + Math.sin(t * 67) * 0.2;
        const x = (i / numPoints) * w;
        const y = centerY + noise * amplitude;
        points.push({ x, y });
      }
    } else {
      // Synthetic waveform
      for (let i = 0; i < numPoints; i++) {
        const t = i / numPoints;
        const amplitude = h * 0.3;
        const noise =
          Math.sin(t * 50) * 0.5 +
          Math.sin(t * 120) * 0.3 +
          Math.sin(t * 200) * 0.15 +
          Math.sin(t * 400) * 0.05;
        const envelope = Math.sin(t * Math.PI) * 0.8 + 0.2;
        const x = t * w;
        const y = centerY + noise * amplitude * envelope;
        points.push({ x, y });
      }
    }

    // Draw filled waveform
    const waveGrad = ctx.createLinearGradient(0, 0, w, 0);
    waveGrad.addColorStop(0, "rgba(34, 211, 238, 0.6)");
    waveGrad.addColorStop(0.3, "rgba(99, 102, 241, 0.7)");
    waveGrad.addColorStop(0.7, "rgba(168, 85, 247, 0.7)");
    waveGrad.addColorStop(1, "rgba(236, 72, 153, 0.6)");

    // Upper half
    ctx.beginPath();
    ctx.moveTo(0, centerY);
    points.forEach((p) => ctx.lineTo(p.x, p.y));
    ctx.lineTo(w, centerY);
    ctx.closePath();
    ctx.fillStyle = waveGrad;
    ctx.globalAlpha = 0.6;
    ctx.fill();

    // Mirror (lower half)
    ctx.beginPath();
    ctx.moveTo(0, centerY);
    points.forEach((p) => ctx.lineTo(p.x, 2 * centerY - p.y));
    ctx.lineTo(w, centerY);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;

    // Center line
    ctx.strokeStyle = "rgba(99, 102, 241, 0.3)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, centerY);
    ctx.lineTo(w, centerY);
    ctx.stroke();

    // Time markers
    ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
    ctx.font = "10px Inter, sans-serif";
    const interval = duration > 120 ? 30 : duration > 60 ? 15 : duration > 30 ? 10 : 5;
    for (let t = 0; t <= duration; t += interval) {
      const x = (t / duration) * w;
      ctx.fillText(
        `${Math.floor(t / 60)}:${(t % 60).toString().padStart(2, "0")}`,
        x + 2,
        h - 4
      );
      ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
  }, [duration, mistakes, pitchData]);

  return (
    <div className="glass rounded-2xl p-4 md:p-6">
      <h3 className="text-lg font-semibold mb-4 gradient-text-blue">Waveform Overview</h3>
      <canvas
        ref={canvasRef}
        className="w-full rounded-xl"
        style={{ height: "120px" }}
      />
      <div className="flex items-center gap-4 mt-3 text-xs text-text-muted">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-sm" style={{ background: "rgba(234, 179, 8, 0.4)" }} />
          Low severity
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-sm" style={{ background: "rgba(249, 115, 22, 0.5)" }} />
          Medium
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-sm" style={{ background: "rgba(239, 68, 68, 0.6)" }} />
          High
        </span>
      </div>
    </div>
  );
}
