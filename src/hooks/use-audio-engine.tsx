import {
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
import { AudioEngineContext } from "./audio-engine-context";
import type { AudioEngineContextValue } from "./audio-engine-context";
import { saveSession, loadSession, clearSession, type StoredSession } from "@/lib/session-store";

const MAX_VERSIONS = 10;
const STEM_RETRY_DELAYS_MS = [2000, 5000, 10000];
const STEM_DELAY_BETWEEN_MS = 3000;
const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

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

export function useAudioEngine() {
  const ctx = useContext(AudioEngineContext);
  if (!ctx) throw new Error("useAudioEngine must be used within AudioEngineProvider");
  return ctx;
}

export function AudioEngineProvider({ children }: { children: ReactNode }) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [generationProgress, setGenerationProgress] = useState<string | null>(null);
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
  const hasRestoredRef = useRef(false);

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

  // Persist current session to IndexedDB
  const persistCurrentSession = useCallback((currentStems: StemState[], prompt: string | null) => {
    const storedStems = currentStems.map(s => ({
      id: s.id,
      label: s.label,
      color: s.color,
      bgClass: s.bgClass,
      versions: s.versions.map(v => ({
        id: v.id,
        versionNumber: v.versionNumber,
        label: v.label,
        blob: v.blob,
        prompt: v.prompt,
        userFeedback: v.userFeedback,
        timestamp: v.timestamp,
      })),
      activeVersionIndex: s.activeVersionIndex,
    }));
    saveSession({ generationPrompt: prompt, stems: storedStems, savedAt: Date.now() });
  }, []);

  // Check if a saved session exists (without loading it)
  const [hasSavedSession, setHasSavedSession] = useState(false);
  const [savedSessionPrompt, setSavedSessionPrompt] = useState<string | null>(null);

  useEffect(() => {
    if (hasRestoredRef.current) return;
    hasRestoredRef.current = true;
    (async () => {
      const session = await loadSession();
      if (session && session.stems.length > 0) {
        setHasSavedSession(true);
        setSavedSessionPrompt(session.generationPrompt);
        console.log("[Session] Found saved session available for restore");
      }
    })();
  }, []);

  // Manually restore session when user clicks "Resume"
  const restoreSession = useCallback(async () => {
    const session = await loadSession();
    if (!session || !session.stems.length) return;

    setIsLoading(true);
    try {
      const ctx = getAudioContext();
      ctx.resume().catch(() => {});

      const restoredStems: StemState[] = [];
      for (const stored of session.stems) {
        let gainNode = gainNodesRef.current.get(stored.id);
        if (!gainNode) {
          gainNode = ctx.createGain();
          gainNode.connect(ctx.destination);
          gainNodesRef.current.set(stored.id, gainNode);
        }

        const versions: StemVersion[] = [];
        for (const sv of stored.versions) {
          try {
            const arrayBuf = await sv.blob.arrayBuffer();
            const buffer = await ctx.decodeAudioData(arrayBuf);
            versions.push({
              id: sv.id,
              versionNumber: sv.versionNumber,
              label: sv.label,
              buffer,
              blob: sv.blob,
              prompt: sv.prompt,
              userFeedback: sv.userFeedback,
              timestamp: sv.timestamp,
            });
          } catch (decodeErr) {
            console.warn(`[Session] Failed to decode version ${sv.id}:`, decodeErr);
          }
        }

        if (versions.length > 0) {
          restoredStems.push({
            id: stored.id,
            label: stored.label,
            color: stored.color,
            bgClass: stored.bgClass,
            isSolo: false,
            isMuted: false,
            isLocked: false,
            versions,
            activeVersionIndex: Math.min(stored.activeVersionIndex, versions.length - 1),
            isRegenerating: false,
          });
        }
      }

      if (restoredStems.length && restoredStems[0].versions.length) {
        setStems(restoredStems);
        setDuration(restoredStems[0].versions[restoredStems[0].activeVersionIndex]?.buffer?.duration || 0);
        setCurrentTime(0);
        offsetRef.current = 0;
        setGenerationPrompt(session.generationPrompt);
        setIsLoaded(true);
        console.log(`[Session] Restored ${restoredStems.length} stems`);
      }
    } catch (err) {
      console.warn("[Session] Failed to restore session:", err);
    } finally {
      setIsLoading(false);
    }
  }, [getAudioContext]);

  // Clear saved session
  const clearSavedSession = useCallback(async () => {
    await clearSession();
    setHasSavedSession(false);
    setSavedSessionPrompt(null);
  }, []);

  // Auto-save session to IndexedDB when stems change
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!isLoaded || !stems.some(s => s.versions.length > 0)) return;
    // Debounce saves
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      persistCurrentSession(stems, generationPrompt);
    }, 500);
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  }, [isLoaded, stems, generationPrompt, persistCurrentSession]);

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

    const fetchStem = async (config: typeof STEM_CONFIGS[number]) => {
      let attempt = 0;

      while (true) {
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-music`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
              Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            },
            body: JSON.stringify({ prompt, duration_seconds: 30, stem_type: config.id }),
          }
        );

        if (!response.ok) {
          const errData = await response.json().catch(() => ({ error: "Unknown error" }));
          const errorMessage = errData.error || `HTTP ${response.status}`;

          if (response.status === 429 && attempt < STEM_RETRY_DELAYS_MS.length) {
            const delay = STEM_RETRY_DELAYS_MS[attempt];
            attempt += 1;
            await wait(delay);
            continue;
          }

          if (response.status === 429) {
            throw new Error("Too many requests right now. Please try again in a few seconds.");
          }

          if (response.status === 401 || response.status === 402) {
            throw new Error("Generation credits are exhausted. Please top up your ElevenLabs credits and try again.");
          }

          throw new Error(errorMessage);
        }

        const audioArrayBuf = await response.arrayBuffer();
        const blob = new Blob([audioArrayBuf], { type: "audio/mpeg" });
        const buffer = await ctx.decodeAudioData(audioArrayBuf.slice(0));

        return {
          id: config.id,
          label: config.label,
          color: config.color,
          bgClass: config.bgClass,
          buffer,
          blob,
        };
      }
    };

    try {
      const stemResults: Array<{
        id: string; label: string; color: string; bgClass: string;
        buffer: AudioBuffer; blob: Blob;
      }> = [];

      // Generate stems ONE AT A TIME to respect ElevenLabs concurrency limit
      for (let i = 0; i < STEM_CONFIGS.length; i++) {
        const config = STEM_CONFIGS[i];
        setGenerationProgress(`Generating ${config.label} (${i + 1}/${STEM_CONFIGS.length})...`);
        if (i > 0) await wait(STEM_DELAY_BETWEEN_MS);
        const result = await fetchStem(config);
        stemResults.push(result);
      }

      setGenerationProgress(null);
      setupStems(stemResults);
      setGenerationPrompt(prompt);
    } catch (err) {
      console.error("Track generation failed:", err);
      setGenerationProgress(null);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [getAudioContext, setupStems, demoMode]);

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
          body: JSON.stringify({ prompt, duration_seconds: 30, stem_type: stemId }),
        }
      );
      if (!response.ok) {
        const errData = await response.json().catch(() => ({ error: "Unknown error" }));
        if (response.status === 429) {
          throw new Error("Rate limit reached. Please wait a few seconds and try again.");
        }
        if (response.status === 401 || response.status === 402) {
          throw new Error("Generation credits are exhausted. Please top up your ElevenLabs credits.");
        }
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
        generationPrompt, generationProgress, hasSavedSession, savedSessionPrompt,
        demoMode, setDemoMode,
        loadDemo, loadFromBlob, generateTrack, regenerateStem,
        restoreSession, clearSavedSession,
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
