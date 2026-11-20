// Three.js renderer, orbit camera, picking, tiny tween system, floating texts and health bars.
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GRID } from '../data.ts';

const host = document.getElementById('game')!;
export const scene = new THREE.Scene();
export const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 300);
export const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
host.appendChild(renderer.domElement);

camera.position.set(0, 12, 20); // tilted view (about 30° above the ground)
if (innerWidth < innerHeight) camera.position.set(0, 19, 22); // portrait phone: a bit higher so the village fills the tall screen
export const controls = new OrbitControls(camera, renderer.domElement);
Object.assign(controls, { enableDamping: true, maxPolarAngle: 1.25, minDistance: 8, maxDistance: 80, /* zoom out far enough to see the bigger map */ screenSpacePanning: false });
// touch like a mobile game: one finger moves the map, two fingers pinch-zoom and turn
controls.touches = { ONE: THREE.TOUCH.PAN, TWO: THREE.TOUCH.DOLLY_ROTATE };

const hemi = new THREE.HemisphereLight(0xdff2ff, 0x3a4a20, 1.4);
const sun = new THREE.DirectionalLight(0xfff0d0, 2.6);
sun.position.set(12, 22, 8);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -18, right: 18, top: 18, bottom: -18, near: 1, far: 60 });
sun.shadow.bias = -0.0005;
scene.add(hemi, sun);

/** Everything belonging to the current mode lives here and is wiped on mode change. */
export const world = new THREE.Group();
scene.add(world);

new ResizeObserver(() => {
  const w = host.clientWidth, h = host.clientHeight;
  renderer.setSize(w, h);
  camera.aspect = w / h;
  camera.fov = w < h ? 50 : 38; // phones in portrait: wider view so the village fits across
  camera.updateProjectionMatrix();
}).observe(host);

export interface Tile { x: number; y: number } // fractional tile coordinates
export const toWorld = (x: number, y: number, h = 0) => new THREE.Vector3(x - GRID / 2, h, y - GRID / 2);

export interface Mode {
  update(dt: number): void;
  click?(t: Tile): void;
  move?(t: Tile): void;
  cancel?(): void;
}
let mode: Mode | null = null;

export function setMode(make: () => Mode) {
  // mesh materials are shared (cached) and sprite geometry is global in three.js, so only these are freed
  world.traverse(o => { if (o instanceof THREE.Mesh) { if (!o.userData.shared) o.geometry.dispose(); } else if (o instanceof THREE.Sprite) o.material.dispose(); });
  world.clear();
  anims.length = 0;
  for (const f of floats) f.el.remove();
  floats.length = 0;
  mode = make();
}

// ---- picking: a click is a press+release that barely moved (otherwise it was a camera drag)
const ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const ray = new THREE.Raycaster();
function pick(e: PointerEvent): Tile | null {
  const r = renderer.domElement.getBoundingClientRect();
  ray.setFromCamera(new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), camera);
  const p = ray.ray.intersectPlane(ground, new THREE.Vector3());
  return p && { x: p.x + GRID / 2, y: p.z + GRID / 2 };
}
let down: { x: number; y: number } | null = null;
renderer.domElement.addEventListener('pointerdown', e => { down = { x: e.clientX, y: e.clientY }; });
renderer.domElement.addEventListener('pointerup', e => {
  if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6) return;
  if (e.button === 2) return mode?.cancel?.();
  const t = pick(e);
  if (t && e.button === 0) mode?.click?.(t);
});
renderer.domElement.addEventListener('pointermove', e => { const t = pick(e); if (t) mode?.move?.(t); });
renderer.domElement.addEventListener('contextmenu', e => e.preventDefault());
addEventListener('keydown', e => { if (e.key === 'Escape') mode?.cancel?.(); });

// ---- tiny animation system
const anims: { t: number; dur: number; fn: (k: number) => void; done?: () => void }[] = [];
export function animate(dur: number, fn: (k: number) => void, done?: () => void) { anims.push({ t: 0, dur, fn, done }); }

// ---- floating DOM texts that follow a world position
const floats: { el: HTMLElement; pos: THREE.Vector3; t: number }[] = [];
export function floatText(pos: THREE.Vector3, text: string, color = '#fff') {
  const el = document.createElement('div');
  el.className = 'float';
  el.textContent = text;
  el.style.color = color;
  host.appendChild(el);
  floats.push({ el, pos: pos.clone(), t: 0 });
}

// ---- billboard health/progress bar
export class Bar {
  group = new THREE.Group();
  private fill: THREE.Sprite;
  private w: number;
  constructor(w: number, color: number) {
    this.w = w;
    const mk = (c: number) => new THREE.Sprite(new THREE.SpriteMaterial({ color: c, depthTest: false }));
    const bg = mk(0x1a120c);
    bg.scale.set(w + 0.08, 0.2, 1);
    this.fill = mk(color); // same position as the background; aligned in screen space via center (a world-space offset drifts when the camera turns)
    this.fill.scale.set(w, 0.12, 1);
    bg.renderOrder = 10; this.fill.renderOrder = 11;
    this.group.add(bg, this.fill);
  }
  set(frac: number, color?: number) {
    const f = Math.min(1, Math.max(0, frac));
    this.fill.visible = f > 0.001;
    this.fill.scale.x = this.w * Math.max(f, 0.001);
    this.fill.center.set(0.5 / Math.max(f, 0.001), 0.5); // keeps the fill's left edge on the background's left edge
    if (color !== undefined) this.fill.material.color.setHex(color);
  }
}

const clock = new THREE.Clock();
const v = new THREE.Vector3();
renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.1);
  controls.update();
  controls.target.x = THREE.MathUtils.clamp(controls.target.x, -GRID * 0.7, GRID * 0.7); // keep the village in view when panning
  controls.target.z = THREE.MathUtils.clamp(controls.target.z, -GRID * 0.7, GRID * 0.7);
  mode?.update(dt);
  for (let i = anims.length - 1; i >= 0; i--) {
    const a = anims[i];
    a.t += dt;
    a.fn(Math.min(1, a.t / a.dur));
    if (a.t >= a.dur) { anims.splice(i, 1); a.done?.(); }
  }
  for (let i = floats.length - 1; i >= 0; i--) {
    const f = floats[i];
    f.t += dt;
    f.pos.y += dt * 1.2;
    v.copy(f.pos).project(camera);
    f.el.style.left = `${((v.x + 1) / 2) * host.clientWidth}px`;
    f.el.style.top = `${((1 - v.y) / 2) * host.clientHeight}px`;
    f.el.style.opacity = String(1 - f.t / 1.2);
    if (f.t > 1.2) { f.el.remove(); floats.splice(i, 1); }
  }
  renderer.render(scene, camera);
});
