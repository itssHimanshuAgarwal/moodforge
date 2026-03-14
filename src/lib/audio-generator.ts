// Generates demo audio buffers using Web Audio API
export interface StemConfig {
  id: string;
  label: string;
  color: string;
  bgClass: string;
  frequency: number;
  type: OscillatorType;
  pulseBpm?: number;
}

export const STEM_CONFIGS: StemConfig[] = [
  { id: "drums", label: "Drums", color: "#3b82f6", bgClass: "stem-bg-drums", frequency: 100, type: "square", pulseBpm: 120 },
  { id: "bass", label: "Bass", color: "#a855f7", bgClass: "stem-bg-bass", frequency: 80, type: "sawtooth" },
  { id: "melody", label: "Melody", color: "#22c55e", bgClass: "stem-bg-melody", frequency: 440, type: "sine" },
  { id: "harmony", label: "Harmony", color: "#f59e0b", bgClass: "stem-bg-harmony", frequency: 330, type: "sine" },
  { id: "vocals", label: "Vocals", color: "#ef4444", bgClass: "stem-bg-vocals", frequency: 220, type: "sine" },
];

const DURATION = 30; // seconds
const SAMPLE_RATE = 44100;

export function generateDemoBuffer(
  audioCtx: AudioContext,
  config: StemConfig
): AudioBuffer {
  const length = DURATION * SAMPLE_RATE;
  const buffer = audioCtx.createBuffer(1, length, SAMPLE_RATE);
  const data = buffer.getChannelData(0);

  const { frequency, type, pulseBpm } = config;

  for (let i = 0; i < length; i++) {
    const t = i / SAMPLE_RATE;
    let sample = 0;

    // Generate waveform based on type
    const phase = (t * frequency) % 1;
    switch (type) {
      case "sine":
        sample = Math.sin(2 * Math.PI * frequency * t);
        break;
      case "square":
        sample = phase < 0.5 ? 1 : -1;
        break;
      case "sawtooth":
        sample = 2 * phase - 1;
        break;
      default:
        sample = Math.sin(2 * Math.PI * frequency * t);
    }

    // Apply pulse envelope for drums
    if (pulseBpm) {
      const beatInterval = 60 / pulseBpm;
      const timeInBeat = t % beatInterval;
      const envelope = Math.exp(-timeInBeat * 12); // fast decay
      sample *= envelope;
    }

    // Add some variation
    sample *= 0.3; // base volume
    sample += Math.sin(2 * Math.PI * frequency * 1.5 * t) * 0.08; // harmonic
    sample += Math.sin(2 * Math.PI * frequency * 2 * t) * 0.04; // overtone

    // Soft clamp
    data[i] = Math.max(-0.95, Math.min(0.95, sample));
  }

  return buffer;
}

export function audioBufferToBlob(buffer: AudioBuffer): Blob {
  const length = buffer.length;
  const channels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;

  // WAV header
  const wavLength = 44 + length * channels * 2;
  const arrayBuffer = new ArrayBuffer(wavLength);
  const view = new DataView(arrayBuffer);

  // RIFF header
  writeString(view, 0, "RIFF");
  view.setUint32(4, wavLength - 8, true);
  writeString(view, 8, "WAVE");

  // fmt chunk
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, channels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * channels * 2, true);
  view.setUint16(32, channels * 2, true);
  view.setUint16(34, 16, true);

  // data chunk
  writeString(view, 36, "data");
  view.setUint32(40, length * channels * 2, true);

  const channelData = buffer.getChannelData(0);
  let offset = 44;
  for (let i = 0; i < length; i++) {
    const sample = Math.max(-1, Math.min(1, channelData[i]));
    view.setInt16(offset, sample * 0x7fff, true);
    offset += 2;
  }

  return new Blob([arrayBuffer], { type: "audio/wav" });
}

function writeString(view: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}
