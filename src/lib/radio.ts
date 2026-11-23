import type { RaceConfig } from '../types';
import type { ClockState } from '../sim/clock';
import type { Lap, Row } from '../sim/race';
import { needsStop, stintLaps } from '../sim/race';
import { ABSENCE } from '../config/balance';

export interface RadioMsg { id: string; text: string; urgent: boolean }

/**
 * The race engineer. Decides what to say from the current state; each message has a stable id so
 * it's only said once per race. Short and specific, the way a real engineer talks.
 */
export function engineer(cfg: RaceConfig, c: ClockState, rows: Row[], laps: Lap[], om: { available: number; left: number }): RadioMsg | null {
  if (c.phase === 'grid') return null;
  const you = rows.find(r => r.car.isYou)!;
  const ahead = rows[you.position - 2];
  const behind = rows[you.position];
  const lapNo = Math.min(cfg.laps, Math.floor(c.focusMs / cfg.lapMs) + 1);
  const lapFrac = c.focusMs / cfg.lapMs - Math.floor(c.focusMs / cfg.lapMs);
  const stint = c.stints[c.stints.length - 1];
  const stintLap = Math.floor((c.focusMs - stint.fromFocusMs) / cfg.lapMs);
  const life = stintLaps(stint.tyre, cfg.laps);
  const lapsLeft = cfg.laps - lapNo;

  if (c.phase === 'away') return { id: `away-${c.awayStartedAt}`, text: c.strikes >= ABSENCE.strikesToDnf - 1 ? 'Final warning. Get back in the car now.' : 'Yellow flag. Come back to the car.', urgent: true };
  if (c.phase === 'pit') return { id: `pit-${c.stops.length}`, text: 'In the box. Take your break, we’ll hold the car.', urgent: false };
  if (c.phase === 'dnf') return { id: 'dnf', text: c.dnfReason === 'retired' ? 'Okay, box the car. We’re retiring it.' : 'Stop the car. Stop the car. We’re out.', urgent: true };
  if (c.phase === 'finished') return { id: 'flag', text: you.position === 1 ? 'Get in there! P1! Winner!' : you.position <= 3 ? `P${you.position}! Podium! Brilliant job.` : you.position <= 10 ? `P${you.position}, that’s points. Good work.` : `Chequered flag. P${you.position}. We’ll find more next time.`, urgent: false };
  if (lapNo === 1 && lapFrac < 0.08) return { id: 'start', text: `Good start. We’re P${you.position}. Settle in.`, urgent: false };
  if (stintLap + 1 >= life && lapsLeft > 0) return { id: `box-${c.stints.length}`, text: 'Box, box. Tyres are gone. Box this lap.', urgent: true };
  if (needsStop(cfg) && c.stops.length === 0 && lapsLeft === 2) return { id: 'mandatory', text: 'Reminder: we still need our stop. Box in the next two laps.', urgent: true };
  if (lapsLeft === 0 && lapFrac > 0.02) return { id: 'last', text: 'Last lap. Bring it home.', urgent: false };
  if (om.available > 0 && om.left > 0 && ahead && ahead.intervalS < 1.2) return { id: `om-${lapNo}`, text: `Overtake Mode is ready. ${ahead.car.code} is ${ahead.intervalS.toFixed(1)} ahead. Push now.`, urgent: false };
  if (laps.length && laps[laps.length - 1].error && lapFrac < 0.3) return { id: `err-${laps.length}`, text: 'Little moment there. Reset, you’re fine.', urgent: false };
  if (lapFrac > 0.1 && lapFrac < 0.2 && lapNo % 4 === 0) {
    const parts = [ahead && `Gap ahead ${ahead.intervalS.toFixed(1)}`, behind && `${behind.car.code} behind ${behind.intervalS.toFixed(1)}`].filter(Boolean);
    return { id: `gap-${lapNo}`, text: parts.join(', ') + '.', urgent: false };
  }
  return null;
}
