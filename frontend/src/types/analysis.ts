export interface AnalysisResult {
  overall_score: number;
  pitch_score: number;
  rhythm_score: number;
  tempo_score: number;
  vocal_stability_score: number;
  key_detected: string;
  octave_shift: number;
  tempo_bpm: number;
  quality_warning: boolean;
  snr_db: number;
  duration_seconds: number;
  mistakes: {
    timestamp: string;
    time_seconds: number;
    end_time_seconds: number;
    type: "pitch" | "rhythm" | "tempo" | "unclear";
    severity: "low" | "medium" | "high";
    description: string;
    confidence: number;
  }[];
  exercises: {
    name: string;
    why: string;
    how: string;
  }[];
  feedback_beginner: string;
  feedback_musician: string;
  processing_time_seconds: number;
  pitch_data: { time: number; freq: number; confidence: number; note: string }[];
  rhythm_data: { tempo: number; beat_count: number; beat_confidence: number; tempo_curve: { time: number; bpm: number }[] };
}