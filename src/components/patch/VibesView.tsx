import { useState, useCallback, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Slider } from "@/components/ui/slider";
import { ArrowRight, TrendingUp, TrendingDown } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export interface VibeValues {
  energy: number;
  mood: number;
  complexity: number;
  warmth: number;
  rhythm: number;
}

const VIBE_DEFS = [
  { key: "energy", label: "Energy", low: "Low", high: "High", color: "hsl(var(--patch-drums))", emoji: "⚡" },
  { key: "mood", label: "Mood", low: "Dark", high: "Bright", color: "hsl(var(--patch-melody))", emoji: "🌗" },
  { key: "complexity", label: "Complexity", low: "Minimal", high: "Dense", color: "hsl(var(--patch-bass))", emoji: "🧩" },
  { key: "warmth", label: "Warmth", low: "Cold", high: "Warm", color: "hsl(var(--patch-harmony))", emoji: "🔥" },
  { key: "rhythm", label: "Rhythm", low: "Calm", high: "Driving", color: "hsl(var(--patch-vocals))", emoji: "🥁" },
] as const;

// Keyword analysis to estimate initial vibes from generation prompt
function analyzePrompt(prompt: string): VibeValues {
  const p = prompt.toLowerCase();
  
  const score = (high: string[], low: string[], base = 50) => {
    let val = base;
    high.forEach(kw => { if (p.includes(kw)) val += 15; });
    low.forEach(kw => { if (p.includes(kw)) val -= 15; });
    return Math.max(5, Math.min(95, val));
  };

  return {
    energy: score(
      ["intense", "powerful", "heavy", "hard", "loud", "aggressive", "fast", "energetic", "hype", "edm", "metal", "punk", "rave", "uptempo", "high energy", "140bpm", "150bpm", "160bpm", "170bpm", "180bpm"],
      ["chill", "calm", "ambient", "soft", "gentle", "mellow", "relaxed", "slow", "lo-fi", "lofi", "downtempo", "60bpm", "70bpm", "lullaby", "peaceful"]
    ),
    mood: score(
      ["happy", "bright", "uplifting", "joyful", "cheerful", "sunny", "major", "positive", "euphoric", "hopeful", "playful", "fun"],
      ["dark", "sad", "melancholy", "moody", "somber", "minor", "haunting", "eerie", "dystopian", "brooding", "noir", "ominous", "gloomy"]
    ),
    complexity: score(
      ["complex", "intricate", "layered", "dense", "orchestral", "progressive", "jazz", "fusion", "polyrhythm", "experimental"],
      ["simple", "minimal", "sparse", "stripped", "basic", "bare", "clean", "lo-fi", "lofi", "acoustic"]
    ),
    warmth: score(
      ["warm", "analog", "vinyl", "tape", "tube", "vintage", "retro", "soul", "r&b", "funk", "organic", "cozy"],
      ["cold", "icy", "digital", "crisp", "sharp", "glitch", "industrial", "synthetic", "metallic", "clean"]
    ),
    rhythm: score(
      ["driving", "groovy", "bouncy", "rhythmic", "percussive", "dance", "four-on-the-floor", "breakbeat", "drum and bass", "dnb", "techno", "house"],
      ["calm", "ambient", "pad", "sustained", "drone", "atmospheric", "floating", "ethereal", "spacey", "still"]
    ),
  };
}

// Human-readable description of a value
function describeLevel(value: number): string {
  if (value <= 15) return "very low";
  if (value <= 35) return "low";
  if (value <= 65) return "moderate";
  if (value <= 85) return "high";
  return "very high";
}

function describeVibe(key: string, value: number): string {
  const descriptions: Record<string, Record<string, string>> = {
    energy: { "very low": "very relaxed", low: "laid-back", moderate: "balanced energy", high: "energetic", "very high": "intense" },
    mood: { "very low": "very dark", low: "moody", moderate: "neutral mood", high: "bright", "very high": "euphoric" },
    complexity: { "very low": "very stripped-back", low: "simple", moderate: "balanced layers", high: "rich & layered", "very high": "very intricate" },
    warmth: { "very low": "icy & digital", low: "cool-toned", moderate: "balanced tone", high: "warm & analog", "very high": "very warm & vintage" },
    rhythm: { "very low": "very still", low: "gentle pulse", moderate: "steady groove", high: "driving beat", "very high": "relentless rhythm" },
  };
  return descriptions[key]?.[describeLevel(value)] || describeLevel(value);
}

// Maps a vibe change to a natural language edit instruction
function vibeChangeToInstruction(key: string, oldVal: number, newVal: number): { instruction: string; stems: string[]; summary: string } {
  const delta = newVal - oldVal;
  const direction = delta > 0 ? "increase" : "decrease";
  const intensity = Math.abs(delta) > 40 ? "significantly" : Math.abs(delta) > 20 ? "noticeably" : "slightly";

  const map: Record<string, { up: string; down: string; stems: string[]; upSummary: string; downSummary: string }> = {
    energy: {
      up: `${intensity} increase the energy — make drums more intense and bass more driving`,
      down: `${intensity} reduce the energy — soften the drums and lower bass intensity`,
      stems: ["drums", "bass"],
      upSummary: `Making it more ${intensity === "slightly" ? "energetic" : "powerful"}`,
      downSummary: `Making it more ${intensity === "slightly" ? "relaxed" : "mellow"}`,
    },
    mood: {
      up: `${intensity} brighten the mood — make the melody more uplifting and harmony brighter`,
      down: `${intensity} darken the mood — make the melody more somber and harmony moodier`,
      stems: ["melody", "harmony"],
      upSummary: `Making the feel ${intensity === "slightly" ? "brighter" : "more uplifting"}`,
      downSummary: `Making the feel ${intensity === "slightly" ? "moodier" : "darker"}`,
    },
    complexity: {
      up: `${intensity} increase complexity — add more layers and intricate patterns to melody and harmony`,
      down: `${intensity} simplify the arrangement — strip back melody and harmony to essentials`,
      stems: ["melody", "harmony"],
      upSummary: `Adding ${intensity === "slightly" ? "some" : "more"} layers & detail`,
      downSummary: `Stripping back to ${intensity === "slightly" ? "simpler" : "bare essentials"}`,
    },
    warmth: {
      up: `${intensity} add warmth — make bass rounder and harmony warmer with analog character`,
      down: `${intensity} make it colder — sharpen the bass and make harmony more crystalline`,
      stems: ["bass", "harmony"],
      upSummary: `Adding ${intensity === "slightly" ? "warmth" : "rich analog warmth"}`,
      downSummary: `Making it ${intensity === "slightly" ? "crisper" : "sharper & digital"}`,
    },
    rhythm: {
      up: `${intensity} make the rhythm more driving — intensify drum patterns and add rhythmic bass`,
      down: `${intensity} calm the rhythm — soften drum patterns and make bass more sustained`,
      stems: ["drums", "bass"],
      upSummary: `Making the groove ${intensity === "slightly" ? "more driving" : "relentless"}`,
      downSummary: `Making the rhythm ${intensity === "slightly" ? "gentler" : "much calmer"}`,
    },
  };

  const entry = map[key] || { up: "adjust the track", down: "adjust the track", stems: ["full_mix"], upSummary: "Adjusting", downSummary: "Adjusting" };
  return {
    instruction: direction === "increase" ? entry.up : entry.down,
    stems: entry.stems,
    summary: direction === "increase" ? entry.upSummary : entry.downSummary,
  };
}

interface VibeChange {
  key: string;
  label: string;
  from: number;
  to: number;
  summary: string;
  timestamp: number;
}

interface VibesViewProps {
  onVibeChange: (instruction: string, affectedStems: string[]) => void;
  disabled?: boolean;
  generationPrompt?: string | null;
  editCount?: number;
}

const VibesView = ({ onVibeChange, disabled = false, generationPrompt, editCount = 0 }: VibesViewProps) => {
  // Derive initial values from prompt
  const initialValues = useMemo(() => {
    return generationPrompt ? analyzePrompt(generationPrompt) : { energy: 50, mood: 50, complexity: 50, warmth: 50, rhythm: 50 };
  }, [generationPrompt]);

  const [values, setValues] = useState<VibeValues>(initialValues);
  const [committedValues, setCommittedValues] = useState<VibeValues>(initialValues);
  const [previousValues, setPreviousValues] = useState<VibeValues | null>(null);
  const [recentChanges, setRecentChanges] = useState<VibeChange[]>([]);

  // Sync if prompt changes (new track generated)
  useEffect(() => {
    setValues(initialValues);
    setCommittedValues(initialValues);
    setPreviousValues(null);
    setRecentChanges([]);
  }, [initialValues]);

  const handleCommit = useCallback(
    (key: string, newVal: number) => {
      const oldVal = committedValues[key as keyof VibeValues];
      if (Math.abs(newVal - oldVal) < 5) {
        // Snap back
        setValues(prev => ({ ...prev, [key]: oldVal }));
        return;
      }

      const vibeDef = VIBE_DEFS.find(v => v.key === key)!;
      const { instruction, stems, summary } = vibeChangeToInstruction(key, oldVal, newVal);

      const change: VibeChange = {
        key,
        label: vibeDef.label,
        from: oldVal,
        to: newVal,
        summary,
        timestamp: Date.now(),
      };

      toast({
        title: summary,
        description: `${vibeDef.label}: ${describeVibe(key, oldVal)} → ${describeVibe(key, newVal)}`,
      });

      setPreviousValues({ ...committedValues });
      setCommittedValues(prev => ({ ...prev, [key]: newVal }));
      setRecentChanges(prev => [change, ...prev].slice(0, 8));
      onVibeChange(instruction, stems);
    },
    [committedValues, onVibeChange]
  );

  // Build feel summary
  const feelSummary = useMemo(() => {
    const parts = VIBE_DEFS
      .filter(v => {
        const val = committedValues[v.key as keyof VibeValues];
        return val < 30 || val > 70; // only mention notable values
      })
      .map(v => describeVibe(v.key, committedValues[v.key as keyof VibeValues]));
    
    if (parts.length === 0) return "Balanced across all dimensions";
    return parts.join(" · ");
  }, [committedValues]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col gap-5 p-6"
    >
      {/* Current feel summary */}
      <div className="rounded-lg bg-muted/20 border border-border/50 px-4 py-3 space-y-1.5">
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          Your track feels
        </span>
        <p className="text-[13px] font-medium text-foreground/80">{feelSummary}</p>
      </div>

      {/* Sliders */}
      {VIBE_DEFS.map((vibe, i) => {
        const currentVal = values[vibe.key as keyof VibeValues];
        const committedVal = committedValues[vibe.key as keyof VibeValues];
        const prevVal = previousValues?.[vibe.key as keyof VibeValues];
        const hasChanged = prevVal !== undefined && prevVal !== committedVal;

        return (
          <motion.div
            key={vibe.key}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05, duration: 0.3 }}
            className="space-y-1.5"
          >
            {/* Label row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm">{vibe.emoji}</span>
                <span
                  className="text-[12px] font-semibold uppercase tracking-wider"
                  style={{ color: vibe.color }}
                >
                  {vibe.label}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {/* Show before → after when changed */}
                <AnimatePresence mode="wait">
                  {hasChanged ? (
                    <motion.div
                      key="changed"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex items-center gap-1 text-[10px]"
                    >
                      <span className="text-muted-foreground/40 line-through">{describeVibe(vibe.key, prevVal!)}</span>
                      <ArrowRight size={9} className="text-muted-foreground/30" />
                      <span className="font-medium" style={{ color: vibe.color }}>{describeVibe(vibe.key, committedVal)}</span>
                    </motion.div>
                  ) : (
                    <motion.span
                      key="current"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-[10px] text-muted-foreground/50"
                    >
                      {describeVibe(vibe.key, committedVal)}
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Slider with ghost marker */}
            <div className="flex items-center gap-3">
              <span className="text-[10px] text-muted-foreground/40 w-12 text-right shrink-0">
                {vibe.low}
              </span>
              <div className="flex-1 relative">
                {/* Ghost marker showing previous position */}
                {hasChanged && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="absolute top-1/2 -translate-y-1/2 z-0 pointer-events-none"
                    style={{
                      left: `${prevVal}%`,
                      transform: `translateX(-50%) translateY(-50%)`,
                    }}
                  >
                    <div
                      className="w-2.5 h-2.5 rounded-full opacity-25 border border-current"
                      style={{ color: vibe.color }}
                    />
                  </motion.div>
                )}
                <Slider
                  value={[currentVal]}
                  min={0}
                  max={100}
                  step={1}
                  disabled={disabled}
                  onValueChange={([v]) => setValues(prev => ({ ...prev, [vibe.key]: v }))}
                  onValueCommit={([v]) => handleCommit(vibe.key, v)}
                  className="w-full relative z-10 [&_[data-radix-slider-track]]:h-1.5 [&_[data-radix-slider-track]]:bg-muted/40 [&_[data-radix-slider-range]]:bg-current [&_[data-radix-slider-thumb]]:h-3.5 [&_[data-radix-slider-thumb]]:w-3.5 [&_[data-radix-slider-thumb]]:border-2 [&_[data-radix-slider-thumb]]:shadow-lg"
                  style={{ color: vibe.color } as React.CSSProperties}
                />
              </div>
              <span className="text-[10px] text-muted-foreground/40 w-12 shrink-0">
                {vibe.high}
              </span>
            </div>
          </motion.div>
        );
      })}

      {/* Recent changes log */}
      <AnimatePresence>
        {recentChanges.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="space-y-2 pt-2 border-t border-border/30"
          >
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Recent changes
            </span>
            <div className="space-y-1.5 max-h-32 overflow-y-auto custom-scrollbar">
              {recentChanges.map((change, i) => (
                <motion.div
                  key={change.timestamp}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="flex items-center gap-2 text-[11px]"
                >
                  {change.to > change.from ? (
                    <TrendingUp size={11} className="text-secondary shrink-0" />
                  ) : (
                    <TrendingDown size={11} className="text-primary shrink-0" />
                  )}
                  <span className="text-foreground/70">{change.summary}</span>
                  <span className="text-muted-foreground/30 text-[9px] ml-auto font-mono">
                    {describeVibe(change.key, change.from)} → {describeVibe(change.key, change.to)}
                  </span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default VibesView;
