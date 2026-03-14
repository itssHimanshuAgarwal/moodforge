import { motion, AnimatePresence } from "framer-motion";
import StemLane from "./StemLane";
import EmptyState from "./EmptyState";
import WaveformDisplay from "./WaveformDisplay";
import EditCard from "./EditCard";
import { useAudioEngine } from "@/hooks/use-audio-engine";
import type { EditIntent } from "@/lib/types";

interface MainStageProps {
  editIntent: EditIntent | null;
  editTranscript: string | null;
  onApplyEdit: () => void;
  onRetryEdit: () => void;
}

const MainStage = ({ editIntent, editTranscript, onApplyEdit, onRetryEdit }: MainStageProps) => {
  const { isLoaded, stems, currentTime, duration, isPlaying, seek } = useAudioEngine();
  const mainBlob = stems[0]?.blob ?? null;

  return (
    <section
      className="flex-1 border-r border-border flex flex-col relative overflow-hidden"
      style={{
        background:
          "radial-gradient(ellipse 80% 40% at 50% 0%, rgba(99,102,241,0.04), transparent)",
      }}
    >
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

            {/* Stem lanes */}
            <div className="flex flex-col gap-4">
              {stems.map((stem, i) => (
                <div key={stem.id}>
                  <StemLane stemId={stem.id} />
                  {i < stems.length - 1 && (
                    <div className="h-px bg-border/30 mt-4" />
                  )}
                </div>
              ))}
            </div>
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
