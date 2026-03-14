import { Plus, Loader2, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAudioEngine } from "@/hooks/use-audio-engine";
import GenerateModal from "./GenerateModal";

const EmptyState = () => {
  const { loadDemo, isLoading } = useAudioEngine();
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
        {/* Radial spotlight */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "radial-gradient(ellipse 60% 50% at 50% 50%, rgba(99,102,241,0.03), transparent 70%), radial-gradient(ellipse 50% 40% at 50% 50%, rgba(139,92,246,0.03), transparent 70%)",
          }}
        />

        {/* Animated gradient background */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "linear-gradient(135deg, rgba(99,102,241,0.05) 0%, rgba(168,85,247,0.04) 50%, rgba(99,102,241,0.05) 100%)",
            backgroundSize: "400% 400%",
            animation: "gradientShift 12s ease infinite",
          }}
        />

        <div className="relative w-full max-w-md border border-border/50 rounded-xl p-12 flex flex-col items-center text-center gap-3 backdrop-blur-[20px] bg-card/30" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
          <div
            className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center mb-2 border border-primary/20"
            style={{ animation: "glowRing 3s ease-in-out infinite" }}
          >
            {isLoading ? (
              <Loader2 className="text-primary animate-spin" size={28} />
            ) : (
              <Plus className="text-primary" size={28} />
            )}
          </div>
          <h2 className="text-section text-foreground mb-0.5">
            What do you want to feel?
          </h2>
          <p className="text-body text-muted-foreground max-w-xs mb-3">
            Discover your sound, generate it, then edit it to perfection.
          </p>

          <button
            onClick={() => setShowModal(true)}
            disabled={isLoading}
            className="group relative px-5 py-2.5 bg-primary text-primary-foreground text-body font-semibold rounded-full hover:scale-105 transition-transform duration-150 active:scale-95 glow-indigo disabled:opacity-50 disabled:hover:scale-100 overflow-hidden"
          >
            <span
              className="absolute inset-0 -translate-x-full group-hover:animate-[shimmer_0.6s_ease-in-out] bg-gradient-to-r from-transparent via-white/15 to-transparent"
            />
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

          <p className="text-[11px] text-muted-foreground/60 mt-1">
            or drag and drop an audio file
          </p>
          <button
            onClick={loadDemo}
            disabled={isLoading}
            className="text-[11px] text-foreground/70 hover:text-foreground underline underline-offset-2 transition-colors duration-150 disabled:opacity-30"
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