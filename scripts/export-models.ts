// Exports every 3D model built in src/three/models.ts to .glb files under public/models/.
// Run with `npm run models` after changing a model; the game loads the .glb files, not the code.
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { BUILDINGS, GOBLIN_BASES, TROOPS, troopMaxLevel } from '../src/data.ts';
import { building, troop } from '../src/three/models.ts';
import { buildingPath, troopPath } from '../src/three/paths.ts';

// Node has Blob but no FileReader, which GLTFExporter needs for binary output.
globalThis.FileReader = class {
  result: ArrayBuffer | null = null;
  onloadend: (() => void) | null = null;
  readAsArrayBuffer(blob: Blob) { blob.arrayBuffer().then(b => { this.result = b; this.onloadend?.(); }); }
} as unknown as typeof FileReader;

const exporter = new GLTFExporter();
async function save(path: string, object: import('three').Object3D) {
  const glb = await exporter.parseAsync(object, { binary: true }) as ArrayBuffer;
  const file = `public/${path}`;
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, Buffer.from(glb));
  console.log(file, `${(glb.byteLength / 1024).toFixed(0)} KB`);
}

const goblinTypes = new Set(GOBLIN_BASES.flatMap(b => b.buildings.map(p => p.type)));
for (const [type, d] of Object.entries(BUILDINGS))
  for (let level = 1; level <= d.levels.length; level++) {
    await save(buildingPath(type, false, level), building(type, false, level));
    if (goblinTypes.has(type)) await save(buildingPath(type, true, level), building(type, true, level));
  }
for (const kind of Object.keys(TROOPS))
  for (let level = 1; level <= troopMaxLevel(kind); level++) await save(troopPath(kind, level), troop(kind, level));
