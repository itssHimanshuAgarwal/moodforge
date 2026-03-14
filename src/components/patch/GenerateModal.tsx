import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2, Music } from "lucide-react";
import { useAudioEngine } from "@/hooks/use-audio-engine";
import { toast } from "@/hooks/use-toast";

interface GenerateModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const phaseMessages = [
  "Composing...",
  "Arranging stems...",
  "Mixing down...",
];

const GenerateModal = ({ isOpen, onClose }: GenerateModalProps) => {
  const { generateTrack } = useAudioEngine();
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [phase, setPhase] = useState(0);

  // Cycle through loading messages
  useEffect(() => {
    if (!isGenerating) { setPhase(0); return; }
    const interval = setInterval(() => {
      setPhase((p) => (p + 1) % phaseMessages.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [isGenerating]);

  const handleGenerate = async () => {
    if (!prompt.trim() || isGenerating) return;
    setIsGenerating(true);
    try {
      await generateTrack(prompt.trim());
      toast({ title: "Track generated", description: "Your track is ready for editing." });
      onClose();
      setPrompt("");
    } catch (err) {
      console.error(err);
      toast({
        title: "Generation failed",
        description: "Couldn't generate track — try uploading a file instead.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center"
        >
          <div
            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            onClick={() => !isGenerating && onClose()}
          />
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="relative w-full max-w-lg panel-surface rounded-xl backdrop-blur-xl shadow-2xl overflow-hidden"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <div className="flex items-center gap-2">
                <Music size={16} className="text-primary" />
                <span className="text-section text-foreground">Generate Track</span>
              </div>
              <button
                onClick={() => !isGenerating && onClose()}
                className="p-1.5 text-muted-foreground hover:text-foreground rounded-md hover:bg-muted transition-colors duration-150"
                disabled={isGenerating}
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="text-meta text-muted-foreground mb-2 block">
                  Describe your track
                </label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  disabled={isGenerating}
                  rows={3}
                  placeholder="dark minimal electronic, 85bpm, atmospheric with heavy sub-bass"
                  className="w-full bg-muted/40 border border-border rounded-lg px-4 py-3 text-body text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/30 transition-colors duration-150 resize-none disabled:opacity-50"
                />
              </div>

              {isGenerating ? (
                <div className="flex flex-col items-center py-6 gap-3">
                  {/* Animated waveform bars drawing left to right */}
                  <div className="flex items-center gap-1">
                    {Array.from({ length: 20 }).map((_, i) => (
                      <motion.div
                        key={i}
                        className="w-1 bg-primary rounded-full"
                        initial={{ height: 4, opacity: 0.2 }}
                        animate={{
                          height: [4, 12 + Math.random() * 16, 4],
                          opacity: [0.2, 0.8, 0.4],
                        }}
                        transition={{
                          duration: 1.2,
                          repeat: Infinity,
                          delay: i * 0.08,
                          ease: "easeInOut",
                        }}
                      />
                    ))}
                  </div>
                  <AnimatePresence mode="wait">
                    <motion.span
                      key={phase}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.2 }}
                      className="text-body text-muted-foreground"
                    >
                      {phaseMessages[phase]}
                    </motion.span>
                  </AnimatePresence>
                  <span className="text-[11px] text-muted-foreground/50">
                    This usually takes 10–30 seconds
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleGenerate}
                    disabled={!prompt.trim()}
                    className="group relative px-5 py-2.5 bg-primary text-primary-foreground text-body font-semibold rounded-full hover:scale-105 transition-transform duration-150 active:scale-95 glow-indigo disabled:opacity-40 disabled:hover:scale-100 overflow-hidden"
                  >
                    {/* Shimmer effect */}
                    <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                    <span className="relative">Generate</span>
                  </button>
                  <button
                    onClick={onClose}
                    className="px-4 py-2 border border-border text-body text-muted-foreground rounded-full hover:text-foreground hover:border-foreground/20 transition-colors duration-150"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default GenerateModal;
