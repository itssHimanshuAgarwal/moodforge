import { Layers } from "lucide-react";

const TopBar = () => {
  return (
    <header className="h-12 border-b border-border flex items-center justify-between px-6 shrink-0 bg-background/80 backdrop-blur-xl z-10">
      <div className="flex items-baseline gap-3">
        <h1 className="text-title text-foreground uppercase">Patch</h1>
        <span className="text-meta text-muted-foreground tracking-[0.15em]">
          Fix what you mean
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
    </header>
  );
};

export default TopBar;
