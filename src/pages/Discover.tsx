import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import MoodForgeExplorer from "@/components/moodforge/MoodForgeExplorer";
import { AudioEngineProvider, useAudioEngine } from "@/hooks/use-audio-engine";
import { toast } from "@/hooks/use-toast";

const DiscoverContent = () => {
  const { generateTrack } = useAudioEngine();
  const navigate = useNavigate();
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = useCallback(async (prompt: string) => {
    if (isGenerating) return;
    setIsGenerating(true);
    try {
      await generateTrack(prompt);
      toast({ title: "Track generated!", description: "Redirecting to the editor..." });
      navigate("/");
    } catch (err) {
      console.error(err);
      toast({
        title: "Generation failed",
        description: "Try a different emotional profile or upload a file instead.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  }, [isGenerating, generateTrack, navigate]);

  return (
    <div className="h-svh w-full bg-background text-foreground font-sans flex flex-col overflow-hidden">
      <MoodForgeExplorer
        onGenerateWithPrompt={handleGenerate}
        isGenerating={isGenerating}
      />
    </div>
  );
};

const Discover = () => (
  <AudioEngineProvider>
    <DiscoverContent />
  </AudioEngineProvider>
);

export default Discover;
