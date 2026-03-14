import { Lock } from "lucide-react";
import { useMemo } from "react";

interface StemLaneProps {
  label: string;
  color: string;
}

const StemLane = ({ label, color }: StemLaneProps) => {
  // Generate a pseudo-random waveform pattern
  const bars = useMemo(() => {
    const count = 120;
    return Array.from({ length: count }, (_, i) => {
      const x = i / count;
      const h = Math.sin(x * Math.PI) * 0.6 + Math.sin(x * 7) * 0.2 + Math.sin(x * 13) * 0.1 + 0.1;
      return Math.max(0.08, Math.min(1, h));
    });
  }, []);

  return (
    <div className="h-20 w-full group flex gap-4">
      <div className="w-32 shrink-0 flex flex-col justify-center gap-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
            {label}
          </span>
          <Lock
            size={12}
            className="text-muted-foreground/40 hover:text-primary cursor-pointer transition-colors duration-150"
          />
        </div>
        <div className="flex gap-1">
          <button className="px-2 py-0.5 rounded bg-muted text-[9px] font-bold text-muted-foreground hover:bg-muted/80 hover:text-foreground transition-colors duration-150">
            S
          </button>
          <button className="px-2 py-0.5 rounded bg-muted text-[9px] font-bold text-muted-foreground hover:bg-muted/80 hover:text-foreground transition-colors duration-150">
            M
          </button>
        </div>
      </div>
      <div className="flex-1 rounded-md border border-border relative overflow-hidden bg-card/30 group-hover:bg-card/50 transition-colors duration-150">
        <div className="absolute inset-0 flex items-end justify-center gap-px px-2 py-3">
          {bars.map((h, i) => (
            <div
              key={i}
              className="flex-1 rounded-sm opacity-40 transition-opacity duration-150 group-hover:opacity-60"
              style={{
                height: `${h * 100}%`,
                backgroundColor: color,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default StemLane;
