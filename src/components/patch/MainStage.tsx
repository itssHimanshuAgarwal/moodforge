import { Activity } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useMemo } from "react";
import StemLane from "./StemLane";
import EmptyState from "./EmptyState";

interface MainStageProps {
  isLoaded: boolean;
  onGenerate: () => void;
}

const stems = [
  { label: "Drums", color: "#3b82f6", bgClass: "stem-bg-drums" },
  { label: "Bass", color: "#a855f7", bgClass: "stem-bg-bass" },
  { label: "Melody", color: "#22c55e", bgClass: "stem-bg-melody" },
  { label: "Harmony", color: "#f59e0b", bgClass: "stem-bg-harmony" },
  { label: "Vocals", color: "#ef4444", bgClass: "stem-bg-vocals" },
];

const MainStage = ({ isLoaded, onGenerate }: MainStageProps) => {
  // Global waveform bars
  const globalBars = useMemo(() => {
    const count = 200;
    return Array.from({ length: count }, (_, i) => {
      const x = i / count;
      const h =
        Math.sin(x * Math.PI) * 0.5 +
        Math.sin(x * 5.7) * 0.25 +
        Math.sin(x * 11.3) * 0.1 +
        Math.cos(x * 17) * 0.08 +
        0.07;
      return Math.max(0.04, Math.min(1, h));
    });
  }, []);

  return (
    <section
      className="flex-1 border-r border-border flex flex-col relative overflow-hidden"
      style={{
        background:
          "radial-gradient(ellipse 80% 40% at 50% 0%, rgba(99,102,241,0.04), transparent)",
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
            className="flex-1 flex flex-col overflow-y-auto custom-scrollbar p-8 gap-4"
          >
            {/* Global waveform */}
            <div className="h-28 w-full panel-surface rounded-lg relative overflow-hidden shrink-0">
              <div className="absolute inset-0 flex items-center justify-center gap-[1px] px-4 py-3">
                {globalBars.map((h, i) => {
                  const centerDist = Math.abs(i / globalBars.length - 0.5) * 2;
                  const opacity = 0.15 + (1 - centerDist) * 0.25;
                  return (
                    <div
                      key={i}
                      className="flex-1 min-w-[1px] rounded-[0.5px] bg-primary"
                      style={{
                        height: `${h * 100}%`,
                        opacity,
                      }}
                    />
                  );
                })}
              </div>
              <div className="absolute bottom-2.5 left-4 text-meta text-muted-foreground/50">
                Full Mix
              </div>
              <div className="absolute bottom-2.5 right-4 text-mono text-muted-foreground/40">
                03:24
              </div>
            </div>

            {/* Stem lanes */}
            <div className="flex flex-col gap-4">
              {stems.map((stem, i) => (
                <div key={stem.label}>
                  <StemLane
                    label={stem.label}
                    color={stem.color}
                    bgClass={stem.bgClass}
                  />
                  {i < stems.length - 1 && (
                    <div className="h-px bg-border/30 mt-4" />
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
};

export default MainStage;
