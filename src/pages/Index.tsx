import { useState, useCallback } from "react";
import TopBar from "@/components/patch/TopBar";
import MainStage from "@/components/patch/MainStage";
import HistoryPanel from "@/components/patch/HistoryPanel";
import TransportBar from "@/components/patch/TransportBar";
import { useAudioEngine } from "@/hooks/use-audio-engine";
import { useVoiceFeedback } from "@/hooks/use-voice-feedback";
import { useKeyboardShortcuts, ShortcutsHint } from "@/components/patch/KeyboardShortcuts";
import { playClick, playChime, playPop } from "@/lib/ui-sounds";
import type { EditHistoryItem } from "@/lib/types";
import { STEM_COLOR_MAP } from "@/lib/types";
import { toast } from "@/hooks/use-toast";

const IndexContent = () => {
  const { isLoaded, regenerateStem, generationPrompt, stems, selectVersion, resetAllVersions, togglePlayPause, toggleSolo } = useAudioEngine();
  const {
    voiceState, transcript, intent,
    startRecording, stopRecording, submitText, reset,
  } = useVoiceFeedback();

  const [history, setHistory] = useState<EditHistoryItem[]>([]);
  const [isRegenerating, setIsRegenerating] = useState(false);

  const handleMicClick = useCallback(() => {
    playClick();
    if (voiceState === "recording") {
      stopRecording();
    } else if (voiceState === "idle" || voiceState === "done" || voiceState === "error") {
      reset();
      startRecording();
      toast({ title: "Voice recording started", description: "Speak your edit instruction." });
    }
  }, [voiceState, startRecording, stopRecording, reset]);

  const handleTextSubmit = useCallback(
    (text: string) => {
      reset();
      submitText(text);
    },
    [submitText, reset]
  );

  const handleApplyEdit = useCallback(async () => {
    if (!intent || !transcript) return;

    // Normalize GPT output: lowercase, trim, handle variations
    const rawTarget = (intent.target_stem || "full_mix").toLowerCase().trim();
    
    // Fuzzy match: GPT might return "bass guitar", "vocal", "drums/percussion", etc.
    const STEM_ALIASES: Record<string, string> = {
      drums: "drums", drum: "drums", percussion: "drums", kick: "drums", snare: "drums", hihat: "drums",
      bass: "bass", "bass guitar": "bass", "bass line": "bass", bassline: "bass", sub: "bass",
      melody: "melody", lead: "melody", "lead synth": "melody", synth: "melody", piano: "melody",
      harmony: "harmony", chords: "harmony", pad: "harmony", pads: "harmony", keys: "harmony",
      vocals: "vocals", vocal: "vocals", voice: "vocals", singing: "vocals", vox: "vocals",
      full_mix: "full_mix", full: "full_mix", mix: "full_mix", master: "full_mix", everything: "full_mix",
    };
    
    // Try exact match first, then alias lookup, then fuzzy substring match
    let normalizedTarget = STEM_ALIASES[rawTarget] || rawTarget;
    if (!stems.find(s => s.id === normalizedTarget)) {
      // Try substring matching: "bass guitar" contains "bass"
      const fuzzyMatch = Object.entries(STEM_ALIASES).find(([alias]) => rawTarget.includes(alias));
      if (fuzzyMatch) normalizedTarget = fuzzyMatch[1];
    }
    
    const stemInfo = STEM_COLOR_MAP[normalizedTarget] || STEM_COLOR_MAP.full_mix;
    const now = new Date();
    const timeStr = now.toTimeString().slice(0, 8);

    const matchedStem = stems.find(s => s.id === normalizedTarget);
    const targetStemId = matchedStem?.id || stems[0]?.id || "full_mix";
    
    console.log("[Edit] GPT target_stem:", intent.target_stem, "→ resolved:", targetStemId);

    const basePrompt = generationPrompt || "music track";
    const regenPrompt = [
      intent.action,
      ...intent.style_keywords,
      `matching the style of: ${basePrompt}`,
      `for the ${stemInfo.label.toLowerCase()} part`,
    ].join(", ");

    const targetStem = stems.find(s => s.id === targetStemId);
    const nextVersion = (targetStem?.versions.length ?? 0) + 1;

    const entry: EditHistoryItem = {
      id: `edit-${Date.now()}`,
      time: timeStr,
      prompt: transcript,
      action: intent.action,
      stemColor: stemInfo.color,
      stemName: stemInfo.label,
      stemId: targetStemId,
      versionNumber: nextVersion,
      status: "pending",
      intent,
    };
    setHistory((prev) => [entry, ...prev]);

    setIsRegenerating(true);
    try {
      const actualVersion = await regenerateStem(targetStemId, regenPrompt, transcript);
      playChime();
      setHistory((prev) =>
        prev.map((h) => h.id === entry.id ? { ...h, status: "applied", versionNumber: actualVersion } : h)
      );
      toast({
        title: `Edit applied — ${stemInfo.label.toLowerCase()} v${actualVersion} created`,
        description: intent.action,
      });
      reset();
    } catch (err) {
      console.error("Stem regeneration failed:", err);
      toast({
        title: "Couldn't generate stem",
        description: err instanceof Error ? err.message : "Try a different description.",
        variant: "destructive",
      });
      setHistory((prev) =>
        prev.map((h) => h.id === entry.id ? { ...h, status: "reverted" } : h)
      );
    } finally {
      setIsRegenerating(false);
    }
  }, [intent, transcript, reset, regenerateStem, generationPrompt, stems]);

  const handleRetryEdit = useCallback(() => {
    reset();
  }, [reset]);

  const handleRevert = useCallback((entry: EditHistoryItem) => {
    playPop();
    const stem = stems.find(s => s.id === entry.stemId);
    if (stem && stem.activeVersionIndex > 0) {
      selectVersion(entry.stemId, stem.activeVersionIndex - 1);
    }
  }, [stems, selectVersion]);

  const handleResetAll = useCallback(() => {
    playPop();
    resetAllVersions();
  }, [resetAllVersions]);

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onTogglePlayPause: togglePlayPause,
    onToggleMic: handleMicClick,
    onSoloStem: (index) => {
      if (stems[index]) toggleSolo(stems[index].id);
    },
    onDismissEdit: handleRetryEdit,
  });

  // Handle vibe slider changes → feed into same edit pipeline as text/voice
  const handleVibeChange = useCallback(async (instruction: string, affectedStems: string[]) => {
    if (!isLoaded) return;
    // Use the first affected stem as the primary target
    const primaryStem = affectedStems[0] || "full_mix";
    
    // Submit the instruction through the text pipeline
    reset();
    submitText(instruction);
  }, [isLoaded, reset, submitText]);

  const showIntent = voiceState === "done" ? intent : null;
  const showTranscript = voiceState === "done" ? transcript : null;

  return (
    <div className="h-svh w-full bg-background text-foreground font-sans flex flex-col overflow-hidden selection:bg-primary/30">
      <TopBar />
      <main className="flex-1 flex overflow-hidden">
        <div className="w-[70%] flex flex-col">
          <MainStage
            editIntent={showIntent}
            editTranscript={showTranscript}
            onApplyEdit={handleApplyEdit}
            onRetryEdit={handleRetryEdit}
            onVibeChange={handleVibeChange}
          />
        </div>
        <div className="w-[30%]">
          <HistoryPanel
            hasTrack={isLoaded}
            history={history}
            onRevert={handleRevert}
            onResetAll={handleResetAll}
          />
        </div>
      </main>
      <TransportBar
        voiceState={voiceState}
        transcript={voiceState === "recording" ? null : transcript}
        onMicClick={handleMicClick}
        onTextSubmit={handleTextSubmit}
      />
      <ShortcutsHint />
    </div>
  );
};

const Index = () => <IndexContent />;

export default Index;
