import { useEffect, useState } from "react";
import { Keyboard } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const shortcuts = [
  { key: "Space", action: "Play / Pause" },
  { key: "M", action: "Toggle mic" },
  { key: "1–5", action: "Solo stem" },
  { key: "Esc", action: "Dismiss edit" },
];

interface KeyboardShortcutsProps {
  onTogglePlayPause: () => void;
  onToggleMic: () => void;
  onSoloStem: (index: number) => void;
  onDismissEdit: () => void;
}

export function useKeyboardShortcuts({
  onTogglePlayPause,
  onToggleMic,
  onSoloStem,
  onDismissEdit,
}: KeyboardShortcutsProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input/textarea
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;

      switch (e.code) {
        case "Space":
          e.preventDefault();
          onTogglePlayPause();
          break;
        case "KeyM":
          e.preventDefault();
          onToggleMic();
          break;
        case "Escape":
          onDismissEdit();
          break;
        case "Digit1":
        case "Digit2":
        case "Digit3":
        case "Digit4":
        case "Digit5":
          e.preventDefault();
          onSoloStem(parseInt(e.code.replace("Digit", "")) - 1);
          break;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onTogglePlayPause, onToggleMic, onSoloStem, onDismissEdit]);
}

export function ShortcutsHint() {
  const [show, setShow] = useState(false);

  return (
    <div className="fixed bottom-3 right-3 z-40">
      <button
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        className="w-7 h-7 rounded-md bg-muted/60 border border-border flex items-center justify-center text-muted-foreground/40 hover:text-muted-foreground transition-colors duration-150"
      >
        <Keyboard size={14} />
      </button>
      <AnimatePresence>
        {show && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute bottom-full right-0 mb-2 panel-surface rounded-lg p-3 min-w-[160px] shadow-xl backdrop-blur-xl"
          >
            <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Shortcuts</p>
            <div className="space-y-1.5">
              {shortcuts.map((s) => (
                <div key={s.key} className="flex items-center justify-between gap-4">
                  <span className="text-[10px] text-muted-foreground">{s.action}</span>
                  <kbd className="text-[9px] font-mono bg-muted/60 border border-border rounded px-1.5 py-0.5 text-foreground/60">
                    {s.key}
                  </kbd>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
