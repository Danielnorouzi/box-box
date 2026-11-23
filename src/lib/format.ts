const pad = (n: number, w = 2) => String(Math.floor(n)).padStart(w, '0');

/** 1:04:09 or 12:09 */
export function clock(ms: number) {
  const s = Math.max(0, Math.ceil(ms / 1000 - 1e-6));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  return h ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`;
}

/** 1:23.456 */
export function lapTime(ms: number) {
  const m = Math.floor(ms / 60000), s = (ms % 60000) / 1000;
  return `${m}:${s.toFixed(3).padStart(6, '0')}`;
}

export function gap(s: number) {
  return `+${s.toFixed(s < 10 ? 3 : 1)}`;
}

export function minutes(ms: number) {
  const m = Math.round(ms / 60000);
  return m >= 60 ? `${Math.floor(m / 60)} h ${m % 60} min` : `${m} min`;
}

export const ordinal = (p: number) => `P${p}`;
