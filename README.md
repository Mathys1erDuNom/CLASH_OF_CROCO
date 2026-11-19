# 🐊 Clash of Croco

Prototype de jeu de construction de base et d'attaque dans un marais. Construis ton village
(mines d'or, pompes à vase, casernes, défenses), forme des troupes (Croco Cogneur, Grenouille
Sarbacane, Bébé Croco) et attaque les bases des gobelins.

Le jeu est en **3D** (Three.js) : clic-glisser pour tourner la caméra, clic droit-glisser pour la déplacer, molette pour zoomer.

**Graphismes et licences** : tous les modèles 3D sont des modèles low-poly originaux créés pour ce projet
(aucun téléchargement, donc aucune licence externe). Ils sont rangés en fichiers .glb, un dossier par
bâtiment ou troupe et un fichier par niveau :

```
public/models/buildings/<bâtiment>/level1.glb, level2.glb, level3.glb
public/models/buildings/<bâtiment>/goblin-level1.glb …   (versions gobelines)
public/models/troops/<troupe>/level1.glb, level2.glb, level3.glb
```

Le jeu charge ces fichiers au démarrage (`src/three/assets.ts`). Ils sont générés à partir du code de
`src/three/models.ts` par `npm run models`. Pour utiliser un autre modèle (fait dans Blender ou un pack
CC0), remplace simplement le .glb voulu par le tien, sans relancer `npm run models`, qui l'écraserait, et
note sa licence ici. Les icônes du panneau sont des SVG originaux (`src/sprites.ts`).

**Stack** : Three.js + TypeScript + Vite (front), Fastify sur Node.js (sert le jeu + l'API),
PostgreSQL pour les sauvegardes. Sans `DATABASE_URL`, les sauvegardes vont dans `.data/` (un fichier JSON par joueur).

## Lancer en local

Node.js 22.18 ou plus récent (le serveur est en TypeScript exécuté directement par Node).

```bash
npm install
```

```bash
npm run dev
```

Ouvre http://localhost:5173 (Vite, rechargement à chaud ; l'API tourne sur le port 3000).
`npm run dev` utilise `&` : sous Windows, lance `node server/index.ts` et `npx vite` dans deux terminaux.

Version « production » en local :

```bash
npm run build && npm start
```

puis http://localhost:3000. Tests de la logique (combat, production, formation) : `npm test`.

## Déployer sur Railway

Le dépôt contient déjà `railway.json` (build `npm run build`, démarrage `npm start`, healthcheck `/api/health`)
et `.nvmrc` (Node 24). Le serveur écoute sur la variable `PORT` fournie par Railway.

1. Mets le projet sur GitHub (ou utilise la CLI Railway : `railway up` depuis ce dossier, sans GitHub).
2. Sur Railway : **New Project → Deploy from GitHub repo** et choisis le dépôt.
3. Dans le projet : **New → Database → Add PostgreSQL**.
4. Dans le service du jeu → **Variables** → ajoute `DATABASE_URL` = `${{Postgres.DATABASE_URL}}`
   (référence vers la base, Railway remplit la valeur).
5. Railway lance `npm ci`, `npm run build` puis `npm start`.
6. **Settings → Networking → Generate Domain** pour obtenir l'URL publique du jeu.

**Base de données** : au démarrage, le serveur crée la table `saves` si elle n'existe pas
(`CREATE TABLE IF NOT EXISTS`). Chaque joueur y a une ligne avec toute sa progression en JSON : ressources,
bâtiments (position, niveau, travaux en cours), troupes et leurs niveaux, file de formation, recherche du
laboratoire, étoiles des bases gobelines. Ouvre `https://<ton-domaine>/api/health` : il doit répondre
`"storage":"postgres"`. S'il répond `"file"`, la variable `DATABASE_URL` est absente et les sauvegardes seraient
perdues à chaque redéploiement.

## Comment jouer

- Clique sur une mine ou une pompe pour récolter (ou « Tout récolter »). La production continue hors ligne.
- « Construire » : choisis un bâtiment, puis clique sur la carte (Échap / clic droit pour annuler).
- **Déplacer** : clique sur un bâtiment puis « Déplacer », et clique sur le nouvel emplacement (vert = libre).
- **Bâtiments débloqués par la Hutte du Chef** : champ `hutRequired` dans `BUILDINGS` (`src/data.ts`). Tant que
  la hutte n'a pas ce niveau, le bâtiment n'apparaît même pas dans « Construire ». Actuellement : tour de
  roseaux et laboratoire à la hutte 2, lance-harpons anti-air à la hutte 3, le reste dès la hutte 1.
- **Améliorations** : clique sur un bâtiment pour voir son niveau et ses stats, puis « Améliorer ».
  Chaque bâtiment a 3 niveaux, chacun avec son modèle 3D, son coût, sa durée et ses stats
  (production et stock pour les mines/pompes, dégâts et portée pour les défenses, places d'armée
  pour la caserne). Un bâtiment ne peut pas dépasser le niveau de la Hutte du Chef. Pendant les
  travaux, le bâtiment ne produit pas. Tout se règle dans `levels` de `src/data.ts`.
- Forme des troupes avec la vase : clique sur une caserne terminée, les boutons de formation sont dans son panneau. Les troupes logent dans les **Camps des troupes** :
  20, 35 puis 50 places par camp selon son niveau, et on les voit marcher en rond autour du feu de camp. Chaque niveau de
  caserne accélère la formation (x1,5 puis x2).
- **Lanceur de croco explosif** : tire de loin (portée 4,5) des crocos explosifs qui font des dégâts de zone
  autour du bâtiment visé. Il se débloque avec une caserne niveau 2 (`barracksRequired`, mis à 1 temporairement pour les tests) et peut monter au
  niveau 2 avec un labo niveau 3 (`labRequired: { 2: 3 }`, `maxLevel: 2`). Tout se règle dans `TROOPS`.
- **Croco volant bombardier** : vole au-dessus de tout et lâche des bombes à dégâts de zone. Seules les
  défenses avec `hitsAir` (la tour de roseaux) peuvent le toucher ; le canon ne tire qu'au sol. Caserne
  niveau 3 requise (mis à 1 temporairement pour les tests), niveau 2 avec labo niveau 3 (`flying: true` dans `TROOPS`).
- **Lance-harpons anti-air** : défense qui ne tire que sur les troupes volantes (`airOnly`), avec de gros
  dégâts (110, 160 puis 230 par seconde). Présent aussi au Fort des Verrues et à la Citadelle.
- **Laboratoire** : il améliore les troupes (une recherche à la fois). Le niveau de labo exigé se règle par
  troupe et par niveau dans `TROOPS` (`src/data.ts`), champ `labRequired` : `{ 2: 2, 3: 3 }` veut dire
  « niveau 2 = labo 2, niveau 3 = labo 3 ». Pour une future troupe plus rare, mets par exemple `{ 2: 3, 3: 3 }`.
  Pour ajouter un niveau de labo, ajoute une ligne dans `levels` du `lab` puis lance `npm run models`.
- Ciblage : le Croco Cogneur fonce d'abord sur les défenses, le Bébé Croco sur les mines et pompes,
  la Grenouille tire sur le bâtiment le plus proche. Quand il n'y a plus de cible préférée, ils tapent le reste
  (réglable avec `prefers` dans `TROOPS`, `src/data.ts`).
- Attaque : choisis une troupe et clique sur la carte hors des zones rouges. 1 étoile à 50 %,
  1 pour la Hutte du Chef, 1 pour 100 %. Le butin dépend des mines/pompes/hutte détruites.

## Code

- `src/data.ts` : bâtiments, troupes, bases gobelines (l'équilibrage se fait ici)
- `src/economy.ts` : production, constructions, file de formation (timers basés sur l'horloge)
- `src/combat.ts` : simulation du combat, sans rendu (testée dans `combat.test.ts`)
- `src/modes/` : modes Village et Attaque ; `src/three/` : moteur 3D, modèles, décor ; `src/ui.ts` : panneau latéral
- `server/index.ts` : API `GET/PUT /api/save/:id` + fichiers statiques

Le joueur est identifié par un UUID aléatoire stocké dans le navigateur (pas de compte) :
changer de navigateur = nouveau village.
