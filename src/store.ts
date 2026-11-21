// Loads/saves the village through the server API.
// With Discord login on, the save belongs to the logged-in account; otherwise to a random id kept in this browser.
import { centreBase, migrate, newSave, type Save } from './economy.ts';

export interface User { id: string; name: string; avatar: string }
export interface Me { authEnabled: boolean; loginHost?: string; user?: User | null }

const guestId = localStorage.getItem('croco-id');
let url = ''; // where this player's save lives

export let save: Save;
export let saveError = false;

export const fetchMe = async (): Promise<Me> => (await fetch('/api/me')).json();

/** Loads the save. Returns 'claim' when a logged-in account has no save yet but this browser has a guest one. */
export async function loadSave(me: Me): Promise<'ok' | 'claim'> {
  if (me.authEnabled) url = '/api/save';
  else {
    let id = guestId;
    if (!id) { id = crypto.randomUUID(); localStorage.setItem('croco-id', id); }
    url = `/api/save/${id}`;
  }
  const r = await fetch(url);
  if (r.ok) { save = migrate(await r.json()); return 'ok'; }
  if (r.status !== 404) throw new Error(`Chargement impossible (${r.status})`);
  if (me.authEnabled && guestId) return 'claim';
  startNewSave();
  return 'ok';
}

export function startNewSave() {
  save = newSave(Date.now());
  persist();
}

/** Copies this browser's guest save to the logged-in account. */
export async function claimGuestSave(): Promise<boolean> {
  const r = await fetch('/api/save/claim', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ guestId }) });
  if (!r.ok) return false;
  localStorage.removeItem('croco-id'); // the base now lives in the account
  const ok = (await loadSave({ authEnabled: true })) === 'ok';
  if (ok) { centreBase(save); persist(); } // a guest base may predate the centred start
  return ok;
}

let timer: ReturnType<typeof setTimeout> | undefined;
/** Debounced save: batches rapid changes into one request. */
export function persist() {
  clearTimeout(timer);
  timer = setTimeout(async () => {
    try {
      const r = await fetch(url, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(save) });
      saveError = !r.ok;
    } catch { saveError = true; }
  }, 500);
}
