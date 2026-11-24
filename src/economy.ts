// Village state and timer logic. Timers are wall-clock timestamps so production continues while offline.
import { BUILDINGS, TRAIN_SPEEDUP_PER_LEVEL, TROOP_LEVELS, GRID, TROOPS, centred, troopMaxLevel, type Cost, type Level, type Res } from './data.ts';

/** `level` is the level being built/reached; while now < readyAt the building works at level - 1 (0 = not built yet). */
export interface Building { id: number; type: string; x: number; y: number; level: number; readyAt: number; collectedAt: number }
export interface Save {
  v: 1; gold: number; chicken: number;
  buildings: Building[];
  troops: Record<string, number>;
  queue: { kind: string; doneAt: number }[];
  unlockedTroops: string[]; // troops paid for in the barracks (troops with a unlock cost)
  unlocking: { kind: string; doneAt: number } | null; // one unlock at a time for ground troops
  unlockingAir: { kind: string; doneAt: number } | null; // and one for flying troops, so the two barracks unlock independently
  troopLevel: Record<string, number>; // missing = level 1
  research: { kind: string; doneAt: number } | null; // one troop upgrade at a time
  nextId: number;
  stars: Record<string, number>; // best stars per goblin base
  ruins: Ruin[]; // buildings destroyed in a raid, waiting to be rebuilt for free
  raids: Raid[]; // attacks this village suffered, shown to the owner until dismissed
}
export interface Raid { by: string; buildings: number; gold: number; chicken: number }
export interface Ruin { type: string; x: number; y: number; level: number }

export function newSave(now: number): Save {
  const s: Save = { v: 1, gold: 250, chicken: 250, buildings: [], troops: { croco: 2 }, queue: [], unlockedTroops: [], unlocking: null, unlockingAir: null, troopLevel: {}, research: null, nextId: 1, stars: {}, ruins: [], raids: [] };
  const start = [['hq', 8, 8], ['goldMine', 4, 9], ['chickenFarm', 14, 9], ['barracks', 9, 13], ['camp', 4, 13], ['goldStore', 4, 4], ['chickenStore', 14, 4], ['workshop', 9, 4]] as const;
  for (const { type, x, y } of centred(start.map(([type, x, y]) => ({ type, x, y }))))
    s.buildings.push({ id: s.nextId++, type, x, y, level: 1, readyAt: now, collectedAt: now });
  return s;
}

/** Building type as it is named now: 'mudPump' became 'chickenFarm', 'reedTower' became 'sarbacaneTower'. Also used for other players' bases. */
export const currentType = (t: string) => (t === 'mudPump' ? 'chickenFarm' : t === 'reedTower' ? 'sarbacaneTower' : t);

/** Fills fields added after a save was written (saves from before upgrades had no level). */
/** Moves the whole village to the middle of the grid, keeping its layout (used on first login). */
export function centreBase(s: Save) {
  const c = centred(s.buildings);
  s.buildings.forEach((b, i) => { b.x = c[i].x; b.y = c[i].y; });
}

export function migrate(s: Save): Save {
  const old = s as Save & { mud?: number }; // saves from before the vase became chicken
  s.chicken ??= old.mud ?? 0;
  delete old.mud;
  for (const b of s.buildings) { b.type = currentType(b.type); b.level ??= 1; }
  for (const r of s.ruins ?? []) r.type = currentType(r.type); // ruins keep their old names too
  for (const m of [s.troops, s.troopLevel, s.unlockedTroops] as unknown[]) renameFrog(m); // the frog troop is now the croco sarbacane
  for (const q of [...s.queue, s.unlocking, s.unlockingAir, s.research]) if (q?.kind === 'frog') q.kind = 'crocoSarbacane'; // queued, unlocking or upgrading frogs too
  s.troopLevel ??= {};
  s.research ??= null;
  s.unlockedTroops ??= Object.keys(TROOPS); // saves from before troops were unlocked keep all of them
  s.unlocking ??= null;
  s.unlockingAir ??= null;
  s.ruins ??= [];
  s.raids ??= [];
  for (const type of ['camp', 'goldStore', 'chickenStore', 'workshop']) { // saves from before camps and storages: give a free one
    if (countOf(s, type) || s.ruins.some(r => r.type === type)) continue; // a destroyed one is a ruin to rebuild, not a missing one
    const spot = [...Array(GRID * GRID).keys()].map(i => [i % GRID, Math.floor(i / GRID)]).find(([x, y]) => canPlace(s, type, x, y));
    if (spot) s.buildings.push({ id: s.nextId++, type, x: spot[0], y: spot[1], level: 1, readyAt: 0, collectedAt: 0 });
  }
  return s;
}

export const canAfford = (s: Save, c: Cost) => (c.gold ?? 0) <= s.gold && (c.chicken ?? 0) <= s.chicken;
const pay = (s: Save, c: Cost) => { s.gold -= c.gold ?? 0; s.chicken -= c.chicken ?? 0; };

export const workingLevel = (b: Building, now: number) => (now < b.readyAt ? b.level - 1 : b.level);
export const stats = (type: string, level: number): Level => BUILDINGS[type].levels[Math.max(0, level - 1)];

export function pending(b: Building, now: number): number {
  const lv = stats(b.type, b.level);
  if (!lv.perMin || now < b.readyAt) return 0; // no production while building or upgrading
  const since = now - Math.max(b.collectedAt, b.readyAt);
  return Math.floor(Math.min(lv.cap!, (lv.perMin * since) / 60_000));
}

/** Largest stock of a resource: the sum of the storages' working levels. */
export const storeCap = (s: Save, res: Res, now: number) =>
  s.buildings.reduce((n, b) => n + (BUILDINGS[b.type].store === res && workingLevel(b, now) > 0 ? stats(b.type, workingLevel(b, now)).store! : 0), 0);

/** Adds to a stock up to the storage cap. Returns what was actually added; the rest is lost. */
export function gain(s: Save, res: Res, n: number, now: number): number {
  const before = s[res];
  s[res] = Math.min(Math.max(before, storeCap(s, res, now)), before + n);
  return s[res] - before;
}

/** Nothing can be collected from a building while its resource is already at the storage cap. */
export function collect(s: Save, b: Building, now: number): number {
  const n = pending(b, now);
  const res = BUILDINGS[b.type].res;
  let got = 0;
  if (n > 0 && res && s[res] < storeCap(s, res, now)) { got = gain(s, res, n, now); b.collectedAt = now; }
  return got;
}

export function canPlace(s: Save, type: string, x: number, y: number, ignoreId?: number): boolean {
  const n = BUILDINGS[type].size;
  if (x < 0 || y < 0 || x + n > GRID || y + n > GRID) return false;
  return s.buildings.every(b => {
    if (b.id === ignoreId) return true;
    const m = BUILDINGS[b.type].size;
    return x + n <= b.x || b.x + m <= x || y + n <= b.y || b.y + m <= y;
  });
}

/** Moves a building to a free spot (its own old footprint counts as free). */
export function moveBuilding(s: Save, b: Building, x: number, y: number): boolean {
  if (!canPlace(s, b.type, x, y, b.id)) return false;
  b.x = x; b.y = y;
  return true;
}

export const countOf = (s: Save, type: string) => s.buildings.filter(b => b.type === type).length;

/** Whether the Chief's hut is high enough to build this type (BUILDINGS[type].hutRequired). */
export const unlocked = (s: Save, type: string, now: number) => hqLevel(s, now) >= (BUILDINGS[type].hutRequired ?? 1);

/** Workers: the HQ gives one, each finished workshop another. Buildings under construction or upgrade keep theirs busy. */
export const workersTotal = (s: Save, now: number) => 1 + s.buildings.filter(b => BUILDINGS[b.type].workshop && now >= b.readyAt).length;
export const workersFree = (s: Save, now: number) => workersTotal(s, now) - s.buildings.filter(b => now < b.readyAt).length;

/** How many of a building the player may own now, given the Hutte du Chef's level. */
export const maxCount = (s: Save, type: string, now: number) => BUILDINGS[type].maxByHut?.[hqLevel(s, now) - 1] ?? BUILDINGS[type].max;

export function placeBuilding(s: Save, type: string, x: number, y: number, now: number): boolean {
  const lv = BUILDINGS[type].levels[0];
  if (!unlocked(s, type, now) || countOf(s, type) >= maxCount(s, type, now) || !canAfford(s, lv.cost) || !canPlace(s, type, x, y) || workersFree(s, now) < 1) return false;
  pay(s, lv.cost);
  s.buildings.push({ id: s.nextId++, type, x, y, level: 1, readyAt: now + lv.sec * 1000, collectedAt: now });
  return true;
}

/** 0 when the HQ is gone (a raid can destroy it): the village then has no level until it is rebuilt. */
export const hqLevel = (s: Save, now: number) => { const hq = s.buildings.find(b => b.type === 'hq'); return hq ? workingLevel(hq, now) : 0; };

/** Why the building cannot be upgraded right now, or null if it can. */
export function upgradeBlock(s: Save, b: Building, now: number): string | null {
  const next = BUILDINGS[b.type].levels[b.level];
  if (now < b.readyAt) return 'Travaux en cours';
  if (!next) return 'Niveau maximum';
  if (workersFree(s, now) < 1) return 'Aucun ouvrier libre';
  if (b.type !== 'hq' && b.level >= hqLevel(s, now)) return `Hutte du Chef niveau ${b.level + 1} requise`;
  if (!canAfford(s, next.cost)) return 'Pas assez de ressources';
  return null;
}

export function upgrade(s: Save, b: Building, now: number): boolean {
  if (upgradeBlock(s, b, now)) return false;
  if (BUILDINGS[b.type].res) collect(s, b, now); // bank what was produced before the works start
  const next = BUILDINGS[b.type].levels[b.level];
  pay(s, next.cost);
  b.level++;
  b.readyAt = now + next.sec * 1000;
  b.collectedAt = now;
  return true;
}

/** Army places given by camps at the level they currently work at. */
export const campHousing = (b: Building, now: number) => (workingLevel(b, now) > 0 ? stats(b.type, workingLevel(b, now)).housing ?? 0 : 0);
export const armyCap = (s: Save, now: number) => s.buildings.reduce((n, b) => n + campHousing(b, now), 0);

/** Flying troops are trained in the aerial barracks, the others in the classic barracks. */
export const trainerOf = (kind: string) => (TROOPS[kind].flying ? 'air' : 'ground');

/** Training time in ms, shortened by the best working barracks level of the right kind. */
export function trainMs(s: Save, kind: string, now: number) {
  const best = Math.max(1, ...s.buildings.filter(b => BUILDINGS[b.type].trains === trainerOf(kind)).map(b => workingLevel(b, now)));
  return (TROOPS[kind].trainSec * 1000) / (1 + TRAIN_SPEEDUP_PER_LEVEL * (best - 1));
}
export const troopLevel = (s: Save, kind: string) => s.troopLevel[kind] ?? 1;
export const troopMult = (s: Save, kind: string) => TROOP_LEVELS[troopLevel(s, kind) - 1].mult;

/** Lab level needed to research the given troop level (TROOPS[kind].labRequired, default: the level itself). */
export const labNeeded = (kind: string, target: number) => TROOPS[kind].labRequired[target] ?? target;
export const labLevel = (s: Save, now: number) => Math.max(0, ...s.buildings.filter(b => BUILDINGS[b.type].lab).map(b => workingLevel(b, now)));

/** Starts the research of the next level of a troop, if a working lab is high enough. */
export function upgradeTroop(s: Save, kind: string, now: number): boolean {
  const lvl = troopLevel(s, kind), up = TROOP_LEVELS[lvl - 1].up;
  if (lvl >= troopMaxLevel(kind) || s.research || !up || !canAfford(s, up.cost) || labLevel(s, now) < labNeeded(kind, lvl + 1)) return false;
  pay(s, up.cost);
  s.research = { kind, doneAt: now + up.sec * 1000 };
  return true;
}

/** Army places used: troops count by their space, queued troops included. */
export const armySize = (s: Save) =>
  Object.entries(s.troops).reduce((a, [k, n]) => a + n * TROOPS[k].space, 0) + s.queue.reduce((a, q) => a + TROOPS[q.kind].space, 0);
export const hasBarracks = (s: Save, now: number, trainer: 'ground' | 'air') => s.buildings.some(b => BUILDINGS[b.type].trains === trainer && workingLevel(b, now) > 0);

/** Best working barracks level (0 = none). */
export const barracksLevel = (s: Save, now: number, trainer: 'ground' | 'air') => Math.max(0, ...s.buildings.filter(b => BUILDINGS[b.type].trains === trainer).map(b => workingLevel(b, now)));

export const troopUnlocked = (s: Save, kind: string) => !TROOPS[kind].unlock || s.unlockedTroops.includes(kind);

/** Which unlock slot a troop uses: flying troops and ground troops unlock side by side. */
export const unlockSlot = (kind: string) => (TROOPS[kind].flying ? 'unlockingAir' : 'unlocking') as 'unlocking' | 'unlockingAir';

/** Pays to unlock a troop; it can be trained once the unlock time has passed. */
export function unlockTroop(s: Save, kind: string, now: number): boolean {
  const u = TROOPS[kind].unlock;
  if (!u || troopUnlocked(s, kind) || s[unlockSlot(kind)] || !canAfford(s, u.cost)) return false;
  pay(s, u.cost);
  s[unlockSlot(kind)] = { kind, doneAt: now + u.sec * 1000 };
  return true;
}

export function addTroopsToQueue(s: Save, kind: string, now: number): boolean {
  const d = TROOPS[kind];
  if (!troopUnlocked(s, kind) || barracksLevel(s, now, trainerOf(kind)) < (d.barracksRequired ?? 1) || armySize(s) + d.space > armyCap(s, now) || !canAfford(s, d.cost)) return false;
  pay(s, d.cost);
  const start = Math.max(now, s.queue.at(-1)?.doneAt ?? 0);
  s.queue.push({ kind, doneAt: start + trainMs(s, kind, now) });
  return true;
}

/** Moves finished troops from the training queue into the army. Returns true if anything changed. */
export function tick(s: Save, now: number): boolean {
  let changed = false;
  for (const slot of ['unlocking', 'unlockingAir'] as const) {
    const u = s[slot];
    if (u && u.doneAt <= now) { s.unlockedTroops.push(u.kind); s[slot] = null; changed = true; }
  }
  while (s.queue.length && s.queue[0].doneAt <= now) {
    const { kind } = s.queue.shift()!;
    s.troops[kind] = (s.troops[kind] ?? 0) + 1;
    changed = true;
  }
  if (s.research && s.research.doneAt <= now) {
    s.troopLevel[s.research.kind] = troopLevel(s, s.research.kind) + 1;
    s.research = null;
    changed = true;
  }
  return changed;
}

/** A raid on this village: the destroyed buildings become ruins and the stolen stock leaves the stock. */
export function applyRaid(s: Save, destroyed: number[], gold: number, chicken: number, by: string) {
  const hit = s.buildings.filter(b => destroyed.includes(b.id));
  s.buildings = s.buildings.filter(b => !destroyed.includes(b.id));
  s.ruins = [...(s.ruins ?? []), ...hit.map(({ type, x, y, level }) => ({ type, x, y, level }))];
  const lostGold = Math.min(s.gold, gold), lostChicken = Math.min(s.chicken, chicken); // what was really there to lose
  s.gold -= lostGold;
  s.chicken -= lostChicken;
  if (hit.length || lostGold || lostChicken) s.raids = [...(s.raids ?? []), { by, buildings: hit.length, gold: lostGold, chicken: lostChicken }];
}

/** Rebuilds ruins for free where there is room. Returns how many came back; the others stay ruins. */
export function rebuild(s: Save, now: number): number {
  let n = 0;
  s.ruins = s.ruins.filter(r => {
    if (!canPlace(s, r.type, r.x, r.y)) return true;
    s.buildings.push({ id: s.nextId++, type: r.type, x: r.x, y: r.y, level: r.level, readyAt: now, collectedAt: now });
    n++;
    return false;
  });
  return n;
}

/** Saves from when the troop was called 'frog' keep their troops under the new name. */
function renameFrog(o: unknown) {
  if (Array.isArray(o)) o.forEach((k, i) => { if (k === 'frog') o[i] = 'crocoSarbacane'; });
  else if (o && typeof o === 'object' && 'frog' in o) { (o as Record<string, unknown>).crocoSarbacane = (o as Record<string, unknown>).frog; delete (o as Record<string, unknown>).frog; }
}
