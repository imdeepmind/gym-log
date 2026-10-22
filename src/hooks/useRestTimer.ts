import { create } from 'zustand';

interface RestTimerState {
  active: boolean;
  endsAt: number | null;
  initialSec: number;
  exerciseName?: string;
  start: (seconds: number, exerciseName?: string) => void;
  adjust: (deltaSec: number) => void;
  skip: () => void;
}

// AudioContext singleton for zero-latency alert beep
let audioCtx: AudioContext | null = null;

function playRestEndBeep() {
  try {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        audioCtx = new AudioContextClass();
      }
    }
    if (audioCtx) {
      if (audioCtx.state === 'suspended') {
        audioCtx.resume();
      }
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, audioCtx.currentTime); // A5 pitch
      gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.5);
    }
  } catch (e) {
    console.error('Audio beep failed', e);
  }

  // Trigger vibration if supported
  if ('vibrate' in navigator) {
    try {
      navigator.vibrate([200, 100, 200]);
    } catch (e) {}
  }
}

export const useRestTimerStore = create<RestTimerState>((set, get) => ({
  active: false,
  endsAt: null,
  initialSec: 90,
  exerciseName: undefined,

  start: (seconds: number, exerciseName?: string) => {
    const endsAt = Date.now() + seconds * 1000;
    set({
      active: true,
      endsAt,
      initialSec: seconds,
      exerciseName,
    });
  },

  adjust: (deltaSec: number) => {
    const { endsAt } = get();
    if (!endsAt) return;
    const newEndsAt = Math.max(Date.now(), endsAt + deltaSec * 1000);
    set({ endsAt: newEndsAt });
  },

  skip: () => {
    set({ active: false, endsAt: null });
  },
}));

export { playRestEndBeep };
