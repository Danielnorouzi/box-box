import { Suspense, lazy, useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { TEAMS, teamById } from '../../data/teams';
import { trackOf } from '../../data/tracks';
import { nextRound, roundById, weekendLabel } from '../../data/calendar';
import { FORMATS, MIN, VSC_BUDGET_SHARE, stopLimitFor } from '../../sim/rules';
import { liveTickets, useRace } from '../../store/raceStore';
import { championship } from '../../lib/championship';
import { clock, minutes } from '../../lib/format';
import type { RaceFormat } from '../../types';
import { IconFlag } from '../icons';

const Car3D = lazy(() => import('./Car3D'));

const OPTIONS: { format: RaceFormat; min: number; label: string }[] = [
  { format: 'sprint', min: 25, label: 'Sprint' },
  { format: 'gp', min: 45, label: 'Grand Prix' },
  { format: 'gp', min: 60, label: 'Grand Prix' },
  { format: 'gp', min: 90, label: 'Grand Prix' },
];

export function Garage() {
  const s = useRace();
  const reduce = useReducedMotion();
  const round = (s.roundId && roundById(s.roundId)) || nextRound();
  const following = !s.roundId;
  const track = trackOf(round.trackId);
  const team = teamById(s.teamId);
  const open = liveTickets(s.tickets).filter(t => !t.doneAt);
  const ticket = open.find(t => t.id === s.draftTicketId) ?? null;

  const [opt, setOpt] = useState(() => Math.max(0, OPTIONS.findIndex(x => x.min === s.lastLength)));
  const [subject, setSubject] = useState('');
  const o = OPTIONS[opt];
  const laps = FORMATS[o.format].laps(track.laps);
  const budget = o.min * MIN * VSC_BUDGET_SHARE;
  const lapS = (o.min * 60) / laps;
  const counts = o.format === 'gp' || round.sprint;

  const champ = useMemo(() => championship(s.history), [s.history]);
  const me = champ.rows.findIndex(r => r.you);
  const focus = s.history.reduce((a, r) => a + r.focusMs, 0);

  return (
    <main className="page garage">
      <motion.section
        className="glass next-race"
        initial={{ scale: 0.98 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
        aria-labelledby="gp-name"
      >
        <header>
          <span className="eyebrow">
            {following ? 'Next on the calendar' : 'Chosen Grand Prix'} · {weekendLabel(round)}
            {round.sprint && <b className="chip">Sprint weekend</b>}
          </span>
          <h2 id="gp-name">{round.name}</h2>
          <div className="meta num">
            <span>{track.name}</span>
            <span>{track.lengthKm.toFixed(3)} km</span>
            <span>{track.laps} laps</span>
            <button className="link" onClick={() => s.setTab('season')}>Change Grand Prix</button>
            {!following && <button className="link" onClick={() => s.pickRound(null)}>Follow the calendar</button>}
          </div>
        </header>

        <form
          onSubmit={e => {
            e.preventDefault();
            s.lineUp({ format: o.format, durationMin: o.min, subject: ticket ? ticket.title : subject, roundId: round.id, ticketId: ticket?.id });
          }}
          style={{ display: 'grid', gap: 'var(--s5)' }}
        >
          <div>
            <span className="label" id="what">What are you racing on?</span>
            {open.length > 0 && (
              <div className="ticket-pick" role="group" aria-labelledby="what">
                {open.slice(0, 6).map(t => (
                  <button type="button" key={t.id} aria-pressed={ticket?.id === t.id}
                    onClick={() => s.setDraftTicket(ticket?.id === t.id ? null : t.id)}>{t.title}</button>
                ))}
              </div>
            )}
            {!ticket && (
              <input
                id="subject" className="field" value={subject} maxLength={80} aria-labelledby="what"
                placeholder={open.length ? 'Or type a one-off subject' : 'e.g. Organic chemistry, chapter 4'}
                onChange={e => setSubject(e.target.value)} autoComplete="off"
                style={{ marginTop: open.length ? 'var(--s2)' : 0 }}
              />
            )}
          </div>

          <div>
            <span className="label" id="len">Race length, minutes</span>
            <div className="seg num" role="group" aria-labelledby="len">
              {OPTIONS.map((x, i) => (
                <button type="button" key={x.min} aria-pressed={opt === i} onClick={() => setOpt(i)} aria-label={`${x.label}, ${x.min} minutes`}>
                  <strong>{x.min}</strong><small><span className="long">{x.label}</span><span className="short">{x.format === 'gp' ? 'GP' : 'Sprint'}</span></small>
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className="label" id="seat">Your seat</span>
            <div className="teams" role="group" aria-labelledby="seat">
              {TEAMS.map(t => (
                <button
                  type="button" key={t.id} className="team" aria-pressed={s.teamId === t.id}
                  style={{ '--team': t.color } as React.CSSProperties}
                  onClick={() => s.setTeam(t.id)}
                >
                  <i />{t.name}
                </button>
              ))}
            </div>
          </div>

          <ul className="rules num">
            <li><b className="g">LAP</b><span>{laps} laps, one every {Math.floor(lapS / 60)}:{String(Math.round(lapS % 60)).padStart(2, '0')} of focus. Clean laps build pace.</span></li>
            <li><b className="y">VSC</b><span>Pause any time. The field is frozen for {clock(budget)} in total, then races on without you.</span></li>
            <li><b className="r">DNF</b><span>One stop longer than {clock(stopLimitFor(budget))} retires the car.</span></li>
            {!counts && <li><b className="n">NOTE</b><span>{round.name} has no sprint, so this one is practice and won't score championship points.</span></li>}
          </ul>

          <button className="btn btn-primary" type="submit">
            <IconFlag />Line up on the grid
          </button>
        </form>
      </motion.section>

      <aside className="garage-side">
        <figure className="car-stage" style={{ '--team': team.color } as React.CSSProperties}>
          <Suspense fallback={<div className="car-fallback" />}>
            <Car3D color={team.color} spin={!reduce} />
          </Suspense>
          <figcaption><i />{team.name} · your car</figcaption>
        </figure>

        <section className="season-card" aria-labelledby="champ-h">
          <div className="season-head">
            <h3 id="champ-h">Championship</h3>
            <button className="link" onClick={() => s.setTab('season')}>Full standings</button>
          </div>
          <div className="season-stats num">
            <div className="stat"><strong>{me >= 0 ? `P${me + 1}` : '–'}</strong><span>position</span></div>
            <div className="stat"><strong>{me >= 0 ? champ.rows[me].points : 0}</strong><span>points</span></div>
            <div className="stat"><strong>{champ.rounds}</strong><span>rounds raced</span></div>
            <div className="stat"><strong>{Math.floor(focus / 3_600_000)}<small>h {Math.round((focus % 3_600_000) / 60_000)}m</small></strong><span>focused</span></div>
          </div>
          {s.history.length === 0 ? (
            <p className="empty">No races yet. Results land here after the chequered flag and score against the 2026 grid.</p>
          ) : (
            <ul className="results num">
              {s.history.slice(0, 4).map(r => (
                <li key={r.id}>
                  <button onClick={() => s.openResult(r.id)}>
                    <span className={'pos' + (r.status === 'dnf' ? ' dnf' : '')}>{r.status === 'dnf' ? 'DNF' : `P${r.position}`}</span>
                    <span className="what">
                      <div>{r.subject || 'Untitled session'}</div>
                      <small>{roundById(r.roundId)?.name.replace(' Grand Prix', '') ?? ''} · {FORMATS[r.format].label} · {minutes(r.focusMs)}</small>
                    </span>
                    <span className="pts">{r.points} pts</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </aside>
    </main>
  );
}
