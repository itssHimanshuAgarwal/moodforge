import { History } from "lucide-react";

interface HistoryItemData {
  id: string;
  time: string;
  prompt: string;
  action: string;
  stemColor: string;
  stemName: string;
  status: "applied" | "pending" | "reverted";
}

const sampleHistory: HistoryItemData[] = [
  {
    id: "1",
    time: "14:20:05",
    prompt: "Make the drums punchier in the chorus",
    action: "Increased transient attack on drum stem, bars 33–48",
    stemColor: "#3b82f6",
    stemName: "Drums",
    status: "applied",
  },
  {
    id: "2",
    time: "14:18:32",
    prompt: "Soften the bass in the intro section",
    action: "Reduced low-end presence on bass stem, bars 1–16",
    stemColor: "#a855f7",
    stemName: "Bass",
    status: "applied",
  },
  {
    id: "3",
    time: "14:15:10",
    prompt: "Add reverb to the vocal bridge",
    action: "Applied hall reverb to vocal stem, bars 49–64",
    stemColor: "#ef4444",
    stemName: "Vocals",
    status: "reverted",
  },
];

const statusStyles: Record<string, string> = {
  applied: "bg-primary/15 text-primary",
  pending: "bg-secondary/15 text-secondary",
  reverted: "bg-muted text-muted-foreground line-through",
};

const HistoryPanel = ({ hasTrack }: { hasTrack: boolean }) => {
  return (
    <aside className="w-full h-full bg-card/40 backdrop-blur-xl flex flex-col border-l border-border">
      <div className="px-6 py-4 border-b border-border flex items-center gap-2">
        <History size={13} className="text-muted-foreground" />
        <span className="text-meta text-muted-foreground">Edit History</span>
      </div>
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-2.5">
        {hasTrack ? (
          sampleHistory.map((item) => (
            <div
              key={item.id}
              className="p-3.5 rounded-lg panel-surface space-y-2"
            >
              {/* Header: dot + stem + timestamp + status */}
              <div className="flex items-center gap-2">
                <div
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: item.stemColor }}
                />
                <span className="text-[10px] font-mono font-medium uppercase tracking-wider" style={{ color: item.stemColor }}>
                  {item.stemName}
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
              {/* User prompt */}
              <p className="text-[12px] text-foreground/60 leading-relaxed italic">
                "{item.prompt}"
              </p>
              {/* Parsed action */}
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                {item.action}
              </p>
            </div>
          ))
        ) : (
          <div className="flex items-center justify-center h-40">
            <p className="text-[11px] text-muted-foreground/50">
              Edits will appear here
            </p>
          </div>
        )}
      </div>
    </aside>
  );
};

export default HistoryPanel;
