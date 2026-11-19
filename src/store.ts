// Loads/saves the village through the server API. The player id is a random UUID kept in localStorage.
import { migrate, newSave, type Save } from './economy.ts';

let id = localStorage.getItem('croco-id');
if (!id) { id = crypto.randomUUID(); localStorage.setItem('croco-id', id); }

export let save: Save;
export let saveError = false;

export async function loadSave() {
  const r = await fetch(`/api/save/${id}`);
  if (r.ok) save = migrate(await r.json());
  else if (r.status === 404) save = newSave(Date.now());
  else throw new Error(`Chargement impossible (${r.status})`);
}

let timer: ReturnType<typeof setTimeout> | undefined;
/** Debounced save: batches rapid changes into one request. */
export function persist() {
  clearTimeout(timer);
  timer = setTimeout(async () => {
    try {
      const r = await fetch(`/api/save/${id}`, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(save) });
      saveError = !r.ok;
    } catch { saveError = true; }
  }, 500);
}
