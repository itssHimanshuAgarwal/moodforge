import { useEffect, useRef, useCallback, memo } from "react";
import WaveSurfer from "wavesurfer.js";

interface WaveformDisplayProps {
  blob: Blob | null;
  color: string;
  height: number;
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  onSeek: (time: number) => void;
  progressColor?: string;
  opacity?: number;
}

const WaveformDisplay = memo(({
  blob,
  color,
  height,
  currentTime,
  duration,
  onSeek,
  progressColor,
  opacity = 0.6,
}: WaveformDisplayProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WaveSurfer | null>(null);
  const seekingRef = useRef(false);

  // Initialize WaveSurfer
  useEffect(() => {
    if (!containerRef.current || !blob) return;

    const ws = WaveSurfer.create({
      container: containerRef.current,
      height,
      waveColor: color,
      progressColor: progressColor || color,
      cursorColor: "rgba(255,255,255,0.8)",
      cursorWidth: 1,
      barWidth: 2,
      barGap: 1,
      barRadius: 1,
      normalize: true,
      interact: true,
      fillParent: true,
      minPxPerSec: 0,
      autoCenter: false,
      backend: "WebAudio",
      mediaControls: false,
    });

    ws.loadBlob(blob);

    ws.on("interaction", (newTime: number) => {
      seekingRef.current = true;
      onSeek(newTime);
      // Small delay to prevent our sync from overriding user seek
      setTimeout(() => { seekingRef.current = false; }, 100);
    });

    // Mute the wavesurfer internal audio — we handle audio ourselves
    ws.setVolume(0);

    wsRef.current = ws;

    return () => {
      ws.destroy();
      wsRef.current = null;
    };
  }, [blob, height, color, progressColor, onSeek]);

  // Sync time from engine → wavesurfer
  useEffect(() => {
    const ws = wsRef.current;
    if (!ws || seekingRef.current || duration <= 0) return;

    const progress = currentTime / duration;
    // Only seek wavesurfer visually if difference is significant
    const wsProgress = ws.getCurrentTime() / (ws.getDuration() || 1);
    if (Math.abs(progress - wsProgress) > 0.005) {
      try {
        ws.seekTo(Math.max(0, Math.min(1, progress)));
      } catch {}
    }
  }, [currentTime, duration]);

  return (
    <div
      ref={containerRef}
      className="w-full cursor-pointer"
      style={{ opacity, height }}
    />
  );
});

WaveformDisplay.displayName = "WaveformDisplay";

export default WaveformDisplay;
