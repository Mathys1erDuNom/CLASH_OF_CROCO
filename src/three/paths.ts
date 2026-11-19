/** Where each model file lives, relative to the site root (files are in public/models/). */
export const buildingPath = (type: string, goblin: boolean, level: number) => `models/buildings/${type}/${goblin ? 'goblin-' : ''}level${level}.glb`;
export const troopPath = (kind: string, level: number) => `models/troops/${kind}/level${level}.glb`;
