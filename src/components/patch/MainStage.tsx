import { motion, AnimatePresence } from "framer-motion";
import { useState, useCallback } from "react";
import StemLane from "./StemLane";
import EmptyState from "./EmptyState";
import WaveformDisplay from "./WaveformDisplay";
import EditCard from "./EditCard";
import ViewToggle, { type ViewMode } from "./ViewToggle";
import VibesView from "./VibesView";
import { useAudioEngine } from "@/hooks/use-audio-engine";
import type { EditIntent } from "@/lib/types";
import { toast } from "@/hooks/use-toast";

interface MainStageProps {
  editIntent: EditIntent | null;
  editTranscript: string | null;
  onApplyEdit: () => void;
  onRetryEdit: () => void;
  onVibeChange?: (instruction: string, affectedStems: string[]) => void;
}

const MainStage = ({ editIntent, editTranscript, onApplyEdit, onRetryEdit, onVibeChange }: MainStageProps) => {
  const { isLoaded, stems, currentTime, duration, isPlaying, seek, loadFromBlob, getActiveBlob } = useAudioEngine();
  const mainBlob = getActiveBlob(stems[0] ?? null as any);
  const [isDragging, setIsDragging] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("stems");

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (!file) return;
    const validTypes = ["audio/mpeg", "audio/wav", "audio/ogg", "audio/mp3", "audio/x-wav"];
    if (!validTypes.includes(file.type) && !file.name.match(/\.(mp3|wav|ogg)$/i)) {
      toast({ title: "Unsupported format", description: "Please drop an MP3, WAV, or OGG file.", variant: "destructive" });
      return;
    }
    try {
      await loadFromBlob(file, file.name);
    } catch {
      toast({ title: "Couldn't load file", description: "The audio file may be corrupted.", variant: "destructive" });
    }
  }, [loadFromBlob]);

  // Version summary bar
  const versionSummary = stems.filter(s => s.versions.length > 0).map(s => {
    const v = s.versions[s.activeVersionIndex];
    return `${s.label} v${v?.versionNumber ?? 1}`;
  });
  const hasMultipleVersionsAnywhere = stems.some(s => s.versions.length > 1);

  const handleVibeChange = useCallback((instruction: string, affectedStems: string[]) => {
    onVibeChange?.(instruction, affectedStems);
  }, [onVibeChange]);

  return (
    <section
      className="flex-1 border-r border-border flex flex-col relative overflow-hidden"
      style={{
        background: "radial-gradient(ellipse 80% 40% at 50% 0%, rgba(99,102,241,0.04), transparent)",
      }}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
    >
      {/* Drag overlay */}
      <AnimatePresence>
        {isDragging && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-30 bg-primary/5 border-2 border-dashed border-primary/30 rounded-lg flex items-center justify-center backdrop-blur-sm"
          >
            <span className="text-section text-primary">Drop audio file here</span>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {!isLoaded ? (
          <EmptyState key="empty" />
        ) : (
          <motion.div
            key="loaded"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
            className="flex-1 flex flex-col overflow-y-auto custom-scrollbar p-8 gap-4"
          >
            {/* View toggle + version summary */}
            <div className="flex items-center justify-between">
              <ViewToggle mode={viewMode} onChange={setViewMode} />
              {hasMultipleVersionsAnywhere && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-muted/30 border border-border/50">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground mr-1">Playing:</span>
                  {versionSummary.map((text, i) => (
                    <span key={i} className="text-[10px] font-mono text-foreground/60">
                      {text}{i < versionSummary.length - 1 && <span className="text-muted-foreground/40 mx-1">·</span>}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Main waveform */}
            <div className="w-full panel-surface rounded-lg relative overflow-hidden shrink-0">
              <div className="px-4 pt-3 pb-1">
                {mainBlob ? (
                  <WaveformDisplay
                    blob={mainBlob}
                    color="#6366f1"
                    progressColor="#22d3ee"
                    height={80}
                    currentTime={currentTime}
                    duration={duration}
                    isPlaying={isPlaying}
                    onSeek={seek}
                    opacity={0.7}
                  />
                ) : (
                  <div className="h-20 flex items-center justify-center">
                    <span className="text-meta text-muted-foreground/40">Loading waveform…</span>
                  </div>
                )}
              </div>
              <div className="h-0.5 bg-muted/30 w-full">
                <div
                  className="h-full bg-gradient-to-r from-primary to-secondary transition-[width] duration-75"
                  style={{ width: duration > 0 ? `${(currentTime / duration) * 100}%` : "0%" }}
                />
              </div>
              <div className="flex justify-between px-4 py-1.5">
                <span className="text-meta text-muted-foreground/50">Full Mix</span>
                <span className="text-mono text-muted-foreground/40">
                  {formatTime(duration)}
                </span>
              </div>
            </div>

            {/* Stems vs Vibes view */}
            <AnimatePresence mode="wait">
              {viewMode === "stems" ? (
                <motion.div
                  key="stems-view"
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -16 }}
                  transition={{ duration: 0.25 }}
                  className="flex flex-col gap-4"
                >
                  {stems.map((stem, i) => {
                    const editTargetStem = editIntent ? (editIntent.target_stem || "").toLowerCase().trim() : null;
                    const isTarget = editTargetStem === stem.id;
                    return (
                      <div key={stem.id}>
                        <StemLane stemId={stem.id} isEditTarget={isTarget} />
                        {i < stems.length - 1 && (
                          <div className="h-px bg-border/30 mt-4" />
                        )}
                      </div>
                    );
                  })}
                </motion.div>
              ) : (
                <motion.div
                  key="vibes-view"
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 16 }}
                  transition={{ duration: 0.25 }}
                >
                  <div className="panel-surface rounded-lg">
                    <VibesView
                      onVibeChange={handleVibeChange}
                      disabled={stems.some(s => s.isRegenerating)}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Card overlay */}
      <AnimatePresence>
        {editIntent && editTranscript && (
          <EditCard
            intent={editIntent}
            transcript={editTranscript}
            onApply={onApplyEdit}
            onRetry={onRetryEdit}
            isRegenerating={stems.some(s => s.isRegenerating)}
          />
        )}
      </AnimatePresence>
    </section>
  );
};

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export default MainStage;
