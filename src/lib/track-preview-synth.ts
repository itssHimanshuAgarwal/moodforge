/**
 * Track Preview Synthesizer — generates short musical previews
 * based on a track's tempo, key, mode, and GEMS emotional profile.
 * Ported from the MoodForge concept: when the spider web moves,
 * the nearest track auto-plays a musical preview.
 */
import type { GemsTrack } from "./gems-data";

// Note frequencies (A4 = 440Hz)
const NOTE_FREQ: Record<string, number> = {
  "C": 261.63, "C#": 277.18, "Db": 277.18,
  "D": 293.66, "D#": 311.13, "Eb": 311.13,
  "E": 329.63, "F": 349.23, "F#": 369.99,
  "Gb": 369.99, "G": 392.00, "G#": 415.30,
  "Ab": 415.30, "A": 440.00, "A#": 466.16,
  "Bb": 466.16, "B": 493.88,
};

// Scale intervals
const MAJOR_SCALE = [0, 2, 4, 5, 7, 9, 11];
const MINOR_SCALE = [0, 2, 3, 5, 7, 8, 10];

function getScaleFreqs(root: string, mode: string, octaveShift = 0): number[] {
  const rootFreq = (NOTE_FREQ[root] || 261.63) * Math.pow(2, octaveShift);
  const intervals = mode === "minor" ? MINOR_SCALE : MAJOR_SCALE;
  return intervals.map(semitones => rootFreq * Math.pow(2, semitones / 12));
}

// Melodic patterns based on mood
function getMelodyPattern(track: GemsTrack): number[] {
  const { gems } = track;
  if (gems.tension > 0.7) return [0, 3, 1, 4, 2, 5, 1, 0]; // chromatic tension
  if (gems.joyful_activation > 0.7) return [0, 2, 4, 6, 4, 2, 4, 6]; // ascending joy
  if (gems.peacefulness > 0.7) return [0, 2, 4, 2, 0, 2, 4, 2]; // gentle wave
  if (gems.power > 0.7) return [0, 4, 0, 4, 2, 6, 2, 0]; // bold intervals
  if (gems.gems_sadness > 0.6) return [4, 2, 0, 2, 4, 2, 0, -1]; // descending sadness
  if (gems.nostalgia > 0.6) return [0, 4, 2, 0, 4, 2, 0, 4]; // wistful loop
  if (gems.wonder > 0.7) return [0, 4, 6, 4, 2, 6, 4, 0]; // wide intervals wonder
  if (gems.transcendence > 0.7) return [0, 2, 4, 6, 4, 6, 4, 2]; // ascending float
  if (gems.tenderness > 0.7) return [0, 2, 0, 4, 2, 0, 2, 4]; // gentle steps
  return [0, 2, 4, 2, 0, 4, 2, 0]; // default
}

let audioCtx: AudioContext | null = null;
let currentNodes: AudioNode[] = [];
let stopTimeout: ReturnType<typeof setTimeout> | null = null;

function getCtx(): AudioContext {
  if (!audioCtx) audioCtx = new AudioContext();
  return audioCtx;
}

export function stopPreview() {
  if (stopTimeout) clearTimeout(stopTimeout);
  currentNodes.forEach(n => {
    try { (n as any).stop?.(); } catch {}
    try { n.disconnect(); } catch {}
  });
  currentNodes = [];
}

export function playTrackPreview(track: GemsTrack): void {
  stopPreview();

  const ctx = getCtx();
  if (ctx.state === "suspended") ctx.resume();

  const { gems } = track;
  const tempo = track.tempo || 100;
  const beatDuration = 60 / tempo;
  const noteLength = beatDuration * 0.8;
  const totalDuration = beatDuration * 8; // 8 notes

  // Scale setup
  const scaleFreqs = getScaleFreqs(track.key || "C", track.mode || "major", 0);
  const lowFreqs = getScaleFreqs(track.key || "C", track.mode || "major", -1);
  const pattern = getMelodyPattern(track);

  // Master gain
  const master = ctx.createGain();
  master.gain.setValueAtTime(0, ctx.currentTime);
  master.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 0.1);
  master.gain.setValueAtTime(0.15, ctx.currentTime + totalDuration - 0.3);
  master.gain.linearRampToValueAtTime(0, ctx.currentTime + totalDuration);
  master.connect(ctx.destination);

  // Reverb-like delay for atmosphere
  const delay = ctx.createDelay(1);
  delay.delayTime.value = beatDuration * 0.75;
  const delayGain = ctx.createGain();
  delayGain.gain.value = gems.transcendence > 0.5 ? 0.35 : 0.15;
  const delayFilter = ctx.createBiquadFilter();
  delayFilter.type = "lowpass";
  delayFilter.frequency.value = 2000;
  delay.connect(delayFilter);
  delayFilter.connect(delayGain);
  delayGain.connect(master);
  delayGain.connect(delay); // feedback loop

  // Choose waveform based on mood
  let waveform: OscillatorType = "triangle";
  if (gems.power > 0.7) waveform = "sawtooth";
  else if (gems.tension > 0.7) waveform = "square";
  else if (gems.peacefulness > 0.6) waveform = "sine";

  const nodes: AudioNode[] = [master, delay, delayGain, delayFilter];

  // Melody notes
  pattern.forEach((degree, i) => {
    const startTime = ctx.currentTime + i * beatDuration;
    const freq = degree >= 0
      ? scaleFreqs[Math.min(degree, scaleFreqs.length - 1)]
      : lowFreqs[lowFreqs.length + degree] || lowFreqs[0];

    // Main oscillator
    const osc = ctx.createOscillator();
    osc.type = waveform;
    osc.frequency.setValueAtTime(freq, startTime);

    // Vibrato for tender/nostalgic
    if (gems.tenderness > 0.5 || gems.nostalgia > 0.5) {
      const vibrato = ctx.createOscillator();
      const vibratoGain = ctx.createGain();
      vibrato.frequency.value = 5;
      vibratoGain.gain.value = freq * 0.008;
      vibrato.connect(vibratoGain);
      vibratoGain.connect(osc.frequency);
      vibrato.start(startTime);
      vibrato.stop(startTime + noteLength);
      nodes.push(vibrato, vibratoGain);
    }

    const noteGain = ctx.createGain();
    const attack = gems.peacefulness > 0.5 ? 0.08 : 0.02;
    const release = gems.peacefulness > 0.5 ? noteLength * 0.6 : noteLength * 0.3;
    noteGain.gain.setValueAtTime(0, startTime);
    noteGain.gain.linearRampToValueAtTime(0.6, startTime + attack);
    noteGain.gain.setValueAtTime(0.6, startTime + noteLength - release);
    noteGain.gain.exponentialRampToValueAtTime(0.001, startTime + noteLength);

    // Filter for warmth
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = gems.power > 0.5 ? 4000 : gems.peacefulness > 0.5 ? 1200 : 2400;
    filter.Q.value = gems.wonder > 0.5 ? 3 : 1;

    osc.connect(noteGain);
    noteGain.connect(filter);
    filter.connect(master);
    filter.connect(delay);

    osc.start(startTime);
    osc.stop(startTime + noteLength + 0.01);

    nodes.push(osc, noteGain, filter);
  });

  // Pad/drone for atmospheric tracks
  if (gems.transcendence > 0.4 || gems.wonder > 0.4 || gems.peacefulness > 0.5) {
    const padFreq = (NOTE_FREQ[track.key || "C"] || 261.63) / 2;
    const pad = ctx.createOscillator();
    pad.type = "sine";
    pad.frequency.value = padFreq;
    const padGain = ctx.createGain();
    padGain.gain.setValueAtTime(0, ctx.currentTime);
    padGain.gain.linearRampToValueAtTime(0.08, ctx.currentTime + 0.5);
    padGain.gain.setValueAtTime(0.08, ctx.currentTime + totalDuration - 0.5);
    padGain.gain.linearRampToValueAtTime(0, ctx.currentTime + totalDuration);
    pad.connect(padGain);
    padGain.connect(master);
    pad.start(ctx.currentTime);
    pad.stop(ctx.currentTime + totalDuration + 0.1);

    // Fifth interval for richness
    const pad5 = ctx.createOscillator();
    pad5.type = "sine";
    pad5.frequency.value = padFreq * 1.5;
    const pad5Gain = ctx.createGain();
    pad5Gain.gain.setValueAtTime(0, ctx.currentTime);
    pad5Gain.gain.linearRampToValueAtTime(0.04, ctx.currentTime + 0.8);
    pad5Gain.gain.setValueAtTime(0.04, ctx.currentTime + totalDuration - 0.5);
    pad5Gain.gain.linearRampToValueAtTime(0, ctx.currentTime + totalDuration);
    pad5.connect(pad5Gain);
    pad5Gain.connect(master);
    pad5.start(ctx.currentTime);
    pad5.stop(ctx.currentTime + totalDuration + 0.1);

    nodes.push(pad, padGain, pad5, pad5Gain);
  }

  currentNodes = nodes;
  stopTimeout = setTimeout(() => { currentNodes = []; }, (totalDuration + 0.5) * 1000);
}
