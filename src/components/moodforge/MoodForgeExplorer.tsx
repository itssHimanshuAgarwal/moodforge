/**
 * MoodForge Explorer — GEMS 9 spider web + track matching + prompt generation.
 * Queries real FMA tracks from the database when available, falls back to samples.
 */
import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Copy, Check, ArrowRight, RotateCcw, Database, Music } from "lucide-react";
import MoodRadar from "./MoodRadar";
import TrackMatch from "./TrackMatch";
import {
  GEMS_KEYS, GEMS_LABELS,
  buildPromptFromGems,
  type GemsKey, type GemsTrack,
} from "@/lib/gems-data";
import { playTrackPreview, stopPreview } from "@/lib/track-preview-synth";
import { useFmaTracks, getTrackAudioUrl } from "@/hooks/use-fma-tracks";
import { toast } from "@/hooks/use-toast";

interface MoodForgeExplorerProps {
  onGenerateWithPrompt: (prompt: string) => void;
  isGenerating?: boolean;
  generationProgress?: string | null;
}

export default function MoodForgeExplorer({ onGenerateWithPrompt, isGenerating, generationProgress }: MoodForgeExplorerProps) {
  const [cursorValues, setCursorValues] = useState<Record<GemsKey, number>>(
    () => Object.fromEntries(GEMS_KEYS.map(k => [k, 0.5])) as Record<GemsKey, number>
  );
  const [userDescription, setUserDescription] = useState("");
  const [copied, setCopied] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
  const lastPlayedTrackRef = useRef<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const { tracks, loading, usingDb, trackCount } = useFmaTracks();

  const handleChange = useCallback((key: GemsKey, value: number) => {
    setHasInteracted(true);
    setCursorValues(prev => ({ ...prev, [key]: value }));
  }, []);

  // Find nearest track in GEMS space
  const { nearestTrack, distance } = useMemo(() => {
    let best: GemsTrack | null = null;
    let bestDist = Infinity;
    for (const track of tracks) {
      let dist = 0;
      for (const k of GEMS_KEYS) {
        const d = (track.gems[k] || 0) - (cursorValues[k] || 0);
        dist += d * d;
      }
      dist = Math.sqrt(dist / GEMS_KEYS.length);
      if (dist < bestDist) {
        bestDist = dist;
        best = track;
      }
    }
    return { nearestTrack: best, distance: bestDist };
  }, [cursorValues, tracks]);

  // Stop any playing audio
  const stopAllAudio = useCallback(() => {
    stopPreview();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    setIsPreviewPlaying(false);
  }, []);

  // Play audio — use real MP3 if available, else synth
  const playAudio = useCallback((track: GemsTrack) => {
    stopAllAudio();
    setIsPreviewPlaying(true);

    const audioPath = (track as any).audioPath;
    if (audioPath) {
      // Stream real audio from storage
      const url = getTrackAudioUrl(audioPath);
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.volume = 0.5;
      audio.play().catch(() => {
        // Fallback to synth if streaming fails
        playTrackPreview(track);
      });
      audio.onended = () => setIsPreviewPlaying(false);
      audio.onerror = () => {
        playTrackPreview(track);
        const beatDur = 60 / (track.tempo || 100);
        setTimeout(() => setIsPreviewPlaying(false), beatDur * 8 * 1000 + 500);
      };
    } else {
      // Synth preview
      playTrackPreview(track);
      const beatDur = 60 / (track.tempo || 100);
      setTimeout(() => setIsPreviewPlaying(false), beatDur * 8 * 1000 + 500);
    }
  }, [stopAllAudio]);

  // Auto-play preview when nearest track changes
  useEffect(() => {
    if (!hasInteracted || !nearestTrack) return;
    if (lastPlayedTrackRef.current === nearestTrack.id) return;
    lastPlayedTrackRef.current = nearestTrack.id;
    playAudio(nearestTrack);
  }, [nearestTrack?.id, hasInteracted, playAudio]);

  // Cleanup on unmount
  useEffect(() => () => stopAllAudio(), [stopAllAudio]);

  const handlePlayPreview = useCallback(() => {
    if (!nearestTrack) return;
    if (isPreviewPlaying) {
      stopAllAudio();
    } else {
      playAudio(nearestTrack);
    }
  }, [nearestTrack, isPreviewPlaying, stopAllAudio, playAudio]);

  const generatedPrompt = useMemo(
    () => buildPromptFromGems(cursorValues, nearestTrack, userDescription),
    [cursorValues, nearestTrack, userDescription]
  );

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(generatedPrompt);
      setCopied(true);
      toast({ title: "Prompt copied!" });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: "Couldn't copy", variant: "destructive" });
    }
  }, [generatedPrompt]);

  const handleGenerate = useCallback(() => {
    onGenerateWithPrompt(generatedPrompt);
  }, [onGenerateWithPrompt, generatedPrompt]);

  const handleReset = useCallback(() => {
    stopAllAudio();
    setCursorValues(Object.fromEntries(GEMS_KEYS.map(k => [k, 0.5])) as Record<GemsKey, number>);
    setHasInteracted(false);
    setUserDescription("");
    lastPlayedTrackRef.current = null;
  }, [stopAllAudio]);

  // Emotional summary
  const emotionalSummary = useMemo(() => {
    const high = GEMS_KEYS.filter(k => cursorValues[k] > 0.7);
    if (!hasInteracted) return "Drag any dot to shape your sound";
    if (high.length === 0) return "Balanced emotional profile";
    return high.map(k => GEMS_LABELS[k].toLowerCase()).join(", ");
  }, [cursorValues, hasInteracted]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-primary" />
          <span className="text-sm font-bold text-foreground tracking-tight">MoodForge</span>
          <span className="text-[10px] text-muted-foreground px-2 py-0.5 rounded-full bg-muted/40 border border-border/50">
            GEMS 9
          </span>
          {/* Track source indicator */}
          <span className="text-[10px] text-muted-foreground/60 flex items-center gap-1">
            {loading ? (
              "Loading tracks..."
            ) : usingDb ? (
              <><Database size={10} /> {trackCount.toLocaleString()} tracks</>
            ) : (
              <><Music size={10} /> {trackCount} samples</>
            )}
          </span>
        </div>
        <button
          onClick={handleReset}
          className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
        >
          <RotateCcw size={12} />
          Reset
        </button>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left: Radar */}
        <div className="flex-1 flex flex-col items-center justify-center p-4 min-w-0">
          <div className="w-full max-w-[480px]">
            <MoodRadar
              values={cursorValues}
              onChange={handleChange}
              onDragEnd={() => {}}
            />
          </div>
          <AnimatePresence mode="wait">
            <motion.div
              key={emotionalSummary}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="mt-2 text-xs text-muted-foreground text-center max-w-xs"
            >
              {emotionalSummary}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Right: Match + Prompt */}
        <div className="w-[320px] border-l border-border flex flex-col shrink-0 overflow-y-auto custom-scrollbar">
          {/* Track match */}
          <div className="border-b border-border">
            <div className="px-4 pt-3 pb-1">
              <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                Nearest Match
              </span>
            </div>
            <TrackMatch
              track={hasInteracted ? nearestTrack : null}
              distance={distance}
              isPlaying={isPreviewPlaying}
              onTogglePlay={handlePlayPreview}
            />
          </div>

          {/* Description input */}
          <div className="p-4 border-b border-border">
            <label className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground mb-2 block">
              Your Description (optional)
            </label>
            <textarea
              value={userDescription}
              onChange={e => setUserDescription(e.target.value)}
              rows={2}
              placeholder="e.g. a dreamy lo-fi beat for studying"
              className="w-full bg-muted/40 border border-border rounded-lg px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/30 transition-colors resize-none"
            />
          </div>

          {/* Generated prompt */}
          <div className="p-4 flex-1">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                Generated Prompt
              </span>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
              >
                {copied ? <Check size={10} /> : <Copy size={10} />}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <div className="bg-muted/20 border border-border/50 rounded-lg p-3 text-[11px] text-foreground/70 leading-relaxed whitespace-pre-wrap max-h-[200px] overflow-y-auto custom-scrollbar">
              {generatedPrompt || "Drag the emotional dimensions to generate a prompt..."}
            </div>
          </div>

          {/* Generate button */}
          <div className="p-4 border-t border-border shrink-0">
            <button
              onClick={handleGenerate}
              disabled={!hasInteracted || isGenerating}
              className="w-full group relative flex items-center justify-center gap-2 px-5 py-3 bg-primary text-primary-foreground text-sm font-semibold rounded-xl hover:scale-[1.02] transition-transform duration-150 active:scale-[0.98] disabled:opacity-40 disabled:hover:scale-100 overflow-hidden"
            >
              <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
              <span className="relative flex items-center gap-2">
                {isGenerating ? "Generating..." : "Generate Track"}
                {!isGenerating && <ArrowRight size={14} />}
              </span>
            </button>
            <p className="text-[10px] text-muted-foreground/50 text-center mt-2">
              Uses the emotional profile to create your track
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
