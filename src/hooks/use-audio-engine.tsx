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
} from "@/lib/audio-generator";
import type { ABMode } from "@/lib/types";

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
  editedBuffer: AudioBuffer | null;
  editedBlob: Blob | null;
  isRegenerating: boolean;
}

interface AudioEngineContextValue {
  isLoaded: boolean;
  isPlaying: boolean;
  isLoading: boolean;
  currentTime: number;
  duration: number;
  stems: StemState[];
  abMode: ABMode;
  hasEdits: boolean;
  generationPrompt: string | null;

  loadDemo: () => Promise<void>;
  loadFromBlob: (blob: Blob, label?: string) => Promise<void>;
  generateTrack: (prompt: string) => Promise<void>;
  regenerateStem: (stemId: string, prompt: string) => Promise<void>;
  play: () => void;
  pause: () => void;
  togglePlayPause: () => void;
  seek: (time: number) => void;
  skipForward: () => void;
  skipBack: () => void;
  toggleSolo: (stemId: string) => void;
  toggleMute: (stemId: string) => void;
  toggleLock: (stemId: string) => void;
  setABMode: (mode: ABMode) => void;
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
  const [abMode, setABMode] = useState<ABMode>("original");
  const [generationPrompt, setGenerationPrompt] = useState<string | null>(null);
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
      editedBuffer: null,
      editedBlob: null,
      isRegenerating: false,
    }))
  );

  const audioCtxRef = useRef<AudioContext | null>(null);
  const gainNodesRef = useRef<Map<string, GainNode>>(new Map());
  const sourceNodesRef = useRef<Map<string, AudioBufferSourceNode>>(new Map());
  const startTimeRef = useRef(0);
  const offsetRef = useRef(0);
  const animFrameRef = useRef(0);

  const hasEdits = stems.some((s) => s.editedBuffer !== null);

  const getAudioContext = useCallback(() => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioContext();
    }
    return audioCtxRef.current;
  }, []);

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

  // Helper to set up stems from a list of {id, label, color, bgClass, buffer, blob}
  const setupStems = useCallback((stemData: Array<{
    id: string; label: string; color: string; bgClass: string;
    buffer: AudioBuffer; blob: Blob;
  }>) => {
    const ctx = getAudioContext();
    const newStems: StemState[] = stemData.map((s) => {
      let gainNode = gainNodesRef.current.get(s.id);
      if (!gainNode) {
        gainNode = ctx.createGain();
        gainNode.connect(ctx.destination);
        gainNodesRef.current.set(s.id, gainNode);
      }
      return {
        ...s,
        isSolo: false,
        isMuted: false,
        isLocked: false,
        editedBuffer: null,
        editedBlob: null,
        isRegenerating: false,
      };
    });
    setStems(newStems);
    setDuration(newStems[0]?.buffer?.duration || 0);
    setCurrentTime(0);
    offsetRef.current = 0;
    setIsLoaded(true);
  }, [getAudioContext]);

  const loadDemo = useCallback(async () => {
    setIsLoading(true);
    const ctx = getAudioContext();
    if (ctx.state === "suspended") await ctx.resume();

    const stemData = STEM_CONFIGS.map((config) => {
      const buffer = generateDemoBuffer(ctx, config);
      const blob = audioBufferToBlob(buffer);
      return {
        id: config.id, label: config.label, color: config.color, bgClass: config.bgClass,
        buffer, blob,
      };
    });

    setupStems(stemData);
    setGenerationPrompt("Demo: synthetic tones");
    setIsLoading(false);
  }, [getAudioContext, setupStems]);

  const loadFromBlob = useCallback(async (fileBlob: Blob, label = "Full Mix") => {
    setIsLoading(true);
    const ctx = getAudioContext();
    if (ctx.state === "suspended") await ctx.resume();

    const arrayBuf = await fileBlob.arrayBuffer();
    const audioBuffer = await ctx.decodeAudioData(arrayBuf);

    setupStems([{
      id: "full_mix",
      label,
      color: "#6366f1",
      bgClass: "stem-bg-drums",
      buffer: audioBuffer,
      blob: fileBlob,
    }]);
    setGenerationPrompt(null);
    setIsLoading(false);
  }, [getAudioContext, setupStems]);

  const generateTrack = useCallback(async (prompt: string) => {
    setIsLoading(true);
    const ctx = getAudioContext();
    if (ctx.state === "suspended") await ctx.resume();

    try {
      // Call edge function — returns binary audio
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-music`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ prompt, duration_seconds: 30 }),
        }
      );

      if (!response.ok) {
        const errData = await response.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(errData.error || `HTTP ${response.status}`);
      }

      const audioArrayBuf = await response.arrayBuffer();
      const audioBlob = new Blob([audioArrayBuf], { type: "audio/mpeg" });
      const audioBuffer = await ctx.decodeAudioData(audioArrayBuf.slice(0));

      // Load as single full mix stem
      setupStems([{
        id: "full_mix",
        label: "Full Mix",
        color: "#6366f1",
        bgClass: "stem-bg-drums",
        buffer: audioBuffer,
        blob: audioBlob,
      }]);
      setGenerationPrompt(prompt);
    } catch (err) {
      console.error("Track generation failed:", err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [getAudioContext, setupStems]);

  const regenerateStem = useCallback(async (stemId: string, prompt: string) => {
    // Mark stem as regenerating
    setStems((prev) =>
      prev.map((s) => s.id === stemId ? { ...s, isRegenerating: true } : s)
    );

    const ctx = getAudioContext();
    if (ctx.state === "suspended") await ctx.resume();

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-music`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ prompt, duration_seconds: 30 }),
        }
      );

      if (!response.ok) {
        const errData = await response.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(errData.error || `HTTP ${response.status}`);
      }

      const audioArrayBuf = await response.arrayBuffer();
      const editedBlob = new Blob([audioArrayBuf], { type: "audio/mpeg" });
      const editedBuffer = await ctx.decodeAudioData(audioArrayBuf.slice(0));

      setStems((prev) =>
        prev.map((s) =>
          s.id === stemId
            ? { ...s, editedBuffer, editedBlob, isRegenerating: false }
            : s
        )
      );

      // Auto-switch to edited mode
      setABMode("edited");
    } catch (err) {
      console.error("Stem regeneration failed:", err);
      setStems((prev) =>
        prev.map((s) => s.id === stemId ? { ...s, isRegenerating: false } : s)
      );
      throw err;
    }
  }, [getAudioContext]);

  // Get the active buffer for a stem based on A/B mode
  const getActiveBuffer = useCallback((stem: StemState) => {
    if (abMode === "edited" && stem.editedBuffer) return stem.editedBuffer;
    return stem.buffer;
  }, [abMode]);

  const getActiveBlob = useCallback((stem: StemState) => {
    if (abMode === "edited" && stem.editedBlob) return stem.editedBlob;
    return stem.blob;
  }, [abMode]);

  const startSources = useCallback(
    (offset: number) => {
      const ctx = getAudioContext();
      sourceNodesRef.current.forEach((src) => {
        try { src.stop(); } catch {}
      });
      sourceNodesRef.current.clear();

      stems.forEach((stem) => {
        const buf = getActiveBuffer(stem);
        if (!buf) return;
        const source = ctx.createBufferSource();
        source.buffer = buf;
        const gain = gainNodesRef.current.get(stem.id);
        if (gain) source.connect(gain);
        source.start(0, offset);
        sourceNodesRef.current.set(stem.id, source);
      });

      startTimeRef.current = ctx.currentTime;
      offsetRef.current = offset;
    },
    [getAudioContext, stems, getActiveBuffer]
  );

  // Re-start sources when A/B mode changes during playback
  useEffect(() => {
    if (isPlaying) {
      const ctx = audioCtxRef.current;
      if (ctx) {
        const elapsed = ctx.currentTime - startTimeRef.current;
        const currentOffset = offsetRef.current + elapsed;
        startSources(currentOffset);
      }
    }
  }, [abMode]); // eslint-disable-line react-hooks/exhaustive-deps

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
    if (isPlaying) pause(); else play();
  }, [isPlaying, play, pause]);

  const seek = useCallback(
    (time: number) => {
      const clamped = Math.max(0, Math.min(duration, time));
      offsetRef.current = clamped;
      setCurrentTime(clamped);
      if (isPlaying) startSources(clamped);
    },
    [duration, isPlaying, startSources]
  );

  const skipForward = useCallback(() => seek(currentTime + 5), [seek, currentTime]);
  const skipBack = useCallback(() => seek(currentTime - 5), [seek, currentTime]);

  const toggleSolo = useCallback(
    (stemId: string) => {
      setStems((prev) => {
        const next = prev.map((s) => s.id === stemId ? { ...s, isSolo: !s.isSolo } : s);
        updateGains(next);
        return next;
      });
    },
    [updateGains]
  );

  const toggleMute = useCallback(
    (stemId: string) => {
      setStems((prev) => {
        const next = prev.map((s) => s.id === stemId ? { ...s, isMuted: !s.isMuted } : s);
        updateGains(next);
        return next;
      });
    },
    [updateGains]
  );

  const toggleLock = useCallback((stemId: string) => {
    setStems((prev) =>
      prev.map((s) => s.id === stemId ? { ...s, isLocked: !s.isLocked } : s)
    );
  }, []);

  return (
    <AudioEngineContext.Provider
      value={{
        isLoaded, isPlaying, isLoading, currentTime, duration, stems,
        abMode, hasEdits, generationPrompt,
        loadDemo, loadFromBlob, generateTrack, regenerateStem,
        play, pause, togglePlayPause, seek, skipForward, skipBack,
        toggleSolo, toggleMute, toggleLock, setABMode,
      }}
    >
      {children}
    </AudioEngineContext.Provider>
  );
}
