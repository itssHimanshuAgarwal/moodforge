/**
 * Edge function to receive FMA track metadata (batch) and store in fma_tracks table.
 * Audio files are uploaded separately to the fma-audio storage bucket.
 * 
 * POST /upload-tracks
 * Body: { tracks: Array<{ fma_track_id, title, artist, genre, gems, valence, arousal, tempo, key, mode, prompt_fragment }> }
 * 
 * For audio upload:
 * POST /upload-tracks?action=audio
 * Body: FormData with field "file" (MP3) and "fma_track_id"
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    if (action === "audio") {
      // Handle audio file upload
      const formData = await req.formData();
      const file = formData.get("file") as File;
      const fmaTrackId = formData.get("fma_track_id") as string;

      if (!file || !fmaTrackId) {
        return new Response(
          JSON.stringify({ error: "Missing file or fma_track_id" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const filePath = `tracks/${fmaTrackId}.mp3`;
      const arrayBuffer = await file.arrayBuffer();

      const { error: uploadError } = await supabase.storage
        .from("fma-audio")
        .upload(filePath, arrayBuffer, {
          contentType: "audio/mpeg",
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // Update track record with audio path
      const { error: updateError } = await supabase
        .from("fma_tracks")
        .update({ audio_path: filePath })
        .eq("fma_track_id", fmaTrackId);

      if (updateError) throw updateError;

      return new Response(
        JSON.stringify({ success: true, path: filePath }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Handle metadata batch upload
    const { tracks } = await req.json();

    if (!Array.isArray(tracks) || tracks.length === 0) {
      return new Response(
        JSON.stringify({ error: "Expected { tracks: [...] }" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Map to DB columns
    const rows = tracks.map((t: any) => ({
      fma_track_id: t.fma_track_id,
      title: t.title || "Untitled",
      artist: t.artist || "Unknown",
      genre: t.genre || "Unknown",
      wonder: t.gems?.wonder ?? 0.5,
      transcendence: t.gems?.transcendence ?? 0.5,
      tenderness: t.gems?.tenderness ?? 0.5,
      nostalgia: t.gems?.nostalgia ?? 0.5,
      peacefulness: t.gems?.peacefulness ?? 0.5,
      joyful_activation: t.gems?.joyful_activation ?? 0.5,
      power: t.gems?.power ?? 0.5,
      tension: t.gems?.tension ?? 0.5,
      gems_sadness: t.gems?.gems_sadness ?? 0.5,
      valence: t.valence ?? 0,
      arousal: t.arousal ?? 0,
      tempo: t.tempo ?? 120,
      key: t.key || "C",
      mode: t.mode || "major",
      prompt_fragment: t.prompt_fragment || "",
    }));

    // Upsert in batches of 500
    const batchSize = 500;
    let inserted = 0;
    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize);
      const { error } = await supabase
        .from("fma_tracks")
        .upsert(batch, { onConflict: "fma_track_id" });
      if (error) throw error;
      inserted += batch.length;
    }

    return new Response(
      JSON.stringify({ success: true, inserted }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
