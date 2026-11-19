// Swamp ground, water, trees and props around the play area.
import * as THREE from 'three';
import { GRID } from '../data.ts';
import { ball, box, cone, cyl, mat } from './models.ts';

const turn = <T extends THREE.Object3D>(o: T, x: number, y: number, z: number) => { o.rotation.set(x, y, z); return o; };
import { scene } from './engine.ts';

function rng(seed: number) {
  return () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
}

export function swamp(world: THREE.Group, seed: number, goblin: boolean) {
  const r = rng(seed), H = GRID / 2, SIZE = GRID + 26;
  scene.background = new THREE.Color(goblin ? 0x8a8f7a : 0x9fcbd6);
  scene.fog = new THREE.Fog(scene.background, 35, 70);

  // ground with colour noise; bumpy only outside the buildable square
  const geo = new THREE.PlaneGeometry(SIZE, SIZE, 72, 72).rotateX(-Math.PI / 2);
  const pos = geo.attributes.position, colors: number[] = [], c = new THREE.Color();
  const base = goblin ? [0x6b6a3c, 0x5a5530, 0x75704a] : [0x5f8f36, 0x4f7d2e, 0x6c9a3e];
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    const out = Math.max(Math.abs(x), Math.abs(z)) - H;
    if (out > 0.5) pos.setY(i, Math.sin(x * 0.7) * Math.cos(z * 0.6) * Math.min(1, out / 4) * 0.6 - 0.05);
    c.setHex(base[Math.floor(r() * base.length)]);
    if (out > 0) c.lerp(new THREE.Color(goblin ? 0x4a4630 : 0x3f6a2c), Math.min(1, out / 6));
    colors.push(c.r, c.g, c.b);
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  const ground = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 1 }));
  ground.receiveShadow = true;
  world.add(ground);

  // subtle frame around the buildable area
  const frame = new THREE.Mesh(new THREE.RingGeometry(H * Math.SQRT2, H * Math.SQRT2 + 0.15, 4, 1, Math.PI / 4).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x2b3a1c, transparent: true, opacity: 0.35 }));
  frame.position.y = 0.02;
  world.add(frame);

  // grass tufts (instanced) inside the square
  const tuftGeo = new THREE.ConeGeometry(0.06, 0.28, 3);
  const tufts = new THREE.InstancedMesh(tuftGeo, mat(goblin ? 0x8a8450 : 0x7fb24a), 900);
  const m = new THREE.Matrix4();
  for (let i = 0; i < 900; i++) {
    m.compose(new THREE.Vector3((r() - 0.5) * (GRID + 6), 0.12, (r() - 0.5) * (GRID + 6)), new THREE.Quaternion().setFromEuler(new THREE.Euler((r() - 0.5) * 0.5, r() * 3, (r() - 0.5) * 0.5)), new THREE.Vector3(1, 0.6 + r() * 0.8, 1));
    tufts.setMatrixAt(i, m);
  }
  world.add(tufts);

  // a point in the ring outside the play area
  const outside = (min = 1.5, max = 9) => {
    const a = r() * Math.PI * 2, d = H + min + r() * (max - min);
    const k = d / Math.max(Math.abs(Math.cos(a)), Math.abs(Math.sin(a)));
    return [Math.cos(a) * Math.min(k, d * 1.4), Math.sin(a) * Math.min(k, d * 1.4)];
  };

  const water = new THREE.MeshStandardMaterial({ color: goblin ? 0x4a5a40 : 0x2f7a72, roughness: 0.15, metalness: 0.1, transparent: true, opacity: 0.9 });
  for (let i = 0; i < 9; i++) {
    const [x, z] = outside(1, 7), rad = 1.2 + r() * 2.2;
    const pond = new THREE.Mesh(new THREE.CircleGeometry(rad, 14).rotateX(-Math.PI / 2), water);
    pond.position.set(x, 0.06, z);
    pond.scale.set(1, 1, 0.6 + r() * 0.5);
    pond.receiveShadow = true;
    world.add(pond);
    for (let k = 0; k < 3; k++) {
      const pad = cyl(0.22, 0.22, 0.02, 0x5fae3f, x + (r() - 0.5) * rad, 0.08, z + (r() - 0.5) * rad * 0.6, 7);
      world.add(pad);
      if (!goblin && r() < 0.5) world.add(ball(0.07, 0xf2a6c8, pad.position.x, 0.13, pad.position.z, 0));
    }
    for (let k = 0; k < 4; k++) { // cattails on the bank
      const a = r() * Math.PI * 2, px = x + Math.cos(a) * rad, pz = z + Math.sin(a) * rad * 0.8, h = 0.7 + r() * 0.5;
      world.add(cyl(0.015, 0.02, h, 0x6f8f2a, px, h / 2, pz, 4), cyl(0.05, 0.05, 0.22, 0x6b4122, px, h - 0.05, pz, 6));
    }
  }

  for (let i = 0; i < 34; i++) { // swamp trees around the village
    const [x, z] = outside(2, 11), h = 1.6 + r() * 1.6;
    const t = new THREE.Group();
    t.add(cyl(0.14, 0.24, h, goblin ? 0x4a4038 : 0x5a4026, 0, h / 2, 0, 6));
    for (let k = 0; k < 3; k++) { // mangrove roots
      const root = cyl(0.04, 0.06, 0.7, 0x5a4026, Math.cos(k * 2.1) * 0.25, 0.25, Math.sin(k * 2.1) * 0.25, 4);
      root.rotation.set(Math.sin(k * 2.1) * 0.6, 0, -Math.cos(k * 2.1) * 0.6);
      t.add(root);
    }
    if (goblin) {
      for (let k = 0; k < 3; k++) t.add(turn(cyl(0.03, 0.06, 0.9, 0x4a4038, 0, h - 0.2, 0, 4), 0.8 * Math.cos(k * 2), 0, 0.8 * Math.sin(k * 2)));
    } else {
      const leaf = [0x2f6a2a, 0x3c7d30, 0x285c26][i % 3];
      t.add(ball(0.9 + r() * 0.4, leaf, 0, h + 0.3, 0, 0), ball(0.6, leaf, 0.5, h, 0.2, 0), ball(0.55, leaf, -0.4, h + 0.1, -0.3, 0));
      for (let k = 0; k < 4; k++) t.add(cyl(0.02, 0.01, 0.8, 0x6f9a50, Math.cos(k * 1.6) * 0.7, h - 0.5, Math.sin(k * 1.6) * 0.7, 3)); // hanging moss
    }
    t.position.set(x, 0, z);
    t.rotation.y = r() * 6;
    world.add(t);
  }

  for (let i = 0; i < 26; i++) { // rocks, logs, mushrooms
    const [x, z] = outside(0.4, 8), k = i % 3;
    if (k === 0) world.add(turn(ball(0.2 + r() * 0.3, 0x8c8c84, x, 0.1, z, 0), r(), r(), r()));
    else if (k === 1) world.add(turn(cyl(0.15, 0.15, 1 + r(), 0x7a5430, x, 0.15, z, 7), 0, r() * 3, Math.PI / 2));
    else world.add(cyl(0.04, 0.05, 0.18, 0xefe6cc, x, 0.09, z, 5), cone(0.14, 0.12, 0xc9443a, x, 0.22, z, 7));
  }
  if (goblin) for (let i = 0; i < 6; i++) { // goblin torches
    const [x, z] = outside(0.3, 1.2);
    world.add(cyl(0.04, 0.05, 1, 0x4a3424, x, 0.5, z, 4), box(0.12, 0.16, 0.12, 0xff8a20, x, 1.05, z));
    const light = new THREE.PointLight(0xff8a30, 3, 4);
    light.position.set(x, 1.3, z);
    world.add(light);
  }
}
