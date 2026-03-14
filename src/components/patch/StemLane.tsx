import { Lock, Unlock } from "lucide-react";
import { useMemo, useState } from "react";

interface StemLaneProps {
  label: string;
  color: string;
  bgClass: string;
}

const StemLane = ({ label, color, bgClass }: StemLaneProps) => {
  const [isLocked, setIsLocked] = useState(false);
  const [isSolo, setIsSolo] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  const bars = useMemo(() => {
    const count = 140;
    return Array.from({ length: count }, (_, i) => {
      const x = i / count;
      const h =
        Math.sin(x * Math.PI) * 0.55 +
        Math.sin(x * 7.3) * 0.2 +
        Math.sin(x * 13.7) * 0.12 +
        Math.cos(x * 21) * 0.08 +
        0.08;
      return Math.max(0.06, Math.min(1, h));
    });
  }, []);

  return (
    <div className="h-12 w-full group flex gap-3 items-center">
      {/* Label + controls */}
      <div className="w-28 shrink-0 flex items-center gap-2">
        <span
          className="text-[11px] font-mono font-medium uppercase tracking-wider w-14 truncate"
          style={{ color }}
        >
          {label}
        </span>
        <div className="flex gap-1">
          <button
            onClick={() => setIsSolo(!isSolo)}
            className={`ctrl-btn ${isSolo ? "!bg-primary/20 !text-primary !border-primary/30" : ""}`}
          >
            S
          </button>
          <button
            onClick={() => setIsMuted(!isMuted)}
            className={`ctrl-btn ${isMuted ? "!bg-destructive/20 !text-destructive !border-destructive/30" : ""}`}
          >
            M
          </button>
        </div>
      </div>

      {/* Waveform area */}
      <div
        className={`flex-1 h-full rounded-md border border-border relative overflow-hidden ${bgClass} group-hover:brightness-125 transition-all duration-150`}
      >
        <div className="absolute inset-0 flex items-end justify-center gap-[1px] px-1.5 py-1.5">
          {bars.map((h, i) => (
            <div
              key={i}
              className={`flex-1 min-w-[1px] rounded-[0.5px] transition-opacity duration-150 ${
                isMuted ? "opacity-15" : "opacity-35 group-hover:opacity-50"
              }`}
              style={{
                height: `${h * 100}%`,
                backgroundColor: color,
              }}
            />
          ))}
        </div>
      </div>

      {/* Lock */}
      <button
        onClick={() => setIsLocked(!isLocked)}
        className="p-1 transition-colors duration-150"
      >
        {isLocked ? (
          <Lock
            size={13}
            className="text-patch-harmony"
            style={{ filter: "drop-shadow(0 0 4px rgba(245, 158, 11, 0.3))" }}
          />
        ) : (
          <Unlock size={13} className="text-muted-foreground/30 hover:text-muted-foreground transition-colors duration-150" />
        )}
      </button>
    </div>
  );
};

export default StemLane;
