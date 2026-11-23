import { useRace } from '../store/raceStore';

export interface Quality { tier: 'high' | 'low'; dpr: [number, number]; shadows: boolean; seg: number; envRes: number; particles: number }

const HIGH: Quality = { tier: 'high', dpr: [1, 2], shadows: true, seg: 40, envRes: 256, particles: 420 };
const LOW: Quality = { tier: 'low', dpr: [1, 1.4], shadows: false, seg: 22, envRes: 64, particles: 160 };

/** Phones and low-memory devices get lighter 3D: fewer segments, no shadow maps, capped pixel ratio. */
export function detectTier(): 'high' | 'low' {
  if (typeof window === 'undefined') return 'high';
  const coarse = window.matchMedia?.('(pointer: coarse)').matches;
  const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8;
  const cores = navigator.hardwareConcurrency ?? 8;
  return coarse || mem < 4 || cores < 4 ? 'low' : 'high';
}

export function useQuality(): Quality {
  const pref = useRace(s => s.settings.quality);
  const tier = pref === 'auto' ? detectTier() : pref;
  return tier === 'high' ? HIGH : LOW;
}
