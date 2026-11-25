import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addTroopsToQueue, applyRaid, collect, countOf, gain, migrate, newSave, placeBuilding, storeCap, tick, unlockTroop, workersFree, workersTotal, type Save } from './economy.ts';

test('other troops are paid for and wait in the barracks before training', () => {
  const s = newSave(0);
  s.chicken = 1000;
  assert.equal(addTroopsToQueue(s, 'crocoSarbacane', 0), false); // not unlocked yet
  assert.equal(unlockTroop(s, 'crocoSarbacane', 0), true);
  assert.equal(s.chicken, 900); // sarbacane unlock costs 100
  assert.equal(unlockTroop(s, 'babyCroco', 0), false); // one unlock at a time
  tick(s, 59_999);
  assert.equal(addTroopsToQueue(s, 'crocoSarbacane', 59_999), false); // still unlocking
  tick(s, 60_000);
  assert.equal(addTroopsToQueue(s, 'crocoSarbacane', 60_000), true);
  assert.equal(addTroopsToQueue(s, 'croco', 60_000), true); // the croco needs no unlock
});

test('stock is capped by the storages: overflow is lost, storage levels raise the cap', () => {
  const s = newSave(0);
  assert.equal(storeCap(s, 'gold', 0), 1000); // one level-1 gold storage
  s.gold = 900;
  assert.equal(gain(s, 'gold', 500, 0), 100); // only 100 fits
  assert.equal(s.gold, 1000);
  s.gold = 1500; // above the cap (e.g. after a storage was lost): nothing is added, nothing is removed
  assert.equal(gain(s, 'gold', 50, 0), 0);
  assert.equal(s.gold, 1500);
  s.buildings.find(b => b.type === 'goldStore')!.level = 2;
  assert.equal(storeCap(s, 'gold', 0), 2500);
  const mine = s.buildings.find(b => b.type === 'goldMine')!;
  s.gold = 2500;
  assert.equal(collect(s, mine, 60_000 * 100), 0); // full: the produced gold is lost
});

test('old saves with vase and mud pumps load as chicken and chicken farms', () => {
  const old = { ...newSave(0), buildings: [{ id: 1, type: 'mudPump', x: 3, y: 3, level: 1, readyAt: 0, collectedAt: 0 }] } as unknown as Save & { mud: number };
  delete (old as Partial<Save>).chicken;
  old.mud = 321;
  const s = migrate(old);
  assert.equal(s.chicken, 321);
  assert.equal(s.buildings[0].type, 'chickenFarm');
  assert.equal('mud' in s, false);
});

test('a save from when the troop was a frog gets its troops under the new name', () => {
  const s = migrate({ ...newSave(0), troops: { frog: 3 }, unlockedTroops: ['frog'], troopLevel: { frog: 2 } } as never);
  assert.deepEqual(s.troops, { crocoSarbacane: 3 });
  assert.deepEqual(s.unlockedTroops, ['crocoSarbacane']);
  assert.deepEqual(s.troopLevel, { crocoSarbacane: 2 });
  const q = migrate({ ...newSave(0), queue: [{ kind: 'frog', doneAt: 5 }], unlocking: { kind: 'frog', doneAt: 5 }, research: { kind: 'frog', doneAt: 5 } } as never);
  assert.equal(q.queue[0].kind, 'crocoSarbacane');
  assert.equal(q.unlocking?.kind, 'crocoSarbacane');
  assert.equal(q.research?.kind, 'crocoSarbacane');
});

test('building needs a free worker: the HQ and the starting workshop give two', () => {
  const s = newSave(0);
  s.gold = s.chicken = 10_000;
  assert.equal(workersFree(s, 0), 2);
  assert.equal(placeBuilding(s, 'cannon', 30, 2, 0), true);
  assert.equal(placeBuilding(s, 'chickenFarm', 30, 14, 0), true);
  assert.equal(workersFree(s, 0), 0); // both are being built
  assert.equal(placeBuilding(s, 'chickenFarm', 30, 30, 0), false); // no free worker
  assert.equal(workersTotal(s, 0), 2);
});

test('a second workshop needs the Hutte du Chef at level 3', () => {
  const s = newSave(0);
  s.gold = s.chicken = 10_000;
  assert.equal(placeBuilding(s, 'workshop', 30, 30, 0), false); // hut level 1: one workshop, already there
  s.buildings.find(b => b.type === 'hq')!.level = 3;
  assert.equal(placeBuilding(s, 'workshop', 30, 14, 0), true);
  assert.equal(placeBuilding(s, 'workshop', 20, 2, 0), false); // two is the most
});

test('a save with reed towers is read as sarbacane towers, ruins included', () => {
  const s = migrate({ ...newSave(0), buildings: [{ id: 1, type: 'reedTower', x: 3, y: 3, level: 1, readyAt: 0, collectedAt: 0 }], ruins: [{ type: 'reedTower', x: 5, y: 5, level: 1 }] } as never);
  assert.equal(s.buildings.find(b => b.id === 1)?.type, 'sarbacaneTower');
  assert.equal(s.ruins[0].type, 'sarbacaneTower');
});

test('ground and flying troops unlock side by side', () => {
  const s = newSave(0);
  s.gold = s.chicken = 10_000;
  assert.equal(unlockTroop(s, 'crocoSarbacane', 0), true);
  assert.equal(unlockTroop(s, 'crocoSarbacane', 0), false); // one ground unlock at a time
  assert.equal(unlockTroop(s, 'dragon', 0), true); // the flying one is not blocked by it
  assert.equal(unlockTroop(s, 'flyingCroco', 0), false); // but one flying unlock at a time
});

test('emeralds: a mine makes them, a reserve holds them, a raid takes them, old saves start at 0', () => {
  const s = newSave(0);
  assert.equal(s.emerald, 0);
  assert.equal(migrate({ ...s, emerald: undefined } as never).emerald, 0);
  s.gold = 10_000;
  s.buildings.find(b => b.type === 'hq')!.level = 3;
  assert.equal(placeBuilding(s, 'emeraldMine', 30, 30, 0), true);
  assert.equal(placeBuilding(s, 'emeraldStore', 30, 14, 0), true);
  const mine = s.buildings.find(b => b.type === 'emeraldMine')!; // both finish after 60 s
  assert.equal(collect(s, mine, 180_000), 4); // two emeralds a minute, for the 2 minutes after they were ready
  assert.equal(s.emerald, 4);
  applyRaid(s, [], { emerald: 3 }, 'Attaquant');
  assert.equal(s.emerald, 1);
});
