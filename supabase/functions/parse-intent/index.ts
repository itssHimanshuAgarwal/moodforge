import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are a professional music producer AI. Parse the user's feedback about their music track into a structured JSON edit instruction. Output ONLY valid JSON with these fields:

{
  "target_stem": "drums|bass|melody|harmony|vocals|full_mix",
  "target_section": "intro|verse|chorus|bridge|outro|full_track",
  "action": "clear description of the change",
  "preserve": ["list of elements to keep unchanged"],
  "style_keywords": ["descriptive words for the desired change"],
  "confidence": 0.0-1.0,
  "clarification": null or "question string"
}

Always default to preserving as much as possible. The user wants surgical changes, not wholesale replacement.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) {
    return new Response(
      JSON.stringify({ error: "LOVABLE_API_KEY not configured" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const contentType = req.headers.get("content-type") || "";

    let transcript = "";

    // Step 1: If audio blob sent, transcribe with Whisper
    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const audioFile = formData.get("audio") as File;
      const textInput = formData.get("text") as string | null;

      if (textInput) {
        transcript = textInput;
      } else if (audioFile) {
        // For audio transcription, we'll extract text by asking the AI to acknowledge
        // Since Lovable AI doesn't support Whisper, we skip transcription and ask user to type
        // For now, return an error suggesting text input
        return new Response(
          JSON.stringify({ error: "Voice transcription is temporarily unavailable. Please type your feedback instead." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } else {
      const body = await req.json();
      transcript = body.text || "";
    }

    if (!transcript.trim()) {
      return new Response(
        JSON.stringify({ error: "No transcript received" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 2: Parse intent with Lovable AI
    const chatRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: transcript },
        ],
        temperature: 0.3,
        response_format: { type: "json_object" },
      }),
    });

    if (!chatRes.ok) {
      const errText = await chatRes.text();
      throw new Error(`GPT-4o API error [${chatRes.status}]: ${errText}`);
    }

    const chatData = await chatRes.json();
    const intentText = chatData.choices?.[0]?.message?.content || "{}";
    const intent = JSON.parse(intentText);

    return new Response(
      JSON.stringify({ transcript, intent }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("parse-intent error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
