import { motion } from "framer-motion";
import { Layers, Sparkles } from "lucide-react";

export type ViewMode = "stems" | "vibes";

interface ViewToggleProps {
  mode: ViewMode;
  onChange: (mode: ViewMode) => void;
}

const ViewToggle = ({ mode, onChange }: ViewToggleProps) => {
  return (
    <div className="inline-flex items-center rounded-lg bg-muted/30 border border-border p-0.5 gap-0.5">
      {([
        { key: "stems" as const, label: "Stems", icon: Layers },
        { key: "vibes" as const, label: "Vibes", icon: Sparkles },
      ]).map(({ key, label, icon: Icon }) => (
        <button
          key={key}
          onClick={() => onChange(key)}
          className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-semibold uppercase tracking-wider transition-colors duration-150 ${
            mode === key ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {mode === key && (
            <motion.div
              layoutId="view-toggle-bg"
              className="absolute inset-0 rounded-md bg-primary"
              transition={{ type: "spring", stiffness: 500, damping: 35 }}
            />
          )}
          <span className="relative z-10 flex items-center gap-1.5">
            <Icon size={12} />
            {label}
          </span>
        </button>
      ))}
    </div>
  );
};

export default ViewToggle;
