/**
 * Hook to fetch FMA tracks from the database with fallback to sample data.
 * Queries all tracks and performs nearest-neighbor search in GEMS 9 space.
 */
import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { GEMS_KEYS, SAMPLE_TRACKS, type GemsKey, type GemsTrack } from "@/lib/gems-data";

export function useFmaTracks() {
  const [dbTracks, setDbTracks] = useState<GemsTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [usingDb, setUsingDb] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function fetchTracks() {
      try {
        // Check if there are any tracks in the DB
        const { count } = await supabase
          .from("fma_tracks")
          .select("*", { count: "exact", head: true });

        if (!count || count === 0) {
          setLoading(false);
          return;
        }

        // Fetch all tracks (paginated if > 1000)
        const allTracks: GemsTrack[] = [];
        let page = 0;
        const pageSize = 1000;
        let hasMore = true;

        while (hasMore && !cancelled) {
          const { data, error } = await supabase
            .from("fma_tracks")
            .select("*")
            .range(page * pageSize, (page + 1) * pageSize - 1);

          if (error) throw error;
          if (!data || data.length === 0) {
            hasMore = false;
            break;
          }

          for (const row of data) {
            allTracks.push({
              id: row.id,
              title: row.title,
              artist: row.artist,
              genre: row.genre,
              gems: {
                wonder: row.wonder,
                transcendence: row.transcendence,
                tenderness: row.tenderness,
                nostalgia: row.nostalgia,
                peacefulness: row.peacefulness,
                joyful_activation: row.joyful_activation,
                power: row.power,
                tension: row.tension,
                gems_sadness: row.gems_sadness,
              },
              valence: row.valence,
              arousal: row.arousal,
              tempo: row.tempo,
              key: row.key,
              mode: row.mode,
              promptFragment: row.prompt_fragment,
              audioPath: row.audio_path || undefined,
            } as GemsTrack & { audioPath?: string });
          }

          if (data.length < pageSize) hasMore = false;
          page++;
        }

        if (!cancelled && allTracks.length > 0) {
          setDbTracks(allTracks);
          setUsingDb(true);
        }
      } catch (err) {
        console.warn("Failed to fetch DB tracks, using sample data:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchTracks();
    return () => { cancelled = true; };
  }, []);

  const tracks = usingDb ? dbTracks : SAMPLE_TRACKS;

  return { tracks, loading, usingDb, trackCount: tracks.length };
}

/**
 * Get the public audio URL for a track with an audio_path.
 */
export function getTrackAudioUrl(audioPath: string): string {
  const { data } = supabase.storage.from("fma-audio").getPublicUrl(audioPath);
  return data.publicUrl;
}
