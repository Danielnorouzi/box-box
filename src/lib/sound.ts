// Race-start sounds, synthesised with Web Audio so there are no files to load or license.
// An AudioContext may only start after a tap, so `unlock()` is called from the Start button.

let ctx: AudioContext | null = null;

export function unlock() {
  try {
    ctx ??= new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    if (ctx.state === 'suspended') void ctx.resume();
  } catch {
    ctx = null;
  }
  return ctx;
}

/** One light coming on: the short square-ish tone of the broadcast start sequence. */
export function lightBeep(n: number) {
  const c = unlock();
  if (!c) return;
  const t = c.currentTime;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = 'square';
  osc.frequency.value = 880;
  const f = c.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.value = 2400;
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(0.11 + n * 0.008, t + 0.008);
  g.gain.setValueAtTime(0.11 + n * 0.008, t + 0.16);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.24);
  osc.connect(f).connect(g).connect(c.destination);
  osc.start(t);
  osc.stop(t + 0.26);
}

function noiseBuffer(c: AudioContext, seconds: number) {
  const b = c.createBuffer(1, Math.floor(c.sampleRate * seconds), c.sampleRate);
  const d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return b;
}

/**
 * Lights out: the grid launching. Several detuned "engines" climb through the revs
 * with a gear change, plus a burst of filtered noise for wheelspin, then fade into the distance.
 */
export function lightsOut() {
  const c = unlock();
  if (!c) return;
  const t = c.currentTime;
  const master = c.createGain();
  master.gain.setValueAtTime(0, t);
  master.gain.linearRampToValueAtTime(0.5, t + 0.06);
  master.gain.setValueAtTime(0.5, t + 1.4);
  master.gain.exponentialRampToValueAtTime(0.0001, t + 3.6);
  const comp = c.createDynamicsCompressor();
  master.connect(comp).connect(c.destination);

  const lp = c.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.setValueAtTime(900, t);
  lp.frequency.linearRampToValueAtTime(2600, t + 1.2);
  lp.frequency.exponentialRampToValueAtTime(500, t + 3.6); // cars pull away
  lp.Q.value = 2;
  lp.connect(master);

  const engines = 6;
  for (let i = 0; i < engines; i++) {
    const delay = i * 0.045 + Math.random() * 0.03;
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = 'sawtooth';
    const base = 95 + Math.random() * 18;
    const f = osc.frequency;
    f.setValueAtTime(base, t + delay);
    f.exponentialRampToValueAtTime(base * 2.6, t + delay + 0.85); // first gear
    f.exponentialRampToValueAtTime(base * 1.9, t + delay + 0.95); // upshift
    f.exponentialRampToValueAtTime(base * 2.9, t + delay + 1.9);
    f.exponentialRampToValueAtTime(base * 2.2, t + delay + 2.0);
    f.exponentialRampToValueAtTime(base * 2.6, t + delay + 3.6);
    osc.detune.value = (Math.random() - 0.5) * 40;
    g.gain.value = 0.9 / engines;
    osc.connect(g).connect(lp);
    osc.start(t + delay);
    osc.stop(t + 3.7);
  }

  const n = c.createBufferSource();
  n.buffer = noiseBuffer(c, 1.4);
  const bp = c.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = 1800;
  bp.Q.value = 0.8;
  const ng = c.createGain();
  ng.gain.setValueAtTime(0.0001, t);
  ng.gain.exponentialRampToValueAtTime(0.35, t + 0.05);
  ng.gain.exponentialRampToValueAtTime(0.0001, t + 1.3);
  n.connect(bp).connect(ng).connect(master);
  n.start(t);
}
