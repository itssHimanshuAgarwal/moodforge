import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useEffect,
  type ReactNode,
} from "react";
import {
  STEM_CONFIGS,
  generateDemoBuffer,
  audioBufferToBlob,
  type StemConfig,
} from "@/lib/audio-generator";

export interface StemState {
  id: string;
  label: string;
  color: string;
  bgClass: string;
  isSolo: boolean;
  isMuted: boolean;
  isLocked: boolean;
  buffer: AudioBuffer | null;
  blob: Blob | null;
}

interface AudioEngineContextValue {
  // State
  isLoaded: boolean;
  isPlaying: boolean;
  isLoading: boolean;
  currentTime: number;
  duration: number;
  stems: StemState[];

  // Actions
  loadDemo: () => Promise<void>;
  play: () => void;
  pause: () => void;
  togglePlayPause: () => void;
  seek: (time: number) => void;
  skipForward: () => void;
  skipBack: () => void;
  toggleSolo: (stemId: string) => void;
  toggleMute: (stemId: string) => void;
  toggleLock: (stemId: string) => void;
}

const AudioEngineContext = createContext<AudioEngineContextValue | null>(null);

export function useAudioEngine() {
  const ctx = useContext(AudioEngineContext);
  if (!ctx) throw new Error("useAudioEngine must be used within AudioEngineProvider");
  return ctx;
}

export function AudioEngineProvider({ children }: { children: ReactNode }) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [stems, setStems] = useState<StemState[]>(
    STEM_CONFIGS.map((c) => ({
      id: c.id,
      label: c.label,
      color: c.color,
      bgClass: c.bgClass,
      isSolo: false,
      isMuted: false,
      isLocked: false,
      buffer: null,
      blob: null,
    }))
  );

  const audioCtxRef = useRef<AudioContext | null>(null);
  const gainNodesRef = useRef<Map<string, GainNode>>(new Map());
  const sourceNodesRef = useRef<Map<string, AudioBufferSourceNode>>(new Map());
  const startTimeRef = useRef(0); // audioCtx.currentTime when playback started
  const offsetRef = useRef(0); // offset into buffer when playback started
  const animFrameRef = useRef(0);

  // Get or create AudioContext
  const getAudioContext = useCallback(() => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioContext();
    }
    return audioCtxRef.current;
  }, []);

  // Update gain nodes based on solo/mute state
  const updateGains = useCallback((currentStems: StemState[]) => {
    const anySolo = currentStems.some((s) => s.isSolo);
    currentStems.forEach((stem) => {
      const gain = gainNodesRef.current.get(stem.id);
      if (!gain) return;

      let volume = 1;
      if (anySolo) {
        volume = stem.isSolo ? 1 : 0;
      } else if (stem.isMuted) {
        volume = 0;
      }
      gain.gain.setTargetAtTime(volume, gain.context.currentTime, 0.02);
    });
  }, []);

  // Load demo audio
  const loadDemo = useCallback(async () => {
    setIsLoading(true);
    const ctx = getAudioContext();
    if (ctx.state === "suspended") await ctx.resume();

    const newStems = STEM_CONFIGS.map((config) => {
      const buffer = generateDemoBuffer(ctx, config);
      const blob = audioBufferToBlob(buffer);

      // Create gain node
      const gainNode = ctx.createGain();
      gainNode.connect(ctx.destination);
      gainNodesRef.current.set(config.id, gainNode);

      return {
        id: config.id,
        label: config.label,
        color: config.color,
        bgClass: config.bgClass,
        isSolo: false,
        isMuted: false,
        isLocked: false,
        buffer,
        blob,
      };
    });

    setStems(newStems);
    setDuration(newStems[0].buffer!.duration);
    setCurrentTime(0);
    offsetRef.current = 0;
    setIsLoaded(true);
    setIsLoading(false);
  }, [getAudioContext]);

  // Start source nodes from offset
  const startSources = useCallback(
    (offset: number) => {
      const ctx = getAudioContext();

      // Stop existing sources
      sourceNodesRef.current.forEach((src) => {
        try { src.stop(); } catch {}
      });
      sourceNodesRef.current.clear();

      stems.forEach((stem) => {
        if (!stem.buffer) return;
        const source = ctx.createBufferSource();
        source.buffer = stem.buffer;
        const gain = gainNodesRef.current.get(stem.id);
        if (gain) source.connect(gain);
        source.start(0, offset);
        sourceNodesRef.current.set(stem.id, source);
      });

      startTimeRef.current = ctx.currentTime;
      offsetRef.current = offset;
    },
    [getAudioContext, stems]
  );

  // Animation frame for currentTime
  useEffect(() => {
    if (!isPlaying) {
      cancelAnimationFrame(animFrameRef.current);
      return;
    }

    const tick = () => {
      const ctx = audioCtxRef.current;
      if (!ctx) return;
      const elapsed = ctx.currentTime - startTimeRef.current;
      const newTime = offsetRef.current + elapsed;
      if (newTime >= duration) {
        // Stop at end
        setIsPlaying(false);
        setCurrentTime(0);
        offsetRef.current = 0;
        sourceNodesRef.current.forEach((src) => {
          try { src.stop(); } catch {}
        });
        sourceNodesRef.current.clear();
        return;
      }
      setCurrentTime(newTime);
      animFrameRef.current = requestAnimationFrame(tick);
    };

    animFrameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [isPlaying, duration]);

  const play = useCallback(() => {
    if (!isLoaded) return;
    const ctx = getAudioContext();
    if (ctx.state === "suspended") ctx.resume();
    startSources(offsetRef.current);
    setIsPlaying(true);
  }, [isLoaded, getAudioContext, startSources]);

  const pause = useCallback(() => {
    if (!isPlaying) return;
    const ctx = audioCtxRef.current;
    if (ctx) {
      const elapsed = ctx.currentTime - startTimeRef.current;
      offsetRef.current = offsetRef.current + elapsed;
    }
    sourceNodesRef.current.forEach((src) => {
      try { src.stop(); } catch {}
    });
    sourceNodesRef.current.clear();
    setIsPlaying(false);
  }, [isPlaying]);

  const togglePlayPause = useCallback(() => {
    if (isPlaying) pause();
    else play();
  }, [isPlaying, play, pause]);

  const seek = useCallback(
    (time: number) => {
      const clamped = Math.max(0, Math.min(duration, time));
      offsetRef.current = clamped;
      setCurrentTime(clamped);
      if (isPlaying) {
        startSources(clamped);
      }
    },
    [duration, isPlaying, startSources]
  );

  const skipForward = useCallback(() => seek(currentTime + 5), [seek, currentTime]);
  const skipBack = useCallback(() => seek(currentTime - 5), [seek, currentTime]);

  const toggleSolo = useCallback(
    (stemId: string) => {
      setStems((prev) => {
        const next = prev.map((s) =>
          s.id === stemId ? { ...s, isSolo: !s.isSolo } : s
        );
        updateGains(next);
        return next;
      });
    },
    [updateGains]
  );

  const toggleMute = useCallback(
    (stemId: string) => {
      setStems((prev) => {
        const next = prev.map((s) =>
          s.id === stemId ? { ...s, isMuted: !s.isMuted } : s
        );
        updateGains(next);
        return next;
      });
    },
    [updateGains]
  );

  const toggleLock = useCallback((stemId: string) => {
    setStems((prev) =>
      prev.map((s) =>
        s.id === stemId ? { ...s, isLocked: !s.isLocked } : s
      )
    );
  }, []);

  return (
    <AudioEngineContext.Provider
      value={{
        isLoaded,
        isPlaying,
        isLoading,
        currentTime,
        duration,
        stems,
        loadDemo,
        play,
        pause,
        togglePlayPause,
        seek,
        skipForward,
        skipBack,
        toggleSolo,
        toggleMute,
        toggleLock,
      }}
    >
      {children}
    </AudioEngineContext.Provider>
  );
}
