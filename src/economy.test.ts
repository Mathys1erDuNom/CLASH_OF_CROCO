import { test } from 'node:test';
import assert from 'node:assert/strict';
import { migrate, newSave, type Save } from './economy.ts';

test('old saves with vase and mud pumps load as chicken and chicken farms', () => {
  const old = { ...newSave(0), buildings: [{ id: 1, type: 'mudPump', x: 3, y: 3, level: 1, readyAt: 0, collectedAt: 0 }] } as unknown as Save & { mud: number };
  delete (old as Partial<Save>).chicken;
  old.mud = 321;
  const s = migrate(old);
  assert.equal(s.chicken, 321);
  assert.equal(s.buildings[0].type, 'chickenFarm');
  assert.equal('mud' in s, false);
});
