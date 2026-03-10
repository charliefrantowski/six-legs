import { EVENTS, SEASONS, TYPE } from './constants.js';
import { G, gameSpeed } from './state.js';
import { spawnAnt, gameSpeedMult } from './ant.js';
import { spawnFoodCluster, spawnFoodItem, killSurface, scheduleAttack } from './colony.js';

let eventActive = false;

export function isEventActive() { return eventActive; }
export function setEventActive(v) { eventActive = v; }

// ─── EVENT EFFECTS ─────────────────────────────────────────
function applyEventEffect(ev) {
  switch (ev.title) {
    case 'HEAVY RAIN':
      G.pherGrid.fill(0);
      G.homGrid.fill(0);
      killSurface(3);
      break;
    case 'PREDATOR!':
      killSurface(5);
      break;
    case 'FUNGAL BLOOM':
      G.food += 80;
      break;
    case 'EARLY FROST':
      G.larvaeDev *= 0.5;
      break;
    case 'DROUGHT':
      G.surfaceFood += 20;
      break;
    case 'CATERPILLAR BONANZA':
      G.food += 60;
      spawnFoodCluster();
      break;
    case 'RIVAL SCOUTS':
      scheduleAttack(15);
      break;
    case 'MATING SEASON':
      G.eggs += 8;
      break;
    case 'UNDERGROUND SPRING':
      G.tunnelBonus = true;
      break;
    case 'WILDFIRE NEARBY':
      killSurface(2);
      G.surfacePenalty = 200;
      break;
    case 'SPIDER NEST':
      // Spawn a couple extra enemy soldiers as "spiders"
      const nx = G.nestX + (Math.random() - 0.5) * 150;
      const ny = G.nestY + (Math.random() - 0.5) * 80;
      for (let i = 0; i < 3; i++) {
        spawnAnt(TYPE.ENEMY_SOLDIER, nx + (Math.random() - 0.5) * 20, ny + (Math.random() - 0.5) * 20);
      }
      break;
    case 'FLASH FLOOD':
      // Damage some tunnels conceptually, kill some underground ants
      let killed = 0;
      G.ants = G.ants.filter(a => {
        if (killed < 3 && a.y > G.nestY + 30 && a.type !== TYPE.QUEEN) { killed++; return false; }
        return true;
      });
      break;
  }
}

// ─── SHOW EVENT ────────────────────────────────────────────
export function showEvent(ev) {
  eventActive = true;
  document.getElementById('eIcon').textContent = ev.icon;
  document.getElementById('eTitle').textContent = ev.title;
  document.getElementById('eDesc').textContent = ev.desc;
  document.getElementById('eventBanner').style.display = 'block';
  if (ev.effect) {
    ev.effect();
  } else {
    applyEventEffect(ev);
  }
}

export function dismissEvent() {
  document.getElementById('eventBanner').style.display = 'none';
  eventActive = false;
}

// ─── UPDATE EVENTS ─────────────────────────────────────────
export function updateEvents(tick) {
  G.nextEvent -= gameSpeedMult();
  if (G.nextEvent <= 0 && !eventActive) {
    const ev = EVENTS[Math.floor(Math.random() * EVENTS.length)];
    showEvent(ev);
    G.nextEvent = 500 + Math.random() * 600;
  }

  if (G.pendingAttack > 0) {
    G.pendingAttack -= gameSpeedMult();
    if (G.pendingAttack <= 0) {
      launchAttack();
      G.pendingAttack = -1;
    }
  }

  // Auto-spawn enemy ants
  if (tick % Math.floor(600 / gameSpeedMult()) === 0 && G.enemyColony.ants.length < 20) {
    const ex = G.enemyColony.x, ey = G.enemyColony.y;
    spawnAnt(
      Math.random() < 0.3 ? TYPE.ENEMY_SOLDIER : TYPE.ENEMY_WORKER,
      ex + (Math.random() - 0.5) * 30,
      ey + (Math.random() - 0.5) * 30
    );
  }
}

function launchAttack() {
  const ex = G.enemyColony.x, ey = G.enemyColony.y;
  for (let i = 0; i < 4; i++) {
    spawnAnt(TYPE.ENEMY_SOLDIER, ex + (Math.random() - 0.5) * 20, ey + (Math.random() - 0.5) * 20);
  }
  for (let i = 0; i < 3; i++) {
    spawnAnt(TYPE.ENEMY_WORKER, ex + (Math.random() - 0.5) * 20, ey + (Math.random() - 0.5) * 20);
  }
  showEvent({
    icon: '⚔️',
    title: 'UNDER ATTACK!',
    desc: 'Enemy soldiers are marching on your nest! Rally your soldiers to defend!',
    effect: () => {}
  });
}

// ─── DAY/SEASON CYCLE ─────────────────────────────────────
export function updateDayCycle() {
  G.dayTimer += gameSpeedMult();
  if (G.dayTimer >= 1200) {
    G.dayTimer = 0;
    G.day++;

    if (G.day % 30 === 0) {
      G.seasonIdx = (G.seasonIdx + 1) % 4;
      const sName = SEASONS[G.seasonIdx];
      showEvent(
        sName === 'SPRING' ? { icon: '🌸', title: 'SPRING ARRIVES', desc: 'Warmth returns. Food is plentiful. Your colony stirs with new energy.', effect: () => { G.eggs += 4; } } :
        sName === 'SUMMER' ? { icon: '☀️', title: 'SUMMER HEAT', desc: 'Long days bring abundant food. Growth peaks. Enemies grow bolder too.', effect: () => { G.surfaceFood += 8; } } :
        sName === 'AUTUMN' ? { icon: '🍂', title: 'AUTUMN FALLS', desc: 'Days shorten. Stock your food stores before winter comes.', effect: () => { spawnFoodCluster(); spawnFoodCluster(); } } :
        { icon: '❄️', title: 'WINTER DESCENDS', desc: 'Food is scarce. Larvae develop slowly. Protect your queen.', effect: () => { G.larvaeDev = 0.3; } }
      );
      if (sName === 'SPRING') G.larvaeDev = 1.0;
      if (sName === 'SUMMER') G.larvaeDev = 1.3;
    }

    // Replenish surface food
    const season = SEASONS[G.seasonIdx];
    const replenish = season === 'WINTER' ? 0.3 : season === 'AUTUMN' ? 1 : season === 'SUMMER' ? 2 : 1.5;
    if (Math.random() < replenish * 0.4) spawnFoodItem();
  }

  if (G.surfacePenalty > 0) G.surfacePenalty -= gameSpeedMult();
}
