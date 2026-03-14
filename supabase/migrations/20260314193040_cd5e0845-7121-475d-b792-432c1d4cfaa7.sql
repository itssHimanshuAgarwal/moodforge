
-- Table for FMA track metadata + GEMS 9 emotional scores
CREATE TABLE public.fma_tracks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fma_track_id TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL DEFAULT 'Untitled',
  artist TEXT NOT NULL DEFAULT 'Unknown',
  genre TEXT NOT NULL DEFAULT 'Unknown',
  
  -- GEMS 9 emotional dimensions (0-1 scale)
  wonder REAL NOT NULL DEFAULT 0.5,
  transcendence REAL NOT NULL DEFAULT 0.5,
  tenderness REAL NOT NULL DEFAULT 0.5,
  nostalgia REAL NOT NULL DEFAULT 0.5,
  peacefulness REAL NOT NULL DEFAULT 0.5,
  joyful_activation REAL NOT NULL DEFAULT 0.5,
  power REAL NOT NULL DEFAULT 0.5,
  tension REAL NOT NULL DEFAULT 0.5,
  gems_sadness REAL NOT NULL DEFAULT 0.5,
  
  -- Valence/arousal
  valence REAL NOT NULL DEFAULT 0,
  arousal REAL NOT NULL DEFAULT 0,
  
  -- Musical metadata
  tempo REAL NOT NULL DEFAULT 120,
  key TEXT NOT NULL DEFAULT 'C',
  mode TEXT NOT NULL DEFAULT 'major',
  
  -- Generated prompt fragment
  prompt_fragment TEXT NOT NULL DEFAULT '',
  
  -- Audio file path in storage bucket
  audio_path TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for nearest-neighbor search (we'll query by GEMS dimensions)
CREATE INDEX idx_fma_tracks_genre ON public.fma_tracks(genre);
CREATE INDEX idx_fma_tracks_fma_id ON public.fma_tracks(fma_track_id);

-- RLS: public read access (these are public domain tracks)
ALTER TABLE public.fma_tracks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read tracks"
  ON public.fma_tracks FOR SELECT
  TO anon, authenticated
  USING (true);

-- Storage bucket for audio files
INSERT INTO storage.buckets (id, name, public)
VALUES ('fma-audio', 'fma-audio', true);

-- Allow public read access to audio files
CREATE POLICY "Public read access for FMA audio"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'fma-audio');
