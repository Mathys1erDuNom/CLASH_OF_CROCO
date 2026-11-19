import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Battle } from './combat.ts';
import { GOBLIN_BASES, TROOPS } from './data.ts';
import { canPlace, placeBuilding, addTroopsToQueue, armyCap, collect, migrate, moveBuilding, newSave, tick, trainMs, troopLevel, upgrade, upgradeBlock, upgradeTroop } from './economy.ts';

test('troop research needs the lab level set in labRequired, takes time, then gives more hp', () => {
  const s = newSave(0);
  s.gold = s.mud = 10_000;
  assert.equal(upgradeTroop(s, 'croco', 0), false); // no lab yet
  s.buildings.push({ id: s.nextId++, type: 'lab', x: 15, y: 15, level: 1, readyAt: 0, collectedAt: 0 });
  assert.equal(upgradeTroop(s, 'croco', 0), false); // croco level 2 needs a level-2 lab
  s.buildings.at(-1)!.level = 2;
  assert.equal(upgradeTroop(s, 'croco', 0), true);
  assert.equal(upgradeTroop(s, 'frog', 0), false); // one research at a time
  tick(s, 59_999);
  assert.equal(troopLevel(s, 'croco'), 1);
  tick(s, 60_000);
  assert.equal(troopLevel(s, 'croco'), 2);
  const b = new Battle(GOBLIN_BASES[0].buildings);
  assert.equal(b.deploy('croco', 0, 0, 1.3).hp, 320 * 1.3);
});

test('a big croco army wipes the goblin camp for 3 stars', () => {
  const b = new Battle(GOBLIN_BASES[0].buildings);
  assert.equal(b.canDeploy(10, 10), false);
  for (let i = 0; i < 15; i++) b.deploy('croco', 0, i);
  for (let t = 0; t < 180 && b.destruction() < 100; t += 0.1) b.step(0.1);
  assert.equal(b.destruction(), 100);
  assert.equal(b.stars(), 3);
  assert.equal(b.lootFraction(), 1);
});

test('a lone baby croco dies to the citadel defenses', () => {
  const b = new Battle(GOBLIN_BASES[2].buildings);
  const u = b.deploy('babyCroco', 0, 10);
  for (let t = 0; t < 60; t += 0.1) b.step(0.1);
  assert.ok(u.hp <= 0);
  assert.equal(b.stars(), 0);
});

test('producers accumulate up to their cap and training finishes on time', () => {
  const s = newSave(0);
  const mine = s.buildings.find(b => b.type === 'goldMine')!;
  assert.equal(collect(s, mine, 60_000), 30);
  assert.equal(collect(s, mine, 60_000 * 100), 200); // capped
  s.mud = 1000;
  s.troops = {}; // the starting army (23 places) would fill the 20-place camp
  const before = s.troops.frog ?? 0;
  assert.equal(addTroopsToQueue(s, 'frog', 0), true);
  tick(s, 7_999);
  assert.equal(s.troops.frog ?? 0, before);
  tick(s, 8_000);
  assert.equal(s.troops.frog, before + 1);
});

test('upgrades cost resources, take time, need the hut level, then boost production', () => {
  const s = newSave(0);
  const mine = s.buildings.find(b => b.type === 'goldMine')!, hq = s.buildings.find(b => b.type === 'hq')!;
  s.gold = s.mud = 10_000;
  assert.equal(upgradeBlock(s, mine, 0), 'Hutte du Chef niveau 2 requise');
  assert.equal(upgrade(s, hq, 0), true);
  assert.equal(s.gold, 9_500);
  assert.equal(upgradeBlock(s, hq, 1000), 'Travaux en cours');
  assert.equal(upgrade(s, mine, 60_000), true); // hut done at 60s
  assert.equal(collect(s, mine, 80_000), 0); // no production during works
  assert.equal(collect(s, mine, 100_000 + 60_000), 50); // level 2: 50/min after works end at 100s
  assert.equal(armyCap(s, 0), 20); // one level-1 camp
});

test('crocos go for defenses, baby crocos for resources, frogs for the nearest building', () => {
  const b = new Battle(GOBLIN_BASES[0].buildings); // hq, goldMine, mudPump, cannon
  const croco = b.deploy('croco', 9, 17), baby = b.deploy('babyCroco', 9, 17), frog = b.deploy('frog', 9, 17);
  b.step(0.01);
  const typeOf = (id: number | null) => b.structs.find(s => s.id === id)?.type;
  assert.equal(typeOf(croco.targetId), 'cannon');
  assert.ok(['goldMine', 'mudPump'].includes(typeOf(baby.targetId)!));
  assert.equal(typeOf(frog.targetId), 'hq');
  for (const s of b.structs) if (s.type === 'goldMine' || s.type === 'mudPump') s.hp = 0;
  baby.targetId = null;
  b.step(0.01);
  assert.ok(['hq', 'cannon'].includes(typeOf(baby.targetId)!)); // no resources left: hits the rest
});

test('camps give army places by level, old saves get a camp, barracks level speeds training', () => {
  const s = newSave(0);
  const camp = s.buildings.find(b => b.type === 'camp')!;
  s.gold = s.mud = 10_000;
  upgrade(s, s.buildings.find(b => b.type === 'hq')!, 0);
  assert.equal(upgrade(s, camp, 60_000), true);
  assert.equal(armyCap(s, 60_001), 20); // during works the camp keeps its old level
  assert.equal(armyCap(s, 60_000 + 50_000), 35);
  const old = migrate({ ...newSave(0), buildings: newSave(0).buildings.filter(b => b.type !== 'camp') });
  assert.equal(old.buildings.filter(b => b.type === 'camp').length, 1);
  const barracks = s.buildings.find(b => b.type === 'barracks')!;
  assert.equal(trainMs(s, 'frog', 0), 8000);
  barracks.level = 3;
  assert.equal(trainMs(s, 'frog', 0), 4000);
});

test('buildings move only to free spots, and may overlap their own old footprint', () => {
  const s = newSave(0);
  const mine = s.buildings.find(b => b.type === 'goldMine')!; // at 4,9 (2x2)
  assert.equal(moveBuilding(s, mine, 8, 8), false); // on the hut
  assert.equal(moveBuilding(s, mine, 5, 9), true); // shifted by one, overlapping its old spot
  assert.deepEqual([mine.x, mine.y], [5, 9]);
  assert.equal(moveBuilding(s, mine, 19, 0), false); // outside the grid
});

test('explosive croco launcher: trains at the barracks, splashes nearby buildings, level 2 needs a level-3 lab', () => {
  const s = newSave(0);
  s.gold = s.mud = 10_000;
  s.buildings.find(b => b.type === 'camp')!.level = 3; // room for 4 more places
  s.buildings.find(b => b.type === 'barracks')!.level = TROOPS.crocoLauncher.barracksRequired ?? 1;
  assert.equal(addTroopsToQueue(s, 'crocoLauncher', 0), true);

  const b = new Battle([{ type: 'goldMine', x: 5, y: 5 }, { type: 'goldMine', x: 7, y: 5 }, { type: 'goldMine', x: 15, y: 15 }]);
  b.deploy('crocoLauncher', 3, 6); // in range of the first mine
  b.step(1);
  assert.ok(b.structs[0].hp < b.structs[0].maxHp);
  assert.ok(b.structs[1].hp < b.structs[1].maxHp); // neighbour hit by the blast
  assert.equal(b.structs[2].hp, b.structs[2].maxHp); // far away: untouched

  s.buildings.push({ id: s.nextId++, type: 'lab', x: 15, y: 15, level: 2, readyAt: 0, collectedAt: 0 });
  assert.equal(upgradeTroop(s, 'crocoLauncher', 0), false); // lab 2 is not enough
  s.buildings.at(-1)!.level = 3;
  assert.equal(upgradeTroop(s, 'crocoLauncher', 0), true);
  s.troopLevel.crocoLauncher = 2;
  s.research = null;
  assert.equal(upgradeTroop(s, 'crocoLauncher', 0), false); // max level 2
});

test('flying bomber: trains at the barracks, cannons cannot hit it, reed towers can', () => {
  const s = newSave(0);
  s.gold = s.mud = 10_000;
  s.buildings.find(b => b.type === 'camp')!.level = 3;
  s.buildings.find(b => b.type === 'barracks')!.level = TROOPS.flyingCroco.barracksRequired ?? 1;
  assert.equal(addTroopsToQueue(s, 'flyingCroco', 0), true);

  const b = new Battle([{ type: 'cannon', x: 5, y: 5 }, { type: 'reedTower', x: 15, y: 15 }]);
  const flyer = b.deploy('flyingCroco', 5, 9), walker = b.deploy('croco', 6, 9);
  b.step(0.1);
  assert.equal(b.structs[0].targetId, walker.id); // the cannon ignores the flyer
  const b2 = new Battle([{ type: 'reedTower', x: 5, y: 5 }]);
  const f2 = b2.deploy('flyingCroco', 6, 9);
  b2.step(0.1);
  assert.equal(b2.structs[0].targetId, f2.id);
  assert.ok(flyer.hp === flyer.maxHp);
});

test('barracksRequired blocks training until the barracks level is reached', () => {
  const s = newSave(0);
  s.gold = s.mud = 10_000;
  s.buildings.find(b => b.type === 'camp')!.level = 3;
  const real = TROOPS.flyingCroco.barracksRequired;
  TROOPS.flyingCroco.barracksRequired = 3; // the real value, temporarily lowered for testing
  assert.equal(addTroopsToQueue(s, 'flyingCroco', 0), false);
  s.buildings.find(b => b.type === 'barracks')!.level = 3;
  assert.equal(addTroopsToQueue(s, 'flyingCroco', 0), true);
  TROOPS.flyingCroco.barracksRequired = real;
});

test('anti-air harpoon launcher shoots flyers only', () => {
  const b = new Battle([{ type: 'airDefense', x: 5, y: 5 }]);
  const walker = b.deploy('croco', 6, 9);
  b.step(0.1);
  assert.equal(b.structs[0].targetId, null); // ground troop ignored
  const flyer = b.deploy('flyingCroco', 6, 9);
  b.step(0.1);
  assert.equal(b.structs[0].targetId, flyer.id);
  assert.ok(flyer.hp < flyer.maxHp && walker.hp === walker.maxHp);
});

test('buildings with hutRequired cannot be built before the hut level', () => {
  const s = newSave(0);
  s.gold = s.mud = 10_000;
  assert.equal(placeBuilding(s, 'lab', 15, 15, 0), false); // hut level 1, lab needs 2
  s.buildings.find(b => b.type === 'hq')!.level = 2;
  assert.equal(placeBuilding(s, 'lab', 15, 15, 0), true);
  assert.equal(placeBuilding(s, 'airDefense', 15, 2, 0), false); // needs hut 3
  assert.equal(placeBuilding(s, 'cannon', 15, 2, 0), true); // no requirement
});

test('troops hit once per hitEvery seconds for dps * hitEvery damage', () => {
  const b = new Battle([{ type: 'goldMine', x: 5, y: 5 }]);
  b.deploy('croco', 4.6, 6); // already in reach
  const mine = b.structs[0];
  b.step(0.1);
  assert.equal(mine.maxHp - mine.hp, 26); // one hit
  for (let i = 0; i < 8; i++) b.step(0.1);
  assert.equal(mine.maxHp - mine.hp, 26); // still reloading (0.9 s)
  b.step(0.1);
  assert.equal(mine.maxHp - mine.hp, 52); // second hit at 1 s
});

test('every goblin base fits the grid without overlapping buildings', () => {
  for (const base of GOBLIN_BASES) {
    const s = newSave(0);
    s.buildings = [];
    for (const p of base.buildings) {
      assert.ok(canPlace(s, p.type, p.x, p.y), `${base.id}: ${p.type} at ${p.x},${p.y}`);
      s.buildings.push({ id: s.nextId++, type: p.type, x: p.x, y: p.y, level: 1, readyAt: 0, collectedAt: 0 });
    }
  }
});
