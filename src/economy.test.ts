import { test } from 'node:test';
import assert from 'node:assert/strict';
import { collect, gain, migrate, newSave, storeCap, type Save } from './economy.ts';

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
