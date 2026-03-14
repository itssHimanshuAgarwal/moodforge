import { useState } from "react";
import TopBar from "@/components/patch/TopBar";
import MainStage from "@/components/patch/MainStage";
import HistoryPanel from "@/components/patch/HistoryPanel";
import TransportBar from "@/components/patch/TransportBar";
import { AudioEngineProvider, useAudioEngine } from "@/hooks/use-audio-engine";

const IndexContent = () => {
  const [isRecording, setIsRecording] = useState(false);
  const { isLoaded } = useAudioEngine();

  return (
    <div className="h-svh w-full bg-background text-foreground font-sans flex flex-col overflow-hidden selection:bg-primary/30">
      <TopBar />
      <main className="flex-1 flex overflow-hidden">
        <div className="w-[70%] flex flex-col">
          <MainStage />
        </div>
        <div className="w-[30%]">
          <HistoryPanel hasTrack={isLoaded} />
        </div>
      </main>
      <TransportBar
        isRecording={isRecording}
        onToggleRecording={() => setIsRecording(!isRecording)}
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
