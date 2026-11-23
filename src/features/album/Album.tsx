import { Suspense, lazy, useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion, useTransform } from 'framer-motion';
import { useRace } from '../../store/raceStore';
import { passes, studyMs, trophies, type Pass, type Trophy } from '../../store/derive';
import { roundById } from '../../data/calendar';
import { trackOf } from '../../data/tracks';
import { teamById } from '../../data/teams';
import { clock, minutes } from '../../lib/format';
import { dayKey } from '../../sim/progression';
import { useTilt, askTiltPermission } from '../../hooks/useTilt';
import type { Weekend } from '../../types';
import { StubFace, TicketFace } from '../weekend/Ticket';
import { teamOf } from '../../store/derive';

const CabinetScene = lazy(() => import('../../three/scenes/CabinetScene'));
const ease = [0.22, 1, 0.36, 1] as const;
type View = 'tickets' | 'passes' | 'trophies' | 'stats';

function Tickets() {
  const all = useRace(s => s.weekends);
  const weekends = useMemo(() => all.filter(w => w.rippedAt), [all]);
  const [open, setOpen] = useState<Weekend | null>(null);
  if (!weekends.length) return <p className="empty">Your stubs land here. Pick a Grand Prix in the garage and tear your first ticket.</p>;
  return (
    <>
      <ul className="stubs">
        {weekends.map((w, i) => (
          <motion.li key={w.id} initial={{ opacity: 0.35, y: 10, rotate: -2 }} animate={{ opacity: 1, y: 0, rotate: (i % 3 - 1) * 1.5 }} transition={{ delay: i * 0.04, ease, duration: 0.35 }}>
            <button className="stub-btn" onClick={() => setOpen(w)} aria-label={`Open ticket for ${roundById(w.roundId)?.name}`}><StubFace w={w} jagSeed={7 + i} /></button>
          </motion.li>
        ))}
      </ul>
      <AnimatePresence>
        {open && (
          <motion.div className="ticket-view" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(null)}>
            <motion.div initial={{ y: 30, scale: 0.96 }} animate={{ y: 0, scale: 1 }} exit={{ y: 20, opacity: 0 }} transition={{ ease, duration: 0.35 }} onClick={e => e.stopPropagation()}>
              <TicketFace w={open} stub={false} torn />
              <button className="btn btn-ghost" onClick={() => setOpen(null)}>Close</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function PassCard({ p, i }: { p: Pass; i: number }) {
  const reduce = useReducedMotion();
  const { x, y } = useTilt();
  const s = useRace();
  const team = teamById(teamOf(s));
  const bgPos = useTransform([x, y], ([a, b]: number[]) => `${50 + a * 40}% ${50 + b * 40}%`);
  const rotX = useTransform(y, v => v * -8), rotY = useTransform(x, v => v * 10);
  const d = s.driver;
  return (
    <motion.li className={'pass' + (p.unlocked ? '' : ' locked')}
      initial={reduce ? false : { rotate: -14, y: -120, opacity: 0 }} animate={{ rotate: 0, y: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 70, damping: 7, mass: 0.9, delay: i * 0.12 }} style={{ transformOrigin: '50% -60px' }}>
      <span className="lanyard" aria-hidden />
      <motion.div className="pass-card" style={p.unlocked ? { rotateX: rotX, rotateY: rotY } : undefined}>
        <div className="pass-band" style={{ '--team': team.color } as React.CSSProperties}><span>VIP</span><b>{p.title}</b></div>
        <div className="pass-body">
          <div className="avatar" style={{ background: `conic-gradient(from 200deg, ${d?.helmet.primary ?? '#ddd'} 0 40%, ${d?.helmet.secondary ?? '#333'} 0 70%, ${d?.helmet.accent ?? '#999'} 0)` }} aria-hidden><span className="num">{d?.number}</span></div>
          <div className="pass-who">
            <b>{d?.name ?? 'Driver'}</b>
            <span>{team.name}</span>
            <span className="num">Season 2026{p.at ? ` · issued ${new Date(p.at).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}` : ''}</span>
          </div>
        </div>
        <ul className="zones">{['Paddock', 'Pit Lane Walk', 'Hospitality', 'Team Garage'].map(z => <li key={z} className={p.zones.includes(z) ? 'on' : ''}>{z}</li>)}</ul>
        {p.unlocked ? <motion.div className="pass-holo" style={{ backgroundPosition: bgPos }} aria-hidden /> : <div className="pass-lock"><b>Locked</b><span>{p.requirement}</span></div>}
      </motion.div>
    </motion.li>
  );
}

function Passes() {
  const s = useRace();
  const list = passes(s);
  return (
    <>
      <p className="panel-intro">Milestones unlock paddock access. Tilt your phone to catch the hologram. <button className="link" onClick={askTiltPermission}>Enable tilt</button></p>
      <ul className="passes">{list.map((p, i) => <PassCard key={p.id} p={p} i={i} />)}</ul>
    </>
  );
}

function Trophies() {
  const s = useRace();
  const reduce = useReducedMotion() ?? false;
  const items = useMemo(() => trophies(s), [s.history]); // eslint-disable-line react-hooks/exhaustive-deps
  const [sel, setSel] = useState<string | null>(null);
  const t: Trophy | undefined = items.find(x => x.id === sel);
  if (!items.length) return <p className="empty">The cabinet is empty for now. Finish on the podium and the trophy goes on the shelf, each Grand Prix with its own shape.</p>;
  const r = t?.result;
  const round = r ? roundById(r.roundId) : null;
  return (
    <div className="trophy-room">
      <Suspense fallback={<div className="cabinet-canvas" />}>
        <CabinetScene items={items} selected={sel} onSelect={id => setSel(id === sel ? null : id)} reduce={reduce} />
      </Suspense>
      <aside className="trophy-detail" aria-live="polite">
        {t ? (
          t.kind === 'champion' ? (
            <><span className="kicker">World Champion</span><h3>Season {t.season}</h3><p className="num">{t.points} points</p></>
          ) : (
            <>
              <span className="kicker num">P{t.position} · {round?.name}</span>
              <h3>{trackOf(r!.trackId).name}</h3>
              <dl className="num">
                <div><dt>Date</dt><dd>{new Date(r!.endedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })}</dd></div>
                <div><dt>Studied</dt><dd>{clock(r!.focusMs)}</dd></div>
                <div><dt>Grid</dt><dd>P{r!.gridSlot}</dd></div>
                <div><dt>Team</dt><dd>{teamById(r!.teamId).name}</dd></div>
              </dl>
            </>
          )
        ) : <p>Tap a trophy to spin it and see the race.</p>}
      </aside>
    </div>
  );
}

function Stats() {
  const s = useRace();
  const fin = s.history.filter(r => r.status === 'finished');
  const total = studyMs(s);
  const cells = useMemo(() => {
    const per = new Map<string, number>();
    for (const r of s.history) per.set(dayKey(r.startedAt), (per.get(dayKey(r.startedAt)) ?? 0) + r.focusMs);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const dow = (today.getDay() + 6) % 7;
    const end = today.getTime() + (6 - dow) * 86_400_000;
    return Array.from({ length: 18 * 7 }, (_, i) => { const t = end - (18 * 7 - 1 - i) * 86_400_000; return { t, ms: per.get(dayKey(t)) ?? 0, future: t > today.getTime() }; });
  }, [s.history]);
  const lvl = (ms: number) => (ms <= 0 ? 0 : ms < 30 * 60_000 ? 1 : ms < 60 * 60_000 ? 2 : ms < 120 * 60_000 ? 3 : 4);
  const week = cells.slice(-7).reduce((a, c) => a + c.ms, 0);
  return (
    <div className="stats">
      <div className="stat-row num">
        <div><b>{(total / 3_600_000).toFixed(1)}</b><span>hours studied</span></div>
        <div><b>{minutes(week)}</b><span>this week</span></div>
        <div><b>{s.history.length}</b><span>races</span></div>
        <div><b>{fin.filter(r => r.position === 1).length}</b><span>wins</span></div>
        <div><b>{fin.filter(r => r.position <= 3).length}</b><span>podiums</span></div>
        <div><b>{fin.length ? `P${Math.min(...fin.map(r => r.position))}` : '–'}</b><span>best finish</span></div>
      </div>
      <figure className="heat" aria-label="Study per day, last 18 weeks">
        <div className="heat-grid">{cells.map(c => <span key={c.t} className={`cell l${lvl(c.ms)}${c.future ? ' future' : ''}`} title={`${new Date(c.t).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}: ${c.ms ? minutes(c.ms) : 'no racing'}`} />)}</div>
        <figcaption className="heat-key">Less <span className="cell l0" /><span className="cell l1" /><span className="cell l2" /><span className="cell l3" /><span className="cell l4" /> More · steps at 30 min, 1 h, 2 h</figcaption>
      </figure>
    </div>
  );
}

export function Album() {
  const [view, setView] = useState<View>('tickets');
  const labels: Record<View, string> = { tickets: 'Ticket album', passes: 'Passes', trophies: 'Trophies', stats: 'Stats' };
  return (
    <main className="page album">
      <div className="album-head">
        <h2>Album</h2>
        <div className="seg flat" role="tablist" aria-label="Album sections">
          {(Object.keys(labels) as View[]).map(v => <button key={v} role="tab" aria-selected={view === v} aria-pressed={view === v} onClick={() => setView(v)}>{labels[v]}</button>)}
        </div>
      </div>
      <motion.div key={view} initial={{ y: 10 }} animate={{ y: 0 }} transition={{ duration: 0.25, ease }}>
          {view === 'tickets' && <Tickets />}
          {view === 'passes' && <Passes />}
          {view === 'trophies' && <Trophies />}
          {view === 'stats' && <Stats />}
      </motion.div>
    </main>
  );
}
