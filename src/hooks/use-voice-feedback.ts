import { useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { EditIntent, VoiceState } from "@/lib/types";
import { toast } from "@/hooks/use-toast";

interface UseVoiceFeedbackReturn {
  voiceState: VoiceState;
  transcript: string | null;
  intent: EditIntent | null;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  submitText: (text: string) => Promise<void>;
  reset: () => void;
}

export function useVoiceFeedback(): UseVoiceFeedbackReturn {
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [transcript, setTranscript] = useState<string | null>(null);
  const [intent, setIntent] = useState<EditIntent | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const reset = useCallback(() => {
    setVoiceState("idle");
    setTranscript(null);
    setIntent(null);
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
  }, []);

  const processAudio = useCallback(async (audioBlob: Blob) => {
    setVoiceState("transcribing");

    try {
      const formData = new FormData();
      formData.append("audio", audioBlob, "recording.webm");

      const { data, error } = await supabase.functions.invoke("parse-intent", {
        body: formData,
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setTranscript(data.transcript);
      setVoiceState("parsing");

      // Small delay to show parsing state
      await new Promise((r) => setTimeout(r, 400));

      setIntent(data.intent);
      setVoiceState("done");
    } catch (err) {
      console.error("Voice feedback error:", err);
      toast({
        title: "Couldn't understand that",
        description: "Try again or type your feedback instead.",
        variant: "destructive",
      });
      setVoiceState("error");
      setTimeout(() => setVoiceState("idle"), 2000);
    }
  }, []);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
          ? "audio/webm;codecs=opus"
          : "audio/webm",
      });

      chunksRef.current = [];
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        if (blob.size > 0) {
          processAudio(blob);
        }
      };

      mediaRecorder.start(250); // Collect in 250ms chunks
      setVoiceState("recording");

      // Auto-stop after 15 seconds
      silenceTimerRef.current = setTimeout(() => {
        if (mediaRecorderRef.current?.state === "recording") {
          mediaRecorderRef.current.stop();
        }
      }, 15000);
    } catch (err) {
      console.error("Microphone access error:", err);
      toast({
        title: "Microphone unavailable",
        description: "Please allow microphone access or type your feedback.",
        variant: "destructive",
      });
    }
  }, [processAudio]);

  const stopRecording = useCallback(() => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
  }, []);

  const submitText = useCallback(
    async (text: string) => {
      if (!text.trim()) return;
      setTranscript(text);
      setVoiceState("parsing");

      try {
        const { data, error } = await supabase.functions.invoke("parse-intent", {
          body: { text },
        });

        if (error) throw error;
        if (data?.error) throw new Error(data.error);

        setTranscript(data.transcript || text);
        setIntent(data.intent);
        setVoiceState("done");
      } catch (err) {
        console.error("Text feedback error:", err);
        toast({
          title: "Couldn't parse that",
          description: "Try rephrasing your feedback.",
          variant: "destructive",
        });
        setVoiceState("error");
        setTimeout(() => setVoiceState("idle"), 2000);
      }
    },
    []
  );

  return {
    voiceState,
    transcript,
    intent,
    startRecording,
    stopRecording,
    submitText,
    reset,
  };
}
