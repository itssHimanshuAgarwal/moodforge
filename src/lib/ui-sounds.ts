// Subtle UI sound effects using Web Audio API
let audioCtx: AudioContext | null = null;

function getCtx() {
  if (!audioCtx) audioCtx = new AudioContext();
  return audioCtx;
}

export function playClick() {
  try {
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = 1000;
    gain.gain.value = 0.04;
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.05);
  } catch {}
}

export function playChime() {
  try {
    const ctx = getCtx();
    const notes = [800, 1000, 1200];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.value = 0.03;
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.03 * (i + 1) + 0.06);
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + 0.03 * i);
      osc.stop(ctx.currentTime + 0.03 * (i + 1) + 0.06);
    });
  } catch {}
}

export function playPop() {
  try {
    const ctx = getCtx();
    const bufferSize = ctx.sampleRate * 0.03;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const gain = ctx.createGain();
    gain.gain.value = 0.03;
    source.connect(gain).connect(ctx.destination);
    source.start();
  } catch {}
}
