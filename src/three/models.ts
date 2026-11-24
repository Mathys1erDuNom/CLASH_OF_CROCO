// Original low-poly 3D models built from primitives (no external assets). 1 unit = 1 tile.
// Buildings: origin at the footprint centre on the ground. Troops: face +X.
import * as THREE from 'three';

const mats = new Map<string, THREE.MeshStandardMaterial>();
export function mat(color: number, extra: THREE.MeshStandardMaterialParameters = {}) {
  const key = color + JSON.stringify(extra);
  if (!mats.has(key)) mats.set(key, new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.85, ...extra }));
  return mats.get(key)!;
}

export function mesh(geo: THREE.BufferGeometry, color: number | THREE.Material, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, typeof color === 'number' ? mat(color) : color);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}
export const box = (w: number, h: number, d: number, c: number, x = 0, y = 0, z = 0) => mesh(new THREE.BoxGeometry(w, h, d), c, x, y, z);
export const cyl = (rt: number, rb: number, h: number, c: number, x = 0, y = 0, z = 0, seg = 8) => mesh(new THREE.CylinderGeometry(rt, rb, h, seg), c, x, y, z);
export const cone = (r: number, h: number, c: number, x = 0, y = 0, z = 0, seg = 8) => mesh(new THREE.ConeGeometry(r, h, seg), c, x, y, z);
export const ball = (r: number, c: number, x = 0, y = 0, z = 0, detail = 1) => mesh(new THREE.IcosahedronGeometry(r, detail), c, x, y, z);
const rot = <T extends THREE.Object3D>(o: T, x: number, y: number, z: number) => { o.rotation.set(x, y, z); return o; };
const scl = <T extends THREE.Object3D>(o: T, x: number, y: number, z: number) => { o.scale.set(x, y, z); return o; };

const WOOD = 0x8b6a44, DARK_WOOD = 0x5a4026, DOOR = 0x22160e, STRAW = 0xd9ae55, CROCO = 0x4c9a3f, BELLY = 0xe2d9a0, GOLD = 0xf2c230;
const goldMat = () => mat(GOLD, { emissive: 0x6a4a00, roughness: 0.4, metalness: 0.4 });

function flag(goblin: boolean, x: number, y: number, z: number, h = 1.1) {
  const g = new THREE.Group();
  g.add(cyl(0.03, 0.03, h, DARK_WOOD, 0, h / 2, 0, 5));
  g.add(box(0.5, 0.3, 0.03, goblin ? 0xb3262a : 0x2f9c55, 0.26, h - 0.18, 0));
  g.add(goblin ? ball(0.07, 0xf1ead2, 0.26, h - 0.18, 0.03, 0) : box(0.16, 0.08, 0.04, 0xf5e663, 0.26, h - 0.18, 0));
  g.position.set(x, y, z);
  return g;
}

function crocoHead(scale = 1, skin = CROCO) {
  const g = new THREE.Group();
  g.add(box(0.5, 0.26, 0.4, skin, 0, 0, 0));
  g.add(box(0.45, 0.14, 0.3, skin, 0.42, -0.05, 0));
  for (const z of [-0.12, 0.12]) {
    g.add(ball(0.08, 0xf5e663, 0.1, 0.17, z, 0));
    g.add(ball(0.04, 0x111111, 0.15, 0.19, z, 0));
  }
  for (let i = 0; i < 4; i++) for (const z of [-0.14, 0.14]) g.add(box(0.04, 0.06, 0.03, 0xffffff, 0.28 + i * 0.1, -0.12, z));
  g.scale.setScalar(scale);
  return g;
}

function goblinHead(scale = 1) {
  const g = new THREE.Group();
  g.add(ball(0.22, 0x7f9a4a, 0, 0, 0, 1));
  g.add(rot(cone(0.08, 0.3, 0x7f9a4a, 0, 0.05, 0.25, 4), Math.PI / 2, 0, 0));
  g.add(rot(cone(0.08, 0.3, 0x7f9a4a, 0, 0.05, -0.25, 4), -Math.PI / 2, 0, 0));
  g.add(ball(0.05, 0xff3020, 0.18, 0.05, 0.08, 0), ball(0.05, 0xff3020, 0.18, 0.05, -0.08, 0));
  g.add(cone(0.05, 0.16, 0x6a8a3a, 0.22, -0.02, 0, 4));
  g.scale.setScalar(scale);
  return g;
}

function hq(goblin: boolean) {
  const g = new THREE.Group();
  for (const x of [-1.15, 1.15]) for (const z of [-1.15, 1.15]) g.add(cyl(0.11, 0.13, 0.7, DARK_WOOD, x, 0.35, z, 6));
  g.add(box(2.8, 0.18, 2.8, WOOD, 0, 0.78, 0));
  for (let i = -1; i <= 1; i++) g.add(box(2.82, 0.02, 0.04, DARK_WOOD, 0, 0.88, i * 0.7));
  g.add(cyl(1.0, 1.05, 1.1, goblin ? 0x6e5038 : 0x9c6a3c, 0, 1.42, 0, 10));
  g.add(box(0.45, 0.75, 0.12, DOOR, 0, 1.25, 1.0));
  g.add(box(0.5, 0.08, 0.1, DARK_WOOD, 0, 1.66, 1.02));
  g.add(box(0.5, 0.06, 0.9, WOOD, 0, 0.45, 1.75)); // ramp
  g.children.at(-1)!.rotation.x = 0.5;
  g.add(cone(1.6, 1.4, goblin ? 0x6e4f8a : STRAW, 0, 2.65, 0, 10));
  g.add(cone(1.62, 0.25, goblin ? 0x523a68 : 0xb88a38, 0, 2.05, 0, 10));
  if (goblin) {
    g.add(ball(0.28, 0xf1ead2, 0, 3.55, 0, 1));
    g.add(ball(0.07, 0x111111, 0.12, 3.6, 0.22, 0), ball(0.07, 0x111111, -0.12, 3.6, 0.22, 0));
    g.add(flag(true, 1.2, 0.87, -1.2));
  } else {
    const h = crocoHead(1.1); h.position.set(0, 3.45, 0); h.rotation.y = -Math.PI / 2; g.add(h);
    g.add(flag(false, 1.2, 0.87, -1.2));
  }
  return g;
}

function goldMine(level: number) {
  const g = new THREE.Group();
  g.add(scl(ball(0.85, [0x8a8a84, 0x8a8478, 0xb09a6a][level - 1], -0.1, 0.45, -0.25, 0), 1, 0.85, 1));
  g.add(ball(0.55, 0x76766e, 0.55, 0.3, -0.05, 0), ball(0.45, 0x9a9a92, -0.65, 0.25, 0.35, 0));
  g.add(box(0.62, 0.72, 0.3, DOOR, 0, 0.36, 0.45));
  g.add(box(0.1, 0.85, 0.1, WOOD, -0.36, 0.42, 0.6), box(0.1, 0.85, 0.1, WOOD, 0.36, 0.42, 0.6), box(0.85, 0.12, 0.14, WOOD, 0, 0.84, 0.6));
  for (const [x, y, z] of [[-0.4, 0.9, -0.2], [0.3, 1.05, -0.4], [0.7, 0.6, 0.1], [-0.8, 0.55, 0.2]]) g.add(mesh(new THREE.IcosahedronGeometry(0.1, 0), goldMat(), x, y, z));
  const cart = new THREE.Group();
  cart.add(box(0.5, 0.25, 0.36, DARK_WOOD, 0, 0.22, 0));
  for (const x of [-0.16, 0.16]) for (const z of [-0.2, 0.2]) cart.add(rot(cyl(0.08, 0.08, 0.04, 0x333333, x, 0.08, z, 8), Math.PI / 2, 0, 0));
  for (const [x, z] of [[-0.1, 0], [0.1, 0.06], [0, -0.08]]) cart.add(mesh(new THREE.IcosahedronGeometry(0.11, 0), goldMat(), x, 0.38, z));
  cart.position.set(0.55, 0, 0.7);
  cart.rotation.y = 0.4;
  g.add(cart);
  return g;
}

const RED = 0xb8402c, THATCH = 0xdcae4e, EGG = 0xf7f3e8, BASKET = 0xa8743e;

/** Chicken farm: a thatched hen house in a fenced yard. Level 2 stands on stilts with a silo; level 3 adds a striped awning, a hay shed and a flag. */
function chickenFarm(level: number) {
  const g = new THREE.Group();
  g.add(cyl(0.98, 1.0, 0.1, 0x8a6a3c, 0, 0.05, 0, 14)); // dirt yard
  g.add(fence(0.95, 14));
  const [w, h, d] = level === 1 ? [1.0, 0.6, 0.8] : level === 2 ? [1.1, 0.7, 0.9] : [1.2, 0.8, 1.0];
  const hx = -0.25, hz = -0.15, y0 = level === 1 ? 0 : 0.4, front = hz + d / 2;

  // hen house on stilts from level 2
  if (y0) for (const sx of [-0.45, 0.45]) for (const sz of [-0.35, 0.35]) g.add(cyl(0.05, 0.05, y0, DARK_WOOD, hx + sx, y0 / 2, hz + sz, 5));
  const house = hut(w, h, d);
  house.position.set(hx, y0, hz);
  g.add(house);
  g.add(box(w * 0.5, 0.06, 0.25, STRAW, hx, y0 + 0.05, front + 0.14)); // straw nest by the door
  if (y0) g.add(box(0.3, 0.04, 0.7, WOOD, hx - 0.35, y0 / 2, front + 0.35).rotateX(0.5)); // ramp to the door

  if (level >= 2) {
    // awning: solid red at level 2, red and cream stripes at level 3
    const stripes = level === 3 ? 5 : 1;
    for (let i = 0; i < stripes; i++) {
      const x = stripes === 1 ? hx : hx - w * 0.4 + (i * w * 0.8) / (stripes - 1);
      g.add(box(stripes === 1 ? w * 0.9 : (w * 0.8) / stripes, 0.04, 0.45, i % 2 ? EGG : RED, x, y0 + h * 0.7, front + 0.25).rotateX(-0.35));
    }
    // silo with iron bands and a red cap
    const sh = level === 3 ? 1.6 : 1.2;
    g.add(cyl(0.22, 0.24, sh, WOOD, 0.75, sh / 2, -0.5, 10));
    for (const by of [0.2, sh * 0.5, sh - 0.2]) g.add(cyl(0.245, 0.245, 0.04, IRON, 0.75, by, -0.5, 10));
    g.add(cone(0.28, 0.3, RED, 0.75, sh + 0.15, -0.5, 10));
    g.add(ball(0.08, EGG, 0.75, sh * 0.6, -0.27, 0)); // egg emblem on the silo
    g.add(hen(0.4, 0.6), hen(-0.7, 0.5));
  }
  if (level === 3) {
    // flag on the roof
    const apex = y0 + h * 1.425;
    g.add(cyl(0.02, 0.02, 1.0, DARK_WOOD, hx + 0.3, apex + 0.5, hz, 4));
    g.add(box(0.4, 0.26, 0.02, RED, hx + 0.52, apex + 0.85, hz));
    g.add(ball(0.06, EGG, hx + 0.5, apex + 0.85, hz + 0.02, 0));
    // hay shed with a hay bale stack
    g.add(box(0.6, 0.05, 0.7, THATCH, 0.7, 0.55, 0.2).rotateZ(-0.15));
    for (const x of [0.4, 1.0]) g.add(cyl(0.04, 0.04, 0.55, DARK_WOOD, x, 0.27, 0.2, 4));
    g.add(box(0.3, 0.22, 0.22, STRAW, 0.7, 0.11, 0.2), box(0.3, 0.22, 0.22, STRAW, 0.7, 0.11, 0.45));
    g.add(lantern(-0.85, 0, 0.4));
  }
  if (level === 1) g.add(lantern(0.8, 0, 0.1));

  g.add(eggBasket(0.55, 0.15), hen(0.1, 0.5), hen(-0.6, 0.55));
  if (level === 3) g.add(eggBasket(-0.5, -0.7));
  return g;
}

/** Thatched hen house with a carved crocodile plaque above the door, facing +Z. */
function hut(w: number, h: number, d: number) {
  const g = new THREE.Group();
  g.add(box(w, h, d, WOOD, 0, h / 2, 0));
  g.add(box(w * 0.4, h * 0.6, 0.03, DOOR, 0, h * 0.3, d / 2 + 0.01));
  g.add(box(w * 0.5, 0.2, 0.05, CROCO, 0, h * 0.82, d / 2 + 0.03));
  g.add(cone(w * 0.72, h * 0.85, THATCH, 0, h + h * 0.425, 0, 4).rotateY(Math.PI / 4));
  return g;
}

/** Hen with a red comb and a beak, at ground level. */
function hen(x: number, z: number) {
  const g = new THREE.Group();
  g.add(ball(0.14, 0xf4f0e6, 0, 0.2, 0, 0), ball(0.08, 0xf4f0e6, 0.1, 0.34, 0, 0));
  g.add(ball(0.035, 0xd42a2a, 0.1, 0.42, 0, 0), cone(0.03, 0.06, 0xf0a020, 0.17, 0.34, 0, 4).rotateZ(-Math.PI / 2));
  g.position.set(x, 0, z);
  return g;
}

/** Gold reserve: a timber vault full of gold at level 1; a stone vault with a barrel roof and banners from level 2; corner towers with flames at level 3. */
function goldStore(level: number) {
  const g = new THREE.Group();
  g.add(cyl(0.98, 1.0, 0.1, 0x7a9a3c, 0, 0.05, 0, 14));
  if (level === 1) {
    g.add(box(1.5, 0.8, 1.2, WOOD, 0, 0.4, 0), box(0.8, 0.5, 0.05, DOOR, 0, 0.3, 0.63));
    g.add(cone(1.1, 0.5, 0x8a5a2e, 0, 1.05, 0, 4).rotateY(Math.PI / 4));
    for (const [x, y] of [[-0.25, 0.15], [0.05, 0.15], [0.3, 0.15], [-0.1, 0.27]]) g.add(ball(0.12, GOLD, x, y, 0.5, 0));
    g.add(lantern(0.8, 0, 0.6));
  } else {
    g.add(box(1.8, 1.0, 1.4, STONE, 0, 0.5, 0), box(0.9, 0.6, 0.05, DOOR, 0, 0.3, 0.71));
    g.add(cyl(0.9, 0.9, 1.4, WOOD, 0, 1.5, 0, 10).rotateX(Math.PI / 2)); // barrel roof
    for (let i = 0; i < 7; i++) g.add(ball(0.13, GOLD, -0.5 + i * 0.17, 0.15, 0.55, 0));
    g.add(box(0.35, 0.6, 0.03, RED, 0.8, 0.75, 0.72), ball(0.08, GOLD, 0.8, 0.8, 0.74, 0));
    g.add(box(0.9, 0.1, 0.3, STONE, 0, 0.05, 1.0), box(0.9, 0.1, 0.3, STONE, 0, 0.15, 0.85)); // stairs
  }
  if (level === 3) {
    for (const x of [-0.95, 0.95]) {
      g.add(cyl(0.25, 0.28, 1.5, STONE, x, 0.75, 0.6, 8), cone(0.3, 0.35, RED, x, 1.67, 0.6, 8));
      g.add(mesh(new THREE.SphereGeometry(0.1, 8, 6), mat(0xffb030, { emissive: 0xff8a10, emissiveIntensity: 1 }), x, 2.0, 0.6));
    }
    g.add(box(0.3, 0.5, 0.03, RED, -0.95, 1.0, 0.92)); // banner on the tower
  }
  return g;
}

/** Chicken reserve: a red-roofed barn with an egg emblem and a nest of eggs; bigger with hay, a silo and a striped awning at higher levels. */
function chickenStore(level: number) {
  const g = new THREE.Group();
  g.add(cyl(0.98, 1.0, 0.1, 0x7a9a3c, 0, 0.05, 0, 14));
  const h = level === 1 ? 0.8 : 0.95;
  g.add(box(1.4, h, 1.2, WOOD, 0, h / 2, 0), box(0.7, 0.5, 0.05, DOOR, 0, 0.3, 0.63));
  g.add(cone(1.0, 0.6, RED, 0, h + 0.3, 0, 4).rotateY(Math.PI / 4));
  g.add(scl(ball(0.2, EGG, 0, h * 0.6, 0.63, 0), 0.8, 1.1, 0.3)); // egg emblem
  g.add(box(0.9, 0.12, 0.4, STRAW, 0, 0.1, 0.78));
  for (const [x, z] of [[-0.25, 0.8], [0.05, 0.85], [0.3, 0.78]]) g.add(ball(0.12, EGG, x, 0.25, z, 0));
  if (level >= 2) {
    g.add(box(0.45, 0.3, 0.3, STRAW, 0.9, 0.15, 0.3), box(0.45, 0.3, 0.3, STRAW, 0.9, 0.15, -0.1));
    g.add(cyl(0.3, 0.32, 1.4, STONE, -0.95, 0.7, -0.4, 10), cone(0.34, 0.3, RED, -0.95, 1.55, -0.4, 10));
  }
  if (level === 3) {
    for (let i = 0; i < 5; i++) g.add(box(0.25, 0.04, 0.4, i % 2 ? EGG : RED, -0.5 + i * 0.25, 0.9, 0.85).rotateX(-0.3)); // awning
    g.add(cyl(0.02, 0.02, 0.8, DARK_WOOD, 0.1, 1.35, -0.3, 4), box(0.35, 0.22, 0.02, RED, 0.3, 1.6, -0.3)); // flag
    g.add(ball(0.09, EGG, 0.3, 1.6, -0.29, 0));
  }
  return g;
}

function eggBasket(x: number, z: number) {
  const g = new THREE.Group();
  g.add(cyl(0.2, 0.16, 0.16, BASKET, 0, 0.08, 0, 10));
  for (let i = 0; i < 5; i++) g.add(ball(0.06, EGG, Math.cos(i * 1.26) * 0.09, 0.2, Math.sin(i * 1.26) * 0.09, 0));
  g.position.set(x, 0, z);
  return g;
}

function barracks(goblin: boolean) {
  const g = new THREE.Group();
  const main = goblin ? 0x8a5a3a : 0x6f9e48, stripe = goblin ? 0xb3262a : 0xe8d9a0;
  g.add(rot(cone(1.0, 1.5, main, 0, 0.75, 0, 6), 0, Math.PI / 6, 0));
  g.add(rot(cone(0.7, 0.3, stripe, 0, 0.47, 0, 6), 0, Math.PI / 6, 0), rot(cone(0.36, 0.25, stripe, 0, 1.0, 0, 6), 0, Math.PI / 6, 0));
  g.add(rot(box(0.42, 0.6, 0.05, DOOR, 0, 0.3, 0.83), -0.55, 0, 0));
  for (const z of [-0.12, 0.12]) g.add(ball(0.04, 0xf5e663, z, 0.32, 0.86, 0));
  g.add(rot(cyl(0.02, 0.02, 1.2, DARK_WOOD, -0.6, 0.55, 0.75, 4), 0, 0, 0.5), rot(cone(0.05, 0.14, 0xcccccc, -0.89, 1.08, 0.75, 4), 0, 0, 0.5));
  g.add(rot(cyl(0.02, 0.02, 1.2, DARK_WOOD, 0.6, 0.55, 0.75, 4), 0, 0, -0.5), rot(cone(0.05, 0.14, 0xcccccc, 0.89, 1.08, 0.75, 4), 0, 0, -0.5));
  g.add(flag(goblin, 0, 1.45, 0, 0.7));
  return g;
}

function cannon(goblin: boolean, level: number) {
  const g = new THREE.Group();
  g.add(cyl(0.85, 0.92, 0.45, goblin ? 0x8a7f73 : 0xb0a894, 0, 0.22, 0, 8));
  for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; g.add(box(0.3, 0.16, 0.2, goblin ? 0x6a6056 : 0x908870, Math.cos(a) * 0.82, 0.52, Math.sin(a) * 0.82)); g.children.at(-1)!.rotation.y = -a; }
  const turret = new THREE.Group();
  turret.add(box(0.7, 0.3, 0.6, WOOD, 0, 0.15, 0));
  for (const x of [-0.38, 0.38]) turret.add(rot(cyl(0.2, 0.2, 0.08, DARK_WOOD, x, 0.18, 0, 8), 0, 0, Math.PI / 2));
  const barrel = new THREE.Group();
  barrel.add(rot(cyl(0.16, 0.22, 1.0, [0x34343c, 0x9a6a30, 0x23232e][level - 1], 0, 0, 0.35, 10), Math.PI / 2, 0, 0));
  barrel.add(rot(cyl(0.21, 0.21, 0.1, 0x22222a, 0, 0, 0.85, 10), Math.PI / 2, 0, 0));
  const muzzle = new THREE.Object3D(); // the end of the barrel: shots leave from here
  muzzle.name = 'muzzle';
  muzzle.position.z = 0.95;
  barrel.add(muzzle);
  barrel.position.y = 0.38;
  barrel.rotation.x = -0.35;
  turret.add(barrel);
  turret.position.y = 0.45;
  turret.name = 'turret';
  g.add(turret);
  for (const [x, z] of [[0.75, 0.75], [0.6, 0.85], [0.7, 0.6]]) g.add(ball(0.11, 0x7a4a24, x, 0.11, z, 0));
  return g;
}

/** Short stone pit with a steep tube: it lobs shells far over the walls. */
function mortar(goblin: boolean, level: number) {
  const L2 = level >= 2, L3 = level >= 3;
  const g = new THREE.Group();
  const grow = 1 + (level - 1) * 0.15; // each level is a little wider and taller
  g.add(cyl(0.7 * grow, 0.8 * grow, 0.4 * grow, goblin ? 0x8a7f73 : 0xb0a894, 0, 0.2 * grow, 0, 8));
  if (L2) for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; g.add(box(0.22, 0.2, 0.18, goblin ? 0x6a6056 : 0x908870, Math.cos(a) * 0.78, 0.4, Math.sin(a) * 0.78)); } // stone blocks around the pit
  const turret = new THREE.Group();
  turret.add(box(0.5, 0.25, 0.5, WOOD, 0, 0.1, 0));
  const tube = new THREE.Group();
  tube.add(cyl(0.22, 0.28, 1.0, [0x34343c, 0x9a6a30, 0x23232e][level - 1], 0, 0.5, 0, 10));
  if (L2) for (const y of [0.25, 0.7]) tube.add(cyl(0.3, 0.3, 0.07, IRON, 0, y, 0, 10)); // iron bands
  tube.position.y = 0.3;
  tube.rotation.x = 0.6; // tilted up and forward: the turret turns it toward the target (forward is +z)
  turret.add(tube);
  if (L3) { // a second tube and a banner on a pole
    const twin = tube.clone();
    twin.position.x = 0.4;
    turret.add(twin, cyl(0.03, 0.03, 0.9, DARK_WOOD, -0.35, 0.8, 0, 6), box(0.02, 0.3, 0.3, 0xc23b2b, -0.35, 1.2, 0.15));
  }
  turret.position.y = 0.4 * grow;
  turret.name = 'turret';
  g.add(turret);
  return g;
}

function reedTower(goblin: boolean, level: number) {
  const g = new THREE.Group();
  for (const [x, z] of [[-0.55, -0.55], [0.55, -0.55], [-0.55, 0.55], [0.55, 0.55]]) {
    const leg = cyl(0.07, 0.09, 2.3, 0xb8a35a, x * 0.85, 1.12, z * 0.85, 5);
    leg.rotation.set(z * 0.12, 0, -x * 0.12);
    g.add(leg);
  }
  g.add(box(1.15, 0.06, 0.06, 0x8a7636, 0, 0.8, 0.52), box(1.15, 0.06, 0.06, 0x8a7636, 0, 0.8, -0.52));
  g.add(box(1.35, 0.14, 1.35, WOOD, 0, 2.2, 0));
  for (const [x, z] of [[-0.6, -0.6], [0.6, -0.6], [-0.6, 0.6], [0.6, 0.6]]) g.add(cyl(0.04, 0.04, 0.6, DARK_WOOD, x, 2.55, z, 4));
  g.add(rot(cone(1.05, 0.7, (goblin ? [0x6e4f8a, 0x8a2a3a, 0x2e2a34] : [STRAW, 0xb5562e, 0x2f6fb0])[level - 1], 0, 3.15, 0, 4), 0, Math.PI / 4, 0));
  const lookout = goblin ? goblinHead(0.9) : (() => {
    const f = new THREE.Group();
    f.add(scl(ball(0.22, 0x8fd04b), 1, 0.8, 1));
    for (const z of [-0.1, 0.1]) f.add(ball(0.08, 0xffffff, 0.08, 0.17, z, 0), ball(0.04, 0x111111, 0.14, 0.18, z, 0));
    return f;
  })();
  lookout.position.set(0, 2.47, 0);
  lookout.name = 'turret';
  g.add(lookout);
  return g;
}

const STONE = 0x9a958a, IRON = 0x4a4a55;
const gold = (geo: THREE.BufferGeometry, x = 0, y = 0, z = 0) => mesh(geo, goldMat(), x, y, z);

function lantern(x: number, y: number, z: number) {
  const g = new THREE.Group();
  g.add(cyl(0.025, 0.025, 0.5, DARK_WOOD, 0, 0.25, 0, 4));
  g.add(box(0.14, 0.16, 0.14, 0xffc860, 0, 0.55, 0));
  (g.children.at(-1) as THREE.Mesh).material = mat(0xffc860, { emissive: 0xff9a20, emissiveIntensity: 0.8 });
  g.position.set(x, y, z);
  return g;
}

function fence(r: number, posts: number, color = WOOD) {
  const g = new THREE.Group();
  for (let i = 0; i < posts; i++) {
    const a = (i / posts) * Math.PI * 2;
    if (Math.abs(Math.sin(a) - 1) < 0.35) continue; // leave the front (+Z) open
    g.add(cyl(0.05, 0.06, 0.45, color, Math.cos(a) * r, 0.22, Math.sin(a) * r, 4), cone(0.06, 0.12, color, Math.cos(a) * r, 0.5, Math.sin(a) * r, 4));
  }
  return g;
}

/** Extra parts that make each upgrade level look different. */
function levelParts(g: THREE.Group, type: string, level: number, goblin: boolean) {
  const L2 = level >= 2, L3 = level >= 3;
  switch (type) {
    case 'hq':
      if (L2) { // stone stilts, lanterns, banners
        for (const x of [-1.15, 1.15]) for (const z of [-1.15, 1.15]) g.add(cyl(0.17, 0.2, 0.5, STONE, x, 0.25, z, 6));
        g.add(lantern(-1.25, 0.87, 1.25), lantern(1.25, 0.87, 1.25));
      }
      if (L3) { // second roof tier, gold crown, corner banners
        g.add(cyl(0.55, 0.6, 0.5, goblin ? 0x6e5038 : 0x9c6a3c, 0, 3.1, 0, 8), cone(0.85, 0.8, goblin ? 0x523a68 : 0xc9943c, 0, 3.7, 0, 8));
        const crown = new THREE.Group();
        crown.add(gold(new THREE.CylinderGeometry(0.28, 0.24, 0.15, 8)));
        for (let i = 0; i < 5; i++) crown.add(gold(new THREE.ConeGeometry(0.06, 0.18, 4), Math.cos(i * 1.26) * 0.22, 0.15, Math.sin(i * 1.26) * 0.22));
        crown.position.y = 4.2;
        g.add(crown);
        for (const [x, z] of [[-1.3, -1.3], [-1.3, 1.3], [1.3, 1.3]]) g.add(flag(goblin, x, 0.87, z, 1.4));
      }
      break;
    case 'goldMine':
      if (L2) { // reinforced entrance, lantern, second cart
        g.add(box(1.0, 0.14, 0.18, IRON, 0, 0.92, 0.62), lantern(-0.55, 0, 0.75));
        g.add(rot(box(1.1, 0.06, 0.6, 0xa0522d, 0, 1.05, 0.75), 0.35, 0, 0)); // shed roof over the entrance
        const cart = box(0.4, 0.22, 0.3, DARK_WOOD, -0.55, 0.15, -0.75);
        g.add(cart, gold(new THREE.IcosahedronGeometry(0.12, 0), -0.55, 0.32, -0.75));
      }
      if (L3) { // glowing gold veins and a crane
        for (const [x, y, z] of [[-0.2, 1.1, 0.1], [0.4, 0.9, -0.3], [-0.6, 0.8, -0.4], [0.2, 0.7, 0.35]]) g.add(gold(new THREE.OctahedronGeometry(0.16, 0), x, y, z));
        g.add(cyl(0.06, 0.06, 1.8, WOOD, 0.8, 0.9, -0.6, 5), rot(box(1.0, 0.08, 0.08, WOOD, 0.4, 1.75, -0.6), 0, 0, -0.1), cyl(0.01, 0.01, 0.6, 0x333333, 0, 1.45, -0.6, 3));
        g.add(gold(new THREE.IcosahedronGeometry(0.14, 0), 0, 1.1, -0.6));
      }
      break;
    case 'barracks':
      if (L2) g.add(fence(1.15, 14, goblin ? 0x5a4026 : WOOD)); // palisade
      if (L3) { // weapon rack, shields, banners
        g.add(box(0.7, 0.08, 0.08, DARK_WOOD, -1.0, 0.6, -0.6).rotateY(0.8));
        for (const [x, z] of [[-0.75, 0.85], [0.75, 0.85]]) g.add(cyl(0.2, 0.2, 0.05, goblin ? 0xb3262a : 0x2f9c55, x, 0.45, z, 10).rotateX(Math.PI / 2), ball(0.06, GOLD, x, 0.45, z + 0.04, 0));
        g.add(flag(goblin, -1.1, 0, 1.1, 1.3), flag(goblin, 1.1, 0, 1.1, 1.3));
      }
      break;
    case 'cannon': {
      const turret = g.getObjectByName('turret')!;
      if (L2) { // iron bands on the barrel, higher stone wall
        const barrel = turret.children.at(-1)!;
        for (const z of [0.1, 0.5]) barrel.add(rot(cyl(0.2, 0.2, 0.06, IRON, 0, 0, z, 10), Math.PI / 2, 0, 0));
        for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2 + 0.4; g.add(box(0.22, 0.25, 0.22, goblin ? 0x6a6056 : 0x908870, Math.cos(a) * 0.8, 0.72, Math.sin(a) * 0.8)); }
      }
      if (L3) { // double barrel with gold rims
        const twin = turret.children.at(-1)!.clone();
        turret.children.at(-1)!.position.x = -0.15;
        twin.position.x = 0.15;
        twin.add(rot(gold(new THREE.CylinderGeometry(0.23, 0.23, 0.06, 10), 0, 0, 0.88), Math.PI / 2, 0, 0));
        turret.children.at(-1)!.add(rot(gold(new THREE.CylinderGeometry(0.23, 0.23, 0.06, 10), 0, 0, 0.88), Math.PI / 2, 0, 0));
        turret.add(twin);
      }
      break;
    }
    case 'airDefense': {
      const turret = g.getObjectByName('turret')!;
      if (L2) { // second harpoon and iron armour plates
        turret.add(rot(cyl(0.035, 0.035, 1.1, IRON, 0.18, 0.55, 0.1, 5), Math.PI / 2 - 0.5, 0, 0), rot(cone(0.07, 0.18, 0xdddddd, 0.18, 0.86, 0.6, 4), Math.PI / 2 - 0.5, 0, 0));
        for (const x of [-0.45, 0.45]) g.add(box(0.06, 0.4, 0.7, IRON, x, 0.55, 0));
      }
      if (L3) { // gold rims and a spinning-dish lookout
        for (const x of [-0.5, 0.5]) turret.add(mesh(new THREE.BoxGeometry(0.06, 0.06, 0.9), goldMat(), x, 0.62, 0));
        g.add(cyl(0.04, 0.04, 0.9, DARK_WOOD, -0.75, 0.9, -0.75, 4), rot(mesh(new THREE.CylinderGeometry(0.28, 0.05, 0.12, 10), goldMat(), -0.75, 1.4, -0.75), 0.6, 0, 0));
      }
      break;
    }
    case 'reedTower':
      if (L2) { // reed shields on the platform
        for (const [x, z, r] of [[0, 0.67, 0], [0, -0.67, 0], [0.67, 0, Math.PI / 2], [-0.67, 0, Math.PI / 2]] as const)
          g.add(box(1.2, 0.35, 0.05, goblin ? 0x6a5a3a : 0xc7b36a, x, 2.42, z).rotateY(r));
      }
      if (L3) { // stone base and a pennant
        g.add(cyl(0.9, 1.0, 0.5, STONE, 0, 0.25, 0, 8));
        g.add(flag(goblin, 0, 3.4, 0, 0.8));
      }
      break;
  }
  g.scale.setScalar([1, 1.06, 1.12][level - 1] ?? 1);
}

/** Troop camp: a clearing around a campfire; troops are added around it by the village. */
function camp(level: number) {
  const g = new THREE.Group();
  g.add(cyl(1.45, 1.5, 0.04, 0x8a6a42, 0, 0.02, 0, 16));
  for (let i = 0; i < 7; i++) { const a = (i / 7) * Math.PI * 2; g.add(ball(0.11, 0x777770, Math.cos(a) * 0.32, 0.08, Math.sin(a) * 0.32, 0)); }
  for (let i = 0; i < 3; i++) g.add(rot(cyl(0.05, 0.05, 0.5, DARK_WOOD, 0, 0.1, 0, 5), Math.PI / 2, (i / 3) * Math.PI, 0));
  const flame = new THREE.Group();
  flame.add(mesh(new THREE.ConeGeometry(0.2, 0.5, 6), mat(0xff8a20, { emissive: 0xff5a00, emissiveIntensity: 1 }), 0, 0.3, 0));
  flame.add(mesh(new THREE.ConeGeometry(0.11, 0.35, 6), mat(0xffe060, { emissive: 0xffc020, emissiveIntensity: 1 }), 0, 0.28, 0));
  flame.name = 'flame';
  g.add(flame);
  const light = new THREE.PointLight(0xff9a40, 4, 4);
  light.position.y = 0.6;
  g.add(light);
  for (let i = 0; i < 6; i++) { // log seats around the edge
    const a = (i / 6) * Math.PI * 2 + 0.3;
    g.add(rot(cyl(0.1, 0.1, 0.55, WOOD, Math.cos(a) * 1.3, 0.1, Math.sin(a) * 1.3, 6), Math.PI / 2, -a, 0));
  }
  if (level >= 2) { // tents and torches
    for (const [x, z] of [[-1.1, -1.1], [1.1, -1.1]]) g.add(rot(cone(0.45, 0.7, [0, 0x6f9e48, 0xc9943c][level - 1], x, 0.35, z, 4), 0, Math.PI / 4, 0));
    g.add(lantern(-1.4, 0, 0.6), lantern(1.4, 0, 0.6));
  }
  if (level >= 3) { // croco totem and banners
    for (let i = 0; i < 3; i++) g.add(box(0.3, 0.32, 0.3, [0x9c6a3c, 0x6d4526, 0x9c6a3c][i], 0, 0.16 + i * 0.32, -1.3));
    const head = crocoHead(0.7); head.position.set(0, 1.15, -1.3); head.rotation.y = -Math.PI / 2; g.add(head);
    g.add(flag(false, -1.45, 0, -0.2, 1.4), flag(false, 1.45, 0, -0.2, 1.4));
  }
  return g;
}

export function building(type: string, goblin: boolean, level = 1): THREE.Group {
  if (type === 'camp') { const g = camp(level); g.scale.setScalar([1, 1.03, 1.06][level - 1]); return g; }
  const g = type === 'hq' ? hq(goblin) : type === 'goldMine' ? goldMine(level) : type === 'chickenFarm' ? chickenFarm(level) : type === 'goldStore' ? goldStore(level) : type === 'chickenStore' ? chickenStore(level)
    : type === 'barracks' ? barracks(goblin) : type === 'lab' ? lab(level) : type === 'airDefense' ? airDefense(goblin) : type === 'cannon' ? cannon(goblin, level) : type === 'mortar' ? mortar(goblin, level) : type === 'workshop' ? workshop() : reedTower(goblin, level);
  levelParts(g, type, level, goblin);
  return g;
}

/** The workshop: a timber hut with a hammer sign. */
function workshop() {
  const g = new THREE.Group();
  g.add(box(1.5, 1.0, 1.5, WOOD, 0, 0.5, 0), rot(cone(1.2, 0.8, DARK_WOOD, 0, 1.4, 0, 4), 0, Math.PI / 4, 0)); // walls and roof
  g.add(box(0.4, 0.6, 0.05, DOOR, 0, 0.3, 0.78)); // door
  g.add(box(0.08, 0.8, 0.08, DARK_WOOD, 0.95, 1.0, 0.8), box(0.3, 0.14, 0.14, 0x9a9a9a, 0.95, 1.42, 0.8)); // hammer sign
  return g;
}

/** Height where to float the bar above a building. */
export const BUILDING_TOP: Record<string, number> = { hq: 4.6, reedTower: 4.3, goldMine: 1.6, chickenFarm: 2.4, goldStore: 2.0, chickenStore: 2.2, barracks: 2.0, cannon: 1.5, mortar: 1.5, camp: 1.9, airDefense: 2.2, lab: 2.2, workshop: 2.0 };

// Troop looks per level: skin colours shift and each level adds gear and size.
const CROCO_SKIN = [[0x4c9a3f, 0x3f8f3a, BELLY], [0x3f8a5e, 0x2f7050, 0xd8e0b0], [0x2e6a52, 0x214d3c, 0xe8d890]];

function croco(level: number) {
  const [skin, dark, belly] = CROCO_SKIN[level - 1];
  const g = new THREE.Group();
  for (const z of [-0.1, 0.1]) g.add(box(0.13, 0.25, 0.13, dark, 0, 0.12, z));
  g.add(box(0.36 + level * 0.03, 0.42, 0.34 + level * 0.03, skin, 0, 0.45, 0)); // bulkier each level
  g.add(box(0.06, 0.32, 0.24, belly, 0.19 + level * 0.015, 0.44, 0));
  g.add(box(0.42 + level * 0.03, 0.06, 0.4 + level * 0.03, [0x7a4a24, 0x5a3a1c, 0x8a1f1f][level - 1], 0, 0.3, 0)); // belt
  for (let i = 0; i < 3 + level; i++) g.add(box(0.08, 0.06, 0.06 + level * 0.02, dark, -0.18 - level * 0.015, 0.6 - i * 0.09, 0)); // back ridges grow
  const head = crocoHead(0.75, skin); head.position.set(0.12, 0.76, 0); g.add(head);
  g.add(rot(cone(0.14, 0.55 + level * 0.08, skin, -0.4, 0.2, 0, 5), 0, 0, Math.PI / 2 + 0.35));
  const arm = new THREE.Group();
  arm.add(box(0.1, 0.1, 0.1, skin, 0, 0, 0));
  arm.add(rot(cyl(0.035, 0.04, 0.5, DARK_WOOD, 0.05, 0.22, 0, 5), 0, 0, -0.3));
  if (level === 1) arm.add(ball(0.11, 0x8b5a2b, 0.13, 0.47, 0, 0)); // wooden club
  else { // spiked mace, iron then gold
    arm.add(mesh(new THREE.IcosahedronGeometry(0.13, 0), level === 2 ? mat(IRON, { metalness: 0.6, roughness: 0.4 }) : goldMat(), 0.13, 0.5, 0));
    for (const d of [[0, 1, 0], [1, 0, 0], [0, 0, 1], [0, 0, -1], [-1, 0, 0]]) { // spikes pointing outwards
      const dir = new THREE.Vector3(...(d as [number, number, number]));
      const spike = cone(0.035, 0.1, 0xdddddd, 0.13 + dir.x * 0.15, 0.5 + dir.y * 0.15, dir.z * 0.15, 4);
      spike.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
      arm.add(spike);
    }
  }
  arm.position.set(0.05, 0.55, 0.24);
  arm.name = 'arm';
  g.add(arm);
  if (level >= 2) { // leather helmet and shoulder pad
    g.add(box(0.3, 0.1, 0.36, 0x6d4526, 0.08, 0.93, 0), box(0.14, 0.12, 0.14, 0x6d4526, 0.02, 0.66, 0.22));
  }
  if (level >= 3) { // iron helmet with horns, chest plate, cape
    g.add(box(0.34, 0.12, 0.4, IRON, 0.08, 0.98, 0));
    for (const z of [-0.2, 0.2]) g.add(rot(cone(0.05, 0.2, 0xefe6cc, 0.08, 1.08, z, 5), z > 0 ? 0.6 : -0.6, 0, 0));
    g.add(box(0.06, 0.3, 0.3, 0x9a9aa8, 0.22, 0.47, 0));
    g.add(rot(box(0.04, 0.5, 0.36, 0xb3262a, -0.22, 0.5, 0), 0, 0, -0.15));
  }
  g.scale.setScalar([1, 1.1, 1.2][level - 1]);
  return g;
}

/** The croco sarbacane: a chibi croco with a bamboo blowpipe in its mouth. Level 2 adds a bigger quiver and a leather strap; level 3 has two pipes and gold armour. */
function crocoSarbacane(level: number) {
  const L2 = level >= 2, L3 = level >= 3;
  const skin = [0x7cc24a, 0x5ea83a, 0x4a9a32][level - 1], dark = [0x3a7a2a, 0x2e6a22, 0x25601f][level - 1];
  const bamboo = [0xd9a85a, 0xc8944a, 0xe0b060][level - 1], leather = 0x7a4a2a;
  const g = new THREE.Group();
  g.add(scl(ball(0.3, skin, 0, 0.35, 0), 1, 0.95, 1.1)); // round body
  g.add(scl(ball(0.2, BELLY, 0.1, 0.3, 0), 0.9, 0.9, 1.1)); // belly
  for (const z of [-0.22, 0.22]) g.add(ball(0.12, skin, 0.08, 0.1, z), box(0.2, 0.08, 0.14, BELLY, 0.14, 0.04, z)); // stubby legs and feet
  for (const x of [-0.2, -0.05, 0.1]) g.add(cone(0.05, 0.12, dark, x, 0.62, 0, 4)); // back spikes
  g.add(rot(cone(0.11, 0.6, skin, -0.55, 0.22, 0, 5), 0, 0, Math.PI / 2)); // tail
  g.add(ball(0.27, skin, 0.3, 0.72, 0)); // head
  g.add(box(0.3, 0.16, 0.2, skin, 0.5, 0.66, 0), box(0.28, 0.07, 0.16, BELLY, 0.5, 0.56, 0)); // snout and jaw
  for (const z of [-0.07, 0.07]) g.add(cone(0.02, 0.05, 0xffffff, 0.6, 0.6, z, 4)); // teeth
  for (const z of [-0.2, 0.2]) g.add(ball(0.08, 0xffffff, 0.5, 0.82, z), ball(0.04, 0x1a1a1a, 0.56, 0.84, z * 1.1, 0), box(0.14, 0.04, 0.05, dark, 0.48, 0.95, z)); // eyes and angry brows
  const mouthY = 0.6; // the pipes start inside the mouth
  for (const z of L3 ? [-0.07, 0.07] : [0]) g.add(rot(cyl(0.035, 0.045, 0.95, bamboo, 1.05, mouthY, z, 7), 0, 0, Math.PI / 2), rot(cyl(0.05, 0.05, 0.08, skin, 1.3, mouthY, z, 7), 0, 0, Math.PI / 2)); // blowpipes with a green band
  g.add(ball(0.08, skin, 0.9, mouthY, 0.12), ball(0.08, skin, 0.9, mouthY, -0.12)); // hands holding the pipes
  for (const z of L3 ? [-0.07, 0.07] : [0]) { const mz = new THREE.Object3D(); mz.name = "muzzle"; mz.position.set(1.55, mouthY, z); g.add(mz); } // where each arrow leaves its pipe
  const qh = L2 ? 0.5 : 0.42, qr = L2 ? 0.12 : 0.09, qy = 0.55, qTop = qy + qh / 2;
  g.add(cyl(qr, qr * 0.9, qh, bamboo, -0.25, qy, -0.12, 8)); // quiver on the back
  for (let i = 0; i < 3; i++) { const x = -0.25 + (i - 1) * 0.05; g.add(cyl(0.012, 0.012, 0.5, 0xd8c090, x, qTop, -0.12, 4), cone(0.035, 0.1, 0xd84a3a, x, qTop + 0.3, -0.12, 4)); } // arrows sticking out of the quiver
  if (L2) g.add(rot(box(0.07, 0.5, 0.42, leather, 0.05, 0.4, 0), 0, 0, 0.5), ball(0.05, 0xf2c230, 0.12, 0.42, 0.16)); // leather strap and buckle
  if (L3) g.add(box(0.3, 0.12, 0.36, GOLD, 0.02, 0.6, 0), box(0.08, 0.2, 0.36, GOLD, 0.25, 0.3, 0), ball(0.05, 0x40ff80, 0.25, 0.5, 0), box(0.03, 0.35, 0.22, 0x2f8a3a, -0.25, 0.25, 0)); // gold armour, green gem and cape
  g.scale.setScalar([1, 1.06, 1.12][level - 1]);
  return g;
}

const BABY_SKIN = [[0x67b85a, 0x3f8f3a], [0x5fb08a, 0x3a8060], [0x5aa0b0, 0x2f6a7a]];

function babyCroco(level: number) {
  const [skin, dark] = BABY_SKIN[level - 1];
  const g = new THREE.Group();
  g.add(box(0.38 + level * 0.03, 0.16, 0.22, skin, 0, 0.16, 0));
  for (const x of [-0.12, 0.12]) for (const z of [-0.12, 0.12]) g.add(box(0.07, 0.1, 0.07, dark, x, 0.05, z));
  const head = crocoHead(0.5, skin); head.position.set(0.27, 0.24, 0); g.add(head);
  g.add(rot(cone(0.09, 0.35 + level * 0.06, skin, -0.35, 0.15, 0, 5), 0, 0, Math.PI / 2));
  if (level >= 2) for (let i = 0; i < 4; i++) g.add(cone(0.04, 0.1, dark, 0.12 - i * 0.1, 0.28, 0, 4)); // spiky back
  if (level >= 3) { // bandana and gold tooth necklace
    g.add(box(0.2, 0.06, 0.26, 0xb3262a, 0.24, 0.33, 0), rot(box(0.12, 0.04, 0.05, 0xb3262a, 0.12, 0.33, 0.1), 0, 0.6, 0));
    for (const z of [-0.08, 0, 0.08]) g.add(cone(0.025, 0.07, GOLD, 0.2, 0.12, z, 4).rotateZ(Math.PI));
  }
  g.scale.setScalar([1, 1.1, 1.22][level - 1]);
  return g;
}

/** Anti-air harpoon launcher: big crossbow on a swivel (named turret, aims along +Z and upwards). */
function airDefense(goblin: boolean) {
  const g = new THREE.Group();
  g.add(cyl(0.8, 0.88, 0.35, goblin ? 0x7a6a5a : STONE, 0, 0.17, 0, 8));
  g.add(cyl(0.25, 0.3, 0.3, DARK_WOOD, 0, 0.5, 0, 8));
  const turret = new THREE.Group();
  turret.add(box(0.5, 0.18, 0.5, goblin ? 0x5a4026 : WOOD, 0, 0.1, 0));
  const tilt = Math.PI / 2 - 0.5; // aimed at the sky
  turret.add(rot(box(0.12, 1.2, 0.12, goblin ? 0x4a3424 : 0x7a5430, 0, 0.5, 0.15), tilt, 0, 0)); // stock
  turret.add(rot(box(1.2, 0.08, 0.1, goblin ? 0x4a3424 : 0x7a5430, 0, 0.75, 0.55), 0.5, 0, 0)); // bow arms
  turret.add(rot(cyl(0.01, 0.01, 1.15, 0xf1ead2, 0, 0.68, 0.42, 3), 0, 0, Math.PI / 2)); // string
  turret.add(rot(cyl(0.035, 0.035, 1.1, 0x8b5a2b, 0, 0.55, 0.1, 5), tilt, 0, 0), rot(cone(0.07, 0.18, 0xdddddd, 0, 0.86, 0.6, 4), tilt, 0, 0)); // harpoon
  turret.position.y = 0.65;
  turret.name = 'turret';
  g.add(turret);
  g.add(flag(goblin, 0.65, 0.35, -0.65, 0.9));
  return g;
}

/** Laboratory: a stone hut with bubbling flasks outside; a second flask at level 2. */
function lab(level: number) {
  const g = new THREE.Group();
  g.add(box(1.6, 0.9, 1.6, STONE, 0, 0.45, 0));
  g.add(cone(1.2, 0.8, 0x6a3a8a, 0, 1.3, 0, 4).rotateY(Math.PI / 4));
  g.add(box(0.4, 0.55, 0.04, DOOR, 0, 0.28, 0.81));
  const flask = (x: number, z: number, glow: number) => {
    g.add(cyl(0.2, 0.28, 0.5, 0xcfe6f0, x, 0.25, z, 8), mesh(new THREE.SphereGeometry(0.17, 8, 6), mat(glow, { emissive: glow, emissiveIntensity: 0.6 }), x, 0.62, z));
  };
  flask(1.15, 0.45, 0x7dff6a);
  if (level >= 2) flask(-1.15, -0.45, 0xf0a0ff);
  if (level >= 3) { // bubbling cauldron and a copper antenna
    g.add(cyl(0.32, 0.25, 0.35, 0x2a2a30, 1.1, 0.18, -0.6, 10), mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.04, 10), mat(0x40ffd0, { emissive: 0x20c0a0, emissiveIntensity: 0.8 }), 1.1, 0.36, -0.6));
    g.add(cyl(0.03, 0.03, 0.9, 0xb87333, 0, 2.0, 0, 5), ball(0.09, 0x7dff6a, 0, 2.48, 0, 1));
  }
  return g;
}

/** Explosive-croco launcher: a croco gunner pushing a small catapult loaded with a lit bomb-croco. */
export function bombCroco(level: number) {
  const g = new THREE.Group();
  g.add(box(0.26, 0.12, 0.14, level === 1 ? 0xd0402a : 0x8a3ad0, 0, 0, 0), box(0.12, 0.08, 0.1, level === 1 ? 0xd0402a : 0x8a3ad0, 0.17, -0.01, 0));
  for (const z of [-0.04, 0.04]) g.add(ball(0.025, 0xffffff, 0.08, 0.07, z, 0));
  g.add(cyl(0.012, 0.012, 0.12, 0x222222, -0.08, 0.1, 0, 4), mesh(new THREE.SphereGeometry(0.03, 6, 4), mat(0xffa020, { emissive: 0xff6000, emissiveIntensity: 1 }), -0.08, 0.17, 0));
  return g;
}

function crocoLauncher(level: number) {
  const skin = level === 1 ? 0x5a9a3f : 0x3f7a8a, wood = level === 1 ? WOOD : DARK_WOOD;
  const g = new THREE.Group();
  // gunner, standing behind the catapult
  for (const z of [-0.08, 0.08]) g.add(box(0.11, 0.22, 0.11, skin, -0.3, 0.11, z - 0.22));
  g.add(box(0.3, 0.36, 0.28, skin, -0.3, 0.4, -0.22), box(0.05, 0.26, 0.2, BELLY, -0.14, 0.4, -0.22));
  const head = crocoHead(0.6, skin); head.position.set(-0.22, 0.68, -0.22); g.add(head);
  if (level >= 2) g.add(box(0.06, 0.08, 0.28, GOLD, -0.12, 0.76, -0.22), box(0.32, 0.08, 0.32, IRON, -0.24, 0.84, -0.22)); // goggles and helmet
  // catapult
  g.add(box(0.7, 0.12, 0.4, wood, 0.15, 0.2, 0.15));
  for (const x of [-0.12, 0.42]) for (const z of [-0.06, 0.36]) g.add(rot(cyl(0.1, 0.1, 0.05, DARK_WOOD, x, 0.1, z, 8), Math.PI / 2, 0, 0));
  g.add(box(0.08, 0.35, 0.08, wood, 0.1, 0.42, 0.0), box(0.08, 0.35, 0.08, wood, 0.1, 0.42, 0.3));
  if (level >= 2) for (const x of [-0.1, 0.4]) g.add(box(0.05, 0.14, 0.42, IRON, x, 0.2, 0.15)); // iron reinforcements
  const arm = new THREE.Group();
  arm.add(rot(box(0.6, 0.06, 0.08, wood, -0.25, 0, 0), 0, 0, -0.5));
  arm.add(cyl(0.12, 0.08, 0.08, DARK_WOOD, -0.5, 0.17, 0, 8));
  const bomb = bombCroco(level); bomb.position.set(-0.5, 0.26, 0); arm.add(bomb);
  arm.position.set(0.1, 0.6, 0.15);
  arm.name = 'arm';
  g.add(arm);
  if (level >= 2) g.add(flag(false, 0.45, 0.26, 0.32, 0.7));
  g.scale.setScalar(level === 1 ? 1 : 1.12);
  return g;
}

/** Healer: a fluffy orange highland calf with pink fairy wings (wingL/wingR pivot at the shoulders), like the reference art. */
function healer(level: number) {
  const fur = 0xd0702a, dark = 0x5a3a24, horn = 0xf0e0b0;
  const g = new THREE.Group();
  g.add(box(0.6, 0.36, 0.34, fur, 0, 0.36, 0)); // fluffy body
  // cow tail hanging from the rear, with a dark tuft at the end
  g.add(rot(cyl(0.025, 0.02, 0.42, fur, -0.44, 0.23, 0, 5), 0, 0, 2.6), ball(0.06, dark, -0.55, 0.05, 0, 1));
  for (const x of [-0.22, 0.22]) for (const z of [-0.12, 0.12]) g.add(box(0.1, 0.22, 0.1, fur, x, 0.11, z), box(0.12, 0.06, 0.12, dark, x, 0.01, z)); // legs and hooves
  const head = new THREE.Group();
  head.add(box(0.3, 0.3, 0.3, fur, 0, 0, 0), box(0.12, 0.1, 0.22, 0xf0a8a0, 0.18, -0.06, 0)); // head and pink muzzle
  for (const z of [-0.1, 0.1]) { head.add(cone(0.04, 0.2, horn, -0.02, 0.2, z, 5)); head.add(ball(0.03, 0x1a1a1a, 0.16, 0.04, z * 1.4, 1)); } // horns and eyes
  head.add(box(0.2, 0.08, 0.2, fur, -0.02, 0.18, 0)); // fringe
  head.position.set(0.36, 0.6, 0);
  g.add(head);
  for (const side of [1, -1]) {
    const w = new THREE.Group();
    // butterfly wings: a big upper pair and a small lower pair, thin flat ellipsoids spread sideways, with an eyespot
    const upper = ball(1, 0xf4a6d8, 0, 0.06, side * 0.3, 1); upper.scale.set(0.05, 0.22, 0.34);
    const lower = ball(1, 0xc9a0f0, 0, -0.08, side * 0.2, 1); lower.scale.set(0.05, 0.13, 0.2);
    const eye = ball(1, 0x6a3a9a, 0.02, -0.08, side * 0.2, 1); eye.scale.set(0.03, 0.05, 0.06);
    w.add(upper, lower, eye);
    w.position.set(0, 0.58, side * 0.12); // middle of the back
    w.name = side > 0 ? 'wingL' : 'wingR';
    g.add(w);
  }
  g.scale.setScalar(level === 1 ? 1 : 1.12);
  return g;
}

/** Fire-spitting croco, from the reference art: rocky plates and back spikes, lava cracks from level 2. Faces +x. */
function fireCroco(level: number) {
  const L2 = level >= 2, L3 = level >= 3;
  const skin = [0x4f7a3a, 0x4a3a32, 0xb0302a][level - 1], lava = 0xff6a1a;
  const g = new THREE.Group();
  const big = 1 + (level - 1) * 0.2; // each level is bigger
  g.add(box(0.6 * big, 0.36 * big, 0.36 * big, skin, 0, 0.42 * big, 0)); // body
  g.add(box(0.5 * big, 0.2 * big, 0.3 * big, 0xe2c08a, 0.05, 0.25 * big, 0)); // pale belly
  for (const [x, z] of [[0.2, -0.18], [0.2, 0.18], [-0.2, -0.18], [-0.2, 0.18]]) g.add(box(0.14, 0.26, 0.14, skin, x * big, 0.13 * big, z * big)); // legs
  g.add(box(0.36 * big, 0.2 * big, 0.2 * big, skin, -0.42 * big, 0.36 * big, 0)); // tail base
  g.add(box(0.24 * big, 0.14 * big, 0.14 * big, skin, -0.62 * big, 0.3 * big, 0)); // tail tip
  const head = crocoHead(0.75 * big, skin); head.position.set(0.42 * big, 0.66 * big, 0); g.add(head);
  for (let i = 0; i < 4 + level; i++) { // back spikes, lava-coloured from level 2
    const s = box(0.08, 0.2 * big, 0.08, L2 ? lava : 0x8a3a20, (0.3 - i * 0.16) * big, 0.72 * big, 0);
    s.rotation.z = 0.3; g.add(s);
  }
  if (L2) for (const z of [-0.19, 0.19]) for (let i = 0; i < 3; i++) g.add(box(0.2, 0.03, 0.02, lava, -0.1 + i * 0.2, 0.42 * big, z * big)); // lava cracks on the flanks
  if (L3) for (const x of [-0.2, 0.2]) g.add(box(0.12, 0.03, 0.14, lava, x * big, 0.02, 0.2 * big)); // glowing feet
  if (L3) for (let i = 0; i < 5; i++) g.add(box(0.04, 0.4 * big, 0.4 * big, 0x3a0c08, (-0.2 + i * 0.1) * big, 0.42 * big, 0)); // dark stripes across the red body
  return g;
}

/** Flying bomber croco: long body, bat wings (wingL/wingR pivot at the shoulders), bombs strapped underneath. */
function flyingCroco(level: number) {
  const skin = level === 1 ? 0x4c9a6a : 0x6a4a9a, dark = level === 1 ? 0x2f7a4a : 0x4a2f7a, wing = level === 1 ? 0x8fbf6a : 0xb07ad8;
  const g = new THREE.Group();
  g.add(box(0.6, 0.2, 0.26, skin, 0, 0.3, 0), box(0.5, 0.06, 0.2, BELLY, 0, 0.19, 0));
  const head = crocoHead(0.6, skin); head.position.set(0.38, 0.36, 0); g.add(head);
  g.add(rot(cone(0.1, 0.5, skin, -0.5, 0.3, 0, 5), 0, 0, Math.PI / 2));
  for (let i = 0; i < 4; i++) g.add(box(0.06, 0.06, 0.06, dark, 0.2 - i * 0.14, 0.43, 0)); // back ridge
  for (const side of [1, -1]) {
    const w = new THREE.Group();
    w.add(box(0.36, 0.03, 0.55, wing, 0, 0, side * 0.3), box(0.04, 0.05, 0.6, dark, 0.16, 0.01, side * 0.3)); // membrane and bone
    for (const x of [-0.12, 0.04]) w.add(box(0.02, 0.04, 0.5, dark, x, 0.01, side * 0.3));
    w.position.set(0.05, 0.38, side * 0.12);
    w.name = side > 0 ? 'wingL' : 'wingR';
    g.add(w);
  }
  const bombs = level === 1 ? [0] : [-0.12, 0.12];
  for (const z of bombs) g.add(ball(0.09, 0x222228, 0, 0.08, z, 1), cyl(0.01, 0.01, 0.08, 0x8b5a2b, 0, 0.18, z, 4));
  g.add(box(0.12, 0.03, 0.3, 0x6d4526, 0, 0.15, 0)); // harness
  if (level >= 2) { // flight goggles, red scarf, armoured back
    g.add(box(0.06, 0.07, 0.26, GOLD, 0.48, 0.46, 0), box(0.1, 0.06, 0.3, 0xb3262a, 0.2, 0.36, 0), rot(box(0.12, 0.03, 0.08, 0xb3262a, 0.08, 0.34, 0.16), 0, 0.5, 0.3));
    g.add(box(0.4, 0.05, 0.22, IRON, -0.05, 0.42, 0));
  }
  g.scale.setScalar(level === 1 ? 1.1 : 1.22);
  return g;
}

/** The colossus: a stone-shelled tank, built at normal size then scaled up (see the setScalar below). Faces +x.
 * Level 2 adds plates, gold spikes and a stone crown of horns; level 3 also gets a gold shell. */
function colossus(level: number) {
  const L2 = level >= 2, L3 = level >= 3;
  const skin = [0x4f7a3a, 0x5a6a34, 0x6a5a3a][level - 1], stone = L2 ? 0x6a6058 : 0x3a322c, shell = L3 ? 0xc9a030 : 0x5a4a40, spike = L2 ? 0xe0b040 : 0xc9b48a, belly = 0xd8c28a;
  const g = new THREE.Group();
  g.add(box(0.7, 0.3, 0.6, skin, 0, 0.3, 0)); // low, wide body
  g.add(box(0.6, 0.12, 0.5, belly, 0.02, 0.16, 0)); // belly
  const plates = L2 ? 5 : 4, spacing = L2 ? 0.13 : 0.16;
  for (let i = 0; i < plates; i++) g.add(box(0.2, L2 ? 0.4 : 0.3, 0.58, shell, (i - (plates - 1) / 2) * spacing, 0.6, 0)); // stone plates over the back
  for (let i = 0; i < plates; i++) g.add(cone(0.06, L2 ? 0.5 : 0.32, spike, (i - (plates - 1) / 2) * spacing, L2 ? 1.0 : 0.92, 0, 4)); // spikes on the shell
  for (const x of [-0.22, 0.22]) for (const z of [-0.3, 0.3]) { // legs with stone bands
    g.add(box(0.2, 0.3, 0.2, skin, x, 0.15, z), box(0.24, 0.07, 0.24, stone, x, 0.24, z), box(0.22, 0.05, 0.22, 0x22201c, x, 0.02, z));
  }

  /** Changer la taille de  g.scale.setScalar(valeur) et faire (npm run models) */
  const head = crocoHead(1, skin); head.position.set(0.5, 0.42, 0); g.add(head);
  g.add(box(0.3, 0.14, 0.36, stone, 0.46, 0.6, 0)); // armoured brow
  if (L2) for (const z of [-0.14, 0.14]) g.add(cone(0.05, 0.35, spike, 0.46, 0.8, z, 4)); // stone crown horns
  g.add(box(0.4, 0.14, 0.18, skin, -0.55, 0.22, 0), box(0.25, 0.1, 0.12, stone, -0.8, 0.2, 0)); // tail with a stone tip
  g.scale.setScalar(1.5); 
  return g;
}

export function troop(kind: string, level = 1): THREE.Group {
  return kind === 'croco' ? croco(level) : kind === 'colossus' ? colossus(level) : kind === 'crocoSarbacane' ? crocoSarbacane(level) : kind === 'crocoLauncher' ? crocoLauncher(level) : kind === 'flyingCroco' ? flyingCroco(level) : kind === 'fireCroco' ? fireCroco(level) : kind === 'healer' ? healer(level) : babyCroco(level);
}

/** Returns a translucent copy of a model, for placement previews. */
export function ghostOf<T extends THREE.Object3D>(model: T): T {
  model.traverse(o => {
    if (o instanceof THREE.Mesh) { o.material = (o.material as THREE.Material).clone(); Object.assign(o.material, { transparent: true, opacity: 0.55 }); o.castShadow = false; }
  });
  return model;
}
