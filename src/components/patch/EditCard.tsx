import { motion } from "framer-motion";
import { AlertTriangle, Loader2 } from "lucide-react";
import type { EditIntent } from "@/lib/types";
import { STEM_COLOR_MAP } from "@/lib/types";

interface EditCardProps {
  intent: EditIntent;
  transcript: string;
  onApply: () => void;
  onRetry: () => void;
  isRegenerating?: boolean;
}

const EditCard = ({ intent, transcript, onApply, onRetry, isRegenerating }: EditCardProps) => {
  const stemInfo = STEM_COLOR_MAP[intent.target_stem] || STEM_COLOR_MAP.full_mix;
  const lowConfidence = intent.confidence < 0.7;

  return (
    <motion.div
      initial={{ opacity: 0, y: 60 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 60 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className="absolute bottom-6 left-8 right-8 z-20"
    >
      <div className="panel-surface rounded-xl backdrop-blur-xl overflow-hidden shadow-2xl">
        {lowConfidence && (
          <div className="flex items-center gap-2 px-5 py-2.5 bg-patch-harmony/10 border-b border-patch-harmony/20">
            <AlertTriangle size={14} className="text-patch-harmony shrink-0" />
            <p className="text-[11px] text-patch-harmony">
              I'm not sure I understood correctly.{" "}
              {intent.clarification && (
                <span className="text-foreground/70">{intent.clarification}</span>
              )}
            </p>
          </div>
        )}

        <div className="p-5 space-y-3">
          <p className="text-[12px] text-foreground/50 italic leading-relaxed">
            "{transcript}"
          </p>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 500, damping: 20, delay: 0.1 }}
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: stemInfo.color }}
              />
              <span className="text-meta" style={{ color: stemInfo.color }}>
                Target: {stemInfo.label}
              </span>
              <span className="text-meta text-muted-foreground mx-1">·</span>
              <span className="text-meta text-foreground">
                Section: {intent.target_section.replace("_", " ")}
              </span>
            </div>

            <p className="text-body text-foreground/80">{intent.action}</p>

            {intent.preserve.length > 0 && (
              <p className="text-[11px] text-muted-foreground">
                Preserving: {intent.preserve.join(", ")}
              </p>
            )}

            {intent.style_keywords.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {intent.style_keywords.map((kw, i) => (
                  <motion.span
                    key={kw}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.15 + i * 0.05 }}
                    className="text-[9px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium uppercase tracking-wider"
                  >
                    {kw}
                  </motion.span>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={onApply}
              disabled={isRegenerating}
              className="group relative px-4 py-2 bg-primary text-primary-foreground text-[12px] font-semibold rounded-full hover:scale-105 transition-transform duration-150 active:scale-95 glow-indigo disabled:opacity-50 disabled:hover:scale-100 flex items-center gap-2 overflow-hidden"
            >
              <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
              {isRegenerating && <Loader2 size={12} className="animate-spin" />}
              <span className="relative">{isRegenerating ? "Regenerating…" : "Apply Edit"}</span>
            </button>
            <button
              onClick={onRetry}
              disabled={isRegenerating}
              className="px-4 py-2 border border-border text-[12px] font-medium text-muted-foreground rounded-full hover:text-foreground hover:border-foreground/20 transition-colors duration-150 disabled:opacity-40"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default EditCard;
