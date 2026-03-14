import { motion, AnimatePresence } from "framer-motion";
import { Loader2 } from "lucide-react";
import type { VoiceState } from "@/lib/types";

interface SpeechBubbleProps {
  voiceState: VoiceState;
  transcript: string | null;
}

const stateLabels: Partial<Record<VoiceState, string>> = {
  recording: "Listening…",
  transcribing: "Transcribing…",
  parsing: "Understanding intent…",
};

const SpeechBubble = ({ voiceState, transcript }: SpeechBubbleProps) => {
  const show = voiceState === "recording" || voiceState === "transcribing" || voiceState === "parsing";

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 8, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className="absolute left-1/2 -translate-x-1/2 bottom-full mb-3 z-30"
        >
          <div className="panel-surface rounded-lg px-4 py-2.5 max-w-xs min-w-[140px] backdrop-blur-xl shadow-xl">
            <div className="flex items-center gap-2">
              {(voiceState === "transcribing" || voiceState === "parsing") && (
                <Loader2 size={12} className="animate-spin text-secondary shrink-0" />
              )}
              {voiceState === "recording" && (
                <div className="w-2 h-2 rounded-full bg-secondary animate-pulse shrink-0" />
              )}
              <span className="text-[12px] text-foreground/80">
                {transcript || stateLabels[voiceState] || ""}
              </span>
            </div>
          </div>
          {/* Arrow */}
          <div className="absolute left-1/2 -translate-x-1/2 -bottom-1.5 w-3 h-3 rotate-45 bg-card border-r border-b border-border" />
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SpeechBubble;
