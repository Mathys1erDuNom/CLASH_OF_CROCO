# Graph Report - Clash of Croco  (2026-11-19)

## Corpus Check
- Corpus is ~14,937 words - fits in a single context window. You may not need a graph.

## Summary
- 250 nodes · 675 edges · 8 communities
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 6 edges (avg confidence: 0.78)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Economy and Combat Constants
- Dependencies and Package Config
- Attack Mode and Effects
- 3D Models and Buildings
- Sprite Icons
- Combat Simulation
- TypeScript Config
- Project Docs and Design Notes

## God Nodes (most connected - your core abstractions)
1. `villageMode()` - 42 edges
2. `attackMode()` - 24 edges
3. `svg()` - 22 edges
4. `box()` - 21 edges
5. `cyl()` - 21 edges
6. `ball()` - 20 edges
7. `building()` - 15 edges
8. `onAction()` - 14 edges
9. `shadow()` - 13 edges
10. `cone()` - 13 edges

## Surprising Connections (you probably didn't know these)
- `Game HTML shell` --conceptually_related_to--> `Clash of Croco`  [INFERRED]
  index.html → README.md
- `attackMode()` --calls--> `Battle`  [EXTRACTED]
  src/modes/attack.ts → src/combat.ts
- `attackMode()` --calls--> `edgeDist()`  [EXTRACTED]
  src/modes/attack.ts → src/combat.ts
- `showLevel()` --calls--> `workingLevel()`  [EXTRACTED]
  src/modes/village.ts → src/economy.ts
- `projectile()` --calls--> `ball()`  [EXTRACTED]
  src/modes/attack.ts → src/three/models.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Playable game surfaces** — readme_village_mode, readme_attack_mode, index_html_game_shell [INFERRED 0.75]

## Communities (8 total, 0 thin omitted)

### Community 0 - "Economy and Combat Constants"
Cohesion: 0.13
Nodes (46): fmtCost(), GOBLIN_BASES, TRAIN_SPEEDUP_PER_LEVEL, addTroopsToQueue(), armyCap(), armySize(), Building, campHousing() (+38 more)

### Community 1 - "Dependencies and Package Config"
Cohesion: 0.06
Nodes (34): dependencies, fastify@^5.12.8, @fastify/static@^10.1.11, pg@^8.23.1, three@^0.187.0, devDependencies, @types/node@^26.6.6, @types/pg@^8.23.1 (+26 more)

### Community 2 - "Attack Mode and Effects"
Cohesion: 0.07
Nodes (30): attackMode(), finish(), shake(), projectile(), puff(), View, showLevel(), persist() (+22 more)

### Community 3 - "3D Models and Buildings"
Cohesion: 0.23
Nodes (34): scaffolding(), scene, babyCroco(), ball(), barracks(), box(), building(), camp() (+26 more)

### Community 4 - "Sprite Icons"
Cohesion: 0.20
Nodes (26): babyCroco(), barracks(), campIcon(), cannon(), cattails(), coconut(), coin(), crocoBrute() (+18 more)

### Community 5 - "Combat Simulation"
Cohesion: 0.10
Nodes (16): Battle, edgeDist(), nearest(), Struct, Unit, BuildingDef, BUILDINGS, Cost (+8 more)

### Community 6 - "TypeScript Config"
Cohesion: 0.14
Nodes (13): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleResolution, noEmit, skipLibCheck (+5 more)

### Community 7 - "Project Docs and Design Notes"
Cohesion: 0.25
Nodes (6): Game HTML shell, Attack mode, Clash of Croco, Railway deployment, Three.js + Fastify + PostgreSQL stack, Village mode

## Knowledge Gaps
- **3 isolated node(s):** `Railway deployment`, `Three.js + Fastify + PostgreSQL stack`, `Game HTML shell`
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 69 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `three` connect `Dependencies and Package Config` to `Economy and Combat Constants`, `Attack Mode and Effects`, `3D Models and Buildings`?**
  _High betweenness centrality (0.252) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `villageMode()` (e.g. with `onAction()` and `panelHtml()`) actually correct?**
  _`villageMode()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `Railway deployment`, `Three.js + Fastify + PostgreSQL stack`, `Game HTML shell` to the rest of the system?**
  _3 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Economy and Combat Constants` be split into smaller, more focused modules?**
  _Cohesion score 0.12772133526850507 - nodes in this community are weakly interconnected._
- **Why does `Battle` connect `Combat Simulation` to `Economy and Combat Constants`, `Attack Mode and Effects`?**
  _High betweenness centrality (0.053) - this node is a cross-community bridge._
- **Should `Dependencies and Package Config` be split into smaller, more focused modules?**
  _Cohesion score 0.058693244739756366 - nodes in this community are weakly interconnected._
- **Why does `villageMode()` connect `Economy and Combat Constants` to `Attack Mode and Effects`, `3D Models and Buildings`?**
  _High betweenness centrality (0.038) - this node is a cross-community bridge._