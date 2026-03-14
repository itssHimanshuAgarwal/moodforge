export interface EditIntent {
  target_stem: string;
  target_section: string;
  action: string;
  preserve: string[];
  style_keywords: string[];
  confidence: number;
  clarification: string | null;
}

export interface EditHistoryItem {
  id: string;
  time: string;
  prompt: string;
  action: string;
  stemColor: string;
  stemName: string;
  status: "applied" | "pending" | "reverted";
  intent: EditIntent;
}

export type VoiceState = "idle" | "recording" | "transcribing" | "parsing" | "done" | "error";

export type ABMode = "original" | "edited";

// Map stem IDs to their display properties
export const STEM_COLOR_MAP: Record<string, { color: string; label: string }> = {
  drums: { color: "#3b82f6", label: "Drums" },
  bass: { color: "#a855f7", label: "Bass" },
  melody: { color: "#22c55e", label: "Melody" },
  harmony: { color: "#f59e0b", label: "Harmony" },
  vocals: { color: "#ef4444", label: "Vocals" },
  full_mix: { color: "#6366f1", label: "Full Mix" },
};
