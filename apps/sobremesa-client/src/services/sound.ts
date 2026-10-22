export type SoundCue =
  | 'turn'
  | 'reverse'
  | 'skip'
  | 'stack'
  | 'card'
  | 'draw'
  | 'dice'
  | 'move'
  | 'success'
  | 'error'
  | 'round'
  | 'win'
  | 'lose'
  | 'drawGame';
export interface SoundPreferences {
  enabled: boolean;
  volume: number;
}
const storageKey = 'sobremesa.sound';
export function readSoundPreferences(): SoundPreferences {
  try {
    const value = JSON.parse(localStorage.getItem(storageKey) || 'null');
    return {
      enabled: value?.enabled === true,
      volume:
        typeof value?.volume === 'number' && Number.isFinite(value.volume)
          ? Math.max(0, Math.min(1, value.volume))
          : 0.25,
    };
  } catch {
    return { enabled: false, volume: 0.25 };
  }
}
let preferences = readSoundPreferences();
let context: AudioContext | undefined;
let lastSound = -Infinity;
let lastPriority = 0;
let suppressedUntil = 0;
export function suppressRecoverySounds() {
  suppressedUntil = performance.now() + 1000;
  stopSounds();
}
const voices = new Set<OscillatorNode>();
export function setSoundPreferences(next: SoundPreferences) {
  preferences = { enabled: next.enabled, volume: Math.max(0, Math.min(1, next.volume)) };
  try {
    localStorage.setItem(storageKey, JSON.stringify(preferences));
  } catch {
    // Storage is optional, including in private browsing.
  }
  if (!preferences.enabled || preferences.volume === 0) stopSounds();
}
function stopSounds() {
  for (const voice of voices) {
    try {
      voice.stop();
    } catch {
      /* Already ended. */
    }
  }
  voices.clear();
}
// Called only by trusted user gestures. Blocked audio never queues a later cue.
export function unlockSound() {
  if (!preferences.enabled || document.visibilityState !== 'visible') return;
  try {
    context ??= new AudioContext();
    if (context.state === 'suspended') void context.resume().catch(() => {});
  } catch {
    /* Audio is optional. */
  }
}
export function installSoundGestures() {
  const gesture = (event: Event) => {
    if (event.isTrusted) unlockSound();
  };
  const visibility = () => {
    if (document.visibilityState !== 'visible') stopSounds();
  };
  document.addEventListener('pointerdown', gesture, true);
  document.addEventListener('keydown', gesture, true);
  document.addEventListener('visibilitychange', visibility);
  return () => {
    document.removeEventListener('pointerdown', gesture, true);
    document.removeEventListener('keydown', gesture, true);
    document.removeEventListener('visibilitychange', visibility);
    stopSounds();
    const previous = context;
    context = undefined;
    lastSound = -Infinity;
    if (previous && previous.state !== 'closed') void previous.close().catch(() => {});
  };
}
const notes: Record<SoundCue, number[]> = {
  turn: [523, 659],
  card: [440],
  reverse: [659, 440],
  skip: [440, 440],
  stack: [330, 440, 554],
  draw: [330],
  dice: [196, 247, 294],
  move: [392],
  success: [523],
  error: [220, 196],
  round: [392, 523],
  win: [523, 659, 784],
  lose: [330, 262],
  drawGame: [392, 392],
};
export function playSound(cue: SoundCue | null) {
  if (
    !cue ||
    !preferences.enabled ||
    !preferences.volume ||
    !context ||
    context.state !== 'running' ||
    document.visibilityState !== 'visible' ||
    performance.now() < suppressedUntil
  )
    return;
  const now = context.currentTime;
  const priority = ['win', 'lose', 'drawGame'].includes(cue) ? 2 : cue === 'turn' ? 1 : 0;
  if (now - lastSound < 0.18) {
    if (priority <= lastPriority) return;
    stopSounds();
  }
  lastSound = now;
  lastPriority = priority;
  try {
    notes[cue].forEach((frequency, index) => {
      const voice = context!.createOscillator(),
        gain = context!.createGain();
      const start = now + index * 0.085;
      voice.type = 'sine';
      voice.frequency.setValueAtTime(frequency, start);
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(preferences.volume * 0.12, start + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.12);
      voice.connect(gain);
      gain.connect(context!.destination);
      voices.add(voice);
      voice.onended = () => {
        voices.delete(voice);
        voice.disconnect();
        gain.disconnect();
      };
      voice.start(start);
      voice.stop(start + 0.13);
    });
  } catch {
    /* Unsupported or interrupted audio must not affect gameplay. */
  }
}
export function actionSound(action: unknown): SoundCue | null {
  const type = (action as { type?: unknown } | null)?.type;
  if (typeof type !== 'string') return 'success';
  if (['STROKE', 'CLEAR', 'GUESS'].includes(type)) return null;
  if (/ROLL/.test(type)) return 'dice';
  if (/DRAW/.test(type)) return 'draw';
  if (/CARD|BET|CALL|RAISE|FOLD/.test(type)) return 'card';
  if (/MOVE|PLACE|PLAY|DROP/.test(type)) return 'move';
  if (/ROUND/.test(type)) return 'round';
  return 'success';
}
