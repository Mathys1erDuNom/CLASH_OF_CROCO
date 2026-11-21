// Pure battle simulation (no Phaser), positions in tiles.
import { BUILDINGS, TROOPS, type Placement, type Res } from './data.ts';

export interface Struct {
  id: number; type: string; level: number; x: number; y: number; size: number;
  cx: number; cy: number; hp: number; maxHp: number; targetId: number | null;
  stock: number; // part of the base's stored gold or chicken that this storage holds
  held: number; // what this mine or farm holds (uncollected production): stolen when it is destroyed
  ref: number | null; // the building's id in its owner's save
}
export interface Unit {
  id: number; kind: string; x: number; y: number; hp: number; maxHp: number; mult: number; targetId: number | null; cooldown: number;
}

const TROOP_SPACING = 0.7; // tiles between two freshly dropped troops

export class Battle {
  structs: Struct[];
  units: Unit[] = [];
  time = 0;
  private nextId = 1000;

  /** stock: the gold and chicken stored in the base, split evenly between its storages (or its mines and farms if it has none). */
  constructor(layout: Placement[], stock: Partial<Record<Res, number>> = {}) {
    this.structs = layout.map((p, i) => {
      const d = BUILDINGS[p.type], level = p.level ?? 1, hp = d.levels[level - 1].hp;
      return { id: i, type: p.type, level, x: p.x, y: p.y, size: d.size, cx: p.x + d.size / 2, cy: p.y + d.size / 2, hp, maxHp: hp, targetId: null, stock: 0, held: p.held ?? 0, ref: p.ref ?? null };
    });
    for (const res of ['gold', 'chicken'] as Res[]) {
      const stores = this.structs.filter(s => BUILDINGS[s.type].store === res);
      const holders = stores.length ? stores : this.structs.filter(s => BUILDINGS[s.type].res === res);
      const total = Math.floor(stock[res] ?? 0);
      holders.forEach((s, i) => { s.stock = Math.floor(total / holders.length) + (i === 0 ? total % holders.length : 0); });
    }
  }

  /** Everything the base holds in a resource (storage stock plus what its mines and farms hold). */
  total(res: Res): number {
    return this.structs.filter(s => holds(s, res)).reduce((n, s) => n + s.stock + s.held, 0);
  }

  /** What has been stolen so far: the contents of every destroyed building that held the resource. */
  taken(res: Res): number {
    return this.structs.filter(s => s.hp <= 0 && holds(s, res)).reduce((n, s) => n + s.stock + s.held, 0);
  }

  /** Stored stock (not mine or farm contents) stolen so far: this is what leaves the owner's storage. */
  stockTaken(res: Res): number {
    return this.structs.filter(s => s.hp <= 0 && holds(s, res)).reduce((n, s) => n + s.stock, 0);
  }

  /** What is still in the base: the total minus what has been stolen. */
  left(res: Res): number {
    return this.total(res) - this.taken(res);
  }

  /** Ids (in the owner's save) of the buildings destroyed in this attack. */
  destroyedRefs(): number[] {
    return this.structs.filter(s => s.hp <= 0 && s.ref !== null).map(s => s.ref!);
  }

  /** Troops may not be dropped on or right next to a building. */
  canDeploy(x: number, y: number): boolean {
    return this.structs.every(s => s.hp <= 0 || x < s.x - 1 || x > s.x + s.size + 1 || y < s.y - 1 || y > s.y + s.size + 1);
  }

  deploy(kind: string, x: number, y: number, mult = 1): Unit {
    const d = TROOPS[kind];
    const u = { id: this.nextId++, kind, x, y, hp: d.hp * mult, maxHp: d.hp * mult, mult, targetId: null, cooldown: 0 };
    this.units.push(u);
    return u;
  }

  alive<T extends { hp: number }>(list: T[]) { return list.filter(e => e.hp > 0); }

  step(dt: number) {
    this.time += dt;
    const structs = this.alive(this.structs);
    const units = this.alive(this.units);

    for (const u of units) {
      const d = TROOPS[u.kind];
      let t = structs.find(s => s.id === u.targetId && s.hp > 0);
      if (!t) {
        const fav = structs.filter(s => d.prefers === 'defense' ? BUILDINGS[s.type].defense : d.prefers === 'resource' && BUILDINGS[s.type].res);
        t = nearest(fav.length ? fav : structs, s => edgeDist(u, s));
        u.targetId = t?.id ?? null;
      }
      if (!t) continue;
      u.cooldown -= dt;
      if (edgeDist(u, t) <= d.range) {
        if (u.cooldown > 1e-6) continue; // still reloading (tolerance for float steps)
        u.cooldown += d.hitEvery;
        if (u.cooldown < 0) u.cooldown = d.hitEvery; // first hit after walking: no burst of stored hits
        const dmg = d.dps * d.hitEvery * u.mult * (BUILDINGS[t.type].res ? d.resourceBonus ?? 1 : 1);
        const hit = d.splash ? structs.filter(s => s.hp > 0 && edgeDist({ x: t.cx, y: t.cy }, s) <= d.splash!) : [t]; // area damage around the target
        for (const s of hit) s.hp -= dmg;
      }
      else {
        const dx = t.cx - u.x, dy = t.cy - u.y, len = Math.hypot(dx, dy);
        const move = Math.min(d.speed * dt, len);
        u.x += (dx / len) * move; u.y += (dy / len) * move;
      }
    }

    for (const s of structs) {
      const { dps, range } = BUILDINGS[s.type].levels[s.level - 1];
      if (!dps || !range || s.hp <= 0) continue;
      const air = BUILDINGS[s.type].hitsAir;
      const airOnly = BUILDINGS[s.type].airOnly;
      const inRange = units.filter(u => u.hp > 0 && (TROOPS[u.kind].flying ? air : !airOnly) && Math.hypot(u.x - s.cx, u.y - s.cy) <= range);
      let t = inRange.find(u => u.id === s.targetId);
      if (!t) t = nearest(inRange, u => Math.hypot(u.x - s.cx, u.y - s.cy));
      s.targetId = t?.id ?? null;
      if (t) t.hp -= dps * dt;
    }

    // troops that overlap push each other apart, so none can stay stacked on another
    for (let i = 0; i < units.length; i++) for (let j = i + 1; j < units.length; j++) {
      const a = units[i], b = units[j];
      let dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy);
      if (len >= TROOP_SPACING) continue;
      if (len < 1e-6) { dx = 1; dy = 0; len = 1; } // same point: split sideways
      const push = (TROOP_SPACING - len) / 2;
      a.x -= (dx / len) * push; a.y -= (dy / len) * push;
      b.x += (dx / len) * push; b.y += (dy / len) * push;
    }
  }

  destruction(): number {
    return Math.round((100 * this.structs.filter(s => s.hp <= 0).length) / this.structs.length);
  }

  stars(): number {
    const pct = this.destruction();
    const hqDown = this.structs.some(s => s.type === 'hq' && s.hp <= 0);
    return (pct >= 50 ? 1 : 0) + (hqDown ? 1 : 0) + (pct === 100 ? 1 : 0);
  }

}

/** A mine, farm or storage that holds this resource. */
function holds(s: Struct, res: Res): boolean {
  return BUILDINGS[s.type].res === res || BUILDINGS[s.type].store === res;
}

export function edgeDist(u: { x: number; y: number }, s: Struct): number {
  const dx = Math.max(s.x - u.x, 0, u.x - (s.x + s.size));
  const dy = Math.max(s.y - u.y, 0, u.y - (s.y + s.size));
  return Math.hypot(dx, dy);
}

function nearest<T>(list: T[], dist: (e: T) => number): T | undefined {
  let best: T | undefined, bd = Infinity;
  for (const e of list) { const d = dist(e); if (d < bd) { bd = d; best = e; } }
  return best;
}
