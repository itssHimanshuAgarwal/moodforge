import { History } from "lucide-react";

interface HistoryItemData {
  id: string;
  time: string;
  prompt: string;
  status: "applied" | "pending" | "reverted";
}

const sampleHistory: HistoryItemData[] = [
  {
    id: "1",
    time: "14:20:05",
    prompt: "Make the drums punchier in the chorus",
    status: "applied",
  },
  {
    id: "2",
    time: "14:18:32",
    prompt: "Soften the bass in the intro section",
    status: "applied",
  },
  {
    id: "3",
    time: "14:15:10",
    prompt: "Add reverb to the vocal bridge",
    status: "reverted",
  },
];

const statusColors: Record<string, string> = {
  applied: "bg-primary/20 text-primary",
  pending: "bg-secondary/20 text-secondary",
  reverted: "bg-muted text-muted-foreground",
};

const HistoryPanel = ({ hasTrack }: { hasTrack: boolean }) => {
  return (
    <aside className="w-full h-full bg-card/50 backdrop-blur-xl flex flex-col border-l border-border">
      <div className="p-4 border-b border-border flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
        <History size={14} />
        Edit History
      </div>
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3">
        {hasTrack ? (
          sampleHistory.map((item) => (
            <div
              key={item.id}
              className="p-3 rounded-lg bg-muted/30 border border-border space-y-2 backdrop-blur-sm"
            >
              <div className="flex justify-between items-center">
                <span className="font-mono text-[10px] text-muted-foreground">
                  {item.time}
                </span>
                <span
                  className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-tighter ${statusColors[item.status]}`}
                >
                  {item.status}
                </span>
              </div>
              <p className="text-xs text-foreground/70 leading-relaxed italic">
                "{item.prompt}"
              </p>
            </div>
          ))
        ) : (
          <div className="flex-1 flex items-center justify-center h-full">
            <p className="text-xs text-muted-foreground text-center">
              Edits will appear here
            </p>
          </div>
        )}
      </div>
    </aside>
  );
};

export default HistoryPanel;
