import { Suspense, lazy, useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useRace } from '../../store/raceStore';
import { driverSkills, offers, studyMs, teamOf } from '../../store/derive';
import { DRIVER, LADDER } from '../../config/balance';
import { TEAMS, teamById } from '../../data/teams';
import { capRemaining, dayKey, SKILLS } from '../../sim/progression';
import { rivalHelmet, DEFAULT_HELMET } from '../../lib/helmets';
import { buzz } from '../../lib/haptics';
import type { ActivityId, TeamId } from '../../types';
import { CreateDriver } from './CreateDriver';

const DriverScene = lazy(() => import('../../three/scenes/DriverScene'));
const ease = [0.22, 1, 0.36, 1] as const;
const ACTS = Object.keys(DRIVER.activities) as ActivityId[];

function ActivityLogger() {
  const s = useRace();
  const [act, setAct] = useState<ActivityId>('gym');
  const def = DRIVER.activities[act];
  const hours = def.unit === 'h';
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const today = dayKey(Date.now());
  const left = capRemaining(s.activity, act, today);
  const submit = () => {
    const v = parseFloat(amount.replace(',', '.'));
    const min = Math.round(hours ? v * 60 : v);
    if (!(min > 0 && min <= 24 * 60)) return setNote({ ok: false, text: hours ? 'Enter hours, like 7.5.' : 'Enter minutes, like 45.' });
    const { counted } = s.logActivity(act, min);
    buzz('light');
    setAmount('');
    setNote({ ok: true, text: counted === min ? `${def.label} logged. ${counted} min towards ${DRIVER.skills[def.skill as keyof typeof DRIVER.skills].label}.` : counted > 0 ? `Logged. ${counted} of ${min} min counted; that's today's cap.` : `Logged, but today's ${def.label.toLowerCase()} cap is already reached, so it doesn't count.` });
  };
  return (
    <section className="panel" aria-labelledby="act-h">
      <h3 id="act-h">Log training</h3>
      <p className="panel-intro">Life away from the desk builds your driver. Each activity has a daily cap so it can't be farmed.</p>
      <div className="chips" role="radiogroup" aria-label="Activity">
        {ACTS.map(a => <button key={a} role="radio" aria-checked={act === a} className="chip-btn" onClick={() => { setAct(a); setNote(null); }}>{DRIVER.activities[a].label}</button>)}
      </div>
      <form className="log-row" onSubmit={e => { e.preventDefault(); submit(); }}>
        <label className="sr-only" htmlFor="amt">{hours ? 'Hours' : 'Minutes'}</label>
        <input id="amt" className="field num" inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)} placeholder={hours ? 'Hours, e.g. 7.5' : 'Minutes, e.g. 45'} />
        <button className="btn btn-primary" type="submit">Log</button>
      </form>
      <p className="status num">{note ? <span className={note.ok ? 'ok' : 'err'}>{note.text}</span> : `Today: ${left} of ${def.dailyCapMin} min still counts → ${DRIVER.skills[def.skill as keyof typeof DRIVER.skills].label}`}</p>
      {s.activity.length > 0 && (
        <ul className="act-list num">
          {s.activity.slice(0, 6).map(e => (
            <li key={e.id}>
              <span>{new Date(e.t).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</span>
              <b>{DRIVER.activities[e.activity].label}</b>
              <span>{e.minutes >= 120 ? `${(e.minutes / 60).toFixed(1)} h` : `${e.minutes} min`}{e.counted < e.minutes ? ` (${e.counted} counted)` : ''}</span>
              <button className="link" onClick={() => s.removeActivity(e.id)} aria-label="Remove entry">Remove</button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Ladder() {
  const s = useRace();
  const team = teamOf(s);
  const hours = studyMs(s) / 3_600_000;
  const open = offers(s).map(o => o.team);
  const at = LADDER.findIndex(l => l.team === team);
  return (
    <section className="panel" aria-labelledby="lad-h">
      <h3 id="lad-h">Contract ladder</h3>
      <p className="panel-intro">Teams call when your study hours and your last five results are both good enough.</p>
      <ol className="ladder num">
        {LADDER.map((l, i) => {
          const t = teamById(l.team);
          const state = i < at ? 'past' : i === at ? 'now' : open.includes(l.team) ? 'offer' : 'locked';
          return (
            <li key={l.team} className={state} style={{ '--team': t.color } as React.CSSProperties}>
              <i />
              <b>{t.name}</b>
              <span>{i === 0 ? 'Start' : state === 'now' ? 'Your team' : state === 'offer' ? 'Offer waiting' : `${l.hours} h · avg P${l.avgFinish}`}</span>
              {state === 'offer' && <button className="btn btn-primary small" onClick={() => s.signContract(l.team as TeamId)}>Sign</button>}
              {state === 'locked' && i === at + 1 && <small>{Math.max(0, l.hours - hours).toFixed(1)} h to go</small>}
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function GridBrowser() {
  const reduce = useReducedMotion() ?? false;
  const real = TEAMS.filter(t => !t.fictional);
  const [teamId, setTeamId] = useState<TeamId>('mclaren');
  const t = teamById(teamId);
  return (
    <section className="panel grid-browser" aria-labelledby="grid-h">
      <h3 id="grid-h">The 2026 grid</h3>
      <div className="team-chips" role="radiogroup" aria-label="Team">
        {real.map(x => <button key={x.id} role="radio" aria-checked={teamId === x.id} className="team-chip" style={{ '--team': x.color } as React.CSSProperties} onClick={() => setTeamId(x.id)}><i />{x.name}</button>)}
      </div>
      <Suspense fallback={<div className="driver-fallback" />}>
        <DriverScene figs={t.drivers.map(d => ({ primary: t.color, secondary: t.color2, number: d.number, helmet: rivalHelmet(t.id, d.number) }))} reduce={reduce} className="driver-canvas" label={`${t.name} drivers`} />
      </Suspense>
      <div className="pair num">{t.drivers.map(d => <div key={d.code}><b>#{d.number}</b><span>{d.name}</span><small>{d.code}</small></div>)}</div>
    </section>
  );
}

export function Driver() {
  const s = useRace();
  const reduce = useReducedMotion() ?? false;
  const [editing, setEditing] = useState(false);
  const team = teamById(teamOf(s));
  const skills = useMemo(() => driverSkills(s), [s.activity, s.history, s.driver]); // eslint-disable-line react-hooks/exhaustive-deps
  if (editing) return <CreateDriver onDone={() => setEditing(false)} />;
  const d = s.driver!;
  return (
    <main className="page driver">
      <section className="driver-hero">
        <div className="driver-stage"><Suspense fallback={<div className="driver-fallback" />}>
          <DriverScene figs={[{ primary: team.color, secondary: team.color2, number: d.number, helmet: d.helmet ?? DEFAULT_HELMET }]} reduce={reduce} className="driver-canvas tall" label="Your driver" />
        </Suspense></div>
        <div className="driver-card">
          <h1>{d.name}</h1>
          <p className="num">#{d.number} · {d.code} · {DRIVER.archetypes[d.archetype].label} · {team.name}</p>
          <button className="btn btn-ghost small" onClick={() => setEditing(true)}>Edit driver and helmet</button>
          <ul className="skills">
            {SKILLS.map((k, i) => (
              <li key={k}>
                <div className="skill-top"><b>{DRIVER.skills[k].label}</b><span className="num">{Math.round(skills[k] * 100)}</span></div>
                <div className="skill-bar"><motion.div initial={{ scaleX: 0 }} animate={{ scaleX: skills[k] }} transition={{ delay: 0.1 + i * 0.06, duration: 0.7, ease }} /></div>
                <small>{DRIVER.skills[k].blurb} {k === 'wet' ? 'Grows from swimming and from racing in the rain.' : `From ${Object.values(DRIVER.activities).find(a => a.skill === k)?.label.toLowerCase()}.`}</small>
              </li>
            ))}
          </ul>
        </div>
      </section>
      <div className="driver-cols">
        <ActivityLogger />
        <Ladder />
      </div>
      <GridBrowser />
    </main>
  );
}
