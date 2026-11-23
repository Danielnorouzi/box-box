import type { ActivityEntry, Archetype, RaceConfig, TeamId, TyreId, Weather } from '../types';
import { TIME } from '../config/balance';
import { trackOf } from '../data/tracks';
import { roundById, seasonProgress } from '../data/calendar';
import { carPace, rndFrac, skillLevels, skillXp, type RndLevels } from './progression';
import { hash, rng } from './rng';

export interface CareerSnapshot {
  teamId: TeamId;
  rnd: RndLevels;
  activity: ActivityEntry[];
  archetype: Archetype;
  wetRaceXp: number;
  code: string;
  number: number;
}

export const lapMsFor = (trackId: string) => trackOf(trackId).refLapMs * TIME.studyPerF1;

export function weatherFor(trackId: string, seed: number): Weather {
  return rng(hash(seed, 33))() < trackOf(trackId).rain ? 'rain' : 'dry';
}

export function youFrom(c: CareerSnapshot): RaceConfig['you'] {
  return {
    code: c.code, number: c.number, carPace: carPace(c.teamId, c.rnd),
    skills: skillLevels(skillXp(c.activity, c.archetype, c.wetRaceXp)),
    reliability: rndFrac('reliability', c.rnd.reliability),
  };
}

export function raceConfig(o: {
  career: CareerSnapshot; roundId: string; laps: number; seed: number; weather: Weather; gridSlot: number; startTyre: TyreId;
  weekendId: string; plan?: string;
}): RaceConfig {
  const round = roundById(o.roundId)!;
  return {
    weekendId: o.weekendId, roundId: round.id, trackId: round.trackId, laps: o.laps, lapMs: lapMsFor(round.trackId),
    seed: o.seed, gridSlot: o.gridSlot, weather: o.weather, startTyre: o.weather === 'rain' ? 'inter' : o.startTyre,
    teamId: o.career.teamId, seasonProgress: seasonProgress(round.id), you: youFrom(o.career), plan: o.plan,
  };
}
