import type { TicketInfo } from '../types';
import { trackOf } from '../data/tracks';
import { roundById, roundNumber } from '../data/calendar';
import { hash, rng } from '../sim/rng';

const TIERS: TicketInfo['tier'][] = ['General Admission', 'Grandstand', 'Grandstand Premium'];

export function makeTicket(roundId: string, seed: number): TicketInfo {
  const r = rng(hash(seed, 77));
  const t = trackOf(roundById(roundId)!.trackId);
  const tier = TIERS[r() < 0.15 ? 0 : r() < 0.75 ? 1 : 2];
  const ga = tier === 'General Admission';
  const serialChars = 'ACDEFHJKLMNPRTUVWXY3479';
  const serial = Array.from({ length: 12 }, (_, i) => (i === 4 || i === 8 ? '-' : serialChars[Math.floor(r() * serialChars.length)])).join('');
  return {
    serial,
    round: roundNumber(roundId),
    grandstand: ga ? 'General Admission Area' : t.grandstands[Math.floor(r() * t.grandstands.length)],
    gate: `${'ABCDEFGH'[Math.floor(r() * 8)]}${1 + Math.floor(r() * 9)}`,
    row: ga ? '—' : String.fromCharCode(65 + Math.floor(r() * 20)),
    seat: ga ? 0 : 1 + Math.floor(r() * 48),
    tier,
    price: ga ? 129 + Math.floor(r() * 40) : tier === 'Grandstand' ? 389 + Math.floor(r() * 260) : 790 + Math.floor(r() * 480),
  };
}
