import { Plus, Loader2, Sparkles, History } from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAudioEngine } from "@/hooks/use-audio-engine";
import GenerateModal from "./GenerateModal";

const EmptyState = () => {
  const { loadDemo, isLoading, hasSavedSession, savedSessionPrompt, restoreSession } = useAudioEngine();
  const [showModal, setShowModal] = useState(false);
  const navigate = useNavigate();

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="flex-1 flex flex-col items-center justify-center p-12 relative overflow-hidden"
      >
        {/* Animated gradient background */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "linear-gradient(135deg, rgba(99,102,241,0.05) 0%, rgba(168,85,247,0.04) 50%, rgba(99,102,241,0.05) 100%)",
            backgroundSize: "400% 400%",
            animation: "gradientShift 12s ease infinite",
          }}
        />

        <div className="relative w-full max-w-md border-2 border-dashed border-foreground/10 rounded-xl p-12 flex flex-col items-center text-center gap-3">
          <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center mb-2 border border-primary/20">
            {isLoading ? (
              <Loader2 className="text-primary animate-spin" size={28} />
            ) : (
              <Plus className="text-primary" size={28} />
            )}
          </div>
          <h2 className="text-section text-foreground mb-0.5">
            Ready for surgery.
          </h2>
          <p className="text-body text-muted-foreground max-w-xs mb-3">
            Generate a track or drop an audio file to start editing.
          </p>

          <button
            onClick={() => setShowModal(true)}
            disabled={isLoading}
            className="group relative px-5 py-2.5 bg-primary text-primary-foreground text-body font-semibold rounded-full hover:scale-105 transition-transform duration-150 active:scale-95 glow-indigo disabled:opacity-50 disabled:hover:scale-100 overflow-hidden"
          >
            <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            <span className="relative">Generate Track</span>
          </button>

          <button
            onClick={() => navigate("/discover")}
            disabled={isLoading}
            className="group flex items-center gap-2 px-5 py-2.5 border border-primary/30 text-primary text-body font-semibold rounded-full hover:scale-105 hover:bg-primary/5 transition-all duration-150 active:scale-95 disabled:opacity-50 disabled:hover:scale-100"
          >
            <Sparkles size={14} />
            <span>Discover Vibes</span>
          </button>

          {/* Resume last session */}
          {hasSavedSession && (
            <motion.button
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              onClick={restoreSession}
              disabled={isLoading}
              className="group flex items-center gap-2 px-5 py-2.5 border border-accent/30 text-accent-foreground text-body font-medium rounded-full hover:scale-105 hover:bg-accent/10 transition-all duration-150 active:scale-95 disabled:opacity-50 disabled:hover:scale-100"
            >
              <History size={14} />
              <span className="truncate max-w-[200px]">
                Resume: {savedSessionPrompt ? `"${savedSessionPrompt.slice(0, 30)}${savedSessionPrompt.length > 30 ? '…' : ''}"` : "Last Session"}
              </span>
            </motion.button>
          )}

          <p className="text-[11px] text-muted-foreground/60 mt-1">
            or drag and drop an audio file
          </p>
          <button
            onClick={loadDemo}
            disabled={isLoading}
            className="text-[11px] text-muted-foreground/40 hover:text-muted-foreground underline underline-offset-2 transition-colors duration-150 disabled:opacity-30"
          >
            Load Demo
          </button>
        </div>
      </motion.div>
      <GenerateModal isOpen={showModal} onClose={() => setShowModal(false)} />
    </>
  );
};

export default EmptyState;
