import { Play, Pause, SkipBack, SkipForward, Mic, Volume2, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";
import { useAudioEngine } from "@/hooks/use-audio-engine";
import SpeechBubble from "./SpeechBubble";
import TextFeedback from "./TextFeedback";
import type { VoiceState } from "@/lib/types";

interface TransportBarProps {
  voiceState: VoiceState;
  transcript: string | null;
  onMicClick: () => void;
  onTextSubmit: (text: string) => void;
}

const TransportBar = ({ voiceState, transcript, onMicClick, onTextSubmit }: TransportBarProps) => {
  const {
    isLoaded, isPlaying, currentTime, duration,
    togglePlayPause, skipBack, skipForward,
  } = useAudioEngine();

  const isRecording = voiceState === "recording";
  const isProcessing = voiceState === "transcribing" || voiceState === "parsing";
  const micBusy = isRecording || isProcessing;

  return (
    <footer className="h-28 border-t border-border bg-card/80 backdrop-blur-xl flex items-center px-8 relative shrink-0">
      {/* Left: Transport */}
      <div className="flex items-center gap-5 w-1/3">
        <div className="flex items-center gap-1.5">
          <button
            onClick={skipBack}
            className="p-2 text-muted-foreground hover:text-foreground transition-colors duration-150 disabled:opacity-25 disabled:cursor-not-allowed"
            disabled={!isLoaded}
          >
            <SkipBack size={18} />
          </button>
          <button
            onClick={togglePlayPause}
            disabled={!isLoaded}
            className="w-10 h-10 flex items-center justify-center bg-foreground text-background rounded-full hover:scale-105 transition-transform duration-150 disabled:opacity-25 disabled:hover:scale-100 disabled:cursor-not-allowed"
          >
            {isPlaying ? (
              <Pause size={18} fill="currentColor" />
            ) : (
              <Play size={18} fill="currentColor" className="ml-0.5" />
            )}
          </button>
          <button
            onClick={skipForward}
            className="p-2 text-muted-foreground hover:text-foreground transition-colors duration-150 disabled:opacity-25 disabled:cursor-not-allowed"
            disabled={!isLoaded}
          >
            <SkipForward size={18} />
          </button>
        </div>
        <div className="text-timecode text-[22px] text-foreground">
          {formatTime(currentTime)}
          <span className="text-muted-foreground text-[16px] ml-0.5">
            / {formatTime(duration)}
          </span>
        </div>
      </div>

      {/* Center: The Mic + Speech Bubble */}
      <div className="absolute left-1/2 -translate-x-1/2 -top-8 z-10">
        <div className="relative">
          <SpeechBubble voiceState={voiceState} transcript={transcript} />
          <motion.button
            onClick={onMicClick}
            animate={isRecording ? { scale: [1, 1.06, 1] } : {}}
            transition={isRecording ? { repeat: Infinity, duration: 2, ease: "easeInOut" } : {}}
            className={`w-16 h-16 rounded-full flex items-center justify-center transition-all duration-500 relative ${
              isRecording
                ? "bg-secondary glow-cyan"
                : isProcessing
                ? "bg-primary/80 glow-indigo"
                : "bg-primary glow-indigo"
            }`}
          >
            {isProcessing ? (
              <Loader2 size={26} className="text-primary-foreground animate-spin" />
            ) : (
              <Mic
                size={26}
                className={`transition-colors duration-300 ${
                  isRecording ? "text-secondary-foreground" : "text-primary-foreground"
                }`}
              />
            )}
            {isRecording && (
              <>
                <span className="absolute inset-0 rounded-full border-2 border-secondary animate-pulse-ring" />
                <span className="absolute inset-0 rounded-full border-2 border-secondary animate-pulse-ring" style={{ animationDelay: "0.5s" }} />
                <span className="absolute inset-0 rounded-full border-2 border-secondary animate-pulse-ring" style={{ animationDelay: "1s" }} />
              </>
            )}
          </motion.button>
        </div>
      </div>

      {/* Right: Text input + A/B + Volume */}
      <div className="w-1/3 flex justify-end items-center gap-4">
        <TextFeedback onSubmit={onTextSubmit} disabled={micBusy} />
        <ABToggle disabled={true} />
        <div className="flex items-center gap-2.5 text-muted-foreground">
          <Volume2 size={15} />
          <div className="w-16 h-1 bg-muted rounded-full relative">
            <div className="absolute inset-y-0 left-0 w-2/3 bg-primary rounded-full" />
          </div>
        </div>
      </div>
    </footer>
  );
};

const ABToggle = ({ disabled }: { disabled: boolean }) => {
  const [isEdited, setIsEdited] = useState(false);

  return (
    <div className={`flex flex-col items-center gap-1 ${disabled ? "opacity-30 pointer-events-none" : ""}`}>
      <span className="text-[9px] font-bold uppercase text-muted-foreground tracking-wider">Compare</span>
      <button
        onClick={() => !disabled && setIsEdited(!isEdited)}
        className="relative w-[88px] h-6 bg-muted/60 rounded-full border border-border flex items-center p-0.5 transition-colors duration-150"
      >
        <div
          className={`absolute h-5 w-[42px] rounded-full transition-all duration-200 ease-out ${
            isEdited
              ? "left-[44px] bg-secondary/20 border border-secondary/30"
              : "left-0.5 bg-primary/20 border border-primary/30"
          }`}
        />
        <span className={`relative z-10 flex-1 text-center text-[9px] font-bold uppercase tracking-tight transition-colors duration-150 ${!isEdited ? "text-primary" : "text-muted-foreground/60"}`}>
          Orig
        </span>
        <span className={`relative z-10 flex-1 text-center text-[9px] font-bold uppercase tracking-tight transition-colors duration-150 ${isEdited ? "text-secondary" : "text-muted-foreground/60"}`}>
          Edit
        </span>
      </button>
    </div>
  );
};

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export default TransportBar;
