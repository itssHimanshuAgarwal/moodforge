import { Plus, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { useState, useCallback } from "react";
import { useAudioEngine } from "@/hooks/use-audio-engine";
import GenerateModal from "./GenerateModal";

const EmptyState = () => {
  const { loadDemo, isLoading } = useAudioEngine();
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="flex-1 flex flex-col items-center justify-center p-12"
      >
        <div className="w-full max-w-md border-2 border-dashed border-foreground/10 rounded-xl p-12 flex flex-col items-center text-center">
          <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center mb-5 border border-primary/20">
            {isLoading ? (
              <Loader2 className="text-primary animate-spin" size={28} />
            ) : (
              <Plus className="text-primary" size={28} />
            )}
          </div>
          <h2 className="text-section text-foreground mb-1.5">
            Ready for surgery.
          </h2>
          <p className="text-body text-muted-foreground max-w-xs mb-6">
            Generate a track or drop an audio file to start editing.
          </p>
          <button
            onClick={() => setShowModal(true)}
            disabled={isLoading}
            className="px-5 py-2.5 bg-primary text-primary-foreground text-body font-semibold rounded-full hover:scale-105 transition-transform duration-150 active:scale-95 glow-indigo disabled:opacity-50 disabled:hover:scale-100"
          >
            Generate Track
          </button>
          <p className="text-[11px] text-muted-foreground/60 mt-3">
            or drag and drop an audio file
          </p>
          <button
            onClick={loadDemo}
            disabled={isLoading}
            className="text-[11px] text-muted-foreground/40 hover:text-muted-foreground mt-2 underline underline-offset-2 transition-colors duration-150 disabled:opacity-30"
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
