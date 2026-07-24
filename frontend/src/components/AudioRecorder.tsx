import { useState, useRef, useEffect, useCallback } from "react";
import { motion } from "framer-motion";

interface AudioRecorderProps {
  onRecordingComplete: (file: File) => void;
}

type RecorderState = "idle" | "recording" | "recorded" | "denied";

const MAX_SECONDS = 300; // 5 minute safety cap

export default function AudioRecorder({ onRecordingComplete }: AudioRecorderProps) {
  const [state, setState] = useState<RecorderState>("idle");
  const [seconds, setSeconds] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const stopStream = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  useEffect(() => {
    return () => {
      stopTimer();
      stopStream();
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];

      const mimeType = MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : MediaRecorder.isTypeSupported("audio/mp4")
        ? "audio/mp4"
        : "";

      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType || "audio/webm" });
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);

        const ext = mimeType.includes("mp4") ? "m4a" : "webm";
        const file = new File([blob], `recording-${Date.now()}.${ext}`, {
          type: blob.type,
        });
        onRecordingComplete(file);
        stopStream();
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setState("recording");
      setSeconds(0);

      timerRef.current = setInterval(() => {
        setSeconds((s) => {
          if (s + 1 >= MAX_SECONDS) {
            stopRecording();
            return s;
          }
          return s + 1;
        });
      }, 1000);
    } catch {
      setState("denied");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onRecordingComplete]);

  const stopRecording = () => {
    stopTimer();
    mediaRecorderRef.current?.stop();
    setState("recorded");
  };

  const reRecord = () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    setSeconds(0);
    setState("idle");
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  if (state === "denied") {
    return (
      <div className="card !p-8 text-center">
        <p className="text-[13px]" style={{ color: "#e06040" }}>
          Microphone access was denied.
        </p>
        <p className="text-[12px] text-text-faint mt-1 mb-4">
          Allow microphone access in your browser settings, then try again.
        </p>
        <button onClick={() => setState("idle")} className="btn-secondary">
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="card !p-8 text-center">
      {state === "idle" && (
        <>
          <button
            onClick={startRecording}
            className="mx-auto flex items-center justify-center w-16 h-16 rounded-full transition-colors cursor-pointer"
            style={{ background: "var(--color-accent, #c9a84c)" }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0b0b0b" strokeWidth="2">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="23" />
            </svg>
          </button>
          <p className="text-[13px] text-text-soft mt-4">Tap to start recording</p>
          <p className="text-[12px] text-text-faint mt-1">Sing directly from your microphone</p>
        </>
      )}

      {state === "recording" && (
        <>
          <motion.button
            onClick={stopRecording}
            className="mx-auto flex items-center justify-center w-16 h-16 rounded-full cursor-pointer"
            style={{ background: "#e06040" }}
            animate={{ scale: [1, 1.06, 1] }}
            transition={{ duration: 1.2, repeat: Infinity }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="#fff">
              <rect x="6" y="6" width="12" height="12" rx="2" />
            </svg>
          </motion.button>
          <p className="text-[15px] text-text-secondary mt-4 font-medium tabular-nums">
            {formatTime(seconds)}
          </p>
          <p className="text-[12px] text-text-faint mt-1">Recording… tap to stop</p>
        </>
      )}

      {state === "recorded" && audioUrl && (
        <>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#c9a84c" strokeWidth="2" className="mx-auto mb-3">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
          <p className="text-[13px] text-text-secondary mb-1">Recording captured ({formatTime(seconds)})</p>
          <audio controls src={audioUrl} className="w-full mt-3 mb-4" />
          <button onClick={reRecord} className="btn-secondary">
            Record again
          </button>
        </>
      )}
    </div>
  );
}
