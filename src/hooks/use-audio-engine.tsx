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
import type { StemVersion } from "@/lib/types";

const MAX_VERSIONS = 10;

export interface StemState {
  id: string;
  label: string;
  color: string;
  bgClass: string;
  isSolo: boolean;
  isMuted: boolean;
  isLocked: boolean;
  versions: StemVersion[];
  activeVersionIndex: number;
  isRegenerating: boolean;
}

interface AudioEngineContextValue {
  isLoaded: boolean;
  isPlaying: boolean;
  isLoading: boolean;
  currentTime: number;
  duration: number;
  stems: StemState[];
  generationPrompt: string | null;

  loadDemo: () => Promise<void>;
  loadFromBlob: (blob: Blob, label?: string) => Promise<void>;
  generateTrack: (prompt: string) => Promise<void>;
  regenerateStem: (stemId: string, prompt: string, userFeedback?: string) => Promise<void>;
  play: () => void;
  pause: () => void;
  togglePlayPause: () => void;
  seek: (time: number) => void;
  skipForward: () => void;
  skipBack: () => void;
  toggleSolo: (stemId: string) => void;
  toggleMute: (stemId: string) => void;
  toggleLock: (stemId: string) => void;
  selectVersion: (stemId: string, versionIndex: number) => void;
  resetAllVersions: () => void;
  getActiveBuffer: (stem: StemState) => AudioBuffer | null;
  getActiveBlob: (stem: StemState) => Blob | null;
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
      versions: [],
      activeVersionIndex: 0,
      isRegenerating: false,
    }))
  );

  const audioCtxRef = useRef<AudioContext | null>(null);
  const gainNodesRef = useRef<Map<string, GainNode>>(new Map());
  const sourceNodesRef = useRef<Map<string, AudioBufferSourceNode>>(new Map());
  const startTimeRef = useRef(0);
  const offsetRef = useRef(0);
  const animFrameRef = useRef(0);

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

  const getActiveBuffer = useCallback((stem: StemState): AudioBuffer | null => {
    if (stem.versions.length === 0) return null;
    return stem.versions[stem.activeVersionIndex]?.buffer ?? null;
  }, []);

  const getActiveBlob = useCallback((stem: StemState): Blob | null => {
    if (stem.versions.length === 0) return null;
    return stem.versions[stem.activeVersionIndex]?.blob ?? null;
  }, []);

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
      const originalVersion: StemVersion = {
        id: `${s.id}-v1`,
        versionNumber: 1,
        label: "Original",
        buffer: s.buffer,
        blob: s.blob,
        prompt: "",
        userFeedback: null,
        timestamp: Date.now(),
      };
      return {
        ...s,
        isSolo: false,
        isMuted: false,
        isLocked: false,
        versions: [originalVersion],
        activeVersionIndex: 0,
        isRegenerating: false,
      };
    });
    setStems(newStems);
    setDuration(newStems[0]?.versions[0]?.buffer?.duration || 0);
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
      return { id: config.id, label: config.label, color: config.color, bgClass: config.bgClass, buffer, blob };
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
    setupStems([{ id: "full_mix", label, color: "#6366f1", bgClass: "stem-bg-drums", buffer: audioBuffer, blob: fileBlob }]);
    setGenerationPrompt(null);
    setIsLoading(false);
  }, [getAudioContext, setupStems]);

  const generateTrack = useCallback(async (prompt: string) => {
    setIsLoading(true);
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
      const audioBlob = new Blob([audioArrayBuf], { type: "audio/mpeg" });
      const audioBuffer = await ctx.decodeAudioData(audioArrayBuf.slice(0));
      setupStems([{ id: "full_mix", label: "Full Mix", color: "#6366f1", bgClass: "stem-bg-drums", buffer: audioBuffer, blob: audioBlob }]);
      setGenerationPrompt(prompt);
    } catch (err) {
      console.error("Track generation failed:", err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [getAudioContext, setupStems]);

  const regenerateStem = useCallback(async (stemId: string, prompt: string, userFeedback?: string) => {
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

      let newVersionNumber = 1;
      setStems((prev) =>
        prev.map((s) => {
          if (s.id !== stemId) return s;
          const truncatedLabel = (userFeedback || prompt).slice(0, 30);
          newVersionNumber = s.versions.length + 1;
          const newVersion: StemVersion = {
            id: `${stemId}-v${newVersionNumber}`,
            versionNumber: newVersionNumber,
            label: truncatedLabel,
            buffer: editedBuffer,
            blob: editedBlob,
            prompt,
            userFeedback: userFeedback || null,
            timestamp: Date.now(),
          };
          const versions = [...s.versions, newVersion].slice(-MAX_VERSIONS);
          return {
            ...s,
            versions,
            activeVersionIndex: versions.length - 1,
            isRegenerating: false,
          };
        })
      );

      return newVersionNumber;
    } catch (err) {
      console.error("Stem regeneration failed:", err);
      setStems((prev) =>
        prev.map((s) => s.id === stemId ? { ...s, isRegenerating: false } : s)
      );
      throw err;
    }
  }, [getAudioContext]);

  const selectVersion = useCallback((stemId: string, versionIndex: number) => {
    const wasPlaying = isPlaying;
    // Stop current sources
    sourceNodesRef.current.forEach((src) => { try { src.stop(); } catch {} });
    sourceNodesRef.current.clear();

    setStems((prev) =>
      prev.map((s) =>
        s.id === stemId ? { ...s, activeVersionIndex: versionIndex } : s
      )
    );

    // Will restart playback in effect if needed
    if (wasPlaying) {
      // Use a small timeout to let state update
      setTimeout(() => {
        const ctx = audioCtxRef.current;
        if (ctx) {
          const elapsed = ctx.currentTime - startTimeRef.current;
          const currentOffset = offsetRef.current + elapsed;
          offsetRef.current = currentOffset;
          // startSources will be called by the play effect
        }
      }, 0);
    }
  }, [isPlaying]);

  const resetAllVersions = useCallback(() => {
    setStems((prev) =>
      prev.map((s) => ({ ...s, activeVersionIndex: 0 }))
    );
  }, []);

  const startSources = useCallback(
    (offset: number) => {
      const ctx = getAudioContext();
      sourceNodesRef.current.forEach((src) => { try { src.stop(); } catch {} });
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

  // Re-start sources when version selection changes during playback
  useEffect(() => {
    if (isPlaying) {
      const ctx = audioCtxRef.current;
      if (ctx) {
        const elapsed = ctx.currentTime - startTimeRef.current;
        const currentOffset = offsetRef.current + elapsed;
        startSources(currentOffset);
      }
    }
  }, [stems.map(s => s.activeVersionIndex).join(",")]); // eslint-disable-line react-hooks/exhaustive-deps

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
        sourceNodesRef.current.forEach((src) => { try { src.stop(); } catch {} });
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
    sourceNodesRef.current.forEach((src) => { try { src.stop(); } catch {} });
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
        generationPrompt,
        loadDemo, loadFromBlob, generateTrack, regenerateStem,
        play, pause, togglePlayPause, seek, skipForward, skipBack,
        toggleSolo, toggleMute, toggleLock,
        selectVersion, resetAllVersions,
        getActiveBuffer, getActiveBlob,
      }}
    >
      {children}
    </AudioEngineContext.Provider>
  );
}
