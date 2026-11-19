// Discord OAuth2 login with a stateless signed session cookie (no session table needed).
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

export interface Session { uid: string; exp: number } // uid = Discord user id, exp = ms timestamp

const b64 = (s: string) => Buffer.from(s).toString('base64url');
const sig = (data: string, secret: string) => createHmac('sha256', secret).update(data).digest('base64url');

/** "payload.signature" where payload is base64url JSON. */
export function signSession(s: Session, secret: string): string {
  const data = b64(JSON.stringify(s));
  return `${data}.${sig(data, secret)}`;
}

export function verifySession(token: string | undefined, secret: string, now = Date.now()): Session | null {
  if (!token) return null;
  const [data, mac] = token.split('.');
  if (!data || !mac) return null;
  const expected = Buffer.from(sig(data, secret)), given = Buffer.from(mac);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  try {
    const s = JSON.parse(Buffer.from(data, 'base64url').toString()) as Session;
    return typeof s.uid === 'string' && /^\d{5,25}$/.test(s.uid) && s.exp > now ? s : null;
  } catch { return null; }
}

export function parseCookies(header: string | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  for (const part of (header ?? '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

export function cookie(name: string, value: string, maxAgeSec: number, secure: boolean): string {
  return `${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSec}${secure ? '; Secure' : ''}`;
}

export const newState = () => randomBytes(16).toString('hex');

export interface DiscordUser { id: string; username: string; global_name?: string | null; avatar?: string | null }

export function avatarUrl(u: { id: string; avatar?: string | null }): string {
  return u.avatar
    ? `https://cdn.discordapp.com/avatars/${u.id}/${u.avatar}.png?size=64`
    : `https://cdn.discordapp.com/embed/avatars/${Number((BigInt(u.id) >> 22n) % 6n)}.png`;
}

/** Exchanges the OAuth2 code for the Discord user (scope "identify"). */
export async function discordUser(code: string, cfg: { id: string; secret: string; redirect: string }): Promise<DiscordUser> {
  const tok = await fetch('https://discord.com/api/oauth2/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: cfg.id, client_secret: cfg.secret, grant_type: 'authorization_code', code, redirect_uri: cfg.redirect }),
  });
  if (!tok.ok) throw new Error(`discord token ${tok.status}`);
  const { access_token } = await tok.json() as { access_token: string };
  const me = await fetch('https://discord.com/api/users/@me', { headers: { authorization: `Bearer ${access_token}` } });
  if (!me.ok) throw new Error(`discord user ${me.status}`);
  return await me.json() as DiscordUser;
}
