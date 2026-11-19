// Loads the .glb models from public/models/ once, then hands out clones.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { BUILDINGS, GOBLIN_BASES, TROOPS, troopMaxLevel } from '../data.ts';
import { buildingPath, troopPath } from './paths.ts';

const cache = new Map<string, THREE.Object3D>();

export async function loadModels() {
  const goblinTypes = new Set(GOBLIN_BASES.flatMap(b => b.buildings.map(p => p.type)));
  const paths = [
    ...Object.entries(BUILDINGS).flatMap(([type, d]) => d.levels.flatMap((_, i) =>
      goblinTypes.has(type) ? [buildingPath(type, false, i + 1), buildingPath(type, true, i + 1)] : [buildingPath(type, false, i + 1)])),
    ...Object.keys(TROOPS).flatMap(kind => Array.from({ length: troopMaxLevel(kind) }, (_, i) => troopPath(kind, i + 1))),
  ];
  const loader = new GLTFLoader();
  await Promise.all(paths.map(async path => {
    const root = (await loader.loadAsync(path)).scene.children[0]; // the exported model, with its level scale
    root.traverse(o => {
      if (!(o instanceof THREE.Mesh)) return;
      (o.material as THREE.MeshStandardMaterial).flatShading = true; // glTF has no flat shading flag
      o.castShadow = o.receiveShadow = true;
      o.userData.shared = true; // geometry is shared by every clone: never dispose it
    });
    cache.set(path, root);
  }));
}

const get = (path: string) => {
  const m = cache.get(path);
  if (!m) throw new Error(`Modèle manquant : ${path} (lance npm run models)`);
  return m.clone() as THREE.Group;
};
export const building = (type: string, goblin: boolean, level = 1) => get(buildingPath(type, goblin, level));
export const troop = (kind: string, level = 1) => get(troopPath(kind, level));
