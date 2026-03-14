import { createContext } from "react";
import type { StemState } from "@/hooks/use-audio-engine";
import type { StemVersion } from "@/lib/types";

export interface AudioEngineContextValue {
  isLoaded: boolean;
  isPlaying: boolean;
  isLoading: boolean;
  generationProgress: string | null;
  currentTime: number;
  duration: number;
  stems: StemState[];
  generationPrompt: string | null;
  hasSavedSession: boolean;
  savedSessionPrompt: string | null;

  loadDemo: () => Promise<void>;
  loadFromBlob: (blob: Blob, label?: string) => Promise<void>;
  generateTrack: (prompt: string) => Promise<void>;
  regenerateStem: (stemId: string, prompt: string, userFeedback?: string) => Promise<number>;
  restoreSession: () => Promise<void>;
  clearSavedSession: () => Promise<void>;
  play: () => void;
  pause: () => void;
  togglePlayPause: () => void;
  seek: (time: number) => void;
  skipForward: () => void;
  skipBack: () => void;
  toggleSolo: (stemId: string) => void;
  toggleMute: (stemId: string) => void;
  toggleLock: (stemId: string) => void;
  selectVersion: (stemId: string, versionIndex: number) => void;
  resetAllVersions: () => void;
  getActiveBuffer: (stem: StemState) => AudioBuffer | null;
  getActiveBlob: (stem: StemState) => Blob | null;
}

export const AudioEngineContext = createContext<AudioEngineContextValue | null>(null);
