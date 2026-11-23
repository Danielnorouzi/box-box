import { LayoutGroup, motion, useReducedMotion } from 'framer-motion';
import type { StandingRow } from '../../sim/standings';
import { gap } from '../../lib/format';
import type { Phase } from '../../sim/clock';

export function TimingTower({ rows, lap, laps, phase }: { rows: StandingRow[]; lap: number; laps: number; phase: Phase }) {
  const reduce = useReducedMotion();
  return (
    <aside className="glass dark tower" aria-label="Timing tower">
      <div className="tower-head num">
        <strong>{phase === 'grid' ? 'Starting grid' : `Lap ${lap}/${laps}`}</strong>
        <span>{phase === 'grid' ? '' : 'Interval'}</span>
      </div>
      <LayoutGroup>
        <ol className="num">
          {rows.map(r => (
            <motion.li
              key={r.car.code}
              layout={reduce ? false : 'position'}
              transition={{ type: 'spring', stiffness: 420, damping: 38 }}
              className={r.car.isYou ? 'you' : undefined}
              style={{ '--team': r.car.color } as React.CSSProperties}
              aria-current={r.car.isYou ? 'true' : undefined}
            >
              <span className="p">{r.position}</span>
              <i />
              <span>{r.car.code}</span>
              <span className="g">
                {phase === 'grid' ? '' : r.position === 1 ? 'Leader' : r.lapsDown > 0 ? `+${r.lapsDown}L` : gap(r.intervalS)}
              </span>
            </motion.li>
          ))}
        </ol>
      </LayoutGroup>
    </aside>
  );
}
