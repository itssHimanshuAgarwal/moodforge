import { useState, useCallback } from "react";
import TopBar from "@/components/patch/TopBar";
import MainStage from "@/components/patch/MainStage";
import HistoryPanel from "@/components/patch/HistoryPanel";
import TransportBar from "@/components/patch/TransportBar";
import { AudioEngineProvider, useAudioEngine } from "@/hooks/use-audio-engine";
import { useVoiceFeedback } from "@/hooks/use-voice-feedback";
import type { EditHistoryItem } from "@/lib/types";
import { STEM_COLOR_MAP } from "@/lib/types";

const IndexContent = () => {
  const { isLoaded } = useAudioEngine();
  const {
    voiceState, transcript, intent,
    startRecording, stopRecording, submitText, reset,
  } = useVoiceFeedback();

  const [history, setHistory] = useState<EditHistoryItem[]>([]);

  const handleMicClick = useCallback(() => {
    if (voiceState === "recording") {
      stopRecording();
    } else if (voiceState === "idle" || voiceState === "done" || voiceState === "error") {
      reset();
      startRecording();
    }
  }, [voiceState, startRecording, stopRecording, reset]);

  const handleTextSubmit = useCallback(
    (text: string) => {
      reset();
      submitText(text);
    },
    [submitText, reset]
  );

  const handleApplyEdit = useCallback(() => {
    if (!intent || !transcript) return;

    const stemInfo = STEM_COLOR_MAP[intent.target_stem] || STEM_COLOR_MAP.full_mix;
    const now = new Date();
    const timeStr = now.toTimeString().slice(0, 8);

    const entry: EditHistoryItem = {
      id: `edit-${Date.now()}`,
      time: timeStr,
      prompt: transcript,
      action: intent.action,
      stemColor: stemInfo.color,
      stemName: stemInfo.label,
      status: "applied",
      intent,
    };

    setHistory((prev) => [entry, ...prev]);
    reset();
  }, [intent, transcript, reset]);

  const handleRetryEdit = useCallback(() => {
    reset();
  }, [reset]);

  // Only show intent card when in "done" state
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
          />
        </div>
        <div className="w-[30%]">
          <HistoryPanel hasTrack={isLoaded} history={history} />
        </div>
      </main>
      <TransportBar
        voiceState={voiceState}
        transcript={voiceState === "recording" ? null : transcript}
        onMicClick={handleMicClick}
        onTextSubmit={handleTextSubmit}
      />
    </div>
  );
};

const Index = () => (
  <AudioEngineProvider>
    <IndexContent />
  </AudioEngineProvider>
);

export default Index;
