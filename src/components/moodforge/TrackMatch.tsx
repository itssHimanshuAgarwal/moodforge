/**
 * Shows the nearest matching track based on GEMS cursor position.
 */
import { motion, AnimatePresence } from "framer-motion";
import { Music, Info } from "lucide-react";
import {
  GEMS_KEYS, GEMS_LABELS, GEMS_COLORS,
  type GemsKey, type GemsTrack,
} from "@/lib/gems-data";

interface TrackMatchProps {
  track: GemsTrack | null;
  distance: number;
}

export default function TrackMatch({ track, distance }: TrackMatchProps) {
  if (!track) {
    return (
      <div className="p-4 text-center text-muted-foreground text-sm">
        Drag any dot to find a matching track
      </div>
    );
  }

  // Top 3 GEMS dimensions for this track
  const topGems = GEMS_KEYS
    .map(k => ({ key: k, val: track.gems[k] }))
    .sort((a, b) => b.val - a.val)
    .slice(0, 3);

  const matchPct = Math.max(0, Math.round((1 - distance) * 100));

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={track.id}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.2 }}
        className="p-4 space-y-3"
      >
        {/* Track info */}
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
            <Music size={18} className="text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-semibold text-sm text-foreground truncate">{track.title}</div>
            <div className="text-xs text-muted-foreground truncate">
              {track.artist} · {track.genre}
            </div>
          </div>
          <div className="shrink-0 px-2 py-1 rounded-full bg-primary/10 border border-primary/20">
            <span className="text-[10px] font-bold text-primary">{matchPct}% match</span>
          </div>
        </div>

        {/* GEMS bars */}
        <div className="space-y-1.5">
          {topGems.map(({ key, val }) => (
            <div key={key} className="flex items-center gap-2">
              <span className="text-[10px] w-24 text-muted-foreground truncate">{GEMS_LABELS[key]}</span>
              <div className="flex-1 h-1.5 bg-muted/30 rounded-full overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: GEMS_COLORS[key] }}
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.round(val * 100)}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
              <span className="text-[10px] font-mono text-muted-foreground w-8 text-right">
                {(val * 100).toFixed(0)}%
              </span>
            </div>
          ))}
        </div>

        {/* Musical details */}
        <div className="flex gap-2 flex-wrap">
          {[
            track.tempo && `${Math.round(track.tempo)} BPM`,
            track.key && track.mode && `${track.key} ${track.mode}`,
            track.genre,
          ].filter(Boolean).map((tag, i) => (
            <span key={i} className="px-2 py-0.5 rounded-md bg-muted/40 border border-border/50 text-[10px] text-muted-foreground">
              {tag}
            </span>
          ))}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
