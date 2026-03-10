import { TYPE, STATE, SEASONS, SEASON_COLORS, PW, PH } from './constants.js';
import { G, ctx, W, H, surfaceY, view, showPheromones, camera, tick, minimapCtx } from './state.js';
import { updateAndDrawParticles, spawnParticle, burstParticles } from './particles.js';
import {
  getAntSprite, getFoodCarrySprite, getSoilTile, getTunnelTile,
  getGrassTile, getFoodSprite, getNestSprite, getEnemyNestSprite,
  getGemSprite, getMushroomSprite, getEggSprite, getLarvaSprite,
  TILE_SIZE
} from './sprites.js';

export { updateAndDrawParticles, spawnParticle, burstParticles };

// Pixel scale for crisp retro look
const PX = 3;

function drawSprite(sprite, x, y, scale, flipH) {
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.translate(Math.floor(x), Math.floor(y));
  if (flipH) ctx.scale(-1, 1);
  ctx.drawImage(sprite, -Math.floor(sprite.width * scale / 2), -Math.floor(sprite.height * scale / 2),
    Math.floor(sprite.width * scale), Math.floor(sprite.height * scale));
  ctx.restore();
}

// ─── BACKGROUND ────────────────────────────────────────────
export function drawBackground() {
  const sY = surfaceY();
  const season = SEASONS[G.seasonIdx];
  const sc = SEASON_COLORS[season];
  const tod = G.dayTimer / 1200;
  const nightFactor = tod < 0.25 ? tod * 4 : tod > 0.75 ? (1 - tod) * 4 : 1;

  if (view === 'surface') {
    // Sky gradient
    const skyBase = nightFactor < 0.4 ? '#0e1030' : (season === 'AUTUMN' ? '#dd8855' : season === 'WINTER' ? '#8899bb' : '#55aaee');
    const skyTop = nightFactor < 0.4 ? '#060818' : (season === 'AUTUMN' ? '#cc6633' : season === 'WINTER' ? '#667799' : '#3388cc');
    const skyGrad = ctx.createLinearGradient(0, 0, 0, sY);
    skyGrad.addColorStop(0, skyTop);
    skyGrad.addColorStop(1, skyBase);
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, W(), sY);

    // Stars at night
    if (nightFactor < 0.4) {
      const starAlpha = (0.4 - nightFactor) * 2.5;
      ctx.fillStyle = `rgba(255,255,220,${starAlpha})`;
      for (let s = 0; s < 60; s++) {
        const sx = (s * 137.508 % 1) * W();
        const sy = (s * 97.31 % 1) * sY * 0.85;
        const twinkle = Math.sin(tick * 0.03 + s * 7) * 0.5 + 0.5;
        ctx.globalAlpha = starAlpha * twinkle;
        ctx.fillRect(Math.floor(sx), Math.floor(sy), PX, PX);
      }
      ctx.globalAlpha = 1;
    }

    // Pixel sun/moon
    if (nightFactor > 0.2) {
      const sunX = tod * W();
      const sunY = sY * 0.25 - Math.sin(tod * Math.PI) * sY * 0.4;
      const isSun = tod > 0.15 && tod < 0.85;
      if (isSun) {
        const ss = 6 * PX;
        ctx.fillStyle = '#ffee44';
        ctx.fillRect(Math.floor(sunX - ss / 2), Math.floor(sunY - ss / 2), ss, ss);
        ctx.fillStyle = '#ffffaa';
        ctx.fillRect(Math.floor(sunX - ss / 4), Math.floor(sunY - ss / 4), ss / 2, ss / 2);
        // Rays
        ctx.fillStyle = '#ffdd22';
        for (let r = 0; r < 4; r++) {
          const ra = (r / 4) * Math.PI * 2 + tick * 0.008;
          ctx.fillRect(Math.floor(sunX + Math.cos(ra) * (ss / 2 + 2)), Math.floor(sunY + Math.sin(ra) * (ss / 2 + 2)), PX * 2, PX * 2);
          const ra2 = ra + Math.PI / 4;
          ctx.fillRect(Math.floor(sunX + Math.cos(ra2) * (ss / 2 + 4)), Math.floor(sunY + Math.sin(ra2) * (ss / 2 + 4)), PX, PX);
        }
        // Happy face
        ctx.fillStyle = '#cc8800';
        ctx.fillRect(Math.floor(sunX - PX * 1.5), Math.floor(sunY - PX), PX, PX);
        ctx.fillRect(Math.floor(sunX + PX * 0.5), Math.floor(sunY - PX), PX, PX);
        ctx.fillRect(Math.floor(sunX - PX * 2), Math.floor(sunY + PX), PX, PX);
        ctx.fillRect(Math.floor(sunX - PX), Math.floor(sunY + PX * 1.5), PX * 2, PX);
        ctx.fillRect(Math.floor(sunX + PX), Math.floor(sunY + PX), PX, PX);
      } else {
        const ms = 5 * PX;
        ctx.fillStyle = '#eeeeff';
        ctx.fillRect(Math.floor(sunX - ms / 2), Math.floor(sunY - ms / 2), ms, ms);
        ctx.fillStyle = '#0e1030';
        ctx.fillRect(Math.floor(sunX), Math.floor(sunY - ms / 2), ms / 2, ms);
      }
    }

    // Pixel clouds
    if (nightFactor > 0.3) {
      ctx.fillStyle = `rgba(255,255,255,${nightFactor * 0.5})`;
      for (let c = 0; c < 5; c++) {
        const cx = Math.floor(((c * 200 + tick * 0.08) % (W() + 120)) - 60);
        const cy = Math.floor(sY * 0.12 + c * 22);
        const cw = 12 + c * 3;
        ctx.fillRect(cx, cy, cw * PX, 3 * PX);
        ctx.fillRect(cx + 2 * PX, cy - 2 * PX, (cw - 4) * PX, 2 * PX);
        ctx.fillRect(cx + PX, cy + 3 * PX, (cw - 2) * PX, PX);
      }
    }

    // Grass tile strip
    const grassTileW = TILE_SIZE * PX;
    for (let x = 0; x < W(); x += grassTileW) {
      const variant = Math.floor(x / grassTileW) % 8;
      const tile = getGrassTile(variant, season);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(tile, x, sY - grassTileW / 2, grassTileW, grassTileW);
    }

    // Pixel grass blades
    for (let g = 0; g < W(); g += PX * 4) {
      const h = (3 + Math.floor(Math.sin(g * 0.2) * 2)) * PX;
      const sway = Math.floor(Math.sin(tick * 0.015 + g * 0.08) * PX);
      ctx.fillStyle = sc.grass2;
      ctx.fillRect(g + sway, sY - h - PX * 2, PX, h);
      ctx.fillStyle = sc.grass1;
      ctx.fillRect(g + PX + sway, sY - h + PX - PX * 2, PX, h - PX);
    }

    // Flowers
    if (season === 'SPRING' || season === 'SUMMER') {
      const flowerColors = ['#ff6699', '#ffdd44', '#ff8844', '#bb66ff', '#44ddff'];
      for (let f = 0; f < 10; f++) {
        const fx = Math.floor((f * 137.5 % 1) * W());
        const fy = Math.floor(sY - PX * 6 - Math.sin(f * 2.3) * PX * 3);
        const fc = flowerColors[f % flowerColors.length];
        ctx.fillStyle = '#33aa22';
        ctx.fillRect(fx, fy + PX * 2, PX, PX * 4);
        ctx.fillStyle = fc;
        ctx.fillRect(fx, fy, PX, PX);
        ctx.fillRect(fx - PX, fy + PX, PX, PX);
        ctx.fillRect(fx + PX, fy + PX, PX, PX);
        ctx.fillRect(fx, fy + PX * 2, PX, PX);
        ctx.fillStyle = '#ffff88';
        ctx.fillRect(fx, fy + PX, PX, PX);
      }
    }

    // Butterflies
    if (season === 'SPRING' || season === 'SUMMER') {
      const bColors = ['#ff66aa', '#ffaa44', '#44ccff', '#aa66ff'];
      for (let b = 0; b < 4; b++) {
        const bx = Math.floor(((b * 200 + tick * 0.4 + Math.sin(tick * 0.012 + b * 2) * 60) % (W() + 40)) - 20);
        const by = Math.floor(sY * 0.35 + Math.sin(tick * 0.025 + b * 3) * sY * 0.12);
        const wingOpen = Math.sin(tick * 0.12 + b * 2) > 0;
        ctx.fillStyle = bColors[b % bColors.length];
        if (wingOpen) {
          ctx.fillRect(bx - PX * 2, by, PX * 2, PX);
          ctx.fillRect(bx + PX, by, PX * 2, PX);
        } else {
          ctx.fillRect(bx - PX, by - PX, PX, PX * 2);
          ctx.fillRect(bx + PX, by - PX, PX, PX * 2);
        }
        ctx.fillStyle = '#333';
        ctx.fillRect(bx, by, PX, PX);
      }
    }

    // Falling leaves
    if (season === 'AUTUMN') {
      ctx.fillStyle = '#cc7722';
      for (let l = 0; l < 12; l++) {
        const lx = Math.floor(((l * 173 + tick * 0.25) % W()));
        const ly = Math.floor(((l * 97 + tick * 0.6) % (sY - 20)) + 10);
        ctx.fillRect(lx, ly, PX * 2, PX);
        ctx.fillRect(lx + PX, ly + PX, PX, PX);
      }
    }

    // Snow
    if (season === 'WINTER') {
      ctx.fillStyle = '#ffffff';
      for (let s = 0; s < 50; s++) {
        const sx = Math.floor(((s * 137 + tick * 0.15 + Math.sin(s + tick * 0.008) * 15) % W()));
        const sy = Math.floor(((s * 97 + tick * 0.7) % sY));
        ctx.fillRect(sx, sy, PX, PX);
      }
      ctx.fillStyle = 'rgba(230,240,255,0.5)';
      ctx.fillRect(0, sY - PX * 2, W(), PX * 3);
    }

    // Ladybugs
    for (let lb = 0; lb < 3; lb++) {
      const lbx = Math.floor(((lb * 230 + tick * 0.12) % W()));
      const lby = Math.floor(sY - PX * 3);
      ctx.fillStyle = '#ee3333';
      ctx.fillRect(lbx, lby, PX * 3, PX * 2);
      ctx.fillStyle = '#222';
      ctx.fillRect(lbx + PX * 3, lby, PX, PX * 2);
      ctx.fillStyle = '#111';
      ctx.fillRect(lbx + PX, lby, PX, PX);
    }
  }

  // Underground soil tiles
  const startY = view === 'surface' ? sY : 0;
  const tileW = TILE_SIZE * PX;
  for (let y = startY; y < H(); y += tileW) {
    for (let x = 0; x < W(); x += tileW) {
      const variant = ((Math.floor(x / tileW) * 7 + Math.floor(y / tileW) * 13) % 3);
      const tile = getSoilTile(variant);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(tile, x, y, tileW, tileW);
    }
  }

  // Underground gems
  const gemColors = ['#44ddff', '#ff44bb', '#44ff88', '#ffaa44', '#bb88ff', '#ff6666'];
  for (let g = 0; g < 12; g++) {
    const gx = Math.floor((g * 137.5 + 0.3) % 1 * W());
    const gy = Math.floor(startY + 40 + (g * 91.3 + 0.2) % 1 * (H() - startY - 50));
    const shimmer = Math.sin(tick * 0.04 + g * 2) > 0.3;
    if (shimmer) {
      const gem = getGemSprite(gemColors[g % gemColors.length]);
      drawSprite(gem, gx, gy, PX * 0.8, false);
    }
  }

  // Underground mushrooms
  const mushColors = ['#44ffaa', '#8866ff', '#ff88cc', '#88ffff'];
  for (let m = 0; m < 6; m++) {
    const mx = Math.floor((m * 173 + 0.15) % 1 * W());
    const my = Math.floor(startY + 60 + (m * 97 + 0.4) % 1 * (H() - startY - 70));
    const glow = Math.sin(tick * 0.02 + m * 1.5) * 0.3 + 0.7;
    ctx.globalAlpha = glow;
    const mush = getMushroomSprite(mushColors[m % mushColors.length]);
    drawSprite(mush, mx, my, PX * 0.7, false);
    ctx.globalAlpha = 1;
  }

  // Underground worms
  for (let w = 0; w < 3; w++) {
    const wx = Math.floor((w * 173 + 0.6) % 1 * W());
    const wy = Math.floor(startY + 80 + (w * 137 + 0.3) % 1 * (H() - startY - 100));
    const wiggle = Math.sin(tick * 0.04 + w * 3);
    ctx.fillStyle = '#dd8899';
    for (let s = 0; s < 5; s++) {
      ctx.fillRect(
        Math.floor(wx + s * PX * 1.5 + Math.sin(tick * 0.03 + w + s * 0.8) * PX),
        Math.floor(wy + wiggle * PX + Math.cos(s + tick * 0.02) * PX),
        PX, PX);
    }
    ctx.fillStyle = '#222';
    ctx.fillRect(Math.floor(wx + PX * 0.5), Math.floor(wy - PX * 0.5 + wiggle * PX), PX, PX);
  }
}

// ─── TUNNELS ───────────────────────────────────────────────
export function drawTunnels() {
  const tileW = TILE_SIZE * PX;

  for (const t of G.tunnels) {
    for (let y = t.y; y < t.y + t.h; y += tileW) {
      for (let x = t.x; x < t.x + t.w; x += tileW) {
        const variant = ((Math.floor(x / tileW) + Math.floor(y / tileW)) % 3);
        const tile = getTunnelTile(variant);
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(tile, x, y, Math.min(tileW, t.x + t.w - x), Math.min(tileW, t.y + t.h - y));
      }
    }

    if (t.type === 'storage' || t.type === 'nursery' || t.type === 'chamber') {
      ctx.fillStyle = t.type === 'storage' ? 'rgba(255,200,50,0.4)' :
                      t.type === 'nursery' ? 'rgba(140,120,200,0.4)' : 'rgba(200,160,80,0.3)';
      ctx.beginPath();
      ctx.ellipse(t.x + t.w / 2, t.y + t.h / 2, t.w / 2, t.h / 2, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = t.type === 'storage' ? 'rgba(255,200,50,0.3)' :
                        t.type === 'nursery' ? 'rgba(140,120,200,0.3)' : 'rgba(200,160,80,0.2)';
      ctx.lineWidth = PX;
      ctx.stroke();

      ctx.fillStyle = t.type === 'storage' ? '#ffcc44' : t.type === 'nursery' ? '#aa88dd' : '#ccaa66';
      ctx.font = `bold ${PX * 3}px monospace`;
      ctx.textAlign = 'center';
      ctx.fillText(t.type === 'storage' ? 'FOOD' : t.type === 'nursery' ? 'NURSERY' : 'CHAMBER', t.x + t.w / 2, t.y + t.h / 2 - PX);

      if (t.type === 'storage') {
        const foodLevel = Math.min(6, Math.floor(G.food / 30));
        ctx.fillStyle = '#ffdd44';
        for (let d = 0; d < foodLevel; d++) {
          ctx.fillRect(t.x + t.w / 2 - foodLevel * PX + d * PX * 2, t.y + t.h / 2 + PX * 2, PX * 1.5, PX * 1.5);
        }
      }
      ctx.textAlign = 'start';
    }
  }

  // Dig sites
  for (const ds of G.digSites) {
    ctx.save();
    ctx.strokeStyle = `rgba(255,179,71,${0.4 + Math.sin(tick * 0.06) * 0.2})`;
    ctx.lineWidth = PX;
    ctx.setLineDash([PX * 2, PX * 2]);
    ctx.beginPath();
    ctx.ellipse(ds.x, ds.y, ds.w / 2, ds.h / 2, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    if (ds.progress > 0.05) {
      ctx.globalAlpha = ds.progress;
      ctx.fillStyle = 'rgba(60,35,15,0.8)';
      ctx.beginPath();
      ctx.ellipse(ds.x, ds.y, ds.w / 2 * ds.progress, ds.h / 2 * ds.progress, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    ctx.fillStyle = '#ffcc44';
    ctx.font = `bold ${PX * 3}px monospace`;
    ctx.textAlign = 'center';
    ctx.fillText(`${Math.floor(ds.progress * 100)}%`, ds.x, ds.y + PX * 2);
    ctx.textAlign = 'start';
    ctx.restore();
  }
}

// ─── PHEROMONES ────────────────────────────────────────────
export function drawPheromones() {
  if (!showPheromones) return;
  const cellW = W() / PW, cellH = H() / PH;
  for (let gy = 0; gy < PH; gy++) {
    for (let gx = 0; gx < PW; gx++) {
      const fi = G.pherGrid[gy * PW + gx];
      const hi = G.homGrid[gy * PW + gx];
      if (fi > 0.05) {
        ctx.fillStyle = `rgba(100,255,100,${fi * 0.4})`;
        ctx.fillRect(Math.floor(gx * cellW), Math.floor(gy * cellH), Math.ceil(cellW), Math.ceil(cellH));
      }
      if (hi > 0.05) {
        ctx.fillStyle = `rgba(100,160,255,${hi * 0.3})`;
        ctx.fillRect(Math.floor(gx * cellW), Math.floor(gy * cellH), Math.ceil(cellW), Math.ceil(cellH));
      }
    }
  }
}

// ─── FOOD ITEMS ────────────────────────────────────────────
export function drawFoodItems() {
  for (const f of G.foodItems) {
    if (view === 'underground' && f.y > surfaceY()) continue;
    if (view === 'surface' && f.y < 0) continue;
    const sprite = getFoodSprite(f.type);
    drawSprite(sprite, f.x, f.y, PX * 0.8, false);
    ctx.fillStyle = f.type === 'fruit' ? 'rgba(255,80,80,0.15)' :
                    f.type === 'insect' ? 'rgba(80,255,80,0.15)' : 'rgba(255,200,80,0.15)';
    ctx.fillRect(Math.floor(f.x - PX * 2), Math.floor(f.y + PX * 2), PX * 5, PX);
  }
}

// ─── NEST ──────────────────────────────────────────────────
export function drawNest() {
  if (view === 'surface') {
    const nest = getNestSprite();
    drawSprite(nest, G.nestX, surfaceY() - PX * 2, PX * 1.5, false);
  }

  // Queen chamber glow
  const glowPulse = Math.sin(tick * 0.02) * 0.08 + 0.15;
  ctx.fillStyle = `rgba(255,200,50,${glowPulse})`;
  const gr = 30 + Math.sin(tick * 0.01) * 5;
  for (let dy = -gr; dy <= gr; dy += PX * 2) {
    for (let dx = -gr; dx <= gr; dx += PX * 2) {
      if (dx * dx + dy * dy < gr * gr) {
        const d = Math.sqrt(dx * dx + dy * dy);
        ctx.globalAlpha = glowPulse * (1 - d / gr);
        ctx.fillRect(Math.floor(G.queenX + dx), Math.floor(G.queenY + dy), PX * 2, PX * 2);
      }
    }
  }
  ctx.globalAlpha = 1;
}

// ─── ENEMY NEST ────────────────────────────────────────────
export function drawEnemy() {
  const ec = G.enemyColony;
  const enemy = getEnemyNestSprite();
  drawSprite(enemy, ec.x, ec.y, PX * 1.2, false);
  const pulse = Math.sin(tick * 0.03) * 0.15 + 0.2;
  ctx.fillStyle = `rgba(200,30,0,${pulse})`;
  ctx.fillRect(Math.floor(ec.x - PX * 4), Math.floor(ec.y - PX * 3), PX * 8, PX * 6);
}

// ─── ANT DRAWING ───────────────────────────────────────────
export function drawAnt(ant) {
  const sY = surfaceY();
  if (view === 'surface' && ant.y > sY + 20) return;
  if (view === 'underground' && ant.y < sY - 10) return;

  const frame = Math.floor(ant.timer * 0.15);
  const sprite = getAntSprite(ant.type, ant.isEnemy, frame);
  const flipH = ant.vx < 0;
  const scale = ant.type === TYPE.QUEEN ? PX * 1.1 : PX * 0.75;

  ctx.save();
  ctx.imageSmoothingEnabled = false;

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.fillRect(Math.floor(ant.x - scale * 3), Math.floor(ant.y + scale * 3), Math.floor(scale * 7), PX);

  drawSprite(sprite, ant.x, ant.y, scale, flipH);

  // Carrying food
  if (ant.carryFood > 0) {
    const carry = getFoodCarrySprite();
    drawSprite(carry, ant.x, ant.y - scale * 4, scale * 0.7, false);
  }

  // Fight sparkle
  if (ant.state === STATE.FIGHT && Math.random() < 0.2) {
    spawnParticle(ant.x, ant.y, 'fight');
  }
  // Dig dirt
  if (ant.state === STATE.DIG && Math.random() < 0.15) {
    spawnParticle(ant.x, ant.y, 'dirt');
  }
  // Happy sparkle
  if (ant.carryFood > 0 && Math.random() < 0.04) {
    spawnParticle(ant.x, ant.y - scale * 3, 'sparkle');
  }

  // HP bar
  if (ant.hp < ant.maxHp * 0.8) {
    const bw = PX * 8;
    const bx = Math.floor(ant.x - bw / 2);
    const by = Math.floor(ant.y - scale * 5);
    ctx.fillStyle = '#333';
    ctx.fillRect(bx, by, bw, PX);
    ctx.fillStyle = ant.hp > ant.maxHp * 0.5 ? '#44ee44' : '#ee4444';
    ctx.fillRect(bx, by, Math.floor(bw * (ant.hp / ant.maxHp)), PX);
  }

  ctx.restore();
}

// ─── LARVAE & EGGS ─────────────────────────────────────────
export function drawLarvae() {
  for (let i = 0; i < G.larvae.length; i++) {
    const l = G.larvae[i];
    const lx = Math.floor(G.nestX + (i % 5 - 2) * PX * 6);
    const ly = Math.floor(G.nestY + Math.floor(i / 5) * PX * 5 + PX * 3);
    if (view === 'surface' && ly > surfaceY()) continue;
    const sprite = getLarvaSprite(l.progress);
    drawSprite(sprite, lx, ly, PX * 0.7, false);
    if (l.progress > 0.1) {
      ctx.strokeStyle = `rgba(255,200,50,${l.progress * 0.7})`;
      ctx.lineWidth = PX;
      ctx.beginPath();
      ctx.arc(lx, ly, PX * 4, -Math.PI / 2, -Math.PI / 2 + l.progress * Math.PI * 2);
      ctx.stroke();
    }
  }

  for (let i = 0; i < G.eggs; i++) {
    const ex = Math.floor(G.nestX - PX * 8 + (i % 4) * PX * 4);
    const ey = Math.floor(G.nestY - PX * 5 + Math.floor(i / 4) * PX * 4);
    if (view === 'surface' && ey > surfaceY()) continue;
    const egg = getEggSprite();
    drawSprite(egg, ex, ey, PX * 0.6, false);
  }
}

export function drawQueen() {
  if (view === 'surface' && G.queenY > surfaceY()) return;
  drawAnt({
    type: TYPE.QUEEN, x: G.queenX, y: G.queenY,
    vx: G.queenVX || 0.3, vy: G.queenVY || 0,
    state: G.queenState || STATE.IDLE,
    hp: G.queenHP, maxHp: 100, carryFood: 0,
    timer: tick, isEnemy: false, speed: 0.5
  });
  // Crown glow
  ctx.fillStyle = 'rgba(255,215,0,0.15)';
  ctx.fillRect(Math.floor(G.queenX - PX * 2), Math.floor(G.queenY - PX * 8), PX * 5, PX * 2);
}

// ─── MINIMAP ───────────────────────────────────────────────
export function drawMinimap() {
  const mc = minimapCtx;
  const mw = 100, mh = 60;
  const sx = mw / W(), sy = mh / H();
  mc.imageSmoothingEnabled = false;
  mc.fillStyle = '#150a04';
  mc.fillRect(0, 0, mw, mh);
  mc.fillStyle = '#2d6e1a';
  mc.fillRect(0, 0, mw, Math.floor(surfaceY() * sy));
  mc.fillStyle = '#5a3818';
  for (const t of G.tunnels) {
    mc.fillRect(Math.floor(t.x * sx), Math.floor(t.y * sy), Math.max(2, Math.floor(t.w * sx)), Math.max(1, Math.floor(t.h * sy)));
  }
  mc.fillStyle = '#ffd700';
  mc.fillRect(Math.floor(G.nestX * sx) - 2, Math.floor(G.nestY * sy) - 1, 4, 3);
  mc.fillStyle = '#ff3322';
  mc.fillRect(Math.floor(G.enemyColony.x * sx) - 1, Math.floor(G.enemyColony.y * sy) - 1, 3, 2);
  mc.fillStyle = '#66dd44';
  for (const ant of G.ants) {
    mc.fillRect(Math.floor(ant.x * sx), Math.floor(ant.y * sy), 2, 2);
  }
  mc.fillStyle = '#ff4433';
  for (const ant of G.enemyColony.ants) {
    mc.fillRect(Math.floor(ant.x * sx), Math.floor(ant.y * sy), 2, 2);
  }
  mc.fillStyle = '#ffdd44';
  for (const f of G.foodItems) {
    mc.fillRect(Math.floor(f.x * sx), Math.floor(f.y * sy), 2, 2);
  }
}
