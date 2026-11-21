import * as THREE from 'three';
import { BUILDINGS, TROOPS, type Placement, type Res } from '../data.ts';
import { Battle, edgeDist } from '../combat.ts';
import { Bar, animate, floatText, toWorld, world, type Mode } from '../three/engine.ts';
import { BUILDING_TOP, ball, bombCroco, box, cyl } from '../three/models.ts';
import { building, troop } from '../three/assets.ts';
import { swamp } from '../three/scenery.ts';
import { troopLevel, troopMult } from '../economy.ts';
import { persist, save } from '../store.ts';
import { spriteUrl } from '../sprites.ts';
import { refresh, secs, setPanel } from '../ui.ts';

const DURATION = 90; // seconds
const DT = 1 / 30; // fixed simulation step
const FLY_HEIGHT = 2; // flying troops cruise this high

/** Flaps the wings of a flying model (no-op for others). */
export function flap(model: THREE.Object3D, t: number) {
  const l = model.getObjectByName('wingL'), r = model.getObjectByName('wingR');
  if (l && r) { l.rotation.x = -Math.sin(t * 10) * 0.6; r.rotation.x = Math.sin(t * 10) * 0.6; }
}

function puff(at: THREE.Vector3, color: number, n: number, size = 0.12) {
  for (let i = 0; i < n; i++) {
    const m = new THREE.Mesh(new THREE.IcosahedronGeometry(size * (0.6 + Math.random()), 0), new THREE.MeshBasicMaterial({ color, transparent: true }));
    const dir = new THREE.Vector3(Math.random() - 0.5, Math.random() * 0.8, Math.random() - 0.5);
    m.position.copy(at);
    world.add(m);
    animate(0.5 + Math.random() * 0.3, k => {
      m.position.copy(at).addScaledVector(dir, k * 1.5);
      m.scale.setScalar(1 + k * 1.5);
      (m.material as THREE.MeshBasicMaterial).opacity = 1 - k;
    }, () => { world.remove(m); m.geometry.dispose(); (m.material as THREE.Material).dispose(); });
  }
}

function projectile(kind: 'coconut' | 'thorn' | 'dart' | 'bomb' | 'drop' | 'harpoon', from: THREE.Vector3, to: THREE.Vector3, level = 1) {
  const p = kind === 'harpoon' ? cyl(0.04, 0.04, 0.7, 0x8b5a2b, 0, 0, 0, 5) : kind === 'drop' ? ball(0.1, 0x222228, 0, 0, 0, 1) : kind === 'bomb' ? bombCroco(level) : kind === 'coconut' ? ball(0.13, 0x7a4a24, 0, 0, 0, 0) : cyl(0.02, 0.02, 0.35, kind === 'dart' ? 0xf1ead2 : 0x6d4526, 0, 0, 0, 4);
  world.add(p);
  const arc = kind === 'drop' ? 0 : kind === 'bomb' ? 2.2 : kind === 'coconut' ? 1.6 : 0.3, dur = (kind === 'bomb' ? 0.35 : 0.15) + from.distanceTo(to) * 0.06;
  const dir = to.clone().sub(from);
  if (kind === 'bomb') p.rotation.y = Math.atan2(-dir.z, dir.x); // the bomb-croco flies head first
  else p.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
  animate(dur, k => {
    p.position.copy(from).addScaledVector(dir, k).setY(from.y + (to.y - from.y) * k + Math.sin(k * Math.PI) * arc);
    if (kind === 'bomb') p.rotation.z = (0.5 - k) * 1.5; // nose up, then nose down
  }, () => {
    world.remove(p);
    p.traverse(o => { if (o instanceof THREE.Mesh) o.geometry.dispose(); });
    if (kind === 'bomb' || kind === 'drop') { puff(to, 0xff8a20, 10, 0.22); puff(to, 0x5a5048, 8, 0.18); }
    else puff(to, kind === 'coconut' ? 0xffc070 : 0xe8f0c0, kind === 'coconut' ? 6 : 2);
  });
}

/** A base to attack or visit: a goblin camp (has loot) or another player's base (no loot, no stars). */
export interface Target { id: string; name: string; goblin: boolean; buildings: Placement[]; loot?: Record<Res, number> }

/** visit: read-only view of the base, no troops, no damage. */
export function attackMode(base: Target, exit: () => void, visit = false): Mode {
  const battle = new Battle(base.buildings);
  let selected = Object.keys(TROOPS).find(k => (save.troops[k] ?? 0) > 0) ?? '';
  let acc = 0, t = 0;
  let result: { stars: number; gold: number; chicken: number } | null = null;
  const cd = new Map<number, number>(); // cosmetic shot timers

  swamp(world, base.goblin ? 42 : 7, base.goblin); // same scenery as the village for players
  const structs = new Map<number, { model: THREE.Group; bar: Bar }>();
  const zone = new THREE.MeshBasicMaterial({ color: 0xff3020, transparent: true, opacity: 0.13, depthWrite: false });
  for (const s of battle.structs) {
    const model = building(s.type, base.goblin, s.level);
    model.position.copy(toWorld(s.cx, s.cy));
    const bar = new Bar(s.size * 0.6, 0xe04040);
    bar.group.position.copy(toWorld(s.cx, s.cy, BUILDING_TOP[s.type]));
    bar.group.visible = false;
    const red = new THREE.Mesh(new THREE.PlaneGeometry(s.size + 2, s.size + 2).rotateX(-Math.PI / 2), zone);
    red.position.copy(toWorld(s.cx, s.cy, 0.03));
    world.add(model, bar.group, red);
    red.visible = !visit;
    structs.set(s.id, { model, bar });
  }
  const units = new Map<number, { model: THREE.Group; bar: Bar; last: THREE.Vector3 }>();

  function ready(id: number, dt: number, period: number) {
    const left = (cd.get(id) ?? 0) - dt;
    cd.set(id, left <= 0 ? period : left);
    return left <= 0;
  }

  function finish() {
    const stars = battle.stars(), f = battle.lootFraction();
    result = { stars, gold: Math.floor((base.loot?.gold ?? 0) * f), chicken: Math.floor((base.loot?.chicken ?? 0) * f) };
    save.gold += result.gold; save.chicken += result.chicken;
    if (base.loot) save.stars[base.id] = Math.max(save.stars[base.id] ?? 0, stars);
    persist();
  }

  function shake() {
    animate(0.3, k => world.position.set(Math.sin(k * 60) * 0.12 * (1 - k), 0, Math.cos(k * 50) * 0.12 * (1 - k)), () => world.position.set(0, 0, 0));
  }

  function panelHtml(): string {
    const stars = (n: number) => '★'.repeat(n) + '☆'.repeat(3 - n);
    if (visit) return `<h1>👁 ${base.name}</h1><p class="hint">Base en lecture seule.</p><button data-act="retreat" class="retreat">Retour au village</button>`;
    if (result) {
      return `<h1 class="result">${result.stars ? 'Victoire !' : 'Défaite…'}</h1><p class="big">${stars(result.stars)}</p>
        <p>Destruction : ${battle.destruction()} %</p>
        <p>Butin : <img class="i" src="${spriteUrl('i_gold')}" alt="Or"> ${result.gold} · <img class="i" src="${spriteUrl('i_chicken')}" alt="Poulet"> ${result.chicken}</p>
        <p class="hint">Les troupes engagées dans l’attaque sont perdues.</p>
        <button data-act="home">Retour au village</button>`;
    }
    const troops = Object.entries(TROOPS).map(([k, d]) =>
      `<button data-act="sel:${k}" class="${k === selected ? 'sel' : ''}" ${(save.troops[k] ?? 0) > 0 ? '' : 'disabled'}><img src="${spriteUrl('t_' + k)}" alt="">${d.name} Nv${troopLevel(save, k)} ×${save.troops[k] ?? 0}</button>`).join('');
    const def = battle.structs.filter(s => BUILDINGS[s.type].defense && s.hp > 0).length;
    return `<h1>⚔ ${base.name}</h1>
      <p class="status">⏱ ${secs((DURATION - battle.time) * 1000)} · 💥 ${battle.destruction()} % · ${stars(battle.stars())} · 🛡 ${def}</p>
      <h2>Déployer</h2><div class="scroll-wrap"><div class="deploy" data-scroll="deploy">${troops}</div><i class="sbar h"><b></b></i></div>
      <p class="hint">Choisis une troupe puis touche la carte, hors des zones rouges.</p>
      <button data-act="retreat" class="retreat">🏳 Battre en retraite</button>`;
  }
  setPanel(panelHtml, act => {
    if (act === 'retreat' && visit) exit();
    else if (act === 'retreat' && !result) finish();
    else if (act === 'home') exit();
    else if (act.startsWith('sel:')) selected = act.slice(4);
  });

  return {
    click(tile) {
      if (visit || result || !selected || (save.troops[selected] ?? 0) <= 0) return;
      if (!battle.canDeploy(tile.x, tile.y)) return floatText(toWorld(tile.x, tile.y, 0.5), 'Trop près !', '#ff8080');
      const lvl = troopLevel(save, selected);
      const u = battle.deploy(selected, tile.x, tile.y, troopMult(save, selected));
      save.troops[selected]--;
      persist();
      const model = troop(u.kind, lvl);
      model.position.copy(toWorld(u.x, u.y));
      const bar = new Bar(0.5, 0x60e060);
      world.add(model, bar.group);
      units.set(u.id, { model, bar, last: model.position.clone() });
      puff(toWorld(u.x, u.y, 0.2), 0xcfe8a0, 6);
      animate(0.25, k => model.scale.setScalar(k));
    },

    update(dt) {
      t += dt;
      if (!result && !visit) {
        acc += dt;
        while (acc >= DT) { battle.step(DT); acc -= DT; }
        const noTroopsLeft = !battle.alive(battle.units).length && !Object.values(save.troops).some(n => n > 0);
        if (battle.destruction() === 100 || battle.time >= DURATION || noTroopsLeft) finish();
      }

      for (const s of battle.structs) {
        const v = structs.get(s.id)!;
        if (s.hp <= 0) {
          if (v.model.visible) {
            v.model.visible = v.bar.group.visible = false;
            const c = toWorld(s.cx, s.cy);
            for (let i = 0; i < 7; i++) world.add(ball(0.15 + Math.random() * 0.2, 0x6e6658, c.x + (Math.random() - 0.5) * s.size * 0.8, 0.08, c.z + (Math.random() - 0.5) * s.size * 0.8, 0));
            for (let i = 0; i < 3; i++) world.add(box(0.8, 0.08, 0.12, 0x5a4026, c.x + (Math.random() - 0.5) * s.size * 0.6, 0.12, c.z + (Math.random() - 0.5) * s.size * 0.6).rotateY(Math.random() * 3));
            puff(c.setY(0.6), 0x9a8f7a, 16, 0.25);
            shake();
          }
          continue;
        }
        v.bar.group.visible = s.hp < s.maxHp;
        v.bar.set(s.hp / s.maxHp);
        const target = s.targetId !== null ? battle.units.find(u => u.id === s.targetId && u.hp > 0) : undefined;
        if (!target) continue;
        const turret = v.model.getObjectByName('turret');
        if (turret) turret.rotation.y = Math.atan2(target.x - s.cx, target.y - s.cy);
        if (ready(s.id, dt, s.type === 'cannon' ? 0.9 : s.type === 'airDefense' ? 0.7 : 0.5))
          projectile(s.type === 'cannon' ? 'coconut' : s.type === 'airDefense' ? 'harpoon' : 'thorn', toWorld(s.cx, s.cy, s.type === 'cannon' ? 1.1 : s.type === 'airDefense' ? 1.4 : 2.6), toWorld(target.x, target.y, TROOPS[target.kind].flying ? FLY_HEIGHT : 0.3));
      }

      for (const u of battle.units) {
        const v = units.get(u.id);
        if (!v) continue;
        if (u.hp <= 0) {
          puff(v.model.position.clone().setY(0.3), 0x6cc25a, 8);
          world.remove(v.model, v.bar.group);
          units.delete(u.id);
          continue;
        }
        const pos = toWorld(u.x, u.y);
        const moving = pos.distanceTo(v.last) > 0.001;
        v.last.copy(pos);
        const s = battle.structs.find(s => s.id === u.targetId && s.hp > 0);
        if (s) v.model.rotation.y = Math.atan2(-(s.cy - u.y), s.cx - u.x);
        const fly = TROOPS[u.kind].flying;
        v.model.position.copy(pos).setY(fly ? FLY_HEIGHT + Math.sin(t * 3 + u.id) * 0.12 : moving ? Math.abs(Math.sin(t * 12 + u.id)) * 0.08 : 0);
        flap(v.model, t + u.id);
        v.bar.group.position.copy(pos).setY(fly ? FLY_HEIGHT + 0.9 : u.kind === 'croco' ? 1.25 : 0.85);
        v.bar.set(u.hp / u.maxHp);
        const attacking = s && edgeDist(u, s) <= TROOPS[u.kind].range;
        const arm = v.model.getObjectByName('arm');
        if (arm) arm.rotation.z = attacking ? -Math.abs(Math.sin(t * 8)) * 1.6 : 0;
        if (attacking && ready(u.id, dt, TROOPS[u.kind].hitEvery)) {
          if (u.kind === 'frog') projectile('dart', pos.clone().setY(0.35), toWorld(s.cx, s.cy, 0.6));
          else if (fly) projectile('drop', v.model.position.clone(), toWorld(s.cx, s.cy, 0.3));
          else if (u.kind === 'crocoLauncher') projectile('bomb', pos.clone().setY(0.8), toWorld(s.cx, s.cy, 0.4), troopLevel(save, u.kind));
          else puff(toWorld(u.x + Math.sign(s.cx - u.x) * 0.35, u.y + Math.sign(s.cy - u.y) * 0.35, 0.35), 0xffe08a, 3, 0.07);
        }
      }
      refresh();
    },
  };
}
