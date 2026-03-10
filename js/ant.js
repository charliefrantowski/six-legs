import { TYPE, STATE } from './constants.js';
import { G, W, H, surfaceY, gameSpeed, getUpgradeEffect } from './state.js';
import { depositPher, getPher } from './pheromones.js';

// ─── HELPERS ───────────────────────────────────────────────
export function dist(x1, y1, x2, y2) {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

export function gameSpeedMult() {
  return gameSpeed * 0.35; // Slower base — was 0.6
}

// ─── ADVANCED STEERING ────────────────────────────────────
// Smooth steering with separation, alignment, cohesion

function steer(ant, tx, ty, spd) {
  const dx = tx - ant.x, dy = ty - ant.y;
  const d = Math.sqrt(dx * dx + dy * dy) || 1;
  // Desired velocity
  const dvx = (dx / d) * spd;
  const dvy = (dy / d) * spd;
  // Steering force (lerp toward desired)
  ant.vx += (dvx - ant.vx) * 0.08;
  ant.vy += (dvy - ant.vy) * 0.08;
}

function applyVelocity(ant) {
  // Clamp speed
  const sp = Math.sqrt(ant.vx * ant.vx + ant.vy * ant.vy);
  const maxSpd = ant.speed * 1.2;
  if (sp > maxSpd) {
    ant.vx *= maxSpd / sp;
    ant.vy *= maxSpd / sp;
  }
  ant.x += ant.vx * gameSpeedMult();
  ant.y += ant.vy * gameSpeedMult();
}

function separation(ant, neighbors, radius) {
  let sx = 0, sy = 0, count = 0;
  for (const other of neighbors) {
    if (other === ant || other.id === ant.id) continue;
    const d = dist(ant.x, ant.y, other.x, other.y);
    if (d < radius && d > 0) {
      sx += (ant.x - other.x) / d;
      sy += (ant.y - other.y) / d;
      count++;
    }
  }
  if (count > 0) {
    ant.vx += (sx / count) * 0.15;
    ant.vy += (sy / count) * 0.15;
  }
}

function wander(ant, str) {
  // Perlin-like smooth wandering using sine
  ant.wanderAngle = (ant.wanderAngle || Math.random() * Math.PI * 2) + (Math.random() - 0.5) * 0.5;
  ant.vx += Math.cos(ant.wanderAngle) * str * 0.3;
  ant.vy += Math.sin(ant.wanderAngle) * str * 0.3;
  // Damping
  ant.vx *= 0.92;
  ant.vy *= 0.92;
}

function moveToward(ant, tx, ty, spd) {
  steer(ant, tx, ty, spd);
  applyVelocity(ant);
}

function nearestFood(ant) {
  let best = null, bd = 99999;
  for (const f of G.foodItems) {
    const d = dist(ant.x, ant.y, f.x, f.y);
    if (d < bd) { bd = d; best = f; }
  }
  return best;
}

function nearestEnemy(ant) {
  let best = null, bd = 99999;
  for (const e of G.enemyColony.ants) {
    const d = dist(ant.x, ant.y, e.x, e.y);
    if (d < bd) { bd = d; best = e; }
  }
  return best;
}

function nearestDigSite(ant) {
  let best = null, bd = 99999;
  for (const ds of G.digSites) {
    if (ds.progress >= 1) continue;
    const d = dist(ant.x, ant.y, ds.x, ds.y);
    if (d < bd) { bd = d; best = ds; }
  }
  return best;
}

// ─── SPAWN ─────────────────────────────────────────────────
export function spawnAnt(type, x, y) {
  const isEnemy = type === TYPE.ENEMY_WORKER || type === TYPE.ENEMY_SOLDIER;
  const ant = {
    type,
    x: x !== undefined ? x : G.nestX + (Math.random() - 0.5) * 20,
    y: y !== undefined ? y : G.nestY,
    vx: (Math.random() - 0.5) * 0.8,
    vy: (Math.random() - 0.5) * 0.8,
    state: type === TYPE.WORKER ? STATE.FORAGE :
           type === TYPE.SOLDIER ? STATE.PATROL :
           type === TYPE.NURSE ? STATE.NURSE_DUTY : STATE.WANDER,
    hp: type === TYPE.SOLDIER ? 60 : type === TYPE.ENEMY_SOLDIER ? 50 : 30,
    maxHp: type === TYPE.SOLDIER ? 60 : type === TYPE.ENEMY_SOLDIER ? 50 : 30,
    carryFood: 0,
    target: null,
    timer: Math.random() * 100,
    id: Math.random(),
    age: 0,
    isEnemy,
    speed: type === TYPE.SOLDIER ? 1.0 : type === TYPE.NURSE ? 0.6 : 0.8,
    pherDeposit: 0,
    patrolSurface: false,
    wanderAngle: Math.random() * Math.PI * 2
  };
  if (isEnemy) {
    G.enemyColony.ants.push(ant);
  } else {
    G.ants.push(ant);
  }
  G.born++;
  return ant;
}

// ─── QUEEN AI ─────────────────────────────────────────────
// Queen has her own behavior: patrol nest, inspect larvae, rest, lay eggs
export function updateQueen() {
  if (!G.queenState) G.queenState = 'patrol_nest';
  if (!G.queenTimer) G.queenTimer = 0;
  if (!G.queenVX) G.queenVX = 0.3;
  if (!G.queenVY) G.queenVY = 0;

  G.queenTimer++;

  const nestDist = dist(G.queenX, G.queenY, G.nestX, G.nestY);

  switch (G.queenState) {
    case 'patrol_nest': {
      // Wander around the nest area slowly, inspecting
      const angle = G.queenTimer * 0.008 + Math.sin(G.queenTimer * 0.003) * 0.5;
      const r = 20 + Math.sin(G.queenTimer * 0.005) * 15;
      const tx = G.nestX + Math.cos(angle) * r;
      const ty = G.nestY + Math.sin(angle) * r * 0.6;

      const dx = tx - G.queenX, dy = ty - G.queenY;
      const d = Math.sqrt(dx * dx + dy * dy) || 1;
      G.queenVX += (dx / d * 0.3 - G.queenVX) * 0.05;
      G.queenVY += (dy / d * 0.3 - G.queenVY) * 0.05;
      G.queenX += G.queenVX * gameSpeedMult();
      G.queenY += G.queenVY * gameSpeedMult();

      // Transition: go inspect larvae
      if (G.queenTimer % 400 === 0 && G.larvae.length > 0) {
        G.queenState = 'inspect_larvae';
        G.queenTimer = 0;
      }
      // Transition: rest
      if (G.queenTimer > 600) {
        G.queenState = 'resting';
        G.queenTimer = 0;
      }
      break;
    }

    case 'inspect_larvae': {
      // Move toward nursery area
      const nurseryX = G.nestX + 30;
      const nurseryY = G.nestY + 10;
      const dx = nurseryX - G.queenX, dy = nurseryY - G.queenY;
      const d = Math.sqrt(dx * dx + dy * dy) || 1;
      G.queenVX += (dx / d * 0.25 - G.queenVX) * 0.04;
      G.queenVY += (dy / d * 0.25 - G.queenVY) * 0.04;
      G.queenX += G.queenVX * gameSpeedMult();
      G.queenY += G.queenVY * gameSpeedMult();

      // Bobbing "inspection" motion
      G.queenY += Math.sin(G.queenTimer * 0.1) * 0.2;

      if (G.queenTimer > 200) {
        G.queenState = 'patrol_nest';
        G.queenTimer = 0;
      }
      break;
    }

    case 'resting': {
      // Slowly drift back to nest center
      const dx = G.nestX - G.queenX, dy = G.nestY - G.queenY;
      const d = Math.sqrt(dx * dx + dy * dy) || 1;
      G.queenVX += (dx / d * 0.15 - G.queenVX) * 0.03;
      G.queenVY += (dy / d * 0.15 - G.queenVY) * 0.03;
      G.queenX += G.queenVX * gameSpeedMult() * 0.5;
      G.queenY += G.queenVY * gameSpeedMult() * 0.5;

      // Gentle breathing motion
      G.queenY += Math.sin(G.queenTimer * 0.03) * 0.15;

      if (G.queenTimer > 300) {
        G.queenState = 'laying';
        G.queenTimer = 0;
      }
      break;
    }

    case 'laying': {
      // Stationary, pulsing — laying eggs
      G.queenY += Math.sin(G.queenTimer * 0.15) * 0.3; // Pulsing
      G.queenVX *= 0.9;
      G.queenVY *= 0.9;

      if (G.queenTimer > 150) {
        G.queenState = 'patrol_nest';
        G.queenTimer = 0;
      }
      break;
    }

    default:
      G.queenState = 'patrol_nest';
  }

  // Keep queen underground
  const sY = surfaceY();
  G.queenX = Math.max(G.nestX - 50, Math.min(G.nestX + 50, G.queenX));
  G.queenY = Math.max(sY + 10, Math.min(H() - 20, G.queenY));
}

// ─── UPDATE ANT ────────────────────────────────────────────
export function updateAnt(ant) {
  ant.age++;
  ant.timer++;

  if (ant.isEnemy) { updateEnemyAnt(ant); return; }

  const sY = surfaceY();
  const homeRange = 35;
  const inNest = dist(ant.x, ant.y, G.nestX, G.nestY) < homeRange;

  const speedMod = ant.type === TYPE.WORKER ? getUpgradeEffect('workerSpeed') : 1;

  // Apply separation from nearby ants (flocking)
  if (ant.timer % 3 === 0) {
    separation(ant, G.ants, 12);
  }

  switch (ant.state) {
    case STATE.FORAGE: {
      if (G.surfacePenalty > 0) { ant.state = STATE.RETURN; break; }

      const digSite = nearestDigSite(ant);
      if (digSite && dist(ant.x, ant.y, digSite.x, digSite.y) < 80 && Math.random() < 0.02) {
        ant.target = digSite;
        ant.state = STATE.DIG;
        break;
      }

      const food = nearestFood(ant);
      if (food && dist(ant.x, ant.y, food.x, food.y) < 8) {
        ant.carryFood = Math.min(food.amount, 6);
        food.amount -= ant.carryFood;
        if (food.amount <= 0) G.foodItems.splice(G.foodItems.indexOf(food), 1);
        ant.state = STATE.CARRY;
        depositPher(G.pherGrid, ant.x, ant.y, 0.3);
      } else if (food && dist(ant.x, ant.y, food.x, food.y) < 150) {
        const fp = getPher(G.pherGrid, ant.x, ant.y);
        const spd = ant.speed * speedMod * (fp > 0.1 ? 1.0 : 0.7);
        moveToward(ant, food.x, food.y, spd);
        depositPher(G.homGrid, ant.x, ant.y, 0.05);
      } else {
        // Explore: wander with slight upward bias to find surface food
        wander(ant, 0.6);
        if (ant.y > sY - 5) ant.vy -= 0.15;
        applyVelocity(ant);
        ant.y = Math.min(sY - 2, Math.max(2, ant.y));
      }
      if (ant.timer % 1000 === 0 && Math.random() < 0.3) ant.state = STATE.RETURN;
      break;
    }

    case STATE.CARRY: {
      depositPher(G.pherGrid, ant.x, ant.y, 0.15);
      moveToward(ant, G.nestX, G.nestY, ant.speed * speedMod * 0.9);
      if (dist(ant.x, ant.y, G.nestX, G.nestY) < homeRange) {
        const storageMax = getUpgradeEffect('storageCapacity');
        const toStore = Math.min(ant.carryFood, storageMax - G.food);
        G.food += Math.max(0, toStore);
        G.foodCollected += ant.carryFood;
        ant.carryFood = 0;
        ant.state = STATE.FORAGE;
      }
      break;
    }

    case STATE.PATROL: {
      const enemy = nearestEnemy(ant);
      if (enemy && dist(ant.x, ant.y, enemy.x, enemy.y) < 60) {
        ant.target = enemy;
        ant.state = STATE.FIGHT;
      } else {
        // Patrol in a figure-8 pattern around the nest
        const angle = ant.timer * 0.012 + ant.id * 10;
        const r = 45 + Math.sin(ant.timer * 0.006) * 25;
        const tx = G.nestX + Math.cos(angle) * r;
        const ty = G.nestY + Math.sin(angle * 2) * r * 0.3;
        moveToward(ant, tx, ty, ant.speed * 0.7);
        if (ant.timer % 400 === 0) ant.patrolSurface = !ant.patrolSurface;
        if (ant.patrolSurface && ant.y < sY) ant.y = Math.max(5, ant.y);
      }
      break;
    }

    case STATE.FIGHT: {
      const enemy = ant.target;
      if (!enemy || enemy.hp <= 0 || !G.enemyColony.ants.includes(enemy)) {
        ant.state = ant.type === TYPE.SOLDIER ? STATE.PATROL : STATE.FORAGE;
        ant.target = null;
        break;
      }
      const d = dist(ant.x, ant.y, enemy.x, enemy.y);
      if (d < 10) {
        const dmgMod = ant.type === TYPE.SOLDIER ? getUpgradeEffect('soldierStrength') : 1;
        const dmg = (ant.type === TYPE.SOLDIER ? 3 : 1.5) * dmgMod;
        enemy.hp -= dmg * gameSpeedMult();
        ant.hp -= (ant.type === TYPE.SOLDIER ? 0.8 : 1.5) * gameSpeedMult();
        // Jitter during combat
        ant.x += (Math.random() - 0.5) * 2;
        ant.y += (Math.random() - 0.5) * 2;
        if (enemy.hp <= 0) {
          G.enemyColony.ants.splice(G.enemyColony.ants.indexOf(enemy), 1);
          G.kills++;
          G.food += 2;
          ant.state = ant.type === TYPE.SOLDIER ? STATE.PATROL : STATE.FORAGE;
          ant.target = null;
        }
      } else {
        moveToward(ant, enemy.x, enemy.y, ant.speed * 1.2);
      }
      break;
    }

    case STATE.NURSE_DUTY: {
      if (!inNest) {
        moveToward(ant, G.nestX, G.nestY, ant.speed * 0.7);
      } else {
        // Tend larvae - move between larvae positions
        const larvaIdx = Math.floor(ant.timer * 0.005) % Math.max(1, G.larvae.length);
        const lx = G.nestX + (larvaIdx % 5 - 2) * 12;
        const ly = G.nestY + Math.floor(larvaIdx / 5) * 10 + 5;
        if (dist(ant.x, ant.y, lx, ly) > 15) {
          moveToward(ant, lx, ly, ant.speed * 0.5);
        } else {
          wander(ant, 0.2);
          applyVelocity(ant);
        }
      }
      break;
    }

    case STATE.DIG: {
      const site = ant.target;
      if (!site || site.progress >= 1) {
        ant.state = STATE.FORAGE;
        ant.target = null;
        break;
      }
      const d = dist(ant.x, ant.y, site.x, site.y);
      if (d < 15) {
        const digSpeedMod = getUpgradeEffect('tunnelSpeed');
        site.progress += 0.0008 * digSpeedMod * gameSpeedMult();
        // Digging jitter
        ant.x += (Math.random() - 0.5) * 1;
        ant.y += (Math.random() - 0.5) * 1;
        if (site.progress >= 1) {
          G.tunnels.push({
            x: site.x - site.w / 2,
            y: site.y - site.h / 2,
            w: site.w,
            h: site.h,
            type: site.type
          });
          G.tunnelsDug++;
          G.digSites = G.digSites.filter(ds => ds !== site);
          ant.state = STATE.FORAGE;
          ant.target = null;
        }
      } else {
        moveToward(ant, site.x, site.y, ant.speed * speedMod * 0.8);
      }
      break;
    }

    case STATE.RETURN: {
      moveToward(ant, G.nestX, G.nestY, ant.speed * speedMod * 0.9);
      if (inNest) {
        ant.state = ant.type === TYPE.WORKER ? STATE.FORAGE :
                    ant.type === TYPE.SOLDIER ? STATE.PATROL : STATE.NURSE_DUTY;
      }
      break;
    }

    case STATE.WANDER:
    default: {
      wander(ant, 0.5);
      applyVelocity(ant);
      break;
    }
  }

  ant.x = Math.max(2, Math.min(W() - 2, ant.x));
  ant.y = Math.max(2, Math.min(H() - 2, ant.y));

  // Old age death
  if (ant.age > 20000 && ant.type !== TYPE.QUEEN) ant.hp = 0;
}

function updateEnemyAnt(ant) {
  // Separation from other enemies
  if (ant.timer % 4 === 0) {
    separation(ant, G.enemyColony.ants, 10);
  }

  if (ant.state === STATE.PATROL || ant.state === STATE.WANDER) {
    const target = G.ants.find(a => !a.isEnemy && dist(a.x, a.y, ant.x, ant.y) < 50 && a.type !== TYPE.QUEEN);
    if (target) {
      ant.target = target;
      ant.state = STATE.FIGHT;
    } else if (Math.random() < 0.005) {
      moveToward(ant, G.nestX, G.nestY, ant.speed * 0.6);
    } else {
      wander(ant, 0.4);
      applyVelocity(ant);
    }
    if (dist(ant.x, ant.y, G.queenX, G.queenY) < 15) {
      G.queenHP -= 0.3 * gameSpeedMult();
    }
  } else if (ant.state === STATE.FIGHT) {
    const target = ant.target;
    if (!target || target.hp <= 0 || !G.ants.includes(target)) {
      ant.state = STATE.PATROL;
      ant.target = null;
    } else {
      const d = dist(ant.x, ant.y, target.x, target.y);
      if (d < 10) {
        target.hp -= (ant.type === TYPE.ENEMY_SOLDIER ? 2.5 : 1.2) * gameSpeedMult();
        ant.hp -= 1.0 * gameSpeedMult();
        ant.x += (Math.random() - 0.5) * 1.5;
        ant.y += (Math.random() - 0.5) * 1.5;
      } else {
        moveToward(ant, target.x, target.y, ant.speed * 1.0);
      }
    }
  }

  ant.x = Math.max(2, Math.min(W() - 2, ant.x));
  ant.y = Math.max(2, Math.min(H() - 2, ant.y));
}
