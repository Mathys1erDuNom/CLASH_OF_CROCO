import Fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import pg from 'pg';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { avatarUrl, cookie, discordUser, newState, parseCookies, signSession, verifySession } from './auth.ts';

interface User { id: string; name: string; avatar: string }
interface Store {
  get(id: string): Promise<unknown | null>;
  put(id: string, data: unknown): Promise<void>;
  getUser(id: string): Promise<User | null>;
  upsertUser(u: User): Promise<void>;
  listPlayers(): Promise<User[]>; // Discord accounts that have a save
}

async function postgresStore(url: string): Promise<Store> {
  const pool = new pg.Pool({ connectionString: url });
  pool.on('error', err => console.error('postgres idle client error', err)); // a dropped connection must not crash the server
  await pool.query(`CREATE TABLE IF NOT EXISTS saves (
    id TEXT PRIMARY KEY, data JSONB NOT NULL, updated_at TIMESTAMPTZ NOT NULL DEFAULT now())`);
  await pool.query(`CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY, name TEXT NOT NULL, avatar TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(), last_login TIMESTAMPTZ NOT NULL DEFAULT now())`);
  return {
    async get(id) {
      const r = await pool.query('SELECT data FROM saves WHERE id = $1', [id]);
      return r.rows[0]?.data ?? null;
    },
    async put(id, data) {
      await pool.query(
        `INSERT INTO saves (id, data) VALUES ($1, $2)
         ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = now()`,
        [id, JSON.stringify(data)],
      );
    },
    async getUser(id) {
      const r = await pool.query('SELECT id, name, avatar FROM users WHERE id = $1', [id]);
      return r.rows[0] ?? null;
    },
    async upsertUser(u) {
      await pool.query(
        `INSERT INTO users (id, name, avatar) VALUES ($1, $2, $3)
         ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, avatar = EXCLUDED.avatar, last_login = now()`,
        [u.id, u.name, u.avatar],
      );
    },
    async listPlayers() {
      return (await pool.query(`SELECT u.id, u.name, u.avatar FROM users u
        WHERE EXISTS (SELECT 1 FROM saves s WHERE s.id = 'd-' || u.id) ORDER BY u.name`)).rows;
    },
  };
}

// Local fallback when DATABASE_URL is absent: one JSON file per player in .data/
async function fileStore(dir: string): Promise<Store> {
  await mkdir(dir, { recursive: true });
  const files: Store = {
    async get(id) {
      try { return JSON.parse(await readFile(join(dir, `${id}.json`), 'utf8')); }
      catch { return null; }
    },
    async put(id, data) { await writeFile(join(dir, `${id}.json`), JSON.stringify(data)); },
    async getUser(id) { return await files.get(`user-${id}`) as User | null; },
    async upsertUser(u) { await files.put(`user-${u.id}`, u); },
    async listPlayers() {
      const out: User[] = [];
      for (const f of await readdir(dir)) {
        const m = /^user-(.+)\.json$/.exec(f);
        if (m && await files.get(`d-${m[1]}`)) out.push(await files.get(`user-${m[1]}`) as User);
      }
      return out;
    },
  };
  return files;
}

const url = process.env.DATABASE_URL;
const store = url ? await postgresStore(url) : await fileStore(join(process.cwd(), '.data'));
if (!url) console.warn('DATABASE_URL absent : sauvegardes dans .data/ (perdues à chaque redéploiement sur Railway)');

const app = Fastify({ logger: true, bodyLimit: 256 * 1024 });
const ID = /^[A-Za-z0-9-]{8,64}$/; // ids are client-generated UUIDs; this also blocks path traversal in fileStore

app.get('/api/health', async () => ({ ok: true, storage: url ? 'postgres' : 'file', discord: !!discord }));

// ---- Discord login (enabled when the three DISCORD_* variables are set)
const env = process.env;
const discord = env.DISCORD_CLIENT_ID && env.DISCORD_CLIENT_SECRET && env.DISCORD_REDIRECT_URI
  ? { id: env.DISCORD_CLIENT_ID, secret: env.DISCORD_CLIENT_SECRET, redirect: env.DISCORD_REDIRECT_URI } : null;
const sessionSecret = env.SESSION_SECRET ?? '';
if (discord && sessionSecret.length < 32) throw new Error('SESSION_SECRET (32 caractères minimum) est requis quand la connexion Discord est activée');
const secure = discord?.redirect.startsWith('https://') ?? false;
const SESSION_DAYS = 30;
const sessionOf = (req: { headers: { cookie?: string } }) =>
  discord ? verifySession(parseCookies(req.headers.cookie).croco_session, sessionSecret) : null;
const saveKey = (uid: string) => `d-${uid}`; // a Discord account's save id

app.get('/auth/discord', async (_req, reply) => {
  if (!discord) return reply.code(404).send({ error: 'discord login disabled' });
  const state = newState(); // anti-CSRF: must come back unchanged in the callback
  reply.header('set-cookie', cookie('croco_oauth_state', state, 600, secure));
  const q = new URLSearchParams({ client_id: discord.id, redirect_uri: discord.redirect, response_type: 'code', scope: 'identify', state });
  return reply.redirect(`https://discord.com/oauth2/authorize?${q}`);
});

app.get<{ Querystring: { code?: string; state?: string } }>('/auth/discord/callback', async (req, reply) => {
  if (!discord) return reply.code(404).send({ error: 'discord login disabled' });
  const { code, state } = req.query;
  // no state cookie = the player started the login on another address than DISCORD_REDIRECT_URI, or cookies are blocked
  if (!code || !state || state !== parseCookies(req.headers.cookie).croco_oauth_state) return reply.redirect('/?login=state');
  try {
    const u = await discordUser(code, discord);
    await store.upsertUser({ id: u.id, name: u.global_name || u.username, avatar: avatarUrl(u) });
    const token = signSession({ uid: u.id, exp: Date.now() + SESSION_DAYS * 86_400_000 }, sessionSecret);
    reply.header('set-cookie', [cookie('croco_session', token, SESSION_DAYS * 86_400, secure), cookie('croco_oauth_state', '', 0, secure)]);
    return reply.redirect('/?login=ok');
  } catch (e) {
    req.log.error(e, 'discord login failed');
    return reply.redirect('/?login=discord');
  }
});

app.post('/auth/logout', async (_req, reply) => {
  reply.header('set-cookie', cookie('croco_session', '', 0, secure));
  return { ok: true };
});

app.get('/api/me', async (req, reply) => {
  reply.header('cache-control', 'no-store');
  if (!discord) return { authEnabled: false };
  const s = sessionOf(req);
  return { authEnabled: true, loginHost: new URL(discord.redirect).host, user: s ? await store.getUser(s.uid) : null };
});

const isSave = (b: unknown) => !!b && typeof b === 'object' && !Array.isArray(b);

// Save of the logged-in Discord account
app.get('/api/save', async (req, reply) => {
  const s = sessionOf(req);
  if (!s) return reply.code(401).send({ error: 'not logged in' });
  const data = await store.get(saveKey(s.uid));
  return data ? data : reply.code(404).send({ error: 'not found' });
});

app.put('/api/save', async (req, reply) => {
  const s = sessionOf(req);
  if (!s) return reply.code(401).send({ error: 'not logged in' });
  if (!isSave(req.body)) return reply.code(400).send({ error: 'bad body' });
  await store.put(saveKey(s.uid), req.body);
  return { ok: true };
});

// Other players, for PvP. Only the names and the building layout are public: no stock, troops or stars.
app.get('/api/players', async (req, reply) => {
  const s = sessionOf(req);
  if (!s) return reply.code(401).send({ error: 'not logged in' });
  reply.header('cache-control', 'no-store');
  return (await store.listPlayers()).filter(p => p.id !== s.uid);
});

app.get<{ Params: { uid: string } }>('/api/players/:uid/base', async (req, reply) => {
  const s = sessionOf(req);
  if (!s) return reply.code(401).send({ error: 'not logged in' });
  const { uid } = req.params;
  if (!ID.test(uid) || uid === s.uid) return reply.code(400).send({ error: 'bad id' });
  const user = await store.getUser(uid);
  const save = await store.get(saveKey(uid)) as { buildings?: { id: number; type: string; x: number; y: number; level: number; readyAt: number; collectedAt: number }[] } | null;
  if (!user || !save?.buildings) return reply.code(404).send({ error: 'not found' });
  reply.header('cache-control', 'no-store');
  return { name: user.name, buildings: save.buildings.map(({ id, type, x, y, level, readyAt, collectedAt }) => ({ id, type, x, y, level, readyAt, collectedAt })) };
});

/** First login: copies this browser's guest save to the account, if the account has none yet. */
app.post<{ Body: { guestId?: string } }>('/api/save/claim', async (req, reply) => {
  const s = sessionOf(req);
  if (!s) return reply.code(401).send({ error: 'not logged in' });
  const guestId = req.body?.guestId ?? '';
  if (!ID.test(guestId) || guestId.startsWith('d-')) return reply.code(400).send({ error: 'bad id' });
  if (await store.get(saveKey(s.uid))) return reply.code(409).send({ error: 'account already has a save' });
  const guest = await store.get(guestId);
  if (!guest) return reply.code(404).send({ error: 'no guest save' });
  await store.put(saveKey(s.uid), guest);
  return { ok: true };
});

// Anonymous saves by browser id: only when Discord login is off (local play)
app.get<{ Params: { id: string } }>('/api/save/:id', async (req, reply) => {
  if (discord) return reply.code(403).send({ error: 'login required' });
  if (!ID.test(req.params.id)) return reply.code(400).send({ error: 'bad id' });
  const data = await store.get(req.params.id);
  return data ? data : reply.code(404).send({ error: 'not found' });
});

app.put<{ Params: { id: string } }>('/api/save/:id', async (req, reply) => {
  if (discord) return reply.code(403).send({ error: 'login required' });
  if (!ID.test(req.params.id) || req.params.id.startsWith('d-')) return reply.code(400).send({ error: 'bad id' });
  const body = req.body;
  if (!isSave(body)) return reply.code(400).send({ error: 'bad body' });
  await store.put(req.params.id, body);
  return { ok: true };
});

const dist = join(process.cwd(), 'dist');
if (existsSync(dist)) await app.register(fastifyStatic, { root: dist });

await app.listen({ port: Number(process.env.PORT ?? 3000), host: '0.0.0.0' });
