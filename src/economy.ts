// Village state and timer logic. Timers are wall-clock timestamps so production continues while offline.
import { BUILDINGS, TRAIN_SPEEDUP_PER_LEVEL, TROOP_LEVELS, GRID, TROOPS, centred, troopMaxLevel, type Cost, type Level, type Res } from './data.ts';

/** `level` is the level being built/reached; while now < readyAt the building works at level - 1 (0 = not built yet). */
export interface Building { id: number; type: string; x: number; y: number; level: number; readyAt: number; collectedAt: number }
export interface Save {
  v: 1; gold: number; chicken: number;
  buildings: Building[];
  troops: Record<string, number>;
  queue: { kind: string; doneAt: number }[];
  troopLevel: Record<string, number>; // missing = level 1
  research: { kind: string; doneAt: number } | null; // one troop upgrade at a time
  nextId: number;
  stars: Record<string, number>; // best stars per goblin base
}

export function newSave(now: number): Save {
  const s: Save = { v: 1, gold: 250, chicken: 250, buildings: [], troops: { croco: 3, frog: 4 }, queue: [], troopLevel: {}, research: null, nextId: 1, stars: {} };
  const start = [['hq', 8, 8], ['goldMine', 4, 9], ['chickenFarm', 14, 9], ['barracks', 9, 13], ['camp', 4, 13], ['goldStore', 4, 4], ['chickenStore', 14, 4]] as const;
  for (const { type, x, y } of centred(start.map(([type, x, y]) => ({ type, x, y }))))
    s.buildings.push({ id: s.nextId++, type, x, y, level: 1, readyAt: now, collectedAt: now });
  return s;
}

/** Building type as it is named now: 'mudPump' was renamed 'chickenFarm'. Also used for other players' bases. */
export const currentType = (t: string) => (t === 'mudPump' ? 'chickenFarm' : t);

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
  s.troopLevel ??= {};
  s.research ??= null;
  for (const type of ['camp', 'goldStore', 'chickenStore']) { // saves from before camps and storages: give a free one
    if (countOf(s, type)) continue;
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

export function collect(s: Save, b: Building, now: number): number {
  const n = pending(b, now);
  let got = 0;
  if (n > 0) { got = gain(s, BUILDINGS[b.type].res!, n, now); b.collectedAt = now; }
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

export function placeBuilding(s: Save, type: string, x: number, y: number, now: number): boolean {
  const lv = BUILDINGS[type].levels[0];
  if (!unlocked(s, type, now) || countOf(s, type) >= BUILDINGS[type].max || !canAfford(s, lv.cost) || !canPlace(s, type, x, y)) return false;
  pay(s, lv.cost);
  s.buildings.push({ id: s.nextId++, type, x, y, level: 1, readyAt: now + lv.sec * 1000, collectedAt: now });
  return true;
}

export const hqLevel = (s: Save, now: number) => workingLevel(s.buildings.find(b => b.type === 'hq')!, now);

/** Why the building cannot be upgraded right now, or null if it can. */
export function upgradeBlock(s: Save, b: Building, now: number): string | null {
  const next = BUILDINGS[b.type].levels[b.level];
  if (now < b.readyAt) return 'Travaux en cours';
  if (!next) return 'Niveau maximum';
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

/** Training time in ms, shortened by the best working barracks level. */
export function trainMs(s: Save, kind: string, now: number) {
  const best = Math.max(1, ...s.buildings.filter(b => BUILDINGS[b.type].trains).map(b => workingLevel(b, now)));
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
export const hasBarracks = (s: Save, now: number) => s.buildings.some(b => BUILDINGS[b.type].trains && workingLevel(b, now) > 0);

/** Best working barracks level (0 = none). */
export const barracksLevel = (s: Save, now: number) => Math.max(0, ...s.buildings.filter(b => BUILDINGS[b.type].trains).map(b => workingLevel(b, now)));

export function addTroopsToQueue(s: Save, kind: string, now: number): boolean {
  const d = TROOPS[kind];
  if (barracksLevel(s, now) < (d.barracksRequired ?? 1) || armySize(s) + d.space > armyCap(s, now) || !canAfford(s, d.cost)) return false;
  pay(s, d.cost);
  const start = Math.max(now, s.queue.at(-1)?.doneAt ?? 0);
  s.queue.push({ kind, doneAt: start + trainMs(s, kind, now) });
  return true;
}

/** Moves finished troops from the training queue into the army. Returns true if anything changed. */
export function tick(s: Save, now: number): boolean {
  let changed = false;
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
