// Box Box sync server. No dependencies: `node server/server.mjs` (PORT, DATA_DIR env vars).
// Stores one JSON document per sync key, with a version number for optimistic concurrency.
// The client does all merging; the server only refuses stale writes (409).
import { createServer } from 'node:http';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';
import { join } from 'node:path';

const PORT = Number(process.env.PORT ?? 8787);
const DIR = process.env.DATA_DIR ?? join(process.cwd(), 'server-data');
const MAX_BODY = 5 * 1024 * 1024;
await mkdir(DIR, { recursive: true });

const fileFor = key => join(DIR, createHash('sha256').update(key).digest('hex') + '.json');
const cors = {
  'Access-Control-Allow-Origin': process.env.ALLOW_ORIGIN ?? '*',
  'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
};
const send = (res, code, body) => {
  res.writeHead(code, { ...cors, 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
};
const load = async key => {
  try { return JSON.parse(await readFile(fileFor(key), 'utf8')); } catch { return { version: 0, state: null }; }
};
// Writes for one key are serialised so the version check and the write are atomic.
const locks = new Map();
const withLock = (key, fn) => {
  const prev = locks.get(key) ?? Promise.resolve();
  const next = prev.then(fn, fn);
  locks.set(key, next.catch(() => {}));
  return next;
};

createServer(async (req, res) => {
  if (req.method === 'OPTIONS') { res.writeHead(204, cors); return res.end(); }
  const url = new URL(req.url, 'http://x');
  if (url.pathname === '/health') return send(res, 200, { ok: true });
  if (url.pathname !== '/v1/state') return send(res, 404, { error: 'not found' });
  const key = (req.headers.authorization ?? '').replace(/^Bearer\s+/i, '');
  if (key.length < 16) return send(res, 401, { error: 'sync key must be at least 16 characters' });

  if (req.method === 'GET') return send(res, 200, await load(key));
  if (req.method === 'PUT') {
    let size = 0; const chunks = [];
    for await (const c of req) { size += c.length; if (size > MAX_BODY) return send(res, 413, { error: 'too large' }); chunks.push(c); }
    let body;
    try { body = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { return send(res, 400, { error: 'bad json' }); }
    return withLock(key, async () => {
      const cur = await load(key);
      if (body.baseVersion !== cur.version) return send(res, 409, { error: 'stale', version: cur.version });
      const doc = { version: cur.version + 1, state: body.state, updatedAt: Date.now() };
      const f = fileFor(key);
      await writeFile(f + '.tmp', JSON.stringify(doc));
      await rename(f + '.tmp', f);
      send(res, 200, { version: doc.version });
    });
  }
  send(res, 405, { error: 'method not allowed' });
}).listen(PORT, () => console.log(`Box Box sync on :${PORT}, data in ${DIR}`));
