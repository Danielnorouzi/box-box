import { Suspense, lazy, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useRace } from '../../store/raceStore';
import { teamOf } from '../../store/derive';
import { teamById, TAKEN_NUMBERS } from '../../data/teams';
import { DRIVER } from '../../config/balance';
import { DEFAULT_HELMET } from '../../lib/helmets';
import type { Archetype, Helmet, HelmetPattern, PlayerDriver } from '../../types';

const DriverScene = lazy(() => import('../../three/scenes/DriverScene'));
const ease = [0.22, 1, 0.36, 1] as const;
const PATTERNS: { id: HelmetPattern; label: string }[] = [
  { id: 'stripe', label: 'Stripe' }, { id: 'chevron', label: 'Chevron' }, { id: 'halo', label: 'Halo band' }, { id: 'split', label: 'Split' }, { id: 'stars', label: 'Stars' },
];
const SWATCHES = ['#f2f2f2', '#16181d', '#c8743c', '#e8102c', '#ffd23f', '#1a5fd0', '#18c7b3', '#ff7ab8', '#6a3df0', '#2fbf71'];

function ColorRow({ label, value, onChange }: { label: string; value: string; onChange: (c: string) => void }) {
  return (
    <div className="color-row">
      <span className="label">{label}</span>
      <div className="swatches" role="radiogroup" aria-label={label}>
        {SWATCHES.map(c => (
          <button key={c} role="radio" aria-checked={value === c} aria-label={c} className="swatch" style={{ background: c }} onClick={() => onChange(c)} />
        ))}
        <label className="swatch custom" title="Pick any colour">
          <input type="color" value={value} onChange={e => onChange(e.target.value)} aria-label={`${label}: custom colour`} />
        </label>
      </div>
    </div>
  );
}

export function CreateDriver({ onDone }: { onDone?: () => void }) {
  const s = useRace();
  const reduce = useReducedMotion() ?? false;
  const existing = s.driver;
  const [name, setName] = useState(existing?.name ?? '');
  const [code, setCode] = useState(existing?.code ?? '');
  const [number, setNumber] = useState(String(existing?.number ?? 7));
  const [arch, setArch] = useState<Archetype>(existing?.archetype ?? 'racer');
  const [helmet, setHelmet] = useState<Helmet>(existing?.helmet ?? DEFAULT_HELMET);
  const [err, setErr] = useState<string | null>(null);
  const team = teamById(teamOf(s));
  const autoCode = (n: string) => (n.trim().split(/\s+/).pop() ?? '').replace(/[^a-z]/gi, '').slice(0, 3).toUpperCase();
  const num = parseInt(number, 10);

  const save = () => {
    if (!name.trim()) return setErr('Your driver needs a name.');
    const c = (code || autoCode(name)).toUpperCase();
    if (!/^[A-Z]{3}$/.test(c)) return setErr('The timing code is three letters, like NOR or HAM.');
    if (!(num >= 2 && num <= 99)) return setErr('Pick a race number from 2 to 99.');
    if (TAKEN_NUMBERS.has(num)) return setErr(`#${num} is taken on the 2026 grid. Pick another.`);
    const d: PlayerDriver = { name: name.trim(), code: c, number: num, archetype: arch, helmet };
    s.saveDriver(d);
    onDone?.();
  };

  return (
    <main className="page create">
      <motion.div className="create-stage" initial={{ opacity: 0.35, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, ease }}>
        <Suspense fallback={<div className="driver-fallback" />}>
          <DriverScene figs={[{ primary: team.color, secondary: team.color2, number: Number.isFinite(num) ? num : 7, helmet }]} reduce={reduce} className="driver-canvas tall" label="Your driver preview" />
        </Suspense>
      </motion.div>
      <section className="create-form">
        <div className="section-head">
          <h2>{existing ? 'Your driver' : 'Build your driver'}</h2>
          {!existing && <p>You start with Kestrel Racing, a backmarker. Study well and better teams will call.</p>}
        </div>
        <div className="two">
          <div>
            <label className="label" htmlFor="dname">Name</label>
            <input id="dname" className="field" value={name} maxLength={28} autoComplete="off" onChange={e => { setName(e.target.value); if (!code) setErr(null); }} placeholder="Alex Rivera" />
          </div>
          <div className="two tight">
            <div>
              <label className="label" htmlFor="dcode">Code</label>
              <input id="dcode" className="field num" value={code || autoCode(name)} maxLength={3} onChange={e => setCode(e.target.value.replace(/[^a-z]/gi, '').toUpperCase())} />
            </div>
            <div>
              <label className="label" htmlFor="dnum">Number</label>
              <input id="dnum" className="field num" inputMode="numeric" value={number} maxLength={2} onChange={e => setNumber(e.target.value.replace(/\D/g, ''))} />
            </div>
          </div>
        </div>

        <span className="label" id="arch-l">Driving style</span>
        <div className="archetypes" role="radiogroup" aria-labelledby="arch-l">
          {(Object.keys(DRIVER.archetypes) as Archetype[]).map(a => (
            <button key={a} role="radio" aria-checked={arch === a} className="arch" onClick={() => setArch(a)}>
              <b>{DRIVER.archetypes[a].label}</b><span>{DRIVER.archetypes[a].blurb}</span>
            </button>
          ))}
        </div>

        <span className="label" id="pat-l">Helmet design</span>
        <div className="chips" role="radiogroup" aria-labelledby="pat-l">
          {PATTERNS.map(p => <button key={p.id} role="radio" aria-checked={helmet.pattern === p.id} className="chip-btn" onClick={() => setHelmet(h => ({ ...h, pattern: p.id }))}>{p.label}</button>)}
        </div>
        <ColorRow label="Base" value={helmet.primary} onChange={c => setHelmet(h => ({ ...h, primary: c }))} />
        <ColorRow label="Pattern" value={helmet.secondary} onChange={c => setHelmet(h => ({ ...h, secondary: c }))} />
        <ColorRow label="Detail" value={helmet.accent} onChange={c => setHelmet(h => ({ ...h, accent: c }))} />

        {err && <p className="inline-error" role="alert">{err}</p>}
        <div className="create-actions">
          <button className="btn btn-primary btn-xl" onClick={save}>{existing ? 'Save driver' : 'Sign with Kestrel Racing'}</button>
          {existing && onDone && <button className="btn btn-ghost" onClick={onDone}>Cancel</button>}
        </div>
      </section>
    </main>
  );
}
