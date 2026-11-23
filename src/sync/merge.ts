import type { SyncedState } from '../store/raceStore';
import type { ActivityEntry, RaceResult, Ticket } from '../types';

const byId = <T extends { id: string }>(a: T[], b: T[], pick: (x: T, y: T) => T) => {
  const m = new Map<string, T>();
  for (const x of a) m.set(x.id, x);
  for (const y of b) {
    const x = m.get(y.id);
    m.set(y.id, x ? pick(x, y) : y);
  }
  return [...m.values()];
};

/**
 * Two devices' states → one. Pure and order-independent:
 * results and activity are append-only (union by id), tickets are last-write-wins
 * (deletes are tombstones), and the live race is whichever side touched it last,
 * unless that race has already been filed as a result.
 */
export function mergeStates(local: SyncedState, remote: SyncedState | null): SyncedState {
  if (!remote) return local;
  const history = byId<RaceResult>(local.history, remote.history, x => x).sort((a, b) => b.startedAt - a.startedAt);
  const tickets = byId<Ticket>(local.tickets, remote.tickets, (x, y) => (y.updatedAt > x.updatedAt ? y : x))
    .sort((a, b) => b.createdAt - a.createdAt);
  const activity = byId<ActivityEntry>(local.activity, remote.activity, x => x).sort((a, b) => b.t - a.t).slice(0, 3000);
  const filed = new Set(history.map(h => h.id));
  const candidates = [local.active, remote.active].filter((a): a is NonNullable<typeof a> => !!a && !filed.has(a.id));
  const active = candidates.sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0))[0] ?? null;
  return { teamId: local.teamId, active, history, tickets, activity };
}
