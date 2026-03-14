import { useState } from "react";
import TopBar from "@/components/patch/TopBar";
import MainStage from "@/components/patch/MainStage";
import HistoryPanel from "@/components/patch/HistoryPanel";
import TransportBar from "@/components/patch/TransportBar";

const Index = () => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

  return (
    <div className="h-svh w-full bg-background text-foreground font-sans flex flex-col overflow-hidden selection:bg-primary/30">
      <TopBar />

      <main className="flex-1 flex overflow-hidden">
        <div className="w-[70%] flex flex-col">
          <MainStage isLoaded={isLoaded} onGenerate={() => setIsLoaded(true)} />
        </div>
        <div className="w-[30%]">
          <HistoryPanel hasTrack={isLoaded} />
        </div>
      </main>

      <TransportBar
        isRecording={isRecording}
        onToggleRecording={() => setIsRecording(!isRecording)}
        hasTrack={isLoaded}
      />
    </div>
  );
};

export default Index;
