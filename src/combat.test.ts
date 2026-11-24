import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Battle, edgeDist } from './combat.ts';
import { BUILDINGS, GOBLIN_BASES, GRID, TROOPS } from './data.ts';
import { canPlace, placeBuilding, addTroopsToQueue, armyCap, applyRaid, countOf, hqLevel, collect, migrate, rebuild, storeCap, moveBuilding, newSave, tick, trainMs, troopLevel, upgrade, upgradeBlock, upgradeTroop } from './economy.ts';

test('troop research needs the lab level set in labRequired, takes time, then gives more hp', () => {
  const s = newSave(0);
  s.gold = s.chicken = 10_000;
  assert.equal(upgradeTroop(s, 'croco', 0), false); // no lab yet
  s.buildings.push({ id: s.nextId++, type: 'lab', x: 15, y: 15, level: 1, readyAt: 0, collectedAt: 0 });
  assert.equal(upgradeTroop(s, 'croco', 0), false); // croco level 2 needs a level-2 lab
  s.buildings.at(-1)!.level = 2;
  assert.equal(upgradeTroop(s, 'croco', 0), true);
  assert.equal(upgradeTroop(s, 'crocoSarbacane', 0), false); // one research at a time
  tick(s, 59_999);
  assert.equal(troopLevel(s, 'croco'), 1);
  tick(s, 60_000);
  assert.equal(troopLevel(s, 'croco'), 2);
  const b = new Battle(GOBLIN_BASES[0].buildings);
  assert.equal(b.deploy('croco', 0, 0, 1.3).hp, 320 * 1.3);
});

/** How far a centred base moved from its hand-written layout (the hut was at 9,9). */
const offset = (b: Battle) => { const hq = b.structs.find(s => s.type === 'hq')!; return { ox: hq.x - 9, oy: hq.y - 9 }; };

test('a big croco army wipes the goblin camp for 3 stars', () => {
  const b = new Battle(GOBLIN_BASES[0].buildings, GOBLIN_BASES[0].loot);
  const { ox, oy } = offset(b); // layouts are centred on the grid: test positions are relative to the hut
  assert.equal(b.canDeploy(10 + ox, 10 + oy), false);
  for (let i = 0; i < 15; i++) b.deploy('croco', ox, i + oy);
  for (let t = 0; t < 180 && b.destruction() < 100; t += 0.1) b.step(0.1);
  assert.equal(b.destruction(), 100);
  assert.equal(b.stars(), 3);
  assert.equal(b.taken('gold'), GOBLIN_BASES[0].loot.gold); // everything destroyed: all the gold is stolen
  assert.equal(b.taken('chicken'), GOBLIN_BASES[0].loot.chicken);
  assert.equal(b.left('gold'), 0);
});

test('loot is taken in step with the hp a storage or mine loses', () => {
  const b = new Battle([{ type: 'goldMine', x: 5, y: 5, held: 40 }, { type: 'goldStore', x: 10, y: 5, ref: 7 }], { gold: 100 });
  b.structs[0].hp = b.structs[0].maxHp / 2; // half the mine's hp gone: half its 40 is stolen
  assert.equal(b.taken('gold'), 20);
  b.structs[1].hp = b.structs[1].maxHp * 0.75; // a quarter of the storage's 100 is stolen
  assert.equal(b.stockTaken('gold'), 25);
  assert.equal(b.taken('gold'), 45);
});

test('stored gold sits in the storages, and a mine or farm holds its own production', () => {
  const b = new Battle([{ type: 'goldMine', x: 5, y: 5, held: 40 }, { type: 'goldStore', x: 10, y: 5, ref: 7 }], { gold: 101 });
  assert.equal(b.total('gold'), 141); // 101 stored + 40 in the mine
  b.structs[0].hp = 0; // the mine falls: its 40 are stolen, the stored gold stays
  assert.equal(b.taken('gold'), 40);
  assert.equal(b.stockTaken('gold'), 0);
  assert.deepEqual(b.destroyedRefs(), []); // the mine had no ref
  b.structs[1].hp = 0; // the storage falls: its 101 are stolen and it must be removed from the owner's save
  assert.equal(b.stockTaken('gold'), 101);
  assert.equal(b.left('gold'), 0);
  assert.deepEqual(b.destroyedRefs(), [7]);
});

test('a raid removes the destroyed buildings to ruins, takes the stored stock, and rebuild brings them back', () => {
  const s = newSave(0);
  s.gold = 500;
  const store = s.buildings.find(b => b.type === 'goldStore')!;
  applyRaid(s, [store.id], 200, 0, 'Attaquant');
  assert.equal(s.gold, 300);
  assert.deepEqual(s.raids, [{ by: 'Attaquant', buildings: 1, gold: 200, chicken: 0 }]);
  assert.ok(!s.buildings.some(b => b.id === store.id));
  assert.equal(s.ruins.length, 1);
  assert.equal(rebuild(s, 0), 1); // free, same place
  assert.equal(s.ruins.length, 0);
  assert.ok(s.buildings.some(b => b.type === 'goldStore' && b.x === store.x && b.y === store.y));
});

test('a lone baby croco dies to the citadel defenses', () => {
  const b = new Battle(GOBLIN_BASES[2].buildings);
  const { ox, oy } = offset(b);
  const u = b.deploy('babyCroco', ox, 10 + oy);
  for (let t = 0; t < 60; t += 0.1) b.step(0.1);
  assert.ok(u.hp <= 0);
  assert.equal(b.stars(), 0);
});

test('producers accumulate up to their cap and training finishes on time', () => {
  const s = newSave(0);
  const mine = s.buildings.find(b => b.type === 'goldMine')!;
  assert.equal(collect(s, mine, 60_000), 30);
  assert.equal(collect(s, mine, 60_000 * 100), 200); // capped
  s.chicken = 1000;
  s.troops = {}; // the starting army (23 places) would fill the 20-place camp
  const before = s.troops.crocoSarbacane ?? 0;
  s.unlockedTroops.push('crocoSarbacane');
  assert.equal(addTroopsToQueue(s, 'crocoSarbacane', 0), true);
  tick(s, 7_999);
  assert.equal(s.troops.crocoSarbacane ?? 0, before);
  tick(s, 8_000);
  assert.equal(s.troops.crocoSarbacane, before + 1);
});

test('upgrades cost resources, take time, need the hut level, then boost production', () => {
  const s = newSave(0);
  const mine = s.buildings.find(b => b.type === 'goldMine')!, hq = s.buildings.find(b => b.type === 'hq')!;
  s.buildings.find(b => b.type === 'goldStore')!.level = 3; // stock cap 5000, so the 50/min below is not lost
  s.gold = 4_000; s.chicken = 10_000;
  assert.equal(upgradeBlock(s, mine, 0), 'Hutte du Chef niveau 2 requise');
  assert.equal(upgrade(s, hq, 0), true);
  assert.equal(s.gold, 3_500);
  assert.equal(upgradeBlock(s, hq, 1000), 'Travaux en cours');
  assert.equal(upgrade(s, mine, 60_000), true); // hut done at 60s
  assert.equal(collect(s, mine, 80_000), 0); // no production during works
  assert.equal(collect(s, mine, 100_000 + 60_000), 50); // level 2: 50/min after works end at 100s
  assert.equal(armyCap(s, 0), 20); // one level-1 camp
});

test('crocos go for the nearest building, baby crocos for resources, sarbacanes for the nearest building', () => {
  const b = new Battle(GOBLIN_BASES[0].buildings); // hq, goldMine, chickenFarm, cannon
  const { ox, oy } = offset(b);
  const croco = b.deploy('croco', 9 + ox, 17 + oy), baby = b.deploy('babyCroco', 9 + ox, 17 + oy), sarbacane = b.deploy('crocoSarbacane', 9 + ox, 17 + oy);
  b.step(0.01);
  const typeOf = (id: number | null) => b.structs.find(s => s.id === id)?.type;
  const nearest = b.structs.reduce((a, s) => (edgeDist(croco, s) < edgeDist(croco, a) ? s : a));
  assert.equal(croco.targetId, nearest.id); // no preference any more: the nearest building
  assert.ok(['goldMine', 'chickenFarm'].includes(typeOf(baby.targetId)!));
  assert.equal(typeOf(sarbacane.targetId), 'mortar'); // the nearest building
  for (const s of b.structs) if (s.type === 'goldMine' || s.type === 'chickenFarm') s.hp = 0;
  baby.targetId = null;
  b.step(0.01);
  assert.ok(['hq', 'cannon', 'mortar'].includes(typeOf(baby.targetId)!)); // no resources left: hits the rest
});

test('camps give army places by level, old saves get a camp, barracks level speeds training', () => {
  const s = newSave(0);
  const camp = s.buildings.find(b => b.type === 'camp')!;
  s.gold = s.chicken = 10_000;
  upgrade(s, s.buildings.find(b => b.type === 'hq')!, 0);
  assert.equal(upgrade(s, camp, 60_000), true);
  assert.equal(armyCap(s, 60_001), 20); // during works the camp keeps its old level
  assert.equal(armyCap(s, 60_000 + 50_000), 35);
  const old = migrate({ ...newSave(0), buildings: newSave(0).buildings.filter(b => b.type !== 'camp') });
  assert.equal(old.buildings.filter(b => b.type === 'camp').length, 1);
  const barracks = s.buildings.find(b => b.type === 'barracks')!;
  assert.equal(trainMs(s, 'crocoSarbacane', 0), 8000);
  barracks.level = 3;
  assert.equal(trainMs(s, 'crocoSarbacane', 0), 4000);
});

test('buildings move only to free spots, and may overlap their own old footprint', () => {
  const s = newSave(0);
  const mine = s.buildings.find(b => b.type === 'goldMine')!; // 2x2
  const hq = s.buildings.find(b => b.type === 'hq')!;
  const [x0, y0] = [mine.x, mine.y];
  assert.equal(moveBuilding(s, mine, hq.x, hq.y), false); // on the hut
  assert.equal(moveBuilding(s, mine, x0 + 1, y0), true); // shifted by one, overlapping its old spot
  assert.deepEqual([mine.x, mine.y], [x0 + 1, y0]);
  assert.equal(moveBuilding(s, mine, GRID - 1, 0), false); // a 2x2 hanging off the grid edge
});

test('explosive croco launcher: trains at the barracks, splashes nearby buildings, level 2 needs a level-3 lab', () => {
  const s = newSave(0);
  s.gold = s.chicken = 10_000;
  s.buildings.find(b => b.type === 'camp')!.level = 3; // room for 4 more places
  s.buildings.find(b => b.type === 'barracks')!.level = TROOPS.crocoLauncher.barracksRequired ?? 1;
  s.unlockedTroops.push('crocoLauncher');
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

test('flying bomber: trains at the barracks, cannons cannot hit it, sarbacane towers can', () => {
  const s = newSave(0);
  s.gold = s.chicken = 10_000;
  s.buildings.find(b => b.type === 'camp')!.level = 3;
  s.buildings.push({ id: 900, type: 'aerialBarracks', x: 30, y: 30, level: TROOPS.flyingCroco.barracksRequired ?? 1, readyAt: 0, collectedAt: 0 }); // flyers train in the aerial barracks
  s.unlockedTroops.push('flyingCroco');
  assert.equal(addTroopsToQueue(s, 'flyingCroco', 0), true);

  const b = new Battle([{ type: 'cannon', x: 5, y: 5 }, { type: 'sarbacaneTower', x: 15, y: 15 }]);
  const flyer = b.deploy('flyingCroco', 5, 9), walker = b.deploy('croco', 6, 9);
  b.step(0.1);
  assert.equal(b.structs[0].targetId, walker.id); // the cannon ignores the flyer
  const b2 = new Battle([{ type: 'sarbacaneTower', x: 5, y: 5 }]);
  const f2 = b2.deploy('flyingCroco', 6, 9);
  b2.step(0.1);
  assert.equal(b2.structs[0].targetId, f2.id);
  assert.ok(flyer.hp === flyer.maxHp);
});

test('barracksRequired blocks training until the barracks level is reached', () => {
  const s = newSave(0);
  s.gold = s.chicken = 10_000;
  s.buildings.find(b => b.type === 'camp')!.level = 3;
  const real = TROOPS.flyingCroco.barracksRequired;
  TROOPS.flyingCroco.barracksRequired = 3; // the real value, temporarily lowered for testing
  s.unlockedTroops.push('flyingCroco');
  assert.equal(addTroopsToQueue(s, 'flyingCroco', 0), false);
  s.buildings.push({ id: 900, type: 'aerialBarracks', x: 30, y: 30, level: 3, readyAt: 0, collectedAt: 0 }); // flyers train in the aerial barracks
  s.unlockedTroops.push('flyingCroco');
  assert.equal(addTroopsToQueue(s, 'flyingCroco', 0), true);
  assert.equal(addTroopsToQueue(s, 'croco', 0), true); // ground troops still train in the classic barracks
  TROOPS.flyingCroco.barracksRequired = real;
});

test('anti-air harpoon launcher shoots flyers only', () => {
  const b = new Battle([{ type: 'airDefense', x: 5, y: 5 }]);
  const walker = b.deploy('croco', 6, 9);
  b.step(0.1);
  assert.equal(b.structs[0].targetId, null); // ground troop ignored
  const flyer = b.deploy('flyingCroco', 6, 9);
  for (let i = 0; i < 10; i++) b.step(0.1); // a shot every reload (0.7 s)
  assert.equal(b.structs[0].targetId, flyer.id);
  assert.ok(flyer.hp < flyer.maxHp && walker.hp === walker.maxHp);
});

test('buildings with hutRequired cannot be built before the hut level', () => {
  const s = newSave(0);
  s.gold = s.chicken = 10_000;
  assert.equal(placeBuilding(s, 'lab', 30, 30, 0), false); // hut level 1, lab needs 2
  s.buildings.find(b => b.type === 'hq')!.level = 2;
  assert.equal(placeBuilding(s, 'lab', 30, 30, 0), true);
  assert.equal(placeBuilding(s, 'airDefense', 30, 2, 60_000), false); // needs hut 3
  assert.equal(placeBuilding(s, 'cannon', 30, 2, 60_000), true); // no requirement (the lab is done by then: one worker)
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

test('troops dropped on the same tile appear there, then push apart instead of stacking', () => {
  const b = new Battle([]);
  const spots = Array.from({ length: 8 }, () => b.deploy('croco', 20, 20));
  assert.equal(spots[0].x, 20); // dropped exactly where clicked
  for (let i = 0; i < 200; i++) b.step(0.05);
  for (const [i, u] of spots.entries()) for (const o of spots.slice(i + 1)) assert.ok(Math.hypot(u.x - o.x, u.y - o.y) >= 0.69, 'two troops overlap');
});

test('a resource cannot be collected while its stock is at the storage cap', () => {
  const s = newSave(0);
  const mine = { id: s.nextId++, type: 'goldMine', x: 6, y: 6, level: 1, readyAt: 0, collectedAt: 0 };
  s.buildings.push(mine);
  s.gold = storeCap(s, 'gold', 0); // stock exactly at the cap
  assert.equal(collect(s, mine, 60 * 60_000), 0); // full: nothing taken, production kept
  assert.equal(mine.collectedAt, 0);
  s.gold = 0;
  assert.ok(collect(s, mine, 60 * 60_000) > 0); // room again: collectable
});

test('a village whose HQ was destroyed still loads, and the HQ comes back with the rebuild', () => {
  const s = newSave(0);
  const hq = s.buildings.find(b => b.type === 'hq')!;
  applyRaid(s, [hq.id], 0, 0, 'Attaquant');
  assert.equal(hqLevel(s, 0), 0); // no crash: the village just has no HQ level
  assert.equal(rebuild(s, 0), 1);
  assert.equal(hqLevel(s, 0), 1);
});

test('loading a raided village does not hand back storages that were destroyed', () => {
  const s = newSave(0);
  applyRaid(s, s.buildings.filter(b => b.type === 'goldStore' || b.type === 'camp').map(b => b.id), 0, 0, 'Attaquant');
  migrate(s);
  assert.equal(countOf(s, 'goldStore'), 0);
  assert.equal(countOf(s, 'camp'), 0);
});

test('a bomb hurts every building in its blast, including two that touch', () => {
  const b = new Battle([{ type: 'goldMine', x: 5, y: 5 }, { type: 'goldStore', x: 7, y: 5 }]);
  b.deploy('flyingCroco', 6.5, 5.5); // over the mine, half a tile from the store
  b.step(0.05);
  assert.equal(b.drops.length, 1);
  assert.ok(b.structs[0].hp < b.structs[0].maxHp, 'the mine is hit');
  assert.ok(b.structs[1].hp < b.structs[1].maxHp, 'the store next to it is hit too');
});

test('a mortar reaches far and its shell hits every troop near the target', () => {
  const b = new Battle([{ type: 'mortar', x: 0, y: 0, level: 1 }]);
  b.deploy('croco', 12, 1); // 12 tiles away: within the mortar's reach, far beyond a cannon's
  b.deploy('croco', 12.5, 1.5); // a second troop next to the first one
  for (let i = 0; i < 15; i++) b.step(0.1); // the first shot comes after one reload (1.2 s)
  assert.ok(b.units[0].hp < b.units[0].maxHp, 'first troop hit');
  assert.ok(b.units[1].hp < b.units[1].maxHp, 'the troop beside it hit too');
});

test('a healer heals its most hurt troop, one target at a time, and never attacks', () => {
  const b = new Battle([]);
  const hurt = b.deploy('croco', 10, 10), hurtMore = b.deploy('croco', 11, 10), healer = b.deploy('healer', 10.5, 11.5);
  hurt.hp = hurt.maxHp - 50;
  hurtMore.hp = 10; // lowest share of hp: this one is the first target
  for (let i = 0; i < 10; i++) b.step(0.1);
  assert.equal(healer.targetId, hurtMore.id);
  assert.ok(hurtMore.hp > 10, 'the most hurt troop is healed');
  assert.equal(hurt.hp, hurt.maxHp - 50, 'the other troop waits its turn');
  assert.ok(b.hearts.length > 0, 'hearts are sent');
});

test('a heal lands only when its heart arrives, not when it is sent', () => {
  const b = new Battle([]);
  const hurt = b.deploy('croco', 10, 10), healer = b.deploy('healer', 10.5, 11.5);
  hurt.hp = 10;
  b.step(0.05); // the healer fires at once: the heart is in flight
  assert.equal(hurt.hp, 10, 'nothing yet');
  assert.equal(b.hearts.length, 1);
  for (let i = 0; i < 20; i++) b.step(0.05); // 1 s later the heart has landed
  assert.ok(hurt.hp > 10, 'healed on arrival');
  assert.equal(healer.targetId, hurt.id);
});

test('ground troops walk around a building instead of through it', () => {
  const b = new Battle([{ type: 'goldMine', x: 5, y: 5 }]);
  const croco = b.deploy('croco', 2, 6.5); // straight line to the mine's centre crosses it
  let closest = Infinity;
  for (let i = 0; i < 400 && edgeDist(croco, b.structs[0]) > 0.6; i++) {
    b.step(0.05);
    closest = Math.min(closest, edgeDist(croco, b.structs[0]));
  }
  assert.ok(closest >= 0.3 - 1e-9, `never inside the margin (closest ${closest})`);
  assert.ok(edgeDist(croco, b.structs[0]) <= 0.6 + 1e-9, 'and it still gets in reach');
});

test('a defence hurts in shots: no damage between shots, one reload\'s worth per shot', () => {
  const b = new Battle([{ type: 'cannon', x: 5, y: 5, level: 1 }]);
  const u = b.deploy('croco', 8, 6);
  for (let i = 0; i < 5; i++) b.step(0.1); // 0.5 s: not yet a full reload (0.9 s)
  assert.equal(u.hp, u.maxHp);
  for (let i = 0; i < 7; i++) b.step(0.1); // 1.2 s: the first shot (float steps need a little over 0.9 s)
  assert.equal(u.hp, u.maxHp - BUILDINGS.cannon.levels[0].dps! * 0.9);
});

test('a bomb tower hits every ground troop near its target and never a flyer', () => {
  const b = new Battle([{ type: 'bombTower', x: 5, y: 5, level: 1 }]);
  const near = b.deploy('croco', 8, 6), beside = b.deploy('croco', 8.6, 6.8), flyer = b.deploy('flyingCroco', 8, 6);
  for (let i = 0; i < 12; i++) b.step(0.1); // a bomb every second
  assert.ok(near.hp < near.maxHp && beside.hp < beside.maxHp, 'both ground troops bombed');
  assert.equal(flyer.hp, flyer.maxHp);
});

test('flying troops need the aerial barracks; the classic barracks cannot train them', () => {
  const s = newSave(0);
  s.gold = s.chicken = 10_000;
  s.buildings.find(b => b.type === 'barracks')!.level = 3;
  s.unlockedTroops.push('flyingCroco');
  assert.equal(addTroopsToQueue(s, 'flyingCroco', 0), false);
});
