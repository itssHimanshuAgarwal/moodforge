import { Play, Pause, SkipBack, SkipForward, Mic, Volume2 } from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";

interface TransportBarProps {
  isRecording: boolean;
  onToggleRecording: () => void;
  hasTrack: boolean;
}

const TransportBar = ({ isRecording, onToggleRecording, hasTrack }: TransportBarProps) => {
  const [isPlaying, setIsPlaying] = useState(false);

  return (
    <footer className="h-28 border-t border-border bg-card flex items-center px-8 relative shrink-0">
      {/* Left: Transport */}
      <div className="flex items-center gap-6 w-1/3">
        <div className="flex items-center gap-2">
          <button
            className="p-2 text-muted-foreground hover:text-foreground transition-colors duration-150 disabled:opacity-30"
            disabled={!hasTrack}
          >
            <SkipBack size={20} />
          </button>
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            disabled={!hasTrack}
            className="w-12 h-12 flex items-center justify-center bg-foreground text-background rounded-full hover:scale-105 transition-transform duration-150 disabled:opacity-30 disabled:hover:scale-100"
          >
            {isPlaying ? (
              <Pause size={24} fill="currentColor" />
            ) : (
              <Play size={24} fill="currentColor" />
            )}
          </button>
          <button
            className="p-2 text-muted-foreground hover:text-foreground transition-colors duration-150 disabled:opacity-30"
            disabled={!hasTrack}
          >
            <SkipForward size={20} />
          </button>
        </div>
        <div className="font-mono text-2xl tracking-tighter text-foreground">
          00:00<span className="text-muted-foreground">.00</span>
        </div>
      </div>

      {/* Center: The Mic */}
      <div className="absolute left-1/2 -translate-x-1/2 -top-6 z-10">
        <motion.button
          onClick={onToggleRecording}
          animate={isRecording ? { scale: [1, 1.08, 1] } : {}}
          transition={isRecording ? { repeat: Infinity, duration: 2, ease: "easeInOut" } : {}}
          className={`w-20 h-20 rounded-full flex items-center justify-center shadow-2xl transition-colors duration-500 relative ${
            isRecording
              ? "bg-secondary shadow-secondary/40"
              : "bg-primary shadow-primary/40"
          }`}
        >
          <Mic
            size={32}
            className={isRecording ? "text-secondary-foreground" : "text-primary-foreground"}
          />
          {isRecording && (
            <div className="absolute inset-0 rounded-full border-4 border-secondary animate-pulse-ring" />
          )}
        </motion.button>
      </div>

      {/* Right: Controls */}
      <div className="w-1/3 flex justify-end items-center gap-8">
        <div className="flex flex-col items-center gap-1">
          <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-tighter">
            A/B Compare
          </span>
          <button className="w-12 h-6 bg-muted rounded-full relative p-1 cursor-not-allowed opacity-50">
            <div className="w-4 h-4 bg-muted-foreground/40 rounded-full" />
          </button>
        </div>
        <div className="flex items-center gap-3 text-muted-foreground">
          <Volume2 size={18} />
          <div className="w-24 h-1 bg-muted rounded-full relative">
            <div className="absolute inset-y-0 left-0 w-2/3 bg-primary rounded-full" />
          </div>
        </div>
      </div>
    </footer>
  );
};

export default TransportBar;
