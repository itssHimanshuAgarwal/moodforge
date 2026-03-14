import { Layers } from "lucide-react";

const TopBar = () => {
  return (
    <header className="h-14 border-b border-border flex items-center justify-between px-6 shrink-0 bg-background">
      <div className="flex items-baseline gap-3">
        <h1 className="text-lg font-bold tracking-tighter text-foreground uppercase">
          Patch
        </h1>
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-widest">
          Fix what you mean
        </span>
      </div>
      <nav className="flex items-center gap-4">
        <button className="text-xs font-mono text-muted-foreground hover:text-foreground transition-colors duration-150">
          PROJECT_01.WAV
        </button>
        <div className="h-4 w-px bg-border" />
        <button className="p-2 hover:bg-muted rounded-md transition-all duration-150 text-muted-foreground hover:text-foreground">
          <Layers size={18} />
        </button>
      </nav>
    </header>
  );
};

export default TopBar;
