export type Res = 'gold' | 'chicken';
export type Cost = Partial<Record<Res, number>>;

export const GRID = 35; // tiles per side (about 3x the area of the old 20)

/** Stats of one building level. levels[0] is the initial construction. */
export interface Level {
  cost: Cost;
  sec: number; // build / upgrade time
  hp: number;
  perMin?: number; cap?: number; // producers
  dps?: number; range?: number; // defenses (range in tiles)
  housing?: number; // camps: army places
  store?: number; // storage: max stock of its resource
}

export interface BuildingDef {
  name: string;
  size: number; // footprint in tiles
  max: number; // how many the player may own
  hutRequired?: number; // Chief's hut level needed to build it; hidden from the build menu until then (default 1)
  res?: Res; // resource produced
  store?: Res; // resource whose stock it raises the maximum of
  defense?: boolean;
  hitsAir?: boolean; // defense that can shoot flying troops (others only hit the ground)
  airOnly?: boolean; // shoots flying troops only
  trains?: boolean;
  lab?: boolean; // upgrades troops
  loot?: boolean; // goblin version holds loot
  levels: Level[];
}

export const BUILDINGS: Record<string, BuildingDef> = {
  hq: { name: 'Hutte du Chef', size: 3, max: 1, levels: [
    { cost: {}, sec: 0, hp: 1500 },
    { cost: { gold: 500, chicken: 500 }, sec: 60, hp: 2200 },
    { cost: { gold: 1500, chicken: 1500 }, sec: 180, hp: 3200 },
  ] },
  goldMine: { name: "Mine d'or", size: 2, max: 4, res: 'gold', loot: true, levels: [
    { cost: { chicken: 60 }, sec: 10, hp: 400, perMin: 30, cap: 200 },
    { cost: { chicken: 200 }, sec: 40, hp: 550, perMin: 50, cap: 400 },
    { cost: { chicken: 600 }, sec: 120, hp: 750, perMin: 80, cap: 800 },
  ] },
  chickenFarm: { name: 'Élevage de poulets', size: 2, max: 4, res: 'chicken', loot: true, levels: [
    { cost: { gold: 60 }, sec: 10, hp: 400, perMin: 30, cap: 200 },
    { cost: { gold: 200 }, sec: 40, hp: 550, perMin: 50, cap: 400 },
    { cost: { gold: 600 }, sec: 120, hp: 750, perMin: 80, cap: 800 },
  ] },
  barracks: { name: 'Caserne du marais', size: 2, max: 2, trains: true, levels: [
    { cost: { gold: 120 }, sec: 20, hp: 500 },
    { cost: { gold: 400 }, sec: 60, hp: 700 },
    { cost: { gold: 1000 }, sec: 150, hp: 900 },
  ] },
  camp: { name: 'Camp des troupes', size: 3, max: 3, levels: [
    { cost: { gold: 80 }, sec: 15, hp: 400, housing: 20 },
    { cost: { gold: 350 }, sec: 50, hp: 550, housing: 35 },
    { cost: { gold: 900 }, sec: 120, hp: 700, housing: 50 },
  ] },
  cannon: { name: 'Canon à noix de coco', size: 2, max: 4, defense: true, levels: [
    { cost: { gold: 150 }, sec: 25, hp: 600, dps: 40, range: 6 },
    { cost: { gold: 450 }, sec: 60, hp: 850, dps: 60, range: 6 },
    { cost: { gold: 1100 }, sec: 150, hp: 1100, dps: 85, range: 6 },
  ] },
  reedTower: { name: 'Tour de roseaux', size: 2, max: 4, hutRequired: 2, defense: true, hitsAir: true, levels: [
    { cost: { gold: 100, chicken: 50 }, sec: 25, hp: 450, dps: 22, range: 8 },
    { cost: { gold: 300, chicken: 150 }, sec: 60, hp: 600, dps: 32, range: 8 },
    { cost: { gold: 800, chicken: 400 }, sec: 150, hp: 800, dps: 45, range: 8 },
  ] },
  airDefense: { name: 'Lance-harpons anti-air', size: 2, max: 2, hutRequired: 3, defense: true, hitsAir: true, airOnly: true, levels: [
    { cost: { gold: 300, chicken: 100 }, sec: 40, hp: 500, dps: 110, range: 8 },
    { cost: { gold: 700, chicken: 300 }, sec: 90, hp: 700, dps: 160, range: 8 },
    { cost: { gold: 1500, chicken: 700 }, sec: 180, hp: 900, dps: 230, range: 8 },
  ] },
  goldStore: { name: "Réserve d'or", size: 2, max: 4, store: 'gold', loot: true, levels: [
    { cost: { gold: 150 }, sec: 30, hp: 900, store: 1000 },
    { cost: { gold: 600 }, sec: 90, hp: 1400, store: 2500 },
    { cost: { gold: 1800 }, sec: 180, hp: 2000, store: 5000 },
  ] },
  chickenStore: { name: 'Réserve de poulets', size: 2, max: 4, store: 'chicken', loot: true, levels: [
    { cost: { chicken: 150 }, sec: 30, hp: 900, store: 1000 },
    { cost: { chicken: 600 }, sec: 90, hp: 1400, store: 2500 },
    { cost: { chicken: 1800 }, sec: 180, hp: 2000, store: 5000 },
  ] },
  lab: { name: 'Laboratoire', size: 2, max: 1, hutRequired: 2, lab: true, levels: [
    { cost: { gold: 150, chicken: 100 }, sec: 30, hp: 500 },
    { cost: { gold: 500, chicken: 400 }, sec: 90, hp: 700 },
    { cost: { gold: 1200, chicken: 1000 }, sec: 200, hp: 900 },
  ] },
};

export interface TroopDef {
  name: string;
  hp: number;
  dps: number; // average damage per second
  hitEvery: number; // seconds between two attacks; damage per attack = dps * hitEvery
  range: number; // tiles
  speed: number; // tiles per second
  space: number; // army places taken in camps
  cost: Cost;
  trainSec: number;
  unlock?: { cost: Cost; sec: number }; // paid once in the barracks, then wait; without it the troop is available from the start
  prefers?: 'defense' | 'resource'; // favourite targets; falls back to the nearest building once none are left
  /** Laboratory level needed to research each troop level: { 2: 2 } = "level 2 needs a level-2 lab". */
  labRequired: Record<number, number>;
  barracksRequired?: number; // barracks level needed to train it (default 1)
  maxLevel?: number; // highest level it can reach (default: every level of TROOP_LEVELS)
  splash?: number; // area damage radius in tiles around the target (default: single target)
  flying?: boolean; // flies over everything; only defenses with hitsAir can shoot it
  wanders?: boolean; // no target: flies around the enemy base and drops a bomb (splash) whenever it is over a building
  resourceBonus?: number; // damage multiplier against gold mines and chicken farms
}

export const TROOPS: Record<string, TroopDef> = {
  croco: { name: 'Croco Cogneur', hp: 320, dps: 26, range: 0.6, hitEvery: 1.0, speed: 1.1, space: 5, cost: { chicken: 50 }, trainSec: 12, prefers: 'defense', labRequired: { 2: 2, 3: 3 } },
  frog: { name: 'Grenouille Sarbacane', hp: 90, dps: 16, range: 3, hitEvery: 0.8, speed: 1.6, space: 2, cost: { chicken: 30 }, trainSec: 8, unlock: { cost: { chicken: 100 }, sec: 60 }, labRequired: { 2: 2, 3: 3 } },
  babyCroco: { name: 'Bébé Croco', hp: 70, dps: 12, range: 0.5, hitEvery: 0.5, speed: 2.4, space: 1, cost: { chicken: 15 }, trainSec: 4, unlock: { cost: { chicken: 150 }, sec: 90 }, prefers: 'resource', labRequired: { 2: 2, 3: 3 }, resourceBonus: 3 },
  crocoLauncher: { name: 'Lanceur de croco explosif', hp: 160, dps: 34, range: 4.5, hitEvery: 2.0, speed: 0.9, space: 4, cost: { chicken: 90 }, trainSec: 20, unlock: { cost: { chicken: 400 }, sec: 180 }, labRequired: { 2: 3 }, barracksRequired: 2, maxLevel: 2, splash: 1.5 }, // TEST: real value barracksRequired: 2
  flyingCroco: { name: 'Croco volant bombardier', hp: 300, dps: 42, range: 0, hitEvery: 0.7, speed: 2.5, space: 6, cost: { chicken: 160 }, trainSec: 30, unlock: { cost: { chicken: 600 }, sec: 240 }, labRequired: { 2: 3 }, barracksRequired: 2, maxLevel: 2, splash: 1, flying: true, wanders: true }, // TEST: real value barracksRequired: 3
};

/** Each barracks level above 1 trains troops this much faster (level 2: x1.5, level 3: x2). */
export const TRAIN_SPEEDUP_PER_LEVEL = 0.5;

/** Troop levels by current level: mult scales hp and dps; up pays for the next level (lab level: see labRequired in TROOPS). */
export const TROOP_LEVELS: { mult: number; up?: { cost: Cost; sec: number } }[] = [
  { mult: 1, up: { cost: { chicken: 100 }, sec: 60 } },
  { mult: 1.3, up: { cost: { chicken: 300, gold: 100 }, sec: 150 } },
  { mult: 1.7 },
];

/** ref: the building's id in its owner's save (a raid needs it); held: what a mine or farm holds right now, stealable. */
export interface Placement { type: string; x: number; y: number; level?: number; ref?: number; held?: number }

export interface GoblinBase { id: string; name: string; loot: Record<Res, number>; buildings: Placement[] }

const RAW_GOBLIN_BASES: GoblinBase[] = [
  {
    id: 'camp', name: 'Campement gobelin', loot: { gold: 300, chicken: 300 },
    buildings: [
      { type: 'hq', x: 9, y: 9 }, { type: 'goldMine', x: 5, y: 9 }, { type: 'chickenFarm', x: 13, y: 9 },
      { type: 'cannon', x: 9, y: 5 },
    ],
  },
  {
    id: 'fort', name: 'Fort des Verrues', loot: { gold: 700, chicken: 600 },
    buildings: [
      { type: 'hq', x: 9, y: 9, level: 2 }, { type: 'cannon', x: 6, y: 6, level: 2 }, { type: 'cannon', x: 13, y: 13 },
      { type: 'reedTower', x: 13, y: 6, level: 2 }, { type: 'goldMine', x: 6, y: 13 }, { type: 'goldMine', x: 9, y: 13 },
      { type: 'chickenFarm', x: 9, y: 6 }, { type: 'barracks', x: 13, y: 9 }, { type: 'airDefense', x: 3, y: 9 },
    ],
  },
  {
    id: 'citadel', name: 'Citadelle du Roi Gobelin', loot: { gold: 1500, chicken: 1400 },
    buildings: [
      { type: 'hq', x: 9, y: 9, level: 3 }, { type: 'cannon', x: 6, y: 9, level: 3 }, { type: 'cannon', x: 13, y: 9, level: 3 },
      { type: 'cannon', x: 9, y: 6, level: 2 }, { type: 'reedTower', x: 6, y: 6, level: 2 }, { type: 'reedTower', x: 13, y: 6, level: 2 },
      { type: 'reedTower', x: 6, y: 13, level: 3 }, { type: 'reedTower', x: 13, y: 13, level: 3 }, { type: 'goldMine', x: 9, y: 13, level: 3 },
      { type: 'chickenFarm', x: 3, y: 9, level: 2 }, { type: 'chickenFarm', x: 16, y: 9, level: 2 }, { type: 'goldMine', x: 9, y: 3, level: 2 }, { type: 'airDefense', x: 16, y: 3, level: 2 },
    ],
  },
  {
    id: 'swamp', name: 'Marais Maudit', loot: { gold: 2500, chicken: 2200 },
    buildings: [{ type: 'hq', x: 9, y: 9, level: 3 }, { type: 'cannon', x: 5, y: 5, level: 3 }, { type: 'cannon', x: 14, y: 5, level: 3 }, { type: 'cannon', x: 5, y: 14, level: 3 }, { type: 'cannon', x: 14, y: 14, level: 3 }, { type: 'reedTower', x: 9, y: 5, level: 3 }, { type: 'reedTower', x: 9, y: 14, level: 2 }, { type: 'reedTower', x: 5, y: 9, level: 2 }, { type: 'reedTower', x: 14, y: 9, level: 3 }, { type: 'airDefense', x: 7, y: 7, level: 2 }, { type: 'airDefense', x: 12, y: 12, level: 2 }, { type: 'barracks', x: 12, y: 6, level: 3 }, { type: 'lab', x: 6, y: 12, level: 2 }, { type: 'goldMine', x: 2, y: 2, level: 3 }, { type: 'goldMine', x: 17, y: 17, level: 3 }, { type: 'chickenFarm', x: 17, y: 2, level: 3 }, { type: 'chickenFarm', x: 2, y: 17, level: 3 }],
  },
  {
    id: 'warts', name: 'Repaire du Seigneur des Verrues', loot: { gold: 4000, chicken: 3500 },
    buildings: [{ type: 'hq', x: 9, y: 9, level: 3 }, { type: 'cannon', x: 6, y: 6, level: 3 }, { type: 'cannon', x: 12, y: 6, level: 3 }, { type: 'cannon', x: 6, y: 12, level: 3 }, { type: 'cannon', x: 12, y: 12, level: 3 }, { type: 'cannon', x: 9, y: 3, level: 3 }, { type: 'reedTower', x: 3, y: 9, level: 3 }, { type: 'reedTower', x: 15, y: 9, level: 3 }, { type: 'reedTower', x: 9, y: 15, level: 3 }, { type: 'reedTower', x: 3, y: 3, level: 3 }, { type: 'reedTower', x: 15, y: 15, level: 3 }, { type: 'airDefense', x: 9, y: 6, level: 3 }, { type: 'airDefense', x: 6, y: 9, level: 2 }, { type: 'airDefense', x: 12, y: 9, level: 2 }, { type: 'goldMine', x: 15, y: 3, level: 3 }, { type: 'goldMine', x: 3, y: 15, level: 3 }, { type: 'chickenFarm', x: 17, y: 6, level: 3 }, { type: 'chickenFarm', x: 6, y: 17, level: 3 }, { type: 'camp', x: 16, y: 12, level: 3 }],
  },
  {
    id: 'throne', name: 'Trône du Roi Gobelin Suprême', loot: { gold: 6000, chicken: 5000 },
    buildings: [{ type: 'hq', x: 9, y: 9, level: 3 }, { type: 'cannon', x: 7, y: 7, level: 3 }, { type: 'cannon', x: 12, y: 7, level: 3 }, { type: 'cannon', x: 7, y: 12, level: 3 }, { type: 'cannon', x: 12, y: 12, level: 3 }, { type: 'cannon', x: 9, y: 4, level: 3 }, { type: 'cannon', x: 9, y: 14, level: 3 }, { type: 'cannon', x: 4, y: 9, level: 3 }, { type: 'cannon', x: 14, y: 9, level: 3 }, { type: 'reedTower', x: 4, y: 4, level: 3 }, { type: 'reedTower', x: 14, y: 4, level: 3 }, { type: 'reedTower', x: 4, y: 14, level: 3 }, { type: 'reedTower', x: 14, y: 14, level: 3 }, { type: 'reedTower', x: 1, y: 9, level: 3 }, { type: 'reedTower', x: 17, y: 9, level: 3 }, { type: 'airDefense', x: 9, y: 7, level: 3 }, { type: 'airDefense', x: 7, y: 9, level: 3 }, { type: 'airDefense', x: 12, y: 9, level: 3 }, { type: 'goldMine', x: 1, y: 1, level: 3 }, { type: 'goldMine', x: 17, y: 1, level: 3 }, { type: 'chickenFarm', x: 1, y: 17, level: 3 }, { type: 'chickenFarm', x: 17, y: 17, level: 3 }, { type: 'lab', x: 9, y: 17, level: 2 }, { type: 'barracks', x: 9, y: 1, level: 3 }],
  },
];

/** Shifts a layout so that its footprint sits in the middle of the grid. */
export function centred<T extends Placement>(list: T[]): T[] {
  const xs = list.flatMap(p => [p.x, p.x + BUILDINGS[p.type].size]), ys = list.flatMap(p => [p.y, p.y + BUILDINGS[p.type].size]);
  const dx = Math.round((GRID - (Math.max(...xs) - Math.min(...xs))) / 2) - Math.min(...xs);
  const dy = Math.round((GRID - (Math.max(...ys) - Math.min(...ys))) / 2) - Math.min(...ys);
  return list.map(p => ({ ...p, x: p.x + dx, y: p.y + dy }));
}

export const GOBLIN_BASES: GoblinBase[] = RAW_GOBLIN_BASES.map(b => ({ ...b, buildings: centred(b.buildings) }));

export function fmtCost(c: Cost): string {
  return [c.gold && `${c.gold} or`, c.chicken && `${c.chicken} poulet${c.chicken > 1 ? 's' : ''}`].filter(Boolean).join(' + ') || 'gratuit';
}

export const troopMaxLevel = (kind: string) => TROOPS[kind].maxLevel ?? TROOP_LEVELS.length;
