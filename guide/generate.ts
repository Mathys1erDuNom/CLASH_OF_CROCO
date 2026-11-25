// Writes guide/index.html from the game data: what each Hutte du Chef level unlocks, and the troops.
// Run: node guide/generate.ts
import { writeFileSync } from 'node:fs';
import { BUILDINGS, TROOPS, fmtCost, troopMaxLevel } from '../src/data.ts';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const hutLevels = BUILDINGS.hq.levels.length;
const buildings = Object.entries(BUILDINGS).filter(([k]) => k !== 'hq');
const row = (cells: string[]) => `<tr>${cells.map(c => `<td>${c}</td>`).join('')}</tr>`;

const hutSections = Array.from({ length: hutLevels }, (_, i) => {
  const lvl = i + 1;
  const unlocked = buildings.filter(([, d]) => (d.hutRequired ?? 1) <= lvl);
  const newOnes = buildings.filter(([, d]) => (d.hutRequired ?? 1) === lvl).map(([, d]) => d.name);
  const rows = unlocked.map(([k, d]) => {
    const max = d.maxByHut?.[lvl - 1] ?? d.max;
    return row([esc(d.name), String(max), `${Math.min(d.levels.length, d.maxLevelByHut?.[lvl - 1] ?? lvl)} / ${d.levels.length}`, d.trains ? `forme : ${d.trains === 'air' ? 'troupes volantes' : 'troupes au sol'}` : d.defense ? 'défense' : d.res || d.store ? 'ressource' : d.lab ? 'laboratoire' : d.workshop ? 'ouvriers' : '']);
  }).join('');
  return `<section>
  <h2>Hutte du Chef niveau ${lvl}</h2>
  <p>${newOnes.length ? `Nouveau : ${newOnes.map(esc).join(', ')}.` : 'Rien de nouveau à ce niveau.'}</p>
  <table><thead><tr><th>Bâtiment</th><th>Nombre max</th><th>Niveau max (actuel / total)</th><th>Rôle</th></tr></thead><tbody>${rows}</tbody></table>
</section>`;
}).join('\n');

const troopRows = Object.entries(TROOPS).map(([k, d]) => {
  const maxLv = troopMaxLevel(k);
  const home = { ground: 'barracks', air: 'aerialBarracks', necro: 'necroBarracks' }[d.barracks ?? (d.flying ? 'air' : 'ground')] as keyof typeof BUILDINGS;
  const trainer = d.summonOnly ? 'invoquée, jamais formée' : BUILDINGS[home].name;
  const labs = Object.entries(d.labRequired).map(([lv, lab]) => `niv ${lv} : labo ${lab}`).join(', ') || '—';
  const unlock = d.unlock ? `${fmtCost(d.unlock.cost)} · ${d.unlock.sec} s` : 'de départ';
  const traits = [
    d.flying && 'vole', d.prefers === 'defense' && 'vise les défenses', d.prefers === 'resource' && 'vise les ressources',
    d.splash && `dégâts de zone (rayon ${d.splash})`, d.spins && 'tourne sur lui-même', d.wanders && 'bombarde en survolant',
    d.heal && `soigne (${d.heal} PV)`, d.resourceBonus && `x${d.resourceBonus} sur les mines et poulaillers`,
  ].filter(Boolean).join(' ; ') || '—';
  return row([esc(d.name), esc(trainer), `caserne niv ${d.barracksRequired ?? 1}`, esc(unlock), esc(fmtCost(d.cost)), `${d.trainSec} s`, String(d.space), d.levels.map(l => l.hp).join(' / '), d.levels.map(l => l.dps).join(' / '), `${d.flying ? 'volant' : 'au sol'}`, `${maxLv}`, esc(labs), esc(traits)]);
}).join('');

const html = `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Guide de la Hutte du Chef</title>
<style>
  :root { --bg: #f6f1e4; --ink: #2b1d14; --line: #d8c9a6; --head: #6d4a26; }
  @media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { --bg: #1f1812; --ink: #f1e6cf; --line: #4a3a28; --head: #c9a25a; } }
  :root[data-theme="dark"] { --bg: #1f1812; --ink: #f1e6cf; --line: #4a3a28; --head: #c9a25a; }
  body { background: var(--bg); color: var(--ink); font-family: system-ui, sans-serif; margin: 0; padding: 16px; line-height: 1.4; }
  h1 { color: var(--head); } h2 { color: var(--head); margin-top: 32px; }
  .wrap { overflow-x: auto; }
  table { border-collapse: collapse; width: 100%; min-width: 480px; }
  th, td { border: 1px solid var(--line); padding: 6px 8px; text-align: left; vertical-align: top; }
  th { background: rgba(127, 127, 127, .12); }
</style>
</head>
<body>
<h1>Guide de la Hutte du Chef</h1>
<p>Ce qui est disponible à chaque niveau de la Hutte du Chef, et les troupes. Généré depuis <code>src/data.ts</code> (relancer <code>node guide/generate.ts</code> après un changement).</p>
<h2>Bâtiments par niveau de hutte</h2>
<div class="wrap">
${hutSections}
</div>
<h2>Troupes</h2>
<p>Les troupes au sol se forment à la ${BUILDINGS.barracks.name}, les volantes à la ${BUILDINGS.aerialBarracks.name}. Le déblocage (s'il existe) se paie une fois ; le laboratoire et la caserne donnent le niveau de la troupe.</p>
<div class="wrap">
<table><thead><tr><th>Troupe</th><th>Caserne</th><th>Caserne requise</th><th>Déblocage</th><th>Coût</th><th>Formation</th><th>Places</th><th>PV par niveau</th><th>Dégâts/s par niveau</th><th>Type</th><th>Niveau max</th><th>Laboratoire requis</th><th>Particularités</th></tr></thead>
<tbody>${troopRows}</tbody></table>
</div>
</body>
</html>
`;
writeFileSync(new URL('./index.html', import.meta.url), html);
console.log('guide/index.html written');
