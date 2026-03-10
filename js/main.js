import { G, initCanvas, initGame, ctx, W, H, running, setRunning, paused, tick, incrementTick, gameSpeed } from './state.js';
import { TYPE } from './constants.js';
import { updateAnt, spawnAnt } from './ant.js';
import { buildInitialTunnels, spawnFoodItem, updateLarvae } from './colony.js';
import { updateEvents, updateDayCycle } from './events.js';
import { evaporatePher } from './pheromones.js';
import { drawBackground, drawTunnels, drawPheromones, drawNest, drawEnemy, drawFoodItems, drawLarvae, drawQueen, drawAnt, drawMinimap, updateAndDrawParticles } from './renderer.js';
import { updateHUD, showGameOverStats } from './ui.js';
import { initControls } from './controls.js';

// ─── INITIALIZATION ────────────────────────────────────────
initCanvas();

// ─── TIPS SYSTEM ──────────────────────────────────────────
const TIPS = [
  "Click the surface in SURFACE view to drop food for your ants!",
  "Press D or click DIG to excavate new tunnels underground!",
  "Upgrade your colony with the UPGRADES button!",
  "Adjust breed ratios in the side panel to get more soldiers or workers!",
  "Watch out for enemy attacks - keep soldiers ready!",
  "Nurses help larvae grow faster. Don't forget them!",
  "Press SPACE to pause the game anytime!",
  "Use speed controls (1, 2, 3 keys) to change game speed!",
  "Food storage is limited - upgrade Deep Stores to hold more!",
  "The minimap shows your ants, enemies, and food at a glance!"
];
let lastTip = -1;
let tipTimer = 0;

function showTip() {
  const tipEl = document.getElementById('tipBanner');
  if (!tipEl) return;
  let idx;
  do { idx = Math.floor(Math.random() * TIPS.length); } while (idx === lastTip);
  lastTip = idx;
  tipEl.textContent = "💡 " + TIPS[idx];
  tipEl.style.opacity = '1';
  setTimeout(() => { tipEl.style.opacity = '0'; }, 6000);
}

function startGame() {
  initGame();
  buildInitialTunnels();

  // Spawn starter ants
  for (let i = 0; i < 6; i++) spawnAnt(TYPE.WORKER);
  for (let i = 0; i < 2; i++) spawnAnt(TYPE.SOLDIER);
  for (let i = 0; i < 2; i++) spawnAnt(TYPE.NURSE);

  // Spawn initial food
  for (let i = 0; i < G.surfaceFood; i++) spawnFoodItem();

  setRunning(true);

  // Show first tip after a short delay
  setTimeout(showTip, 3000);
}

// ─── CONTROLS ──────────────────────────────────────────────
initControls(startGame, startGame);

// ─── GAME LOOP ─────────────────────────────────────────────
function gameLoop() {
  if (!running) { requestAnimationFrame(gameLoop); return; }
  if (paused) { requestAnimationFrame(gameLoop); return; }

  incrementTick();

  // Update steps
  const steps = gameSpeed;
  for (let s = 0; s < steps; s++) {
    for (const ant of [...G.ants]) updateAnt(ant);
    for (const ant of [...G.enemyColony.ants]) updateAnt(ant);

    G.ants = G.ants.filter(a => a.hp > 0);
    G.enemyColony.ants = G.enemyColony.ants.filter(a => a.hp > 0);

    updateLarvae(tick);
    updateDayCycle();
    updateEvents(tick);

    if (tick % 3 === 0) {
      evaporatePher(G.pherGrid, 0.002);
      evaporatePher(G.homGrid, 0.001);
    }
  }

  // Game over check
  if (G.queenHP <= 0 && !G.gameOver) {
    G.gameOver = true;
    showGameOverStats();
    document.getElementById('gameOver').style.display = 'flex';
  }

  // HUD update
  if (tick % 30 === 0) updateHUD();

  // Periodic tips
  tipTimer++;
  if (tipTimer % 1800 === 0) showTip();

  // Draw
  ctx.clearRect(0, 0, W(), H());
  drawBackground();
  drawTunnels();
  drawPheromones();
  drawNest();
  drawEnemy();
  drawFoodItems();
  drawLarvae();
  for (const ant of G.ants) drawAnt(ant);
  for (const ant of G.enemyColony.ants) drawAnt(ant);
  drawQueen();
  updateAndDrawParticles();
  drawMinimap();

  requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);
