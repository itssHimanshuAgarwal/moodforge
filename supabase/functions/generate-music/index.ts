import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const STEM_PROMPT_MAP: Record<string, (base: string) => string> = {
  drums: (base) =>
    `Drums and percussion only, no melody or harmony instruments. Isolated drum track for: ${base}. Only kick, snare, hi-hats, cymbals, and percussion elements.`,
  bass: (base) =>
    `Bass line only, no drums or melody. Isolated bass track for: ${base}. Deep, rhythmic bass guitar or synth bass part only.`,
  melody: (base) =>
    `Lead melody only, no drums or bass. Isolated melody track for: ${base}. Single melodic instrument playing the main theme or lead line.`,
  harmony: (base) =>
    `Harmony and chords only, no drums, bass or lead melody. Isolated harmony/pad track for: ${base}. Chords, pads, and harmonic backing elements only.`,
  vocals: (base) =>
    `Vocal melody or vocal-style synth only, no instruments. Isolated vocal-like track for: ${base}. Ethereal vocals, vocal chops, or vocal synth sounds.`,
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");
  if (!ELEVENLABS_API_KEY) {
    return new Response(
      JSON.stringify({ error: "ELEVENLABS_API_KEY not configured" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const { prompt, duration_seconds, stem_type } = await req.json();

    if (!prompt?.trim()) {
      return new Response(
        JSON.stringify({ error: "Prompt is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const finalPromptRaw = stem_type && STEM_PROMPT_MAP[stem_type]
      ? STEM_PROMPT_MAP[stem_type](prompt)
      : prompt;

    const sanitizePrompt = (value: string) =>
      value
        .replace(/["“”]/g, "")
        .replace(/\s+/g, " ")
        .trim();

    const finalPrompt = sanitizePrompt(finalPromptRaw);

    const callMusicApi = (musicPrompt: string) =>
      fetch("https://api.elevenlabs.io/v1/music", {
        method: "POST",
        headers: {
          "xi-api-key": ELEVENLABS_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: musicPrompt,
          duration_seconds: duration_seconds || 30,
        }),
      });

    console.log(`Generating music [${stem_type || "full"}]: "${finalPrompt}" (${duration_seconds || 30}s)`);

    let response = await callMusicApi(finalPrompt);

    if (!response.ok) {
      let errText = await response.text();
      let parsedErr: any = null;
      try {
        parsedErr = JSON.parse(errText);
      } catch {
        // no-op: keep raw text fallback
      }

      const isBadPrompt =
        response.status === 400 &&
        (parsedErr?.detail?.status === "bad_prompt" || errText.toLowerCase().includes("bad_prompt"));

      const promptSuggestion = parsedErr?.detail?.data?.prompt_suggestion;
      if (isBadPrompt && typeof promptSuggestion === "string" && promptSuggestion.trim()) {
        const retryPrompt = sanitizePrompt(promptSuggestion);
        console.warn("Prompt flagged as bad_prompt, retrying with ElevenLabs prompt_suggestion...");
        response = await callMusicApi(retryPrompt);

        if (!response.ok) {
          errText = await response.text();
          parsedErr = null;
          try {
            parsedErr = JSON.parse(errText);
          } catch {
            // no-op
          }
        }
      }

      if (!response.ok) {
        console.error(`ElevenLabs API error [${response.status}]: ${errText}`);
        const normalizedError = errText.toLowerCase();

        if (response.status === 429 || normalizedError.includes("concurrent_limit_exceeded")) {
          return new Response(
            JSON.stringify({
              error: "Rate limit reached: too many concurrent generation requests. Please retry in a few seconds.",
            }),
            { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        if ((response.status === 401 && normalizedError.includes("insufficient_credits")) || normalizedError.includes("payment_required")) {
          return new Response(
            JSON.stringify({
              error: "Insufficient credits for music generation. Please top up your ElevenLabs account.",
            }),
            { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        if (response.status === 400 && parsedErr?.detail?.message) {
          return new Response(
            JSON.stringify({ error: parsedErr.detail.message }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        return new Response(
          JSON.stringify({ error: `ElevenLabs API error [${response.status}]` }),
          { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const audioBuffer = await response.arrayBuffer();

    return new Response(audioBuffer, {
      headers: {
        ...corsHeaders,
        "Content-Type": "audio/mpeg",
        "Content-Length": audioBuffer.byteLength.toString(),
      },
    });
  } catch (error: unknown) {
    console.error("generate-music error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
