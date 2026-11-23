import { useState } from 'react';
import { motion } from 'framer-motion';
import { useRace } from '../../store/raceStore';
import { balance, rndLevels, seasonCapLeft, seasonNumber, seasonSpent, teamOf } from '../../store/derive';
import { RND, TEAM_DEFICIT } from '../../config/balance';
import { AREAS, carPace, rndCost, rndFrac, rndGain } from '../../sim/progression';
import { teamById } from '../../data/teams';
import { buzz } from '../../lib/haptics';
import type { RndArea } from '../../types';

const ease = [0.22, 1, 0.36, 1] as const;

/** Shown as tenths per lap at a 90-second circuit, which is how a real engineer would talk about it. */
const tenths = (pace: number) => (pace * 90).toFixed(2);

export function CarRnd() {
  const s = useRace();
  const lv = rndLevels(s);
  const bal = balance(s);
  const team = teamOf(s);
  const capLeft = seasonCapLeft(s);
  const [msg, setMsg] = useState<{ area: RndArea; text: string } | null>(null);
  const total = carPace(team, lv);

  return (
    <main className="page narrow rnd">
      <div className="section-head">
        <h2>Car development</h2>
        <p>Only study earns these credits. Each upgrade costs more than the last and gives a little less. Spending is capped each season.</p>
      </div>

      <div className="rnd-top num">
        <div className="credit-big"><b>{bal}</b><span>credits</span></div>
        <div className="cap">
          <span>Season {seasonNumber(s)} budget cap</span>
          <div className="bar"><div style={{ transform: `scaleX(${seasonSpent(s) / RND.seasonCap})` }} /></div>
          <small>{seasonSpent(s)} of {RND.seasonCap} spent · resets after the finale</small>
        </div>
        <div className="pace">
          <span>Car vs quickest</span>
          <b className={total >= 0 ? 'green' : undefined}>{total >= 0 ? '+' : '−'}{tenths(Math.abs(total))}s</b>
          <small>{teamById(team).name} base −{tenths(TEAM_DEFICIT[team])}s per lap</small>
        </div>
      </div>

      <ul className="rnd-tree">
        {AREAS.map((a, i) => {
          const L = lv[a];
          const maxed = L >= RND.maxLevel;
          const cost = rndCost(L);
          const next = a === 'reliability' ? null : rndGain(a, L + 1) - rndGain(a, L);
          const reason = maxed ? 'Fully developed.' : bal < cost ? `${cost - bal} more credits needed.` : capLeft < cost ? 'Over this season’s budget cap.' : null;
          return (
            <motion.li key={a} className="rnd-item" initial={{ opacity: 0.35, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06, duration: 0.35, ease }}>
              <div className="rnd-head">
                <h3>{RND.areas[a].label}</h3>
                <span className="lvl num">Level {L}<small>/{RND.maxLevel}</small></span>
              </div>
              <p>{RND.areas[a].blurb}</p>
              <div className="pips" aria-hidden>{Array.from({ length: RND.maxLevel }, (_, k) => <i key={k} className={k < L ? 'on' : ''} />)}</div>
              <div className="rnd-foot num">
                <span>{a === 'reliability' ? `${Math.round(rndFrac(a, L) * 100)}% of max effect` : `+${tenths(rndGain(a, L))}s now${next ? ` · next +${tenths(next)}s` : ''}`}</span>
                <button className="btn btn-primary small" disabled={!!reason}
                  onClick={() => { const e = s.buyRnd(a); setMsg(e ? { area: a, text: e } : null); if (!e) buzz('light'); }}>
                  {maxed ? 'Maxed' : `Develop · ${cost}`}
                </button>
              </div>
              {(reason && !maxed) && <p className="rnd-why">{reason}</p>}
              {msg?.area === a && <p className="inline-error" role="alert">{msg.text}</p>}
            </motion.li>
          );
        })}
      </ul>
    </main>
  );
}
