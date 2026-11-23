import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useRace } from '../../store/raceStore';
import { useNow } from '../../hooks/useNow';
import { deriveClock } from '../../sim/clock';
import { standings } from '../../sim/standings';
import { trackOf } from '../../data/tracks';
import { roundById } from '../../data/calendar';
import { useWakeLock } from '../../hooks/useWakeLock';
import { lightBeep, lightsOut, unlock } from '../../lib/sound';
import { clock as fmt, lapTime } from '../../lib/format';
import type { ActiveRace } from '../../types';
import { TrackMap } from './TrackMap';
import { TimingTower } from './TimingTower';
import { IconBack, IconFlag, IconPause, IconPlay, IconStop } from '../icons';

export function RaceScreen({ race }: { race: ActiveRace }) {
  const { push, settle, leaveGrid, settings } = useRace();
  const now = useNow(40);
  const cfg = race.config;
  const track = trackOf(cfg.trackId);
  const round = roundById(cfg.roundId);
  const c = useMemo(() => deriveClock(race, now), [race, now]);
  const { rows, laps } = useMemo(() => standings(cfg, c), [cfg, c]);
  const you = rows.find(r => r.car.isYou)!;

  // File the result the moment the race is over (including while the tab was in the background).
  useEffect(() => {
    if (c.phase === 'finished' || c.phase === 'dnf') settle(now);
  }, [c.phase, now, settle]);

  const lapPos = c.focusMs / cfg.lapMs;
  const lapNo = Math.min(cfg.laps, Math.floor(lapPos) + 1);
  const lapFrac = lapPos - Math.floor(lapPos);
  const lapLeft = cfg.lapMs * (lapNo - lapPos);
  const raceLeft = cfg.durationMs - c.focusMs;
  const budgetLeft = Math.max(0, cfg.vscBudgetMs - c.vscUsedMs);
  const completed = laps.slice(0, Math.floor(lapPos + 1e-9));
  const last = completed.at(-1);
  const best = completed.filter(l => l.clean).reduce((m, l) => Math.min(m, l.f1Ms), Infinity);
  const paused = c.phase === 'vsc' || c.phase === 'stopped';

  // Tab title doubles as a glanceable timer.
  useEffect(() => {
    document.title =
      c.phase === 'grid' ? 'On the grid · Box Box'
        : paused ? `${c.phase === 'vsc' ? 'VSC' : 'STOPPED'} · P${you.position} · Box Box`
          : `L${lapNo}/${cfg.laps} · ${fmt(lapLeft)} · P${you.position}`;
    return () => { document.title = 'Box Box'; };
  }, [c.phase, paused, lapNo, cfg.laps, lapLeft, you.position]);

  // Start lights: five reds, one a second, then a random hold before lights out.
  const [lights, setLights] = useState(-1);
  const timers = useRef<number[]>([]);
  useWakeLock(settings.wakeLock && (c.phase === 'green' || paused || lights >= 0));
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const startSequence = () => {
    if (settings.sound) unlock(); // must happen inside the tap
    setLights(0);
    for (let i = 1; i <= 5; i++) {
      timers.current.push(window.setTimeout(() => { setLights(i); if (useRace.getState().settings.sound) lightBeep(i); }, i * 900));
    }
    const hold = 5 * 900 + 500 + Math.random() * 1800;
    timers.current.push(window.setTimeout(() => {
      setLights(-1);
      push('start');
      if (useRace.getState().settings.sound) lightsOut();
    }, hold));
  };

  // Retire needs a second press within four seconds.
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 4000);
    return () => clearTimeout(t);
  }, [armed]);

  // Space toggles VSC.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== 'Space' || (e.target as HTMLElement).closest('button, input')) return;
      e.preventDefault();
      if (c.phase === 'green') push('vsc_on');
      else if (paused) push('vsc_off');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [c.phase, paused, push]);

  return (
    <main className="race">
      <div className="top">
        <section className="glass dark lapclock num" aria-label="Lap clock">
          <dl>
            <dt>LAP</dt>
            <dd className="big">{c.phase === 'grid' ? 0 : lapNo}<small>/{cfg.laps}</small></dd>
          </dl>
          <dl>
            <dt>POSITION</dt>
            <dd className="big">P{you.position}</dd>
          </dl>
          <dl>
            <dt>THIS LAP</dt>
            <dd>{c.phase === 'grid' ? fmt(cfg.lapMs) : fmt(lapLeft)}</dd>
          </dl>
          <dl>
            <dt>TO THE FLAG</dt>
            <dd>{fmt(raceLeft)}</dd>
          </dl>
          <dl>
            <dt>LAST LAP</dt>
            <dd className={last && last.clean && last.f1Ms === best ? 'purple' : undefined}>{last ? lapTime(last.f1Ms) : '–'}</dd>
          </dl>
          <dl className="subject">
            <dt>{(round?.name ?? track.name).toUpperCase()}</dt>
            <dd title={cfg.subject}>{cfg.subject || 'Free session'}</dd>
          </dl>
        </section>
      </div>

      <div className="race-map">
        <TrackMap track={track} rows={rows} phase={c.phase} lapFrac={lapFrac} />
        {lights >= 0 && c.phase === 'grid' && (
          <div className="lights">
            <div className="glass dark lights-row" role="status" aria-label={`${lights} of 5 lights`}>
              {[1, 2, 3, 4, 5].map(i => <div key={i} className={'lamp' + (lights >= i ? ' on' : '')} />)}
            </div>
          </div>
        )}
      </div>

      <TimingTower rows={rows} lap={Math.min(cfg.laps, Math.max(1, Math.floor(rows[0].distance) + 1))} laps={cfg.laps} phase={c.phase} />

      <div className="glass dark controls" style={{ flexWrap: 'wrap' }}>
        <AnimatePresence initial={false}>
          {paused && (
            <motion.div
              key={c.phase}
              className={'flag num ' + c.phase}
              style={{ flexBasis: '100%' }}
              initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              role="status"
            >
              <span className="tag">{c.phase === 'vsc' ? 'VSC' : 'STOPPED'}</span>
              <p>
                {c.phase === 'vsc'
                  ? 'Field frozen. You hold P' + you.position + '.'
                  : 'VSC budget used. The field is racing without you.'}
              </p>
              <span className="count" aria-label={c.phase === 'vsc' ? 'VSC budget left' : 'Time until DNF'}>
                {c.phase === 'vsc' ? fmt(budgetLeft) : fmt((c.stopLimitAt ?? now) - now)}
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="main">
          {c.phase === 'grid' && (
            <>
              <button className="btn btn-primary" onClick={startSequence} disabled={lights >= 0}>
                <IconFlag />{lights >= 0 ? 'Lights…' : 'Start the race'}
              </button>
              <button className="btn btn-ghost" onClick={leaveGrid} disabled={lights >= 0}>
                <IconBack />Garage
              </button>
            </>
          )}
          {c.phase === 'green' && (
            <button className="btn btn-vsc" onClick={() => push('vsc_on')}>
              <IconPause />Call VSC
            </button>
          )}
          {paused && (
            <button className="btn btn-green" onClick={() => push('vsc_off')}>
              <IconPlay />Green flag
            </button>
          )}
          {(c.phase === 'green' || paused) && (
            <button
              className={'btn btn-danger' + (armed ? ' armed' : '')}
              onClick={() => (armed ? push('retire') : setArmed(true))}
            >
              <IconStop />{armed ? 'Confirm retire' : 'Retire'}
            </button>
          )}
        </div>

        {c.phase === 'grid' ? (
          <span className="hint num">You start P{cfg.gridSlot} of {rows.length}</span>
        ) : (
          <div className="budget num">
            <span>VSC budget {fmt(budgetLeft)}</span>
            <div className="bar"><div style={{ transform: `scaleX(${budgetLeft / cfg.vscBudgetMs})` }} /></div>
          </div>
        )}
      </div>
    </main>
  );
}
