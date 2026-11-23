import { LayoutGroup, motion, useReducedMotion } from 'framer-motion';
import type { Row } from '../../sim/race';
import { gap } from '../../lib/format';
import type { Phase } from '../../sim/clock';
import { TYRES } from '../../config/balance';
import type { TyreId } from '../../types';

export function TimingTower({ rows, lap, laps, phase, yourTyre, youDnf }: { rows: Row[]; lap: number; laps: number; phase: Phase; yourTyre: TyreId; youDnf: boolean }) {
  const reduce = useReducedMotion();
  return (
    <aside className="tower" aria-label="Timing tower">
      <div className="tower-head num">
        <strong>{phase === 'grid' ? 'Grid' : <>LAP <b>{lap}</b>/{laps}</>}</strong>
        <span>{phase === 'grid' ? '' : 'INT'}</span>
      </div>
      <LayoutGroup>
        <ol className="num">
          {rows.map(r => {
            const out = r.dnf || (r.car.isYou && youDnf);
            return (
              <motion.li
                key={r.car.code}
                layout={reduce ? false : 'position'}
                transition={{ type: 'spring', stiffness: 420, damping: 38 }}
                className={(r.car.isYou ? 'you' : '') + (out ? ' out' : '')}
                style={{ '--team': r.car.color } as React.CSSProperties}
                aria-current={r.car.isYou ? 'true' : undefined}
              >
                <span className="p">{out ? '' : r.position}</span>
                <i />
                <span className="code">{r.car.code}</span>
                {r.car.isYou && !out && <span className="tyre-chip" style={{ '--tyre': TYRES[yourTyre].color } as React.CSSProperties} title={TYRES[yourTyre].label}>{TYRES[yourTyre].label[0]}</span>}
                <span className="g">
                  {out ? <b className="dnf-tag">DNF</b> : r.inPit ? 'PIT' : phase === 'grid' ? '' : r.position === 1 ? 'Leader' : r.lapsDown > 0 ? `+${r.lapsDown}L` : gap(r.intervalS)}
                </span>
              </motion.li>
            );
          })}
        </ol>
      </LayoutGroup>
    </aside>
  );
}
