import { useRace, type SyncedState } from '../store/raceStore';
import { mergeStates } from './merge';

export type SyncResult = { ok: true; at: number } | { ok: false; message: string };

export const pick = (): SyncedState => {
  const s = useRace.getState();
  return {
    driver: s.driver, driverUpdatedAt: s.driverUpdatedAt, history: s.history, weekends: s.weekends, purchases: s.purchases,
    contracts: s.contracts, declined: s.declined, activity: s.activity, active: s.active,
  };
};

/**
 * Protocol (see server/server.mjs): GET /v1/state → { version, state }.
 * PUT /v1/state { baseVersion, state } → { version } or 409 if someone else wrote first.
 * The key is sent as a bearer token and is the only identity.
 */
export async function syncNow(): Promise<SyncResult> {
  const { syncUrl, syncKey } = useRace.getState().settings;
  if (!syncUrl || !syncKey) return { ok: false, message: 'Add a server address and a sync key first.' };
  let base: string;
  try {
    base = new URL('/v1/state', syncUrl).toString();
  } catch {
    return { ok: false, message: 'That server address is not a valid URL.' };
  }
  const headers = { Authorization: `Bearer ${syncKey}`, 'Content-Type': 'application/json' };
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const got = await fetch(base, { headers });
      if (got.status === 401) return { ok: false, message: 'The server refused this sync key.' };
      if (!got.ok) return { ok: false, message: `The server answered ${got.status}.` };
      const remote = (await got.json()) as { version: number; state: SyncedState | null };
      const merged = mergeStates(pick(), remote.state);
      const put = await fetch(base, { method: 'PUT', headers, body: JSON.stringify({ baseVersion: remote.version, state: merged }) });
      if (put.status === 409) continue; // another device wrote between our GET and PUT
      if (!put.ok) return { ok: false, message: `Saving failed, the server answered ${put.status}.` };
      const at = Date.now();
      // Merge again with anything that changed locally while we were on the network.
      useRace.getState().applySynced(mergeStates(pick(), merged), at);
      return { ok: true, at };
    } catch {
      return { ok: false, message: 'Could not reach the server. Check the address and your connection.' };
    }
  }
  return { ok: false, message: 'Another device kept writing at the same time. Try again.' };
}
