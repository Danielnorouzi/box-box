import { useRace } from '../store/raceStore';

export const PATTERNS = {
  tap: 12,
  light: [30],
  radio: [18, 40, 18],
  warning: [80, 60, 80],
  pit: [40, 30, 120],
  dnf: [200, 80, 200, 80, 400],
  podium: [60, 40, 60, 40, 220],
} as const;

/** Vibrates when the device supports it and the player hasn't turned haptics off. */
export function buzz(p: keyof typeof PATTERNS) {
  if (!useRace.getState().settings.haptics) return;
  try { navigator.vibrate?.(PATTERNS[p] as number | number[]); } catch { /* unsupported */ }
}
