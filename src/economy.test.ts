import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addTroopsToQueue, collect, gain, migrate, newSave, storeCap, tick, unlockTroop, type Save } from './economy.ts';

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
});
