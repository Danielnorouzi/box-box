import { useState } from 'react';
import { motion } from 'framer-motion';
import { TEAMS, teamById } from '../../data/teams';
import { TRACKS } from '../../data/tracks';
import { FORMATS, MIN, VSC_BUDGET_SHARE, stopLimitFor } from '../../sim/rules';
import { useRace } from '../../store/raceStore';
import { clock, minutes } from '../../lib/format';
import type { RaceFormat } from '../../types';
import { IconFlag } from '../icons';

const OPTIONS: { format: RaceFormat; min: number; label: string }[] = [
  { format: 'sprint', min: 25, label: 'Sprint' },
  { format: 'gp', min: 45, label: 'Grand Prix' },
  { format: 'gp', min: 60, label: 'Grand Prix' },
  { format: 'gp', min: 90, label: 'Grand Prix' },
];

export function Garage() {
  const { teamId, setTeam, lineUp, history, closeResult } = useRace();
  const lastLength = useRace(s => s.lastLength);
  const [opt, setOpt] = useState(() => Math.max(0, OPTIONS.findIndex(x => x.min === lastLength)));
  const [subject, setSubject] = useState('');
  const track = TRACKS.lusail;
  const o = OPTIONS[opt];
  const laps = FORMATS[o.format].laps(track.laps);
  const budget = o.min * MIN * VSC_BUDGET_SHARE;
  const lapS = (o.min * 60) / laps;

  const finished = history.filter(r => r.status === 'finished');
  const pts = history.reduce((s, r) => s + r.points, 0);
  const focus = history.reduce((s, r) => s + r.focusMs, 0);

  return (
    <main className="garage">
      <div className="brand">
        <h1>Pit Wall</h1>
        <span>2026 season</span>
      </div>

      <motion.section
        className="glass next-race"
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
        aria-labelledby="gp-name"
      >
        <header>
          <span className="eyebrow">Next on the calendar · 27–29 Nov</span>
          <h2 id="gp-name">{track.grandPrix}</h2>
          <div className="meta num">
            <span>{track.name}</span>
            <span>{track.lengthKm.toFixed(3)} km</span>
            <span>{laps} laps</span>
          </div>
        </header>

        <form
          onSubmit={e => {
            e.preventDefault();
            lineUp({ format: o.format, durationMin: o.min, subject });
          }}
          style={{ display: 'grid', gap: 'var(--s5)' }}
        >
          <div>
            <label className="label" htmlFor="subject">What are you racing on?</label>
            <input
              id="subject" className="field" value={subject} maxLength={80}
              placeholder="e.g. Organic chemistry, chapter 4"
              onChange={e => setSubject(e.target.value)} autoComplete="off"
            />
          </div>

          <div>
            <span className="label" id="len">Race length, minutes</span>
            <div className="seg num" role="group" aria-labelledby="len">
              {OPTIONS.map((x, i) => (
                <button type="button" key={x.min} aria-pressed={opt === i} onClick={() => setOpt(i)} aria-label={`${x.label}, ${x.min} minutes`}>
                  <strong>{x.min}</strong><small>{x.label}</small>
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className="label" id="seat">Your seat</span>
            <div className="teams" role="group" aria-labelledby="seat">
              {TEAMS.map(t => (
                <button
                  type="button" key={t.id} className="team" aria-pressed={teamId === t.id}
                  style={{ '--team': t.color } as React.CSSProperties}
                  onClick={() => setTeam(t.id)}
                >
                  <i />{t.name}
                </button>
              ))}
            </div>
          </div>

          <ul className="rules num">
            <li><b className="g">LAP</b><span>One lap every {Math.floor(lapS / 60)}:{String(Math.round(lapS % 60)).padStart(2, '0')} of focus. Clean laps build pace.</span></li>
            <li><b className="y">VSC</b><span>Pause any time. The field is frozen for {clock(budget)} in total, then races on without you.</span></li>
            <li><b className="r">DNF</b><span>One stop longer than {clock(stopLimitFor(budget))} retires the car.</span></li>
          </ul>

          <button className="btn btn-primary" type="submit">
            <IconFlag />Line up on the grid
          </button>
        </form>
      </motion.section>

      <section className="season" aria-labelledby="season-h">
        <h3 id="season-h">Your season</h3>
        <div className="season-stats num">
          <div className="stat"><strong>{pts}</strong><span>points</span></div>
          <div className="stat"><strong>{finished.filter(r => r.position === 1).length}</strong><span>wins</span></div>
          <div className="stat"><strong>{finished.filter(r => r.position <= 3).length}</strong><span>podiums</span></div>
          <div className="stat"><strong>{Math.floor(focus / 3_600_000)}<small style={{ fontSize: 15 }}>h {Math.round((focus % 3_600_000) / 60_000)}m</small></strong><span>focused</span></div>
        </div>
        {history.length === 0 ? (
          <p className="empty">No races yet. Your results land here after the chequered flag, with points towards the season.</p>
        ) : (
          <ul className="results num">
            {history.map(r => (
              <li key={r.id}>
                <button onClick={() => { closeResult(); useRace.setState({ viewingResultId: r.id }); }}>
                  <span className={'pos' + (r.status === 'dnf' ? ' dnf' : '')}>{r.status === 'dnf' ? 'DNF' : `P${r.position}`}</span>
                  <span className="what">
                    <div>{r.subject || 'Untitled session'}</div>
                    <small>
                      {new Date(r.startedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })} · {FORMATS[r.format].label} · {minutes(r.focusMs)} · {teamById(r.teamId).name}
                    </small>
                  </span>
                  <span className="pts">{r.points} pts</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
