import { TYPE, SEASONS } from './constants.js';
import { G, W, surfaceY, gameSpeed, getUpgradeEffect } from './state.js';
import { spawnAnt, gameSpeedMult } from './ant.js';

// ─── FOOD SPAWNING ────────────────────────────────────────
export function spawnFoodItem(x, y) {
  G.foodItems.push({
    x: x !== undefined ? x : 30 + Math.random() * (W() - 60),
    y: y !== undefined ? y : 10 + Math.random() * (surfaceY() - 20),
    size: 3 + Math.random() * 5,
    amount: 8 + Math.floor(Math.random() * 12),
    type: Math.random() < 0.4 ? 'seed' : Math.random() < 0.5 ? 'fruit' : 'insect'
  });
}

export function spawnFoodCluster() {
  const cx = 50 + Math.random() * (W() - 100);
  const cy = 10 + Math.random() * (surfaceY() - 30);
  for (let i = 0; i < 6; i++) {
    spawnFoodItem(cx + (Math.random() - 0.5) * 60, cy + (Math.random() - 0.5) * 30);
  }
}

// ─── TUNNEL BUILDING ──────────────────────────────────────
export function buildInitialTunnels() {
  const nx = G.nestX, ny = G.nestY;
  G.tunnels.push({ x: nx, y: ny, w: 28, h: 18, type: 'chamber' });
  G.tunnels.push({ x: nx - 4, y: surfaceY(), w: 8, h: ny - surfaceY(), type: 'shaft' });
  G.tunnels.push({ x: nx - 80, y: ny + 20, w: 80, h: 6, type: 'tunnel' });
  G.tunnels.push({ x: nx, y: ny + 20, w: 100, h: 6, type: 'tunnel' });
  G.tunnels.push({ x: nx - 80, y: ny + 20, w: 6, h: 40, type: 'tunnel' });
  G.tunnels.push({ x: nx + 94, y: ny + 20, w: 6, h: 40, type: 'tunnel' });
  G.tunnels.push({ x: nx - 100, y: ny + 55, w: 22, h: 14, type: 'storage' });
  G.tunnels.push({ x: nx + 88, y: ny + 55, w: 22, h: 14, type: 'nursery' });
}

// ─── DIG SITE CREATION ────────────────────────────────────
export function createDigSite(worldX, worldY) {
  const sY = surfaceY();
  if (worldY < sY + 10) return false; // too close to surface

  // Check if too close to existing tunnel
  for (const t of G.tunnels) {
    const cx = t.x + t.w / 2, cy = t.y + t.h / 2;
    if (Math.abs(worldX - cx) < 30 && Math.abs(worldY - cy) < 20) return false;
  }

  // Check if too close to another dig site
  for (const ds of G.digSites) {
    if (Math.abs(worldX - ds.x) < 25 && Math.abs(worldY - ds.y) < 20) return false;
  }

  // Determine type based on depth
  const depth = (worldY - sY) / (G.nestY - sY);
  let type, w, h;
  if (Math.random() < 0.3) {
    type = depth > 1.5 ? 'storage' : 'chamber';
    w = 20 + Math.random() * 10;
    h = 12 + Math.random() * 8;
  } else {
    type = 'tunnel';
    if (Math.random() < 0.5) {
      w = 40 + Math.random() * 60;
      h = 6;
    } else {
      w = 6;
      h = 30 + Math.random() * 40;
    }
  }

  G.digSites.push({
    x: worldX,
    y: worldY,
    w,
    h,
    type,
    progress: 0
  });

  return true;
}

// ─── LARVAE / EGG SYSTEM ──────────────────────────────────
export function updateLarvae(tick) {
  const nurses = G.ants.filter(a => a.type === TYPE.NURSE && !a.isEnemy);
  const nurseBonus = (1 + nurses.length * 0.15) * getUpgradeEffect('nurseSkill');

  // Spawn larvae from eggs
  for (let i = 0; i < G.eggs && G.eggs > 0; i++) {
    if (Math.random() < 0.002 * gameSpeedMult()) {
      G.larvae.push({ progress: 0, type: randomAntType() });
      G.eggs--;
    }
  }

  // Develop larvae
  for (const l of G.larvae) {
    if (G.food > 0) {
      l.progress += 0.0003 * G.larvaeDev * nurseBonus * gameSpeedMult();
      if (tick % 20 === 0) G.food = Math.max(0, G.food - 0.05);
    }
  }

  // Hatch ready larvae
  const hatched = G.larvae.filter(l => l.progress >= 1);
  for (const l of hatched) spawnAnt(l.type);
  G.larvae = G.larvae.filter(l => l.progress < 1);

  // Queen lays eggs
  const fertilityMod = getUpgradeEffect('queenFertility');
  const eggInterval = Math.floor(400 / (gameSpeedMult() * fertilityMod));
  if (tick % Math.max(1, eggInterval) === 0 && G.food > 20) {
    const season = SEASONS[G.seasonIdx];
    if (season !== 'WINTER') {
      G.eggs += Math.floor(1 + Math.random() * 2);
      G.food = Math.max(0, G.food - 5);
    }
  }

  // Track peak population
  if (G.ants.length > G.peakPopulation) G.peakPopulation = G.ants.length;
}

function randomAntType() {
  const r = Math.random() * 100;
  const { worker, soldier } = G.breedRatio;
  if (r < worker) return TYPE.WORKER;
  if (r < worker + soldier) return TYPE.SOLDIER;
  return TYPE.NURSE;
}

// ─── SURFACE HELPERS ──────────────────────────────────────
export function killSurface(n) {
  let killed = 0;
  G.ants = G.ants.filter(a => {
    if (killed < n && a.y < surfaceY() && a.type !== TYPE.QUEEN) { killed++; return false; }
    return true;
  });
}

export function scheduleAttack(delay) {
  G.pendingAttack = delay * 60 / gameSpeed;
}
