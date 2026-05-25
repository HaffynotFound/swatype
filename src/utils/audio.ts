// Minimalist sound implementation using browser's Web Audio API that complies with guidelines
let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    // Lazy initialize to bypass user gesture autoplay restriction
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioCtx) {
      audioCtx = new AudioCtx();
    }
  }
  return audioCtx;
}

export function playVictorySound() {
  const ctx = getAudioContext();
  if (!ctx) return;

  // Resume context if suspended
  if (ctx.state === "suspended") {
    ctx.resume();
  }

  const now = ctx.currentTime;

  // Let's create an elegant retro chord arpeggio for victory (Major 7th chord chime)
  // Notes: C5 (523.25 Hz), E5 (659.25 Hz), G5 (783.99 Hz), B5 (987.77 Hz)
  const notes = [523.25, 659.25, 783.99, 987.77];
  
  notes.forEach((freq, index) => {
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, now + index * 0.12);

    // Fade out smoothly
    gainNode.gain.setValueAtTime(0, now + index * 0.12);
    gainNode.gain.linearRampToValueAtTime(0.15, now + index * 0.12 + 0.05);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + index * 0.12 + 0.5);

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.start(now + index * 0.12);
    osc.stop(now + index * 0.12 + 0.6);
  });
}
