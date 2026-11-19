import Fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import pg from 'pg';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

interface Store {
  get(id: string): Promise<unknown | null>;
  put(id: string, data: unknown): Promise<void>;
}

async function postgresStore(url: string): Promise<Store> {
  const pool = new pg.Pool({ connectionString: url });
  pool.on('error', err => console.error('postgres idle client error', err)); // a dropped connection must not crash the server
  await pool.query(`CREATE TABLE IF NOT EXISTS saves (
    id TEXT PRIMARY KEY, data JSONB NOT NULL, updated_at TIMESTAMPTZ NOT NULL DEFAULT now())`);
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
  };
}

// Local fallback when DATABASE_URL is absent: one JSON file per player in .data/
async function fileStore(dir: string): Promise<Store> {
  await mkdir(dir, { recursive: true });
  return {
    async get(id) {
      try { return JSON.parse(await readFile(join(dir, `${id}.json`), 'utf8')); }
      catch { return null; }
    },
    async put(id, data) { await writeFile(join(dir, `${id}.json`), JSON.stringify(data)); },
  };
}

const url = process.env.DATABASE_URL;
const store = url ? await postgresStore(url) : await fileStore(join(process.cwd(), '.data'));
if (!url) console.warn('DATABASE_URL absent : sauvegardes dans .data/ (perdues à chaque redéploiement sur Railway)');

const app = Fastify({ logger: true, bodyLimit: 256 * 1024 });
const ID = /^[A-Za-z0-9-]{8,64}$/; // ids are client-generated UUIDs; this also blocks path traversal in fileStore

app.get('/api/health', async () => ({ ok: true, storage: url ? 'postgres' : 'file' }));

app.get<{ Params: { id: string } }>('/api/save/:id', async (req, reply) => {
  if (!ID.test(req.params.id)) return reply.code(400).send({ error: 'bad id' });
  const data = await store.get(req.params.id);
  return data ? data : reply.code(404).send({ error: 'not found' });
});

app.put<{ Params: { id: string } }>('/api/save/:id', async (req, reply) => {
  if (!ID.test(req.params.id)) return reply.code(400).send({ error: 'bad id' });
  const body = req.body;
  if (!body || typeof body !== 'object' || Array.isArray(body)) return reply.code(400).send({ error: 'bad body' });
  await store.put(req.params.id, body);
  return { ok: true };
});

const dist = join(process.cwd(), 'dist');
if (existsSync(dist)) await app.register(fastifyStatic, { root: dist });

await app.listen({ port: Number(process.env.PORT ?? 3000), host: '0.0.0.0' });
