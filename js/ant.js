import { TYPE, STATE } from './constants.js';
import { G, W, H, surfaceY, gameSpeed, getUpgradeEffect } from './state.js';
import { depositPher, getPher } from './pheromones.js';

// ─── HELPERS ───────────────────────────────────────────────
export function dist(x1, y1, x2, y2) {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

export function gameSpeedMult() {
  return gameSpeed * 0.6;
}

function moveToward(ant, tx, ty, spd) {
  const dx = tx - ant.x, dy = ty - ant.y;
  const d = Math.sqrt(dx * dx + dy * dy) || 1;
  ant.vx = ant.vx * 0.7 + (dx / d) * spd * 0.3;
  ant.vy = ant.vy * 0.7 + (dy / d) * spd * 0.3;
  ant.x += ant.vx;
  ant.y += ant.vy;
}

function wander(ant, str) {
  ant.vx += (Math.random() - 0.5) * str * gameSpeedMult();
  ant.vy += (Math.random() - 0.5) * str * gameSpeedMult();
  ant.vx *= 0.9;
  ant.vy *= 0.9;
  const sp = Math.sqrt(ant.vx * ant.vx + ant.vy * ant.vy);
  if (sp > ant.speed * 1.5) {
    ant.vx *= ant.speed * 1.5 / sp;
    ant.vy *= ant.speed * 1.5 / sp;
  }
  ant.x += ant.vx * gameSpeedMult();
  ant.y += ant.vy * gameSpeedMult();
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
    vx: (Math.random() - 0.5) * 1.2,
    vy: (Math.random() - 0.5) * 1.2,
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
    speed: type === TYPE.SOLDIER ? 1.3 : type === TYPE.NURSE ? 0.8 : 1.0,
    pherDeposit: 0,
    patrolSurface: false
  };
  if (isEnemy) {
    G.enemyColony.ants.push(ant);
  } else {
    G.ants.push(ant);
  }
  G.born++;
  return ant;
}

// ─── UPDATE ANT ────────────────────────────────────────────
export function updateAnt(ant) {
  ant.age++;
  ant.timer++;

  if (ant.isEnemy) { updateEnemyAnt(ant); return; }

  const sY = surfaceY();
  const homeRange = 35;
  const inNest = dist(ant.x, ant.y, G.nestX, G.nestY) < homeRange;

  // Apply upgrade: worker speed
  const speedMod = ant.type === TYPE.WORKER ? getUpgradeEffect('workerSpeed') : 1;

  switch (ant.state) {
    case STATE.FORAGE: {
      if (G.surfacePenalty > 0) { ant.state = STATE.RETURN; break; }

      // Check for dig sites first
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
      } else if (food) {
        const fp = getPher(G.pherGrid, ant.x, ant.y);
        if (fp > 0.1) {
          moveToward(ant, food.x, food.y, ant.speed * speedMod * gameSpeedMult());
        } else {
          moveToward(ant, food.x, food.y, ant.speed * speedMod * 0.7 * gameSpeedMult());
          wander(ant, 0.3);
        }
        depositPher(G.homGrid, ant.x, ant.y, 0.05);
      } else {
        if (ant.y > sY - 5) ant.vy -= 0.3;
        wander(ant, 1.0);
        ant.y = Math.min(sY - 2, Math.max(2, ant.y));
      }
      if (ant.timer % 800 === 0 && Math.random() < 0.3) ant.state = STATE.RETURN;
      break;
    }

    case STATE.CARRY: {
      depositPher(G.pherGrid, ant.x, ant.y, 0.15);
      moveToward(ant, G.nestX, G.nestY, ant.speed * speedMod * 1.1 * gameSpeedMult());
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
        const angle = ant.timer * 0.02;
        const r = 50 + Math.sin(ant.timer * 0.01) * 20;
        const tx = G.nestX + Math.cos(angle + ant.id * 10) * r;
        const ty = G.nestY + Math.sin(angle + ant.id * 10) * r * 0.5;
        moveToward(ant, tx, ty, ant.speed * 0.9 * gameSpeedMult());
        if (ant.timer % 300 === 0) ant.patrolSurface = !ant.patrolSurface;
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
        if (enemy.hp <= 0) {
          G.enemyColony.ants.splice(G.enemyColony.ants.indexOf(enemy), 1);
          G.kills++;
          G.food += 2;
          ant.state = ant.type === TYPE.SOLDIER ? STATE.PATROL : STATE.FORAGE;
          ant.target = null;
        }
      } else {
        moveToward(ant, enemy.x, enemy.y, ant.speed * 1.4 * gameSpeedMult());
      }
      break;
    }

    case STATE.NURSE_DUTY: {
      if (!inNest) moveToward(ant, G.nestX, G.nestY, ant.speed * gameSpeedMult());
      else wander(ant, 0.3);
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
        site.progress += 0.001 * digSpeedMod * gameSpeedMult();
        if (site.progress >= 1) {
          // Dig complete - add tunnel
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
        moveToward(ant, site.x, site.y, ant.speed * speedMod * gameSpeedMult());
      }
      break;
    }

    case STATE.RETURN: {
      moveToward(ant, G.nestX, G.nestY, ant.speed * speedMod * 1.2 * gameSpeedMult());
      if (inNest) {
        ant.state = ant.type === TYPE.WORKER ? STATE.FORAGE :
                    ant.type === TYPE.SOLDIER ? STATE.PATROL : STATE.NURSE_DUTY;
      }
      break;
    }

    case STATE.WANDER:
    default: {
      wander(ant, 0.8);
      break;
    }
  }

  ant.x = Math.max(2, Math.min(W() - 2, ant.x));
  ant.y = Math.max(2, Math.min(H() - 2, ant.y));

  // Old age death
  if (ant.age > 18000 && ant.type !== TYPE.QUEEN) ant.hp = 0;
}

function updateEnemyAnt(ant) {
  if (ant.state === STATE.PATROL || ant.state === STATE.WANDER) {
    const target = G.ants.find(a => !a.isEnemy && dist(a.x, a.y, ant.x, ant.y) < 50 && a.type !== TYPE.QUEEN);
    if (target) {
      ant.target = target;
      ant.state = STATE.FIGHT;
    } else if (Math.random() < 0.005) {
      moveToward(ant, G.nestX, G.nestY, ant.speed * 0.8 * gameSpeedMult());
    } else {
      wander(ant, 0.6);
    }
    if (dist(ant.x, ant.y, G.queenX, G.queenY) < 15) {
      G.queenHP -= 0.5 * gameSpeedMult();
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
      } else {
        moveToward(ant, target.x, target.y, ant.speed * 1.3 * gameSpeedMult());
      }
    }
  }

  ant.x = Math.max(2, Math.min(W() - 2, ant.x));
  ant.y = Math.max(2, Math.min(H() - 2, ant.y));
}
