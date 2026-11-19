import { claimGuestSave, fetchMe, loadSave, startNewSave, type User } from './store.ts';

const panel = document.getElementById('panel')!;
const esc = (s: string) => s.replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);

/** Full-screen card used for login and for the first-login question. */
function screen(html: string) {
  const el = document.createElement('div');
  el.id = 'screen';
  el.innerHTML = `<div class="card"><h1>🐊 Clash of Croco</h1>${html}</div>`;
  document.body.appendChild(el);
  return el;
}

function accountBar(u: User) {
  const el = document.createElement('div');
  el.id = 'account';
  el.innerHTML = `<img src="${esc(u.avatar)}" alt=""><span>${esc(u.name)}</span><button type="button">Se déconnecter</button>`;
  el.querySelector('button')!.addEventListener('click', async () => { await fetch('/auth/logout', { method: 'POST' }); location.href = '/'; });
  document.getElementById('game')!.appendChild(el);
}

async function start() {
  const me = await fetchMe();
  if (me.authEnabled && !me.user) {
    const err = new URLSearchParams(location.search).get('login');
    screen(`<p>Connecte-toi pour retrouver ta base du marais.</p>
      <a class="discord" href="/auth/discord">Se connecter avec Discord</a>
      ${err ? '<p class="err">La connexion a échoué, réessaie.</p>' : ''}`);
    panel.textContent = '';
    return;
  }
  if (me.user) { history.replaceState(null, '', '/'); accountBar(me.user); }
  panel.textContent = 'Chargement des modèles 3D…';
  const [{ setMode }, { villageMode }, { loadModels }, status] = await Promise.all([
    import('./three/engine.ts'), import('./modes/village.ts'), import('./three/assets.ts'), loadSave(me)]);
  if (status === 'claim') {
    await new Promise<void>(done => {
      const el = screen(`<p>Bienvenue ${esc(me.user!.name)} ! Une base existe déjà sur ce navigateur.</p>
        <button class="discord" data-c="claim">La rattacher à mon compte</button><button data-c="new">Commencer une nouvelle base</button>`);
      el.addEventListener('click', async e => {
        const c = (e.target as HTMLElement).dataset.c;
        if (!c) return;
        if (c === 'new' || !(await claimGuestSave())) startNewSave();
        el.remove();
        done();
      });
    });
  }
  await loadModels();
  setMode(villageMode);
}

try {
  await start();
} catch (e) {
  panel.innerHTML = `<p class="err">${esc((e as Error).message)}. Le serveur est-il lancé ?</p>`;
}
