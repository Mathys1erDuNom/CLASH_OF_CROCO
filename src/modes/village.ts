import * as THREE from 'three';
import { BUILDINGS, GOBLIN_BASES, GRID, TRAIN_SPEEDUP_PER_LEVEL, TROOP_LEVELS, TROOPS, fmtCost, troopMaxLevel } from '../data.ts';
import {
  addTroopsToQueue, armyCap, armySize, campHousing, canAfford, canPlace, collect, countOf, hasBarracks, moveBuilding, pending, placeBuilding,
  stats, tick, trainMs, troopLevel, upgrade, upgradeBlock, barracksLevel, labNeeded, unlocked, upgradeTroop, workingLevel, type Building,
  currentType, storeCap, troopUnlocked, unlockTroop, rebuild,
} from '../economy.ts';
import { Bar, animate, floatText, setMode, toWorld, world, type Mode, type Tile } from '../three/engine.ts';
import { BUILDING_TOP, cyl, box, ghostOf } from '../three/models.ts';
import { building, troop } from '../three/assets.ts';
import { swamp } from '../three/scenery.ts';
import { persist, save, saveError } from '../store.ts';
import { spriteUrl } from '../sprites.ts';
import { esc, refresh, secs, setPanel } from '../ui.ts';
import { attackMode, flap } from './attack.ts';

/** Build menu categories: [id, label, which buildings go in it] */
const CATEGORIES: [string, string, (d: typeof BUILDINGS[string]) => boolean][] = [
  ['res', '💰 Ressources', d => !!(d.res || d.store)],
  ['army', '🪖 Armée', d => !!(d.trains || d.lab || d.levels[0].housing)],
  ['def', '🛡️ Défenses', d => !!d.defense],
];

interface View { model: THREE.Group; shown: number; scaffold: THREE.Group; bar: Bar }

const resName = (r?: string) => (r === 'gold' ? 'or' : 'poulets');
const resColor = (r?: string) => (r === 'gold' ? '#ffd84a' : '#e0b080');

function scaffolding(n: number) {
  const g = new THREE.Group(), h = n * 0.7, e = n * 0.5;
  for (const x of [-e, e]) for (const z of [-e, e]) g.add(cyl(0.04, 0.04, h, 0xc49a5a, x, h / 2, z, 4));
  for (const y of [h * 0.4, h * 0.85]) for (const [x, z, r] of [[0, e, 0], [0, -e, 0], [e, 0, Math.PI / 2], [-e, 0, Math.PI / 2]] as const)
    g.add(box(n, 0.05, 0.12, 0xa07a40, x, y, z).rotateY(r));
  return g;
}

/** One line describing what a level does. */
function levelInfo(type: string, level: number) {
  const d = BUILDINGS[type], lv = stats(type, level);
  if (d.res) return `${lv.perMin} ${resName(d.res)}/min · stock ${lv.cap}`;
  if (d.defense) return `${lv.dps} dégâts/s · portée ${lv.range}${d.airOnly ? ' · volants uniquement' : d.hitsAir ? ' · sol et air' : ' · sol uniquement'}`;
  if (d.trains) return level === 1 ? 'forme les troupes' : `formation x${1 + TRAIN_SPEEDUP_PER_LEVEL * (level - 1)} plus rapide`;
  if (lv.housing) return `${lv.housing} places d'armée`;
  if (type === 'hq') {
    const news = level > 1 ? Object.values(BUILDINGS).filter(b => b.hutRequired === level).map(b => b.name) : [];
    return `débloque le niveau ${level} des bâtiments${news.length ? ` · nouveaux : ${news.join(', ')}` : ''}`;
  }
  if (d.store) return `stock max ${lv.store}`;
  if (d.lab) return `débloque les améliorations de troupes demandant un labo niveau ${level}`;
  return '';
}

export function villageMode(): Mode {
  const views = new Map<number, View>();
  let placing: string | null = null;
  let ghost: THREE.Group | null = null;
  let movingId: number | null = null;
  let previewAt = ''; // tile where the placement ghost currently shows // set while 'placing' an existing building somewhere else
  let selected: number | null = null;
  let menu: 'build' | 'attack' | null = null; // which big menu is open in the panel
  let showArmy = false; // mobile: army sheet opened from the 🪖 pill
  let attackTab: 'goblin' | 'player' | null = null; // target list open in the attack menu
  let players: { id: string; name: string; avatar: string }[] | null = null; // null while loading
  let playersErr = '';
  let buildCat: string | null = null; // open category of the build menu
  let openedAt = 0; // when a menu last unfolded: plays the slide-down animation once
  const dropping = () => Date.now() - openedAt < 300;
  let infoKind: string | null = null; // troop whose full stats are open in the barracks panel
  let hint = 'Clique sur un bâtiment pour le voir, récolter ou l’améliorer. Clic-glisser pour tourner la caméra, molette pour zoomer.';
  let t = 0;

  swamp(world, 7, false);
  const grid = new THREE.GridHelper(GRID, GRID, 0xffffff, 0xffffff);
  Object.assign(grid.material, { transparent: true, opacity: 0.18 });
  grid.position.y = 0.03;
  grid.visible = false;
  const footprint = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x44ff44, transparent: true, opacity: 0.4 }));
  footprint.visible = false;
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.62, 0.72, 32).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffe066, transparent: true, opacity: 0.9 }));
  ring.visible = false;
  world.add(grid, footprint, ring);

  const center = (b: { x: number; y: number }, n: number) => toWorld(b.x + n / 2, b.y + n / 2);

  // Troops walking in circles in their camps, rebuilt whenever the army or the camps change.
  const garrison = new THREE.Group();
  world.add(garrison);
  let garrisonKey = '';
  function syncGarrison(now: number) {
    const camps = save.buildings.filter(b => b.type === 'camp').map(b => ({ b, room: campHousing(b, now) }));
    const key = JSON.stringify([save.troops, save.troopLevel, camps.map(c => [c.b.id, c.b.x, c.b.y, c.room])]);
    if (key === garrisonKey) return;
    garrisonKey = key;
        garrison.clear();
    const army = Object.entries(save.troops).flatMap(([k, n]) => Array<string>(n).fill(k));
    for (const { b, room } of camps) {
      const c = center(b, 3);
      const here: string[] = [];
      for (let used = 0; army.length && used + TROOPS[army[0]].space <= room; used += TROOPS[here.at(-1)!].space) here.push(army.shift()!);
      const loops = Math.ceil(here.length / 18); // up to 18 walkers per loop
      here.forEach((kind, i) => {
        const m = troop(kind, troopLevel(save, kind));
        m.scale.setScalar(0.8);
        // evenly spaced on concentric loops around the fire; each loop turns as one, so walkers never collide
        m.userData = { cx: c.x, cz: c.z, a: (2 * Math.PI * Math.floor(i / loops)) / Math.ceil(here.length / loops), r: 1.1 - (i % loops) * 0.3, fly: TROOPS[kind].flying };
        garrison.add(m);
      });
    }
  }

  /** (Re)builds the model for the level the building currently works at. */
  function showLevel(b: Building, v: View | undefined, pop: boolean) {
    const n = BUILDINGS[b.type].size, lvl = Math.max(1, workingLevel(b, Date.now()));
    if (v) world.remove(v.model);
    const model = building(b.type, false, lvl);
    model.position.copy(center(b, n));
    world.add(model);
    if (pop) { const s = model.scale.x; animate(0.4, k => model.scale.setScalar(s * (0.3 + 0.7 * Math.sin((k * Math.PI) / 2) + 0.15 * Math.sin(k * Math.PI)))); }
    if (v) { v.model = model; v.shown = lvl; return v; }
    const bar = new Bar(n * 0.6, 0x4aa3ff);
    bar.group.position.copy(center(b, n)).setY(BUILDING_TOP[b.type]);
    const scaffold = scaffolding(n);
    scaffold.position.copy(center(b, n));
    world.add(bar.group, scaffold);
    const nv = { model, shown: lvl, scaffold, bar };
    views.set(b.id, nv);
    return nv;
  }
  for (const b of save.buildings) showLevel(b, undefined, false);

  function cancel() {
    placing = null;
    movingId = null;
    previewAt = '';
    if (ghost) world.remove(ghost);
    ghost = null;
    grid.visible = footprint.visible = false;
  }

  const spot = (tile: Tile, n: number) => ({ x: Math.round(tile.x - n / 2), y: Math.round(tile.y - n / 2) }); // cursor at the footprint centre

  function select(b: Building | null) {
    selected = b?.id ?? null;
    if (b) { menu = null; showArmy = false; } // a building panel replaces the open menu
    ring.visible = !!b;
    if (b) { const n = BUILDINGS[b.type].size; ring.position.copy(center(b, n)).setY(0.05); ring.scale.setScalar(n); }
  }

  async function loadPlayers() {
    players = null; playersErr = '';
    try {
      const r = await fetch('/api/players');
      if (!r.ok) throw new Error(String(r.status));
      players = await r.json();
    } catch { players = []; playersErr = 'Connecte-toi avec Discord pour voir les autres joueurs.'; }
  }

  /** Opens another player's base: visit = read-only, otherwise a real attack. */
  async function openBase(uid: string, visit: boolean) {
    const r = await fetch(`/api/players/${encodeURIComponent(uid)}/base`);
    if (!r.ok) throw new Error(String(r.status));
    const { name, gold, chicken, buildings }: { name: string; gold: number; chicken: number; buildings: Building[] } = await r.json();
    const now = Date.now();
    // buildings still under construction are not targets; a mine or farm holds what it has produced and not collected yet
    const layout = buildings.filter(b => workingLevel(b, now) > 0).map(b => ({ type: currentType(b.type), x: b.x, y: b.y, level: workingLevel(b, now), ref: b.id, held: BUILDINGS[b.type].res ? pending(b, now) : 0 }));
    setMode(() => attackMode({ id: `p-${uid}`, name, goblin: false, buildings: layout, loot: { gold, chicken }, uid }, () => setMode(villageMode), visit));
  }

  const playersHtml = (ready: boolean) => players === null ? '<p class="hint">Chargement…</p>'
    : !players.length ? `<p class="hint">${playersErr || 'Aucun autre joueur pour l’instant.'}</p>`
    : `<div class="scroll-wrap"><div class="scroll" data-scroll="players">${players.map(p => `<div class="player"><img src="${esc(p.avatar)}" alt=""><b>${esc(p.name)}</b><button data-act="visitPlayer" data-arg="${esc(p.id)}">👁 Voir la base</button><button data-act="attackPlayer" data-arg="${esc(p.id)}" ${ready ? '' : 'disabled'}>⚔ Attaquer</button></div>`).join('')}</div><i class="sbar"><b></b></i></div>`;

  function onAction(act: string, arg: string) {
    const now = Date.now();
    if (act === 'build') {
      cancel(); select(null);
      menu = null;
      placing = arg;
      ghost = ghostOf(building(arg, false));
      ghost.visible = false;
      world.add(ghost);
      grid.visible = true;
      hint = 'Clique sur la carte pour placer (Échap ou clic droit pour annuler).';
    } else if (act === 'cancelPlace') {
      cancel();
      hint = 'Construction annulée.';
    } else if (act === 'move') {
      const b = save.buildings.find(b => b.id === selected);
      if (!b) return;
      cancel();
      placing = b.type;
      movingId = b.id;
      ghost = ghostOf(building(b.type, false, Math.max(1, workingLevel(b, now))));
      ghost.visible = false;
      world.add(ghost);
      grid.visible = true;
      hint = `Clique sur le nouvel emplacement de : ${BUILDINGS[b.type].name} (Échap ou clic droit pour annuler).`;
    } else if (act === 'upgrade') {
      const b = save.buildings.find(b => b.id === selected);
      if (b && upgrade(save, b, now)) {
        persist();
        hint = `${BUILDINGS[b.type].name} : amélioration vers le niveau ${b.level} lancée.`;
        floatText(center(b, BUILDINGS[b.type].size).setY(BUILDING_TOP[b.type]), 'Amélioration !', '#9fd0ff');
      }
    } else if (act === 'menu') {
      showArmy = false;
      menu = menu === arg ? null : (arg as 'build' | 'attack');
      openedAt = Date.now();
      select(null);
    } else if (act === 'cat') {
      buildCat = buildCat === arg ? null : arg;
      openedAt = Date.now();
    } else if (act === 'army') {
      showArmy = !showArmy;
      if (showArmy) { menu = null; select(null); }
      openedAt = Date.now();
    } else if (act === 'info') {
      infoKind = infoKind === arg ? null : arg;
    } else if (act === 'deselect') {
      select(null);
    } else if (act === 'unlock') {
      if (unlockTroop(save, arg, now)) { persist(); hint = `${TROOPS[arg].name} : déblocage lancé.`; }
      else hint = 'Déblocage impossible (poulets ou déblocage déjà en cours).';
    } else if (act === 'train') {
      if (!addTroopsToQueue(save, arg, now)) hint = 'Formation impossible (caserne, poulets ou place).';
      else persist();
    } else if (act === 'troopUp') {
      if (upgradeTroop(save, arg, now)) { persist(); hint = `${TROOPS[arg].name} : recherche lancée.`; }
      else hint = 'Recherche impossible (laboratoire, ressources ou recherche déjà en cours).';
    } else if (act === 'clearRaids') {
      save.raids = [];
      persist();
    } else if (act === 'rebuild') {
      const n = rebuild(save, now);
      persist();
      hint = n ? `${n} bâtiment(s) reconstruit(s).` : 'Pas la place de reconstruire : libère l’emplacement.';
    } else if (act === 'collectAll') {
      let total = 0;
      for (const b of save.buildings) {
        const got = collect(save, b, now);
        if (got) { total += got; floatText(center(b, BUILDINGS[b.type].size).setY(2), `+${got}`, resColor(BUILDINGS[b.type].res)); }
      }
      hint = total ? `Récolté ${total} ressources.` : 'Rien à récolter.';
      persist();
    } else if (act === 'attack') {
      setMode(() => attackMode({ ...GOBLIN_BASES.find(b => b.id === arg)!, goblin: true }, () => setMode(villageMode)));
    } else if (act === 'tab') {
      attackTab = attackTab === arg ? null : (arg as 'goblin' | 'player');
      if (attackTab === 'player') loadPlayers();
    } else if (act === 'attackPlayer' || act === 'visitPlayer') {
      openBase(arg, act === 'visitPlayer').catch(() => { hint = 'Impossible d’ouvrir cette base.'; });
    }
  }

  const queueHtml = (now: number) => (save.queue.length ? `<p>En formation : ${save.queue.length} (prochain dans ${secs(save.queue[0].doneAt - now)})</p>` : '');

  /** Training buttons, shown only in the panel of a working barracks. */
  const hit = (k: string, mult: number) => Math.round(TROOPS[k].dps * TROOPS[k].hitEvery * mult);

  /** Every stat and special trait of a troop at a level, built from TROOPS. */
  function troopStats(k: string, level: number): string {
    const d = TROOPS[k], m = TROOP_LEVELS[level - 1].mult;
    const traits = [
      `vise ${d.prefers === 'defense' ? 'les défenses d’abord' : d.prefers === 'resource' ? 'les ressources d’abord' : 'le bâtiment le plus proche'}`,
      d.resourceBonus && `dégâts x${d.resourceBonus} sur les mines et pompes`,
      d.splash && `dégâts de zone (rayon ${d.splash})`,
      d.flying && 'volant : seules les tours de roseaux le touchent',
      d.range >= 2 && 'attaque à distance',
    ].filter(Boolean);
    return `PV ${Math.round(d.hp * m)} · dégâts ${hit(k, m)} par attaque · 1 attaque toutes les ${d.hitEvery} s (${Math.round(d.dps * m)}/s)<br>portée ${d.flying ? 'au-dessus de la cible' : d.range} · vitesse ${d.speed} · ${d.space} place${d.space > 1 ? 's' : ''}<br>${traits.join(' · ')}`;
  }

  function trainHtml(now: number): string {
    const canTrain = hasBarracks(save, now);
    return '<h2>Former des troupes</h2>' + unlockingHtml(now) + '<div class="scroll-wrap"><div class="scroll" data-scroll="train">' + Object.entries(TROOPS).map(([k, d]) => {
      const req = d.barracksRequired ?? 1, locked = barracksLevel(save, now) < req;
      const target = d.prefers === 'defense' ? 'les défenses' : d.prefers === 'resource' ? 'les ressources' : 'tout';
      const train = `<button data-act="train" data-arg="${k}" ${canTrain && !locked && armySize(save) + d.space <= armyCap(save, now) && canAfford(save, d.cost) ? '' : 'disabled'}><img src="${spriteUrl('t_' + k)}" alt="">${d.name} (${save.troops[k] ?? 0})<small>${fmtCost(d.cost)} · vise ${target}${locked ? `<br>⚠ caserne niveau ${req} requise` : ''}</small></button>`;
      const unlockBtn = `<button class="${locked ? 'off' : 'unlock'}" data-act="unlock" data-arg="${k}" ${save.unlocking || !d.unlock || !canAfford(save, d.unlock.cost) ? 'disabled' : ''}><img src="${spriteUrl('t_' + k)}" alt="">${d.name} · à débloquer<small>${d.unlock ? fmtCost(d.unlock.cost) : ''} · ${d.unlock ? secs(d.unlock.sec * 1000) : ''}</small></button>`;
      const info = `<button class="info" data-act="info" data-arg="${k}" aria-label="Stats de ${d.name}" title="Toutes les stats">${infoKind === k ? '✕' : 'i'}</button>`;
      const details = infoKind === k ? `<div class="stats"><b>${d.name}</b> · niveau ${troopLevel(save, k)}<br>Formation : ${secs(trainMs(save, k, now))}<br>${troopStats(k, troopLevel(save, k))}</div>` : '';
      return `<div class="train-row">${troopUnlocked(save, k) ? train : unlockBtn}${info}</div>${details}`;
    }).join('') + '</div><i class="sbar"><b></b></i></div>'
      + queueHtml(now) + (armySize(save) >= armyCap(save, now) ? '<p class="hint">Camps pleins : construis ou améliore un camp.</p>' : '');
  }

  const unlockingHtml = (now: number) => (save.unlocking ? `<p>Déblocage : ${TROOPS[save.unlocking.kind].name}, encore ${secs(save.unlocking.doneAt - now)}</p>` : '');

  const researchHtml = (now: number) => (save.research
    ? `<p>Recherche : ${TROOPS[save.research.kind].name} niv ${troopLevel(save, save.research.kind) + 1} · encore ${secs(save.research.doneAt - now)}</p>` : '');

  /** "PV 320 → 416 · dégâts 26 → 34" for a research from level to level + 1. */
  function upgradeStats(k: string, level: number): string {
    const d = TROOPS[k], a = TROOP_LEVELS[level - 1].mult, b = TROOP_LEVELS[level].mult;
    const up = (icon: string, label: string, from: number, to: number, unit = '') =>
      `<span class="up">${icon} ${label} ${from}${unit} → <b>${to}${unit}</b> <em>+${to - from}</em></span>`;
    return up('❤️', 'PV', Math.round(d.hp * a), Math.round(d.hp * b)) + up('⚔️', 'Dégâts par attaque', hit(k, a), hit(k, b));
  }

  /** Troop upgrade buttons, shown only in the panel of a working laboratory. */
  function labHtml(now: number, working: number): string {
    return '<h2>Améliorer les troupes</h2>' + researchHtml(now) + '<div class="scroll-wrap"><div class="scroll" data-scroll="lab">' + Object.entries(TROOPS).map(([k, d]) => {
      const lvl = troopLevel(save, k), up = TROOP_LEVELS[lvl - 1].up;
      if (!up || lvl >= troopMaxLevel(k)) return `<button disabled><img src="${spriteUrl('t_' + k)}" alt="">${d.name} niv ${lvl}<small>niveau maximum</small></button>`;
      const need = labNeeded(k, lvl + 1), ok = !save.research && working >= need && canAfford(save, up.cost);
      return `<button data-act="troopUp" data-arg="${k}" ${ok ? '' : 'disabled'}><img src="${spriteUrl('t_' + k)}" alt="">${d.name} niv ${lvl} → ${lvl + 1}<small>${fmtCost(up.cost)} · ${secs(up.sec * 1000)}${upgradeStats(k, lvl)}${working < need ? `<br>⚠ laboratoire niveau ${need} requis` : ''}</small></button>`;
    }).join('') + '</div><i class="sbar"><b></b></i></div>';
  }

  function selectionHtml(now: number): string {
    const b = save.buildings.find(b => b.id === selected);
    if (!b) return '';
    const d = BUILDINGS[b.type], working = workingLevel(b, now), busy = now < b.readyAt;
    const next = d.levels[b.level];
    const stars = '◆'.repeat(Math.max(working, 0)) + '◇'.repeat(d.levels.length - Math.max(working, 0));
    let body = busy
      ? `<p>${working === 0 ? 'Construction' : `Amélioration vers le niveau ${b.level}`} : encore ${secs(b.readyAt - now)}</p>`
      : `<p>${levelInfo(b.type, b.level)}</p>`;
    if (!busy && next) {
      const block = upgradeBlock(save, b, now);
      body += d.trains || d.lab // these panels hold a long list below: keep the building upgrade on one short line
        ? `<button data-act="upgrade" class="compact" ${block ? 'disabled' : ''}>⬆ Niveau ${b.level + 1} · ${fmtCost(next.cost)} · ${secs(next.sec * 1000)}${block ? `<small>⚠ ${block}</small>` : ''}</button>`
        : `<button data-act="upgrade" ${block ? 'disabled' : ''}>Améliorer au niveau ${b.level + 1}<small>${fmtCost(next.cost)} · ${secs(next.sec * 1000)}<br>→ ${levelInfo(b.type, b.level + 1)}${block ? `<br>⚠ ${block}` : ''}</small></button>`;
    } else if (!busy) body += '<p class="hint">Niveau maximum atteint.</p>';
    if (d.trains && working > 0) body += trainHtml(now);
    if (d.lab && working > 0) body += labHtml(now, working);
    return `<div class="sel-box"><h2>${d.name} <span class="lvl">${stars}</span></h2>${body}<div class="row"><button data-act="move">Déplacer</button><button data-act="deselect">Fermer</button></div></div>`;
  }

  function panelHtml(): string {
    const now = Date.now();
    const buildBtn = ([k, d]: [string, typeof BUILDINGS[string]]) => {
      const c = d.levels[0].cost, ok = countOf(save, k) < d.max && canAfford(save, c);
      return `<button data-act="build" data-arg="${k}" ${ok ? '' : 'disabled'}><img src="${spriteUrl('b_' + k)}" alt="">${d.name}<small>${fmtCost(c)} · ${countOf(save, k)}/${d.max}</small></button>`;
    };
    // Build menu as collapsible categories (one open at a time)
    const available = Object.entries(BUILDINGS).filter(([k]) => k !== 'hq' && unlocked(save, k, now));
    const builds = CATEGORIES.map(([id, label, test]) => {
      const list = available.filter(([, d]) => test(d));
      if (!list.length) return '';
      const open = buildCat === id;
      return `<button data-act="cat" data-arg="${id}" class="cat ${open ? 'open' : ''}">${label} <span>${list.length}</span><b>${open ? '▴' : '▾'}</b></button>`
        + (open ? `<div class="cat-items${dropping() ? ' drop' : ''}">${list.map(buildBtn).join('')}</div>` : '');
    }).join('');
    const cap = armyCap(save, now);
    const army = Object.entries(TROOPS).filter(([k]) => troopUnlocked(save, k)).map(([k, d]) => `<div class="troop"><div class="tbox"><img src="${spriteUrl('t_' + k)}" alt="${d.name}" title="${d.name}"><span><small>niv</small> ${troopLevel(save, k)}</span></div><b>${save.troops[k] ?? 0}</b></div>`).join('');
    const ready = Object.values(save.troops).some(n => n > 0);
    const bases = GOBLIN_BASES.map(b => {
      const s = save.stars[b.id] ?? 0;
      return `<button data-act="attack" data-arg="${b.id}" ${ready ? '' : 'disabled'}><img src="${spriteUrl('g_hq')}" alt="">${b.name}<small>${'★'.repeat(s)}${'☆'.repeat(3 - s)} · butin ${b.loot.gold} or / ${b.loot.chicken} poulets</small></button>`;
    }).join('');
    const attackBox = `<div class="menu-box${dropping() ? ' drop' : ''}"><h2>Attaquer</h2>
      <button data-act="tab" data-arg="goblin" class="${attackTab === 'goblin' ? 'sel' : ''}">👹 Attaquer gobelin</button>
      <button data-act="tab" data-arg="player" class="${attackTab === 'player' ? 'sel' : ''}">🐊 Attaquer joueur</button>
      ${attackTab === 'goblin' ? `<div class="scroll-wrap"><div class="scroll" data-scroll="attack">${bases}</div><i class="sbar"><b></b></i></div>` : ''}
      ${attackTab === 'player' ? playersHtml(ready) : ''}
      ${ready ? '' : '<p class="hint">Forme des troupes à la caserne pour pouvoir attaquer.</p>'}</div>`;
    return `<h1>🐊 Clash of Croco</h1>
      ${placing ? `<button data-act="cancelPlace" class="cancel-x" aria-label="Annuler">✕ <span>Annuler ${movingId ? 'le déplacement' : 'la construction'}</span></button>` : ''}
      <div class="res"><span><img src="${spriteUrl('i_gold')}" alt="Or"> ${save.gold}/${storeCap(save, 'gold', Date.now())}</span><span><img src="${spriteUrl('i_chicken')}" alt="Poulets"> ${save.chicken}/${storeCap(save, 'chicken', Date.now())}</span><button class="armypill" data-act="army" title="Armée" aria-label="Voir l’armée">🪖 ${armySize(save)}/${cap}</button></div>
      ${selectionHtml(now)}
      ${save.raids.length ? `<div class="sel-box"><h2>🚩 Vous avez été attaqué</h2>${save.raids.slice(-3).reverse().map(r => `<p>${esc(r.by)} : ${r.buildings} bâtiment${r.buildings > 1 ? 's' : ''} détruit${r.buildings > 1 ? 's' : ''} · −${r.gold} or · −${r.chicken} poulets</p>`).join('')}<button data-act="clearRaids">OK</button></div>` : ''}
      ${save.ruins.length ? `<button data-act="rebuild" class="unlock">🔨 Reconstruire (${save.ruins.length} bâtiment${save.ruins.length > 1 ? 's' : ''} détruit${save.ruins.length > 1 ? 's' : ''})</button>` : ''}
      <div class="menus">
        <button data-act="menu" data-arg="build" class="menu-btn ${menu === 'build' ? 'sel' : ''}">🔨 Construire<i class="arr"> ${menu === 'build' ? '▴' : '▾'}</i></button>
        <button data-act="menu" data-arg="attack" class="menu-btn ${menu === 'attack' ? 'sel' : ''}">⚔️ Attaquer<i class="arr"> ${menu === 'attack' ? '▴' : '▾'}</i></button>
        <button data-act="collectAll" class="menu-btn">💰 Récolter</button>
      </div>
      ${menu === 'build' ? `<div class="menu-box${dropping() ? ' drop' : ''}"><h2>Construire</h2><div class="scroll-wrap"><div class="scroll" data-scroll="build">${builds}</div><i class="sbar"><b></b></i></div></div>` : ''}
      ${menu === 'attack' ? attackBox : ''}
      ${showArmy ? `<div class="menu-box army-sheet${dropping() ? ' drop' : ''}"><h2>Armée ${armySize(save)}/${cap}</h2><div class="army">${army}</div><button data-act="army" class="compact">Fermer</button></div>` : ''}
      <div class="extra">
        <h2>Armée ${armySize(save)}/${cap}</h2><div class="army">${army}</div>${queueHtml(now)}${researchHtml(now)}
        <p class="hint">Clique sur une caserne pour former des troupes.</p>
        <p class="hint">${hint}</p>
      </div>${saveError ? '<p class="err">⚠ Sauvegarde échouée</p>' : ''}`;
  }
  setPanel(panelHtml, onAction);

  return {
    update(dt) {
      t += dt;
      const now = Date.now();
      if (tick(save, now)) persist();
      for (const b of save.buildings) {
        let v = views.get(b.id)!;
        const d = BUILDINGS[b.type], busy = now < b.readyAt, lvl = Math.max(1, workingLevel(b, now));
        if (lvl !== v.shown) { v = showLevel(b, v, true); floatText(center(b, d.size).setY(BUILDING_TOP[b.type]), `Niveau ${b.level} !`, '#ffe066'); }
        const base = [1, 1.06, 1.12][v.shown - 1];
        const k = busy ? 1 - (b.readyAt - now) / (d.levels[b.level - 1].sec * 1000) : 1;
        v.scaffold.visible = busy;
        if (busy && b.level === 1) v.model.scale.set(base, base * (0.25 + 0.75 * k), base); // first construction rises from the ground
        else if (v.model.scale.y < base * 0.999) v.model.scale.setScalar(base);
        v.bar.group.visible = busy || !!d.res;
        if (busy) v.bar.set(k, 0x4aa3ff);
        else if (d.res) v.bar.set(pending(b, now) / stats(b.type, b.level).cap!, d.res === 'gold' ? 0xf2c230 : 0xa0703a);
        const flame = v.model.getObjectByName('flame');
        if (flame) flame.scale.set(1, 0.85 + Math.sin(t * 9 + b.id) * 0.15, 1);
        const lever = v.model.getObjectByName('lever');
        if (lever && !busy) lever.rotation.z = Math.sin(t * 2 + b.id) * 0.25;
      }
      syncGarrison(now);
      for (const [i, m] of garrison.children.entries()) {
        const { cx, cz, a, r } = m.userData, ang = a + t * 0.4;
        const fly = m.userData.fly; // flyers circle above the camp
        m.position.set(cx + Math.cos(ang) * r, fly ? 1.3 + Math.sin(t * 3 + i) * 0.1 : Math.abs(Math.sin(t * 10 + i * 1.7)) * 0.06, cz + Math.sin(ang) * r);
        if (fly) flap(m, t + i);
        m.rotation.y = Math.atan2(-Math.cos(ang), -Math.sin(ang)); // face the walking direction
      }
      ring.rotation.y += dt;
      refresh();
    },
    move(tile) {
      if (!placing || !ghost) return;
      const n = BUILDINGS[placing].size, { x, y } = spot(tile, n);
      previewAt = `${x},${y}`;
      ghost.visible = footprint.visible = true;
      ghost.position.copy(center({ x, y }, n));
      footprint.position.copy(center({ x, y }, n)).setY(0.04);
      footprint.scale.set(n, 1, n);
      (footprint.material as THREE.MeshBasicMaterial).color.setHex(canPlace(save, placing, x, y, movingId ?? undefined) ? 0x44ff44 : 0xff4444);
    },
    click(tile) {
      const now = Date.now();
      if (placing) { // on touch screens there is no hover: the first tap shows where it goes, a second tap there confirms
        const { x, y } = spot(tile, BUILDINGS[placing].size);
        if (previewAt !== `${x},${y}`) {
          this.move!(tile);
          hint = 'Touche encore au même endroit pour confirmer.';
          return;
        }
      }
      const moving = save.buildings.find(b => b.id === movingId);
      if (moving) {
        const n = BUILDINGS[moving.type].size, { x, y } = spot(tile, n);
        if (moveBuilding(save, moving, x, y)) {
          const v = views.get(moving.id)!;
          v.model.position.copy(center(moving, n));
          v.scaffold.position.copy(center(moving, n));
          v.bar.group.position.copy(center(moving, n)).setY(BUILDING_TOP[moving.type]);
          persist();
          hint = `${BUILDINGS[moving.type].name} déplacé.`;
          cancel();
          select(moving);
        } else floatText(toWorld(tile.x, tile.y, 0.5), 'Impossible ici', '#ff8080');
        return;
      }
      if (placing) {
        const { x, y } = spot(tile, BUILDINGS[placing].size);
        if (placeBuilding(save, placing, x, y, now)) {
          const b = save.buildings.at(-1)!;
          showLevel(b, undefined, false);
          persist();
          hint = `${BUILDINGS[placing].name} en construction…`;
          cancel();
          select(b);
        } else floatText(toWorld(tile.x, tile.y, 0.5), 'Impossible ici', '#ff8080');
        return;
      }
      const b = save.buildings.find(b => { const n = BUILDINGS[b.type].size; return tile.x >= b.x && tile.x < b.x + n && tile.y >= b.y && tile.y < b.y + n; });
      select(b ?? null);
      if (!b) return;
      const d = BUILDINGS[b.type], top = center(b, d.size).setY(BUILDING_TOP[b.type]);
      const m = views.get(b.id)!.model, s = m.scale.x;
      if (now >= b.readyAt) animate(0.25, k => m.scale.setScalar(s * (1 + 0.1 * Math.sin(k * Math.PI))));
      if (d.res) {
        const got = collect(save, b, now);
        if (got > 0) { persist(); floatText(top, `+${got} ${resName(d.res)}`, resColor(d.res)); }
      }
    },
    cancel() { cancel(); select(null); },
  };
}
