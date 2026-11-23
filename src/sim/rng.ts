// mulberry32: tiny, fast, deterministic. Every simulated detail comes from the race seed,
// so the same event log always replays to the same race.
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const hash = (...n: number[]) =>
  n.reduce((h, x) => Math.imul(h ^ Math.floor(x), 2654435761) >>> 0, 0x9e3779b9);
