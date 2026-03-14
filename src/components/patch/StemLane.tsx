import { Lock, Unlock, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import WaveformDisplay from "./WaveformDisplay";
import { useAudioEngine } from "@/hooks/use-audio-engine";
import { playPop } from "@/lib/ui-sounds";

interface StemLaneProps {
  stemId: string;
  isEditTarget?: boolean;
}

const StemLane = ({ stemId }: StemLaneProps) => {
  const {
    stems, currentTime, duration, isPlaying,
    toggleSolo, toggleMute, toggleLock, seek, selectVersion,
    getActiveBlob,
  } = useAudioEngine();

  const stem = stems.find((s) => s.id === stemId);
  if (!stem) return null;

  const anySolo = stems.some((s) => s.isSolo);
  const isAudible = anySolo ? stem.isSolo : !stem.isMuted;
  const dimmed = !isAudible;
  const displayBlob = getActiveBlob(stem);
  const hasMultipleVersions = stem.versions.length > 1;

  const handleVersionSelect = (index: number) => {
    playPop();
    selectVersion(stem.id, index);
  };

  return (
    <div className="space-y-1.5">
      <div
        className={`h-12 w-full group flex gap-3 items-center transition-opacity duration-200 ${
          dimmed ? "opacity-30" : "opacity-100"
        }`}
      >
        {/* Label + controls */}
        <div className="w-28 shrink-0 flex items-center gap-2">
          <span
            className="text-[11px] font-mono font-medium uppercase tracking-wider w-14 truncate"
            style={{ color: stem.color }}
          >
            {stem.label}
          </span>
          <div className="flex gap-1">
            <button
              onClick={() => toggleSolo(stem.id)}
              className={`ctrl-btn ${
                stem.isSolo ? "!bg-primary/20 !text-primary !border-primary/30" : ""
              }`}
            >
              S
            </button>
            <button
              onClick={() => toggleMute(stem.id)}
              className={`ctrl-btn ${
                stem.isMuted ? "!bg-destructive/20 !text-destructive !border-destructive/30" : ""
              }`}
            >
              M
            </button>
          </div>
        </div>

        {/* Waveform */}
        <div
          className={`flex-1 h-full rounded-md border relative overflow-hidden ${stem.bgClass} group-hover:brightness-125 transition-all duration-150 ${
            stem.isRegenerating
              ? "border-secondary/40 animate-pulse"
              : stem.activeVersionIndex > 0
              ? "border-secondary/30 shadow-[0_0_10px_rgba(34,211,238,0.1)]"
              : "border-border"
          }`}
        >
          {stem.isRegenerating ? (
            <div className="absolute inset-0 flex items-center justify-center gap-2">
              <Loader2 size={14} className="text-secondary animate-spin" />
              <span className="text-[10px] text-secondary">Re-imagining {stem.label.toLowerCase()}…</span>
            </div>
          ) : displayBlob ? (
            <WaveformDisplay
              blob={displayBlob}
              color={stem.color}
              height={48}
              currentTime={currentTime}
              duration={duration}
              isPlaying={isPlaying}
              onSeek={seek}
              opacity={dimmed ? 0.3 : 0.6}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-[10px] text-muted-foreground/30">No data</span>
            </div>
          )}
        </div>

        {/* Lock + version count */}
        <div className="flex items-center gap-1.5">
          {hasMultipleVersions && (
            <span className="text-[9px] text-muted-foreground/60 font-mono">
              {stem.versions.length}v
            </span>
          )}
          <button
            onClick={() => toggleLock(stem.id)}
            className="p-1 transition-colors duration-150"
          >
            {stem.isLocked ? (
              <motion.div
                initial={{ scale: 1.3 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 500, damping: 15 }}
              >
                <Lock
                  size={13}
                  className="text-patch-harmony"
                  style={{ filter: "drop-shadow(0 0 4px rgba(245, 158, 11, 0.3))" }}
                />
              </motion.div>
            ) : (
              <Unlock
                size={13}
                className="text-muted-foreground/30 hover:text-muted-foreground transition-colors duration-150"
              />
            )}
          </button>
        </div>
      </div>

      {/* Version pills */}
      {hasMultipleVersions && (
        <div className="flex items-center gap-1 pl-28 ml-3">
          {stem.versions.map((v, i) => (
            <motion.button
              key={v.id}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.2, delay: i * 0.03 }}
              onClick={() => handleVersionSelect(i)}
              title={v.label}
              className={`text-[9px] font-mono px-2 py-0.5 rounded-full border transition-all duration-150 ${
                i === stem.activeVersionIndex
                  ? "border-current font-bold"
                  : "border-border text-muted-foreground/50 hover:text-muted-foreground hover:border-muted-foreground/30"
              }`}
              style={i === stem.activeVersionIndex ? { color: stem.color, borderColor: stem.color, backgroundColor: `${stem.color}15` } : undefined}
            >
              v{v.versionNumber}
            </motion.button>
          ))}
        </div>
      )}
    </div>
  );
};

export default StemLane;
