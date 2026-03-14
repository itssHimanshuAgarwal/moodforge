import { Layers } from "lucide-react";

const TopBar = () => {
  return (
    <header className="h-12 border-b border-border flex flex-col shrink-0 bg-background/80 backdrop-blur-xl z-10 relative">
      <div className="flex-1 flex items-center justify-between px-6">
        <div className="flex items-baseline gap-3">
          <div className="flex items-center gap-2">
            <div
              className="w-2 h-2 rounded-full bg-green-500 shrink-0"
              style={{ animation: "pulseGlow 2s ease-in-out infinite" }}
            />
            <h1 className="text-[20px] font-[800] leading-none tracking-tighter uppercase gradient-text-brand">
              MoodForge
            </h1>
          </div>
          <span className="text-meta text-muted-foreground tracking-[0.15em]">
            Shape your sound
          </span>
        </div>
        <nav className="flex items-center gap-3">
          <span className="text-mono text-muted-foreground hover:text-foreground transition-colors duration-150 cursor-pointer select-none">
            PROJECT_01.WAV
          </span>
          <div className="h-3.5 w-px bg-border" />
          <button className="p-1.5 hover:bg-muted rounded-md transition-all duration-150 text-muted-foreground hover:text-foreground">
            <Layers size={16} />
          </button>
        </nav>
      </div>
      {/* Animated gradient line */}
      <div
        className="h-px w-full shrink-0"
        style={{
          background: "linear-gradient(90deg, hsl(187 82% 53%), hsl(271 91% 65%), hsl(187 82% 53%))",
          backgroundSize: "200% 100%",
          animation: "headerLineShift 6s ease infinite",
          opacity: 0.4,
        }}
      />
    </header>
  );
};

export default TopBar;