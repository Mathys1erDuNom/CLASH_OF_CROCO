import { loadSave } from './store.ts';

try {
  document.getElementById('panel')!.textContent = 'Chargement des modèles 3D…';
  const [{ setMode }, { villageMode }, { loadModels }] = await Promise.all([import('./three/engine.ts'), import('./modes/village.ts'), import('./three/assets.ts'), loadSave()]);
  await loadModels();
  setMode(villageMode);
} catch (e) {
  document.getElementById('panel')!.innerHTML = `<p class="err">${(e as Error).message}. Le serveur est-il lancé ?</p>`;
}
