# Graph Report - CLASH_OF_CROCO  (2026-11-20)

## Corpus Check
- Corpus is ~24,930 words - fits in a single context window. You may not need a graph.

## Summary
- 342 nodes · 941 edges · 13 communities
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 6 edges (avg confidence: 0.67)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Economy and Tests
- Attack and Troop Logic
- 3D Models and Scene
- Export Tooling
- Dependencies
- Auth and Server
- Sprite Icons
- Save and UI Panel
- Project Docs and Design
- TypeScript Config
- Railway Deploy
- Military Research
- 3D Engine Docs

## God Nodes (most connected - your core abstractions)
1. `villageMode()` - 52 edges
2. `box()` - 27 edges
3. `attackMode()` - 26 edges
4. `svg()` - 26 edges
5. `cyl()` - 26 edges
6. `ball()` - 23 edges
7. `shadow()` - 17 edges
8. `cone()` - 16 edges
9. `onAction()` - 15 edges
10. `rot()` - 15 edges

## Surprising Connections (you probably didn't know these)
- `Game HTML shell` --conceptually_related_to--> `Clash of Croco`  [INFERRED]
  index.html → README.md
- `attackMode()` --calls--> `Battle`  [EXTRACTED]
  src/modes/attack.ts → src/combat.ts
- `attackMode()` --calls--> `edgeDist()`  [EXTRACTED]
  src/modes/attack.ts → src/combat.ts
- `loadModels()` --calls--> `troopMaxLevel()`  [EXTRACTED]
  src/three/assets.ts → src/data.ts
- `loadSave()` --calls--> `migrate()`  [EXTRACTED]
  src/store.ts → src/economy.ts

## Import Cycles
- None detected.

## Communities (13 total, 0 thin omitted)

### Community 0 - "Economy and Tests"
Cohesion: 0.14
Nodes (54): fmtCost(), TRAIN_SPEEDUP_PER_LEVEL, TROOP_LEVELS, troopMaxLevel(), addTroopsToQueue(), armyCap(), armySize(), barracksLevel() (+46 more)

### Community 1 - "Attack and Troop Logic"
Cohesion: 0.07
Nodes (32): troopMult(), attackMode(), finish(), shake(), projectile(), puff(), View, showLevel() (+24 more)

### Community 2 - "3D Models and Scene"
Cohesion: 0.21
Nodes (42): scaffolding(), scene, airDefense(), BABY_SKIN, babyCroco(), ball(), barracks(), bombCroco() (+34 more)

### Community 3 - "Export Tooling"
Cohesion: 0.08
Nodes (25): exporter, goblinTypes, Battle, edgeDist(), nearest(), Struct, Unit, BuildingDef (+17 more)

### Community 4 - "Dependencies"
Cohesion: 0.07
Nodes (32): dependencies, fastify@^5.12.8, @fastify/static@^10.1.11, pg@^8.23.1, three@^0.187.0, devDependencies, @types/node@^26.6.6, @types/pg@^8.23.1 (+24 more)

### Community 5 - "Auth and Server"
Cohesion: 0.10
Nodes (17): avatarUrl(), b64(), cookie(), DiscordUser, discordUser(), newState(), parseCookies(), Session (+9 more)

### Community 6 - "Sprite Icons"
Cohesion: 0.18
Nodes (30): airDefenseIcon(), babyCroco(), barracks(), campIcon(), cannon(), cattails(), coconut(), coin() (+22 more)

### Community 7 - "Save and UI Panel"
Cohesion: 0.26
Nodes (14): newSave(), Save, accountBar(), esc(), screen(), start(), claimGuestSave(), fetchMe() (+6 more)

### Community 8 - "Project Docs and Design"
Cohesion: 0.15
Nodes (12): Game HTML shell, Attack mode, Troop camps, Clash of Croco, Discord login, Fastify server, PostgreSQL saves, Railway deployment (+4 more)

### Community 9 - "TypeScript Config"
Cohesion: 0.14
Nodes (13): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleResolution, noEmit, skipLibCheck (+5 more)

### Community 10 - "Railway Deploy"
Cohesion: 0.25
Nodes (7): build, buildCommand, deploy, healthcheckPath, restartPolicyType, startCommand, $schema

### Community 11 - "Military Research"
Cohesion: 0.50
Nodes (4): Exploding croco launcher, Flying bomber croco, Anti-air harpoon launcher, Laboratory research

### Community 12 - "3D Engine Docs"
Cohesion: 0.67
Nodes (3): GLB 3D models, npm run models generator, 3D engine (Three.js)

## Knowledge Gaps
- **8 isolated node(s):** `3D engine (Three.js)`, `npm run models generator`, `Signed session cookie`, `Exploding croco launcher`, `Anti-air harpoon launcher` (+3 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 94 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `three` connect `Dependencies` to `Economy and Tests`, `Attack and Troop Logic`, `3D Models and Scene`, `Export Tooling`?**
  _High betweenness centrality (0.153) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `villageMode()` (e.g. with `onAction()` and `panelHtml()`) actually correct?**
  _`villageMode()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `3D engine (Three.js)`, `npm run models generator`, `Signed session cookie` to the rest of the system?**
  _8 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Economy and Tests` be split into smaller, more focused modules?**
  _Cohesion score 0.13533834586466165 - nodes in this community are weakly interconnected._
- **Why does `Battle` connect `Export Tooling` to `Economy and Tests`, `Attack and Troop Logic`?**
  _High betweenness centrality (0.037) - this node is a cross-community bridge._
- **Should `Attack and Troop Logic` be split into smaller, more focused modules?**
  _Cohesion score 0.06976744186046512 - nodes in this community are weakly interconnected._
- **Why does `villageMode()` connect `Economy and Tests` to `Attack and Troop Logic`, `3D Models and Scene`, `Export Tooling`?**
  _High betweenness centrality (0.037) - this node is a cross-community bridge._