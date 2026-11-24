// Pure battle simulation (no Phaser), positions in tiles.
import { BUILDINGS, GRID, TROOPS, type Placement, type Res, type TroopDef } from './data.ts';

export interface Struct {
  id: number; type: string; level: number; x: number; y: number; size: number;
  cx: number; cy: number; hp: number; maxHp: number; targetId: number | null;
  stock: number; // part of the base's stored gold or chicken that this storage holds
  held: number; // what this mine or farm holds (uncollected production): stolen when it is destroyed
  ref: number | null; // the building's id in its owner's save
}
export interface Unit {
  id: number; kind: string; x: number; y: number; hp: number; maxHp: number; mult: number; targetId: number | null; cooldown: number;
  wp: { x: number; y: number } | null; // wandering units: the spot they fly to next
}

const TROOP_SPACING = 0.7; // tiles between two freshly dropped troops

export class Battle {
  structs: Struct[];
  units: Unit[] = [];
  time = 0;
  drops: { x: number; y: number }[] = []; // bombs dropped since the view last looked (it draws them)
  hearts: { from: { x: number; y: number }; to: { x: number; y: number } }[] = []; // hearts sent by healers, drawn by the view
  private healsInFlight: { target: Unit; amount: number; at: number }[] = []; // heals that land when their heart arrives
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

  /** What has been stolen so far: each storage, mine or farm gives up its contents in step with the hp it has lost. */
  taken(res: Res): number {
    return Math.floor(this.structs.filter(s => holds(s, res)).reduce((n, s) => n + (s.stock + s.held) * lostShare(s), 0));
  }

  /** Stored stock (not mine or farm contents) stolen so far: this is what leaves the owner's storage. */
  stockTaken(res: Res): number {
    return Math.floor(this.structs.filter(s => holds(s, res)).reduce((n, s) => n + s.stock * lostShare(s), 0));
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
    const u = { id: this.nextId++, kind, x, y, hp: d.hp * mult, maxHp: d.hp * mult, mult, targetId: null, cooldown: 0, wp: null };
    this.units.push(u);
    return u;
  }

  alive<T extends { hp: number }>(list: T[]) { return list.filter(e => e.hp > 0); }

  /** Ground troops never walk into a building: they take the free direction closest to the wanted one. A troop keeps a
   *  margin of 0.3 tiles from every footprint, so gaps wider than 0.6 tiles can be walked through. */
  private walk(u: Unit, angle: number, dist: number, structs: Struct[]) {
    const living = structs.filter(s => s.hp > 0);
    const gap = (x: number, y: number) => Math.min(0.3, ...living.map(s => edgeDist({ x, y }, s))); // capped at the margin
    const now = gap(u.x, u.y); // a troop already squeezed into a margin may only move away from the building
    for (const turn of [0, 0.5, -0.5, 1, -1, 1.5, -1.5, 2.2, -2.2, Math.PI]) {
      const a = angle + turn, x = u.x + Math.cos(a) * dist, y = u.y + Math.sin(a) * dist;
      if (gap(x, y) >= Math.min(0.3, now) - 0.02) { u.x = x; u.y = y; return; } // the small tolerance lets a troop slide along a wall
    }
  }

  /** The healer: keeps the most hurt troop of its army as its target, flies to it and sends a heart every hitEvery seconds. */
  private heal(u: Unit, d: TroopDef, dt: number) {
    let t = this.units.find(a => a.id === u.targetId && a.hp > 0 && a.hp < a.maxHp);
    if (!t) { // one target at a time: the lowest share of hp, kept until it is full or dead
      t = this.units.filter(a => a !== u && a.hp > 0 && a.hp < a.maxHp).sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
      u.targetId = t?.id ?? null;
    }
    if (!t) return;
    const dist = Math.hypot(t.x - u.x, t.y - u.y);
    if (dist > d.range) { const move = Math.min(d.speed * dt, dist); u.x += ((t.x - u.x) / dist) * move; u.y += ((t.y - u.y) / dist) * move; return; }
    u.cooldown -= dt;
    if (u.cooldown > 1e-6) return;
    u.cooldown = d.hitEvery;
    this.hearts.push({ from: { x: u.x, y: u.y }, to: { x: t.x, y: t.y } });
    // the heal lands when the heart arrives; same travel time as the view draws it (0.15 s + 0.06 s per tile)
    this.healsInFlight.push({ target: t, amount: d.heal!, at: this.time + 0.15 + dist * 0.06 });
  }

  /** The bomber: flies to random spots near the buildings, and drops a bomb whenever it is over one. */
  private bomb(u: Unit, d: TroopDef, structs: Struct[], dt: number) {
    if (!structs.length) return;
    if (!u.wp || Math.hypot(u.wp.x - u.x, u.wp.y - u.y) < 0.2) {
      const s = structs[Math.floor(Math.random() * structs.length)], pad = 2; // spots up to 2 tiles around a building
      const near = (v: number) => Math.min(GRID - 1, Math.max(0, v));
      u.wp = { x: near(s.x - pad + Math.random() * (s.size + 2 * pad)), y: near(s.y - pad + Math.random() * (s.size + 2 * pad)) };
    }
    const dx = u.wp.x - u.x, dy = u.wp.y - u.y, len = Math.hypot(dx, dy);
    const move = Math.min(d.speed * dt, len);
    if (len > 1e-6) { u.x += (dx / len) * move; u.y += (dy / len) * move; }
    u.cooldown -= dt;
    if (u.cooldown <= 0 && structs.some(s => edgeDist(u, s) <= 0.5)) { // over a building: bomb
      u.cooldown = d.hitEvery;
      this.drops.push({ x: u.x, y: u.y });
      const dmg = d.dps * d.hitEvery * u.mult;
      for (const s of structs) if (s.hp > 0 && edgeDist(u, s) <= (d.splash ?? 0)) s.hp -= dmg; // every building in the blast takes the damage
    }
  }

  step(dt: number) {
    this.time += dt;
    for (const h of this.healsInFlight) if (h.at <= this.time && h.target.hp > 0) h.target.hp = Math.min(h.target.maxHp, h.target.hp + h.amount);
    this.healsInFlight = this.healsInFlight.filter(h => h.at > this.time);
    const structs = this.alive(this.structs);
    const units = this.alive(this.units);

    for (const u of units) {
      const d = TROOPS[u.kind];
      if (d.heal) { this.heal(u, d, dt); continue; }
      if (d.wanders) { this.bomb(u, d, structs, dt); continue; }
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
        if (d.flying) { u.x += (dx / len) * move; u.y += (dy / len) * move; } // flyers pass over buildings
        else this.walk(u, Math.atan2(dy, dx), move, structs);
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
      if (t) { // area defences (mortar) hit every troop near the target, not only the target
        const radius = BUILDINGS[s.type].splash;
        for (const u of radius ? inRange.filter(u => Math.hypot(u.x - t.x, u.y - t.y) <= radius) : [t]) u.hp -= dps * dt;
      }
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

/** Share of a building's contents already stolen: its lost hp over its max hp. */
const lostShare = (s: Struct) => 1 - Math.max(0, s.hp) / s.maxHp;

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
