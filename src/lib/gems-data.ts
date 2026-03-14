/**
 * GEMS 9 emotional dimensions + sample track data.
 * Ported from MoodForge Python backend (emotions.py / enrich_tracks.py).
 */

export const GEMS_KEYS = [
  "wonder", "transcendence", "tenderness", "nostalgia", "peacefulness",
  "joyful_activation", "power", "tension", "gems_sadness",
] as const;

export type GemsKey = typeof GEMS_KEYS[number];

export const GEMS_LABELS: Record<GemsKey, string> = {
  wonder: "Wonder",
  transcendence: "Transcendence",
  tenderness: "Tenderness",
  nostalgia: "Nostalgia",
  peacefulness: "Peacefulness",
  joyful_activation: "Joyful Activation",
  power: "Power",
  tension: "Tension",
  gems_sadness: "Sadness",
};

export const GEMS_COLORS: Record<GemsKey, string> = {
  wonder: "#9D4EDD",
  transcendence: "#7B8EF5",
  tenderness: "#EF476F",
  nostalgia: "#FFB347",
  peacefulness: "#00D4AA",
  joyful_activation: "#FFD166",
  power: "#FF6B6B",
  tension: "#FF8C42",
  gems_sadness: "#90CAF9",
};

export const MOOD_WORDS: Record<GemsKey, string[]> = {
  wonder: ["awe-inspiring", "magical", "wondrous"],
  transcendence: ["ethereal", "transcendent", "sublime"],
  tenderness: ["gentle", "tender", "delicate"],
  nostalgia: ["nostalgic", "bittersweet", "wistful"],
  peacefulness: ["serene", "peaceful", "tranquil"],
  joyful_activation: ["joyful", "uplifting", "exuberant"],
  power: ["powerful", "intense", "commanding"],
  tension: ["tense", "suspenseful", "dramatic"],
  gems_sadness: ["melancholic", "sorrowful", "poignant"],
};

export interface GemsTrack {
  id: string;
  title: string;
  artist: string;
  genre: string;
  gems: Record<GemsKey, number>;
  valence: number;
  arousal: number;
  tempo: number;
  key: string;
  mode: string;
  promptFragment: string;
}

/**
 * Build a music generation prompt from GEMS cursor values + optional reference track.
 */
export function buildPromptFromGems(
  cursorValues: Record<GemsKey, number>,
  referenceTrack?: GemsTrack | null,
  userDescription?: string
): string {
  const parts: string[] = [];

  if (userDescription?.trim()) {
    parts.push(userDescription.trim());
  }

  // Emotional profile from cursor
  const high = GEMS_KEYS.filter(k => cursorValues[k] > 0.7);
  const low = GEMS_KEYS.filter(k => cursorValues[k] < 0.3);

  if (high.length > 0) {
    const descriptors = high.map(k => MOOD_WORDS[k][0]);
    parts.push(`Emotionally ${descriptors.join(", ")}.`);
  }
  if (low.length > 0) {
    parts.push(`Avoids ${low.map(k => GEMS_LABELS[k].toLowerCase()).join(", ")}.`);
  }

  // Target emotional profile
  const cursorHigh = GEMS_KEYS.filter(k => cursorValues[k] > 0.7).map(k => GEMS_LABELS[k].toLowerCase());
  const cursorLow = GEMS_KEYS.filter(k => cursorValues[k] < 0.3).map(k => GEMS_LABELS[k].toLowerCase());
  if (cursorHigh.length || cursorLow.length) {
    let intent = "Target emotional profile:";
    if (cursorHigh.length) intent += ` emphasize ${cursorHigh.join(", ")}`;
    if (cursorLow.length) intent += `${cursorHigh.length ? ";" : ""} minimize ${cursorLow.join(", ")}`;
    parts.push(intent + ".");
  }

  // Reference track details
  if (referenceTrack) {
    if (referenceTrack.genre) parts.push(`Style: ${referenceTrack.genre}.`);
    if (referenceTrack.tempo) parts.push(`Tempo: ~${Math.round(referenceTrack.tempo)} BPM.`);
    if (referenceTrack.key && referenceTrack.mode) {
      parts.push(`Key: ${referenceTrack.key} ${referenceTrack.mode}.`);
    }
    if (referenceTrack.promptFragment) {
      parts.push(referenceTrack.promptFragment);
    }
  }

  return parts.join("\n");
}

// ─── Sample tracks (simulating pre-analyzed FMA data) ───────────────────────
// These would normally come from the MoodForge Python pipeline.
// Each track has GEMS 9 scores [0-1], valence [-1,1], arousal [-1,1].

export const SAMPLE_TRACKS: GemsTrack[] = [
  {
    id: "t001", title: "Ethereal Dawn", artist: "Ambient Collective", genre: "Electronic",
    gems: { wonder: 0.82, transcendence: 0.91, tenderness: 0.45, nostalgia: 0.30, peacefulness: 0.78, joyful_activation: 0.25, power: 0.12, tension: 0.08, gems_sadness: 0.15 },
    valence: 0.3, arousal: -0.4, tempo: 72, key: "C", mode: "major",
    promptFragment: "Emotionally ethereal, transcendent. Mood: positive, calm. Timbre: warm/dark. Texture: sparse/breathing.",
  },
  {
    id: "t002", title: "Neon Streets", artist: "Synthwave Runner", genre: "Electronic",
    gems: { wonder: 0.35, transcendence: 0.20, tenderness: 0.10, nostalgia: 0.72, peacefulness: 0.08, joyful_activation: 0.65, power: 0.78, tension: 0.40, gems_sadness: 0.12 },
    valence: 0.5, arousal: 0.8, tempo: 128, key: "A", mode: "minor",
    promptFragment: "Emotionally powerful, nostalgic. Mood: positive, high energy. Style: Synthwave. Timbre: bright/sparkling. Texture: rhythmically dense.",
  },
  {
    id: "t003", title: "Velvet Memories", artist: "Jazz Noir Trio", genre: "Jazz",
    gems: { wonder: 0.40, transcendence: 0.30, tenderness: 0.68, nostalgia: 0.85, peacefulness: 0.50, joyful_activation: 0.15, power: 0.10, tension: 0.22, gems_sadness: 0.72 },
    valence: -0.3, arousal: -0.2, tempo: 88, key: "Bb", mode: "minor",
    promptFragment: "Emotionally nostalgic, melancholic, tender. Mood: dark/melancholic, moderate energy. Style: Jazz. Timbre: warm/dark.",
  },
  {
    id: "t004", title: "Battle Hymn", artist: "Orchestral Fury", genre: "Classical",
    gems: { wonder: 0.55, transcendence: 0.60, tenderness: 0.05, nostalgia: 0.15, peacefulness: 0.02, joyful_activation: 0.40, power: 0.95, tension: 0.85, gems_sadness: 0.10 },
    valence: 0.2, arousal: 0.9, tempo: 152, key: "D", mode: "minor",
    promptFragment: "Emotionally powerful, tense. Mood: neutral, high energy. Style: Orchestral. Timbre: bright/sparkling. Texture: rhythmically dense.",
  },
  {
    id: "t005", title: "Sunday Morning", artist: "Acoustic Garden", genre: "Folk",
    gems: { wonder: 0.30, transcendence: 0.15, tenderness: 0.75, nostalgia: 0.40, peacefulness: 0.88, joyful_activation: 0.55, power: 0.08, tension: 0.05, gems_sadness: 0.10 },
    valence: 0.7, arousal: -0.3, tempo: 96, key: "G", mode: "major",
    promptFragment: "Emotionally peaceful, tender. Mood: positive/bright, low energy/ambient. Style: Folk. Timbre: warm/dark. Texture: sparse/breathing.",
  },
  {
    id: "t006", title: "Midnight Club", artist: "Deep House Collective", genre: "Electronic",
    gems: { wonder: 0.20, transcendence: 0.15, tenderness: 0.05, nostalgia: 0.10, peacefulness: 0.12, joyful_activation: 0.82, power: 0.70, tension: 0.35, gems_sadness: 0.03 },
    valence: 0.6, arousal: 0.7, tempo: 124, key: "F", mode: "minor",
    promptFragment: "Emotionally joyful, powerful. Mood: positive, high energy. Style: Deep House. Timbre: balanced. Texture: rhythmically dense.",
  },
  {
    id: "t007", title: "Frozen Lake", artist: "Nordic Ambient", genre: "Ambient",
    gems: { wonder: 0.70, transcendence: 0.80, tenderness: 0.35, nostalgia: 0.55, peacefulness: 0.65, joyful_activation: 0.05, power: 0.08, tension: 0.30, gems_sadness: 0.60 },
    valence: -0.2, arousal: -0.6, tempo: 60, key: "E", mode: "minor",
    promptFragment: "Emotionally transcendent, wondrous, melancholic. Mood: dark/melancholic, low energy/ambient. Style: Ambient. Timbre: warm/dark. Texture: sparse/breathing.",
  },
  {
    id: "t008", title: "Victory Lap", artist: "Stadium Anthems", genre: "Rock",
    gems: { wonder: 0.45, transcendence: 0.35, tenderness: 0.10, nostalgia: 0.20, peacefulness: 0.05, joyful_activation: 0.90, power: 0.88, tension: 0.25, gems_sadness: 0.02 },
    valence: 0.8, arousal: 0.85, tempo: 140, key: "A", mode: "major",
    promptFragment: "Emotionally joyful, powerful. Mood: positive/bright, high energy. Style: Rock. Timbre: bright/sparkling. Texture: rhythmically dense.",
  },
  {
    id: "t009", title: "Lullaby for Rain", artist: "Piano Stories", genre: "Classical",
    gems: { wonder: 0.50, transcendence: 0.40, tenderness: 0.90, nostalgia: 0.65, peacefulness: 0.70, joyful_activation: 0.08, power: 0.05, tension: 0.10, gems_sadness: 0.75 },
    valence: -0.4, arousal: -0.5, tempo: 68, key: "F", mode: "minor",
    promptFragment: "Emotionally tender, melancholic, nostalgic. Mood: dark/melancholic, low energy/ambient. Style: Piano. Timbre: warm/dark. Texture: sparse/breathing.",
  },
  {
    id: "t010", title: "Carnival Night", artist: "Latin Groove", genre: "Latin",
    gems: { wonder: 0.55, transcendence: 0.20, tenderness: 0.15, nostalgia: 0.30, peacefulness: 0.10, joyful_activation: 0.92, power: 0.60, tension: 0.15, gems_sadness: 0.05 },
    valence: 0.9, arousal: 0.8, tempo: 110, key: "C", mode: "major",
    promptFragment: "Emotionally joyful, exuberant. Mood: positive/bright, high energy. Style: Latin. Timbre: bright/sparkling. Texture: rhythmically dense.",
  },
  {
    id: "t011", title: "Ghost Signal", artist: "Glitch Noir", genre: "Electronic",
    gems: { wonder: 0.60, transcendence: 0.45, tenderness: 0.08, nostalgia: 0.20, peacefulness: 0.05, joyful_activation: 0.12, power: 0.50, tension: 0.90, gems_sadness: 0.35 },
    valence: -0.5, arousal: 0.6, tempo: 135, key: "C#", mode: "minor",
    promptFragment: "Emotionally tense, suspenseful. Mood: dark/melancholic, high energy. Style: Glitch/IDM. Timbre: bright/sparkling. Texture: rhythmically dense.",
  },
  {
    id: "t012", title: "Horizon Glow", artist: "Chillstep Dreams", genre: "Electronic",
    gems: { wonder: 0.75, transcendence: 0.70, tenderness: 0.55, nostalgia: 0.45, peacefulness: 0.60, joyful_activation: 0.35, power: 0.20, tension: 0.10, gems_sadness: 0.25 },
    valence: 0.4, arousal: -0.1, tempo: 85, key: "D", mode: "major",
    promptFragment: "Emotionally wondrous, transcendent. Mood: positive, moderate energy. Style: Chillstep. Timbre: balanced. Texture: moderate rhythm.",
  },
];
