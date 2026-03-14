import { Activity } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import StemLane from "./StemLane";
import EmptyState from "./EmptyState";

interface MainStageProps {
  isLoaded: boolean;
  onGenerate: () => void;
}

const stems = [
  { label: "Drums", color: "#3b82f6" },
  { label: "Bass", color: "#a855f7" },
  { label: "Melody", color: "#22c55e" },
  { label: "Harmony", color: "#f59e0b" },
  { label: "Vocals", color: "#ef4444" },
];

const MainStage = ({ isLoaded, onGenerate }: MainStageProps) => {
  return (
    <section className="flex-1 border-r border-border flex flex-col relative overflow-hidden"
      style={{
        background: "radial-gradient(circle at 50% 0%, rgba(99,102,241,0.04), transparent 70%)",
      }}
    >
      <AnimatePresence mode="wait">
        {!isLoaded ? (
          <EmptyState key="empty" onGenerate={onGenerate} />
        ) : (
          <motion.div
            key="loaded"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
            className="flex-1 flex flex-col overflow-y-auto custom-scrollbar p-6 space-y-2"
          >
            {/* Global waveform */}
            <div className="h-32 w-full bg-muted/30 rounded-lg mb-6 border border-border relative overflow-hidden backdrop-blur-sm">
              <div className="absolute inset-0 flex items-center justify-center opacity-20">
                <Activity size={48} className="text-primary" />
              </div>
              <div className="absolute bottom-2 left-3 font-mono text-[10px] text-muted-foreground uppercase tracking-widest">
                Full Mix
              </div>
            </div>

            {/* Stem lanes */}
            {stems.map((stem, i) => (
              <div key={stem.label}>
                <StemLane label={stem.label} color={stem.color} />
                {i < stems.length - 1 && (
                  <div className="h-px bg-border/50 my-1" />
                )}
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
};

export default MainStage;
