import { UPGRADES } from './constants.js';

// ─── CANVAS REFERENCES ────────────────────────────────────
export let canvas, ctx, minimapCanvas, minimapCtx;

export function initCanvas() {
  canvas = document.getElementById('gameCanvas');
  ctx = canvas.getContext('2d');
  minimapCanvas = document.getElementById('minimapCanvas');
  minimapCtx = minimapCanvas.getContext('2d');
  resize();
  window.addEventListener('resize', resize);
}

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = document.documentElement.clientHeight;
  minimapCanvas.width = 100;
  minimapCanvas.height = 60;
}

// ─── DIMENSION HELPERS ─────────────────────────────────────
export const W = () => canvas.width;
export const H = () => canvas.height;
export const surfaceY = () => Math.floor(H() * 0.35);

// ─── GAME STATE ────────────────────────────────────────────
export let G = {};
export let view = 'underground';
export let showPheromones = true;
export let gameSpeed = 1;
export let running = false;
export let paused = false;
export let tick = 0;
export let digMode = false;
export let showUpgrades = false;
export let showStats = false;

// Camera offset for underground panning
export let camera = { x: 0, y: 0 };

export function setView(v) { view = v; }
export function setShowPheromones(v) { showPheromones = v; }
export function setGameSpeed(s) { gameSpeed = s; }
export function setRunning(v) { running = v; }
export function setPaused(v) { paused = v; }
export function incrementTick() { tick++; }
export function setDigMode(v) { digMode = v; }
export function setShowUpgrades(v) { showUpgrades = v; }
export function setShowStats(v) { showStats = v; }
export function setCamera(x, y) { camera.x = x; camera.y = y; }

// ─── INIT GAME STATE ──────────────────────────────────────
export function initGame() {
  const upgradeLevels = {};
  for (const key of Object.keys(UPGRADES)) {
    upgradeLevels[key] = 0;
  }

  G = {
    food: 50,
    eggs: 3,
    larvae: [],
    ants: [],
    foodItems: [],
    tunnels: [],
    digSites: [],         // active dig projects
    pherGrid: new Float32Array(80 * 50),
    homGrid: new Float32Array(80 * 50),
    day: 1,
    seasonIdx: 0,
    dayTimer: 0,
    queenHP: 100,
    queenX: 0,
    queenY: 0,
    nestX: 0,
    nestY: 0,
    surfaceFood: 12,
    larvaeDev: 1.0,
    surfacePenalty: 0,
    tunnelBonus: false,
    enemyColony: { x: 0, y: 0, ants: [] },
    nextEvent: 400 + Math.random() * 400,
    pendingAttack: -1,
    kills: 0,
    born: 0,
    foodCollected: 0,
    tunnelsDug: 0,
    peakPopulation: 0,
    gameOver: false,
    upgrades: upgradeLevels,
    breedRatio: { worker: 55, soldier: 20, nurse: 25 },
    maxFood: 200
  };

  // Position nest
  G.nestX = W() * 0.35 + Math.random() * W() * 0.3;
  G.nestY = surfaceY() + H() * 0.2 + Math.random() * H() * 0.15;
  G.queenX = G.nestX;
  G.queenY = G.nestY;
  G.queenVX = 0.3;
  G.queenVY = 0;
  G.queenState = 'patrol_nest';
  G.queenTimer = 0;
  G.enemyColony.x = W() * 0.6 + Math.random() * W() * 0.3;
  G.enemyColony.y = surfaceY() + H() * 0.15 + Math.random() * H() * 0.2;

  // Reset camera
  camera.x = 0;
  camera.y = 0;

  // Reset tick
  tick = 0;

  return G;
}

// ─── UPGRADE HELPERS ───────────────────────────────────────
export function getUpgradeCost(key) {
  const u = UPGRADES[key];
  const level = G.upgrades[key];
  return Math.floor(u.baseCost * Math.pow(u.costMult, level));
}

export function getUpgradeEffect(key) {
  const u = UPGRADES[key];
  return u.effect(G.upgrades[key]);
}

export function purchaseUpgrade(key) {
  const cost = getUpgradeCost(key);
  const u = UPGRADES[key];
  if (G.food >= cost && G.upgrades[key] < u.maxLevel) {
    G.food -= cost;
    G.upgrades[key]++;
    return true;
  }
  return false;
}
