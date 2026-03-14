import { History, RotateCcw } from "lucide-react";
import type { EditHistoryItem } from "@/lib/types";

const statusStyles: Record<string, string> = {
  applied: "bg-primary/15 text-primary",
  pending: "bg-secondary/15 text-secondary",
  reverted: "bg-muted text-muted-foreground line-through",
};

interface HistoryPanelProps {
  hasTrack: boolean;
  history: EditHistoryItem[];
  onRevert?: (entry: EditHistoryItem) => void;
  onResetAll?: () => void;
}

const HistoryPanel = ({ hasTrack, history, onRevert, onResetAll }: HistoryPanelProps) => {
  return (
    <aside className="w-full h-full bg-card/40 backdrop-blur-xl flex flex-col border-l border-border">
      <div className="px-6 py-4 border-b border-border flex items-center gap-2">
        <History size={13} className="text-muted-foreground" />
        <span className="text-meta text-muted-foreground">Edit History</span>
        {history.length > 0 && (
          <span className="text-[10px] text-muted-foreground/50 ml-auto font-mono">
            {history.length}
          </span>
        )}
        {history.length > 0 && onResetAll && (
          <button
            onClick={onResetAll}
            className="ml-2 text-[9px] px-2 py-0.5 rounded border border-border text-muted-foreground hover:text-foreground hover:border-foreground/20 transition-colors duration-150 font-medium uppercase tracking-wider"
          >
            Reset All
          </button>
        )}
      </div>
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-2.5">
        {hasTrack && history.length > 0 ? (
          history.map((item) => (
            <div
              key={item.id}
              className="p-3.5 rounded-lg panel-surface space-y-2 cursor-pointer hover:bg-muted/20 transition-colors duration-150"
            >
              <div className="flex items-center gap-2">
                <div
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: item.stemColor }}
                />
                <span
                  className="text-[10px] font-mono font-medium uppercase tracking-wider"
                  style={{ color: item.stemColor }}
                >
                  {item.stemName}
                </span>
                <span
                  className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded"
                  style={{ color: item.stemColor, backgroundColor: `${item.stemColor}15` }}
                >
                  v{item.versionNumber}
                </span>
                <span className="flex-1" />
                <span className="text-mono text-muted-foreground/60">
                  {item.time}
                </span>
                <span
                  className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-tight ${statusStyles[item.status]}`}
                >
                  {item.status}
                </span>
              </div>
              <p className="text-[12px] text-foreground/60 leading-relaxed italic">
                "{item.prompt}"
              </p>
              <div className="flex items-center justify-between">
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  {item.action}
                </p>
                {item.status === "applied" && onRevert && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onRevert(item); }}
                    className="flex items-center gap-1 text-[9px] text-muted-foreground/50 hover:text-foreground transition-colors duration-150"
                  >
                    <RotateCcw size={10} />
                    Revert
                  </button>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="flex items-center justify-center h-40">
            <p className="text-[11px] text-muted-foreground/50">
              {hasTrack ? "Speak or type feedback to start editing" : "Edits will appear here"}
            </p>
          </div>
        )}
      </div>
    </aside>
  );
};

export default HistoryPanel;
