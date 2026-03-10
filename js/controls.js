import {
  G, view, setView, setShowPheromones, showPheromones,
  setGameSpeed, gameSpeed, setRunning, paused, setPaused,
  digMode, setDigMode, showUpgrades, setShowUpgrades,
  showStats, setShowStats, W, H, surfaceY, canvas
} from './state.js';
import { spawnFoodItem, createDigSite } from './colony.js';
import { dismissEvent } from './events.js';
import { updateHUD, updateUpgradePanel, updateStatsOverlay } from './ui.js';

// ─── BREED RATIO ADJUSTMENT ───────────────────────────────
function adjustRatio(type, delta) {
  const r = G.breedRatio;
  const newVal = r[type] + delta;
  if (newVal < 5 || newVal > 90) return;

  // Find another type to compensate
  const others = ['worker', 'soldier', 'nurse'].filter(t => t !== type);
  const otherTotal = others.reduce((s, t) => s + r[t], 0);

  r[type] = newVal;
  // Redistribute remaining among others proportionally
  const remaining = 100 - newVal;
  const scale = remaining / otherTotal;
  let sum = newVal;
  for (let i = 0; i < others.length - 1; i++) {
    r[others[i]] = Math.max(5, Math.round(r[others[i]] * scale));
    sum += r[others[i]];
  }
  r[others[others.length - 1]] = 100 - sum;
  if (r[others[others.length - 1]] < 5) {
    r[others[others.length - 1]] = 5;
    r[type] = 100 - r[others[0]] - 5;
  }

  updateHUD();
}

// ─── INIT CONTROLS ─────────────────────────────────────────
export function initControls(onStart, onRestart) {
  // Start button
  document.getElementById('startBtn').addEventListener('click', () => {
    document.getElementById('splash').style.display = 'none';
    onStart();
  });

  // View toggles
  document.getElementById('viewSurface').addEventListener('click', () => {
    setView('surface');
    document.getElementById('viewSurface').classList.add('on');
    document.getElementById('viewUnder').classList.remove('on');
  });

  document.getElementById('viewUnder').addEventListener('click', () => {
    setView('underground');
    document.getElementById('viewSurface').classList.remove('on');
    document.getElementById('viewUnder').classList.add('on');
  });

  // Pheromone toggle
  document.getElementById('btnPher').addEventListener('click', () => {
    setShowPheromones(!showPheromones);
    document.getElementById('btnPher').classList.toggle('on', showPheromones);
  });

  // Speed controls
  [1, 2, 3].forEach(s => {
    document.getElementById(`spd${s}`).addEventListener('click', () => {
      setGameSpeed(s);
      [1, 2, 3].forEach(x => document.getElementById(`spd${x}`).classList.toggle('on', x === s));
    });
  });

  // Pause
  document.getElementById('btnPause').addEventListener('click', () => {
    setPaused(!paused);
    document.getElementById('btnPause').classList.toggle('on', paused);
    document.getElementById('btnPause').textContent = paused ? '▶' : '⏸';
  });

  // Dig mode toggle
  document.getElementById('btnDig').addEventListener('click', () => {
    setDigMode(!digMode);
    document.getElementById('btnDig').classList.toggle('on', digMode);
    document.getElementById('digIndicator').style.display = digMode ? 'block' : 'none';
  });

  // Upgrade panel toggle
  document.getElementById('btnUpgrade').addEventListener('click', () => {
    setShowUpgrades(!showUpgrades);
    document.getElementById('upgradePanel').style.display = showUpgrades ? 'block' : 'none';
    document.getElementById('btnUpgrade').classList.toggle('on', showUpgrades);
    if (showUpgrades) updateUpgradePanel();
  });

  // Stats overlay
  document.getElementById('btnStats').addEventListener('click', () => {
    setShowStats(!showStats);
    document.getElementById('statsOverlay').style.display = showStats ? 'block' : 'none';
    if (showStats) updateStatsOverlay();
  });

  document.getElementById('closeStats').addEventListener('click', () => {
    setShowStats(false);
    document.getElementById('statsOverlay').style.display = 'none';
  });

  // Event dismiss
  document.getElementById('dismissEvent').addEventListener('click', dismissEvent);

  // Restart
  document.getElementById('restartBtn').addEventListener('click', () => {
    document.getElementById('gameOver').style.display = 'none';
    onRestart();
  });

  // Breed ratio buttons
  document.getElementById('wUp').addEventListener('click', () => adjustRatio('worker', 5));
  document.getElementById('wDn').addEventListener('click', () => adjustRatio('worker', -5));
  document.getElementById('sUp').addEventListener('click', () => adjustRatio('soldier', 5));
  document.getElementById('sDn').addEventListener('click', () => adjustRatio('soldier', -5));
  document.getElementById('nUp').addEventListener('click', () => adjustRatio('nurse', 5));
  document.getElementById('nDn').addEventListener('click', () => adjustRatio('nurse', -5));

  // Canvas interactions
  canvas.addEventListener('touchstart', function (e) {
    e.preventDefault();
    const t = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    const tx = (t.clientX - rect.left) * (W() / rect.width);
    const ty = (t.clientY - rect.top) * (H() / rect.height);
    handleCanvasClick(tx, ty);
  }, { passive: false });

  canvas.addEventListener('click', function (e) {
    const rect = canvas.getBoundingClientRect();
    const tx = (e.clientX - rect.left) * (W() / rect.width);
    const ty = (e.clientY - rect.top) * (H() / rect.height);
    handleCanvasClick(tx, ty);
  });

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    switch (e.key) {
      case ' ':
        e.preventDefault();
        setPaused(!paused);
        document.getElementById('btnPause').classList.toggle('on', paused);
        document.getElementById('btnPause').textContent = paused ? '▶' : '⏸';
        break;
      case '1': setGameSpeed(1); [1, 2, 3].forEach(x => document.getElementById(`spd${x}`).classList.toggle('on', x === 1)); break;
      case '2': setGameSpeed(2); [1, 2, 3].forEach(x => document.getElementById(`spd${x}`).classList.toggle('on', x === 2)); break;
      case '3': setGameSpeed(3); [1, 2, 3].forEach(x => document.getElementById(`spd${x}`).classList.toggle('on', x === 3)); break;
      case 'd':
        setDigMode(!digMode);
        document.getElementById('btnDig').classList.toggle('on', digMode);
        document.getElementById('digIndicator').style.display = digMode ? 'block' : 'none';
        break;
      case 's':
        if (!e.ctrlKey) {
          setView('surface');
          document.getElementById('viewSurface').classList.add('on');
          document.getElementById('viewUnder').classList.remove('on');
        }
        break;
      case 'u':
        setView('underground');
        document.getElementById('viewSurface').classList.remove('on');
        document.getElementById('viewUnder').classList.add('on');
        break;
    }
  });
}

function handleCanvasClick(tx, ty) {
  const sY = surfaceY();

  if (digMode && view === 'underground' && ty > sY + 10) {
    createDigSite(tx, ty);
    return;
  }

  if (ty < sY && view === 'surface') {
    spawnFoodItem(tx + (Math.random() - 0.5) * 30, ty + (Math.random() - 0.5) * 15);
  }
}
