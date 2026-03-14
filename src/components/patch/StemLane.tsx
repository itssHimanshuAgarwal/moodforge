import { Lock, Unlock, Loader2 } from "lucide-react";
import WaveformDisplay from "./WaveformDisplay";
import { useAudioEngine } from "@/hooks/use-audio-engine";

interface StemLaneProps {
  stemId: string;
}

const StemLane = ({ stemId }: StemLaneProps) => {
  const {
    stems, currentTime, duration, isPlaying, abMode,
    toggleSolo, toggleMute, toggleLock, seek,
  } = useAudioEngine();

  const stem = stems.find((s) => s.id === stemId);
  if (!stem) return null;

  const anySolo = stems.some((s) => s.isSolo);
  const isAudible = anySolo ? stem.isSolo : !stem.isMuted;
  const dimmed = !isAudible;
  const isEdited = abMode === "edited" && stem.editedBlob !== null;
  const displayBlob = isEdited ? stem.editedBlob : stem.blob;

  return (
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
            : isEdited
            ? "border-secondary/30 shadow-[0_0_10px_rgba(34,211,238,0.1)]"
            : "border-border"
        }`}
      >
        {stem.isRegenerating ? (
          <div className="absolute inset-0 flex items-center justify-center gap-2">
            <Loader2 size={14} className="text-secondary animate-spin" />
            <span className="text-[10px] text-secondary">Regenerating…</span>
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

      {/* Lock */}
      <button
        onClick={() => toggleLock(stem.id)}
        className="p-1 transition-colors duration-150"
      >
        {stem.isLocked ? (
          <Lock
            size={13}
            className="text-patch-harmony"
            style={{ filter: "drop-shadow(0 0 4px rgba(245, 158, 11, 0.3))" }}
          />
        ) : (
          <Unlock
            size={13}
            className="text-muted-foreground/30 hover:text-muted-foreground transition-colors duration-150"
          />
        )}
      </button>
    </div>
  );
};

export default StemLane;
