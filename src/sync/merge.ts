import type { SyncedState } from '../store/raceStore';

const union = <T>(a: T[], b: T[], key: (x: T) => string, pick: (x: T, y: T) => T = x => x) => {
  const m = new Map<string, T>();
  for (const x of a) m.set(key(x), x);
  for (const y of b) {
    const k = key(y);
    const x = m.get(k);
    m.set(k, x ? pick(x, y) : y);
  }
  return [...m.values()];
};

/**
 * Two devices' states → one. Pure and order-independent. Every list is an append-only log
 * (results, weekends, R&D purchases, contracts, activities), so merging is a union; credits,
 * levels and your current team are derived from the logs and can never conflict.
 * Weekends gain fields over time (ticket ripped, practice, quali), so the two copies are combined.
 */
export function mergeStates(local: SyncedState, remote: Partial<SyncedState> | null): SyncedState {
  if (!remote) return local;
  const r = { ...local, ...remote } as SyncedState;
  const history = union(local.history, r.history ?? [], x => x.id).sort((a, b) => b.startedAt - a.startedAt);
  const weekends = union(local.weekends, r.weekends ?? [], x => x.id, (x, y) => ({ ...x, ...y, ...Object.fromEntries(Object.entries(x).filter(([, v]) => v !== undefined)) }))
    .sort((a, b) => b.createdAt - a.createdAt);
  const purchases = union(local.purchases, r.purchases ?? [], x => x.id).sort((a, b) => a.t - b.t);
  const contracts = union(local.contracts, r.contracts ?? [], x => `${x.team}@${x.t}`).sort((a, b) => a.t - b.t);
  const declined = [...new Set([...local.declined, ...(r.declined ?? [])])];
  const activity = union(local.activity, r.activity ?? [], x => x.id).sort((a, b) => b.t - a.t);
  const newerDriver = (r.driverUpdatedAt ?? 0) > local.driverUpdatedAt;
  const filed = new Set(history.map(h => h.id));
  const active = [local.active, r.active ?? null]
    .filter((a): a is NonNullable<typeof a> => !!a && !filed.has(a.id))
    .sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0))[0] ?? null;
  return {
    driver: newerDriver ? r.driver ?? local.driver : local.driver,
    driverUpdatedAt: Math.max(local.driverUpdatedAt, r.driverUpdatedAt ?? 0),
    history, weekends, purchases, contracts, declined, activity, active,
  };
}
