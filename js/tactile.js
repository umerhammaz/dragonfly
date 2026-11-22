const TICK_DURATION_SEC = 0.05;
const TICK_GAIN_PEAK = 0.05;
const TICK_GAIN_END = 0.001;
const HAPTIC_MS = 15;

const TICK_PRESETS = {
  detent: { startHz: 800, endHz: 300 },
  lock: { startHz: 940, endHz: 420 },
  chaos: { startHz: 540, endHz: 220 }
};

let sharedAudioCtx = null;

export function prefersReducedMotion() {
  return Boolean(
    window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export function playMechanicalTick(preset = "detent") {
  const tone = TICK_PRESETS[preset] || TICK_PRESETS.detent;
  try {
    if (!sharedAudioCtx || sharedAudioCtx.state === "closed") {
      const AudioCtor = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtor) return;
      sharedAudioCtx = new AudioCtor();
    }
    if (sharedAudioCtx.state === "suspended") {
      sharedAudioCtx.resume();
    }

    const now = sharedAudioCtx.currentTime;
    const osc = sharedAudioCtx.createOscillator();
    const gainNode = sharedAudioCtx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(tone.startHz, now);
    osc.frequency.exponentialRampToValueAtTime(
      tone.endHz,
      now + TICK_DURATION_SEC
    );

    gainNode.gain.setValueAtTime(TICK_GAIN_PEAK, now);
    gainNode.gain.exponentialRampToValueAtTime(
      TICK_GAIN_END,
      now + TICK_DURATION_SEC
    );

    osc.connect(gainNode);
    gainNode.connect(sharedAudioCtx.destination);

    osc.start(now);
    osc.stop(now + TICK_DURATION_SEC);
  } catch (e) {
    // Audio playback may be blocked prior to a user gesture
  }
}

export function triggerHaptics(durationMs = HAPTIC_MS) {
  if (navigator.vibrate) {
    navigator.vibrate(durationMs);
  }
}

export function triggerTactileFeedback(preset = "detent") {
  playMechanicalTick(preset);
  triggerHaptics();
}