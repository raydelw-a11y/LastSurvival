// LastSurvival cloud save sync — Cloudflare Worker + D1.
//
// POST /v1/saves         body: SyncEnvelope        -> creates a save, returns { code, ...envelope }
// PUT  /v1/saves/:code   body: SyncEnvelope        -> merges with stored save, returns merged envelope
// GET  /v1/saves/:code                             -> returns stored envelope
//
// The sync code itself is the (unguessable, 60-bit) secret; no accounts needed.
import { mergeEnvelopes, type SyncEnvelope } from '../../src/sync/mergeProgress';

interface D1Result<T> {
  results?: T[];
  meta?: { changes?: number };
}
interface D1Stmt {
  bind(...values: unknown[]): D1Stmt;
  first<T>(): Promise<T | null>;
  run(): Promise<D1Result<unknown>>;
}
interface D1Database {
  prepare(sql: string): D1Stmt;
}
interface Env {
  DB: D1Database;
}

interface SaveRow {
  data: string;
  saved_at: number;
  generation: number;
  updated_at: number;
}

const ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // no 0/O, 1/I
const CODE_RE = /^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{12}$/;
const MAX_BODY = 48 * 1024;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...CORS },
  });

function newCode(): string {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => ALPHABET[b & 31]).join('');
}

function normalizeCode(raw: string): string {
  return decodeURIComponent(raw).toUpperCase().replace(/[^0-9A-Z]/g, '');
}

async function readEnvelope(req: Request): Promise<SyncEnvelope | null> {
  const text = await req.text();
  if (!text || text.length > MAX_BODY) return null;
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return null;
  }
  const e = body as Partial<SyncEnvelope>;
  if (!e || typeof e !== 'object' || !e.progress || typeof e.progress !== 'object' || Array.isArray(e.progress)) {
    return null;
  }
  const savedAt = Number(e.savedAt);
  const generation = Number(e.generation);
  if (!Number.isFinite(savedAt) || savedAt < 0) return null;
  if (!Number.isInteger(generation) || generation < 0 || generation > 1_000_000) return null;
  // Don't trust far-future client clocks to win every merge forever
  return { progress: e.progress, savedAt: Math.min(savedAt, Date.now() + 5 * 60_000), generation };
}

const rowToEnvelope = (row: SaveRow): SyncEnvelope => ({
  progress: JSON.parse(row.data),
  savedAt: row.saved_at,
  generation: row.generation,
});

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });

    const url = new URL(req.url);
    const parts = url.pathname.split('/').filter(Boolean); // ['v1','saves',code?]
    if (parts[0] !== 'v1' || parts[1] !== 'saves' || parts.length > 3) {
      return json({ error: 'not_found' }, 404);
    }

    try {
      // ---- Create a new cloud save -------------------------------------------------
      if (parts.length === 2 && req.method === 'POST') {
        const env0 = await readEnvelope(req);
        if (!env0) return json({ error: 'bad_request' }, 400);
        for (let attempt = 0; attempt < 4; attempt++) {
          const code = newCode();
          const res = await env.DB.prepare(
            'INSERT OR IGNORE INTO saves (code, data, saved_at, generation, updated_at) VALUES (?, ?, ?, ?, ?)'
          )
            .bind(code, JSON.stringify(env0.progress), env0.savedAt, env0.generation, Date.now())
            .run();
          if (res.meta?.changes) return json({ code, ...env0 }, 201);
        }
        return json({ error: 'try_again' }, 503);
      }

      if (parts.length !== 3) return json({ error: 'not_found' }, 404);
      const code = normalizeCode(parts[2]);
      if (!CODE_RE.test(code)) return json({ error: 'invalid_code' }, 400);

      const load = () =>
        env.DB.prepare('SELECT data, saved_at, generation, updated_at FROM saves WHERE code = ?')
          .bind(code)
          .first<SaveRow>();

      // ---- Read -------------------------------------------------------------------
      if (req.method === 'GET') {
        const row = await load();
        return row ? json({ code, ...rowToEnvelope(row) }) : json({ error: 'unknown_code' }, 404);
      }

      // ---- Merge & write (optimistic concurrency on updated_at) --------------------
      if (req.method === 'PUT') {
        const incoming = await readEnvelope(req);
        if (!incoming) return json({ error: 'bad_request' }, 400);

        for (let attempt = 0; attempt < 4; attempt++) {
          const row = await load();
          if (!row) return json({ error: 'unknown_code' }, 404);
          const stored = rowToEnvelope(row);
          const merged = mergeEnvelopes(incoming, stored);
          const data = JSON.stringify(merged.progress);

          if (data === row.data && merged.savedAt === row.saved_at && merged.generation === row.generation) {
            return json({ code, ...merged }); // nothing new: skip the write
          }
          const res = await env.DB.prepare(
            'UPDATE saves SET data = ?, saved_at = ?, generation = ?, updated_at = ? WHERE code = ? AND updated_at = ?'
          )
            .bind(data, merged.savedAt, merged.generation, Date.now(), code, row.updated_at)
            .run();
          if (res.meta?.changes) return json({ code, ...merged });
        }
        return json({ error: 'conflict' }, 409);
      }

      return json({ error: 'method_not_allowed' }, 405);
    } catch (err) {
      return json({ error: 'server_error', detail: String(err).slice(0, 200) }, 500);
    }
  },
};
