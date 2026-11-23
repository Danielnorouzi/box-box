import { Suspense, lazy, useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useRace, currentWeekend } from '../../store/raceStore';
import { balance, championship, offers, studyMs, teamOf } from '../../store/derive';
import { teamById } from '../../data/teams';
import { trackOf } from '../../data/tracks';
import { nextRound, roundById, roundNumber, weekendLabel } from '../../data/calendar';
import { TIME } from '../../config/balance';
import { lapMsFor } from '../../sim/setup';
import { minutes } from '../../lib/format';
import { DEFAULT_HELMET } from '../../lib/helmets';
import { TrackOutline } from '../TrackOutline';
import { IconFlag } from '../icons';

const CarScene = lazy(() => import('../../three/scenes/CarScene'));
const ease = [0.22, 1, 0.36, 1] as const;

function Offers() {
  const s = useRace();
  const list = offers(s);
  if (!list.length) return null;
  const o = list[list.length - 1];
  const t = teamById(o.team);
  return (
    <motion.section className="offer" style={{ '--team': t.color } as React.CSSProperties} initial={{ opacity: 0.35, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease }} aria-labelledby="offer-h">
      <span className="offer-stamp">Contract offer</span>
      <h3 id="offer-h">{t.name} want you for the rest of the season.</h3>
      <p>Your hours and recent results got their attention. Their car is quicker than {teamById(teamOf(s)).name}'s. Your R&amp;D upgrades come with you.</p>
      <div className="offer-actions">
        <button className="btn btn-primary" onClick={() => s.signContract(o.team)}>Sign with {t.name}</button>
        <button className="btn btn-ghost" onClick={() => s.declineOffer(o.team)}>Stay put</button>
      </div>
    </motion.section>
  );
}

export function Garage() {
  const s = useRace();
  const reduce = useReducedMotion() ?? false;
  const team = teamById(teamOf(s));
  const round = (s.roundId && roundById(s.roundId)) || nextRound();
  const track = trackOf(round.trackId);
  const lapMs = lapMsFor(round.trackId);
  const [laps, setLaps] = useState(() => Math.min(track.laps, s.lastLaps));
  const total = laps * lapMs;
  const open = currentWeekend(s);
  const champ = useMemo(() => championship(s), [s.history]); // eslint-disable-line react-hooks/exhaustive-deps
  const me = champ.rows.findIndex(r => r.you);
  const hours = studyMs(s) / 3_600_000;
  const presets = [...TIME.lapPresets.filter(p => p < track.laps), track.laps];

  return (
    <main className="page garage">
      <section className="hero-car" style={{ '--team': team.color } as React.CSSProperties}>
        <div className="hero-meta">
          <h1>{team.name}</h1>
          <p className="num">#{s.driver?.number} {s.driver?.name} · {hours.toFixed(1)} h studied · {balance(s)} credits</p>
        </div>
        <Suspense fallback={<div className="car-fallback" />}>
          <CarScene primary={team.color} secondary={team.color2} number={s.driver?.number ?? 7} helmet={s.driver?.helmet ?? DEFAULT_HELMET} spin={!reduce} className="car-canvas" />
        </Suspense>
      </section>

      <AnimatePresence><Offers /></AnimatePresence>

      <section className="gp-card" aria-labelledby="gp-h">
        <div className="gp-top">
          <div>
            <h2 id="gp-h">{round.name}</h2>
            <p className="num">Round {roundNumber(round.id)} · {weekendLabel(round)}{s.roundId ? '' : ' · next up'}<br />{track.name} · {track.lengthKm.toFixed(3)} km · rain chance {Math.round(track.rain * 100)}%</p>
            <button className="link" onClick={() => s.setTab('season')}>Choose another Grand Prix</button>
          </div>
          <TrackOutline id={round.trackId} className="gp-map" width={26} />
        </div>

        {open ? (
          <div className="resume">
            <p>You have a weekend in progress at the {roundById(open.roundId)?.name}.</p>
            <button className="btn btn-primary btn-xl" onClick={() => useRace.setState({ weekendId: open.id })}><IconFlag />Back to the weekend</button>
          </div>
        ) : (
          <>
            <div className="laps-pick">
              <span className="label" id="laps-l">Race distance</span>
              <div className="seg" role="group" aria-labelledby="laps-l">
                {presets.map(p => (
                  <button key={p} aria-pressed={laps === p} onClick={() => setLaps(p)}>
                    <strong className="num">{p === track.laps ? 'Full' : p}</strong><small className="num">{p === track.laps ? `${p} laps` : 'laps'}</small>
                  </button>
                ))}
              </div>
              <div className="stepper num">
                <button className="btn btn-ghost small" aria-label="One lap fewer" onClick={() => setLaps(l => Math.max(TIME.minLaps, l - 1))}>−</button>
                <span>{laps} laps</span>
                <button className="btn btn-ghost small" aria-label="One lap more" onClick={() => setLaps(l => Math.min(track.laps, l + 1))}>+</button>
              </div>
            </div>
            <div className="race-time">
              <div><span className="big num">{minutes(total)}</span><span className="rt-label">total study time</span></div>
              <p className="num">{track.refLapMs / 1000 | 0}s real lap ÷ 30 = <b>{(lapMs / 60_000).toFixed(1)} min</b> of study per lap. Breaks happen in the pit lane.</p>
            </div>
            <button className="btn btn-primary btn-xl" onClick={() => s.openWeekend(round.id, laps)}><IconFlag />Get your ticket</button>
          </>
        )}
      </section>

      <section className="garage-strip num" aria-label="Season so far">
        <div><b>{me >= 0 ? `P${me + 1}` : '–'}</b><span>championship</span></div>
        <div><b>{me >= 0 ? champ.rows[me].points : 0}</b><span>points</span></div>
        <div><b>{s.history.filter(r => r.position === 1 && r.status === 'finished').length}</b><span>wins</span></div>
        <div><b>{hours.toFixed(1)}</b><span>hours</span></div>
      </section>
    </main>
  );
}
