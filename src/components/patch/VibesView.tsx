import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Slider } from "@/components/ui/slider";
import { toast } from "@/hooks/use-toast";

export interface VibeValues {
  energy: number;
  mood: number;
  complexity: number;
  warmth: number;
  rhythm: number;
}

const VIBE_DEFS = [
  { key: "energy", label: "Energy", low: "Low", high: "High", color: "hsl(var(--patch-drums))" },
  { key: "mood", label: "Mood", low: "Dark", high: "Bright", color: "hsl(var(--patch-melody))" },
  { key: "complexity", label: "Complexity", low: "Minimal", high: "Dense", color: "hsl(var(--patch-bass))" },
  { key: "warmth", label: "Warmth", low: "Cold", high: "Warm", color: "hsl(var(--patch-harmony))" },
  { key: "rhythm", label: "Rhythm", low: "Calm", high: "Driving", color: "hsl(var(--patch-vocals))" },
] as const;

// Maps a vibe change to a natural language edit instruction targeting specific stems
function vibeChangeToInstruction(key: string, oldVal: number, newVal: number): { instruction: string; stems: string[] } {
  const delta = newVal - oldVal;
  const direction = delta > 0 ? "increase" : "decrease";
  const intensity = Math.abs(delta) > 40 ? "significantly" : "slightly";

  const map: Record<string, { up: string; down: string; stems: string[] }> = {
    energy: {
      up: `${intensity} increase the energy — make drums more intense and bass more driving`,
      down: `${intensity} reduce the energy — soften the drums and lower bass intensity`,
      stems: ["drums", "bass"],
    },
    mood: {
      up: `${intensity} brighten the mood — make the melody more uplifting and harmony brighter`,
      down: `${intensity} darken the mood — make the melody more somber and harmony moodier`,
      stems: ["melody", "harmony"],
    },
    complexity: {
      up: `${intensity} increase complexity — add more layers and intricate patterns to melody and harmony`,
      down: `${intensity} simplify the arrangement — strip back melody and harmony to essentials`,
      stems: ["melody", "harmony"],
    },
    warmth: {
      up: `${intensity} add warmth — make bass rounder and harmony warmer with analog character`,
      down: `${intensity} make it colder — sharpen the bass and make harmony more crystalline`,
      stems: ["bass", "harmony"],
    },
    rhythm: {
      up: `${intensity} make the rhythm more driving — intensify drum patterns and add rhythmic bass`,
      down: `${intensity} calm the rhythm — soften drum patterns and make bass more sustained`,
      stems: ["drums", "bass"],
    },
  };

  const entry = map[key] || { up: "adjust the track", down: "adjust the track", stems: ["full_mix"] };
  return {
    instruction: direction === "increase" ? entry.up : entry.down,
    stems: entry.stems,
  };
}

interface VibesViewProps {
  onVibeChange: (instruction: string, affectedStems: string[]) => void;
  disabled?: boolean;
}

const VibesView = ({ onVibeChange, disabled = false }: VibesViewProps) => {
  const [values, setValues] = useState<VibeValues>({
    energy: 50, mood: 50, complexity: 50, warmth: 50, rhythm: 50,
  });
  const [committedValues, setCommittedValues] = useState<VibeValues>({ ...values });

  const handleCommit = useCallback(
    (key: string, newVal: number) => {
      const oldVal = committedValues[key as keyof VibeValues];
      if (Math.abs(newVal - oldVal) < 5) return; // ignore tiny changes

      const { instruction, stems } = vibeChangeToInstruction(key, oldVal, newVal);
      const stemLabels = stems.map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(" & ");

      toast({
        title: `Adjusting ${VIBE_DEFS.find(v => v.key === key)?.label}`,
        description: `→ ${stemLabels}`,
      });

      setCommittedValues(prev => ({ ...prev, [key]: newVal }));
      onVibeChange(instruction, stems);
    },
    [committedValues, onVibeChange]
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col gap-6 p-6"
    >
      <p className="text-meta text-muted-foreground">
        Move the sliders to shape the feel of your track
      </p>

      {VIBE_DEFS.map((vibe, i) => (
        <motion.div
          key={vibe.key}
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.06, duration: 0.3 }}
          className="space-y-2"
        >
          <div className="flex items-center justify-between">
            <span
              className="text-[12px] font-semibold uppercase tracking-wider"
              style={{ color: vibe.color }}
            >
              {vibe.label}
            </span>
            <span className="text-mono text-muted-foreground/50">
              {values[vibe.key as keyof VibeValues]}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[10px] text-muted-foreground/40 w-12 text-right shrink-0">
              {vibe.low}
            </span>
            <div className="flex-1 relative">
              <Slider
                value={[values[vibe.key as keyof VibeValues]]}
                min={0}
                max={100}
                step={1}
                disabled={disabled}
                onValueChange={([v]) => setValues(prev => ({ ...prev, [vibe.key]: v }))}
                onValueCommit={([v]) => handleCommit(vibe.key, v)}
                className="w-full [&_[data-radix-slider-track]]:h-1.5 [&_[data-radix-slider-track]]:bg-muted/40 [&_[data-radix-slider-range]]:bg-current [&_[data-radix-slider-thumb]]:h-3.5 [&_[data-radix-slider-thumb]]:w-3.5 [&_[data-radix-slider-thumb]]:border-2 [&_[data-radix-slider-thumb]]:shadow-lg"
                style={{ color: vibe.color } as React.CSSProperties}
              />
            </div>
            <span className="text-[10px] text-muted-foreground/40 w-12 shrink-0">
              {vibe.high}
            </span>
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
};

export default VibesView;
