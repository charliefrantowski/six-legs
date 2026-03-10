import { TYPE, STATE, SEASONS, SEASON_COLORS, PW, PH } from './constants.js';
import { G, ctx, W, H, surfaceY, view, showPheromones, camera, tick, minimapCtx } from './state.js';
import { updateAndDrawParticles, spawnParticle, burstParticles } from './particles.js';

// Re-export particle functions for use from main
export { updateAndDrawParticles, spawnParticle, burstParticles };

// ─── COLOR BLEND ───────────────────────────────────────────
function blendColor(c1, c2, t) {
  const r1 = parseInt(c1.slice(1, 3), 16), g1 = parseInt(c1.slice(3, 5), 16), b1 = parseInt(c1.slice(5, 7), 16);
  const r2 = parseInt(c2.slice(1, 3), 16), g2 = parseInt(c2.slice(3, 5), 16), b2 = parseInt(c2.slice(5, 7), 16);
  return `rgb(${Math.round(r1 * t + r2 * (1 - t))},${Math.round(g1 * t + g2 * (1 - t))},${Math.round(b1 * t + b2 * (1 - t))})`;
}

// ─── BACKGROUND ────────────────────────────────────────────
export function drawBackground() {
  const sY = surfaceY();
  const season = SEASONS[G.seasonIdx];
  const sc = SEASON_COLORS[season];
  const tod = G.dayTimer / 1200;
  const nightFactor = tod < 0.25 ? tod * 4 : tod > 0.75 ? (1 - tod) * 4 : 1;
  const skyGrad = ctx.createLinearGradient(0, 0, 0, sY);

  if (view === 'surface') {
    const dawnColor = blendColor(sc.sky2, '#0a0a2e', 1 - nightFactor);
    skyGrad.addColorStop(0, tod < 0.1 || tod > 0.9 ? '#050510' : dawnColor);
    skyGrad.addColorStop(1, sc.sky1);
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, W(), sY);

    // Stars
    if (nightFactor < 0.5) {
      ctx.fillStyle = `rgba(255,255,255,${(0.5 - nightFactor) * 2 * 0.8})`;
      for (let s = 0; s < 40; s++) {
        const sx = (s * 137.5 % 1) * W();
        const sy = (s * 97.3 % 1) * sY * 0.8;
        ctx.beginPath();
        ctx.arc(sx, sy, 0.7, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Sun/Moon - with cute happy face!
    if (nightFactor > 0.3) {
      const sunX = tod * W();
      const sunY = sY * 0.3 - Math.sin(tod * Math.PI) * sY * 0.5;
      const isSun = tod > 0.15 && tod < 0.85;
      const sunR = isSun ? 18 : 12;

      ctx.save();
      ctx.shadowBlur = 40;
      ctx.shadowColor = isSun ? '#ffdd44' : '#aaccff';

      // Sun rays
      if (isSun) {
        ctx.strokeStyle = 'rgba(255,220,80,0.3)';
        ctx.lineWidth = 2;
        for (let r = 0; r < 8; r++) {
          const ra = (r / 8) * Math.PI * 2 + tick * 0.005;
          ctx.beginPath();
          ctx.moveTo(sunX + Math.cos(ra) * (sunR + 4), sunY + Math.sin(ra) * (sunR + 4));
          ctx.lineTo(sunX + Math.cos(ra) * (sunR + 12), sunY + Math.sin(ra) * (sunR + 12));
          ctx.stroke();
        }
      }

      ctx.fillStyle = isSun ? '#ffe066' : '#eeeeff';
      ctx.beginPath();
      ctx.arc(sunX, sunY, sunR, 0, Math.PI * 2);
      ctx.fill();

      // Happy face on sun!
      if (isSun) {
        ctx.fillStyle = '#cc9900';
        ctx.beginPath(); ctx.arc(sunX - 5, sunY - 3, 2, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(sunX + 5, sunY - 3, 2, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#cc9900';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(sunX, sunY + 1, 7, 0.1 * Math.PI, 0.9 * Math.PI);
        ctx.stroke();
      }

      ctx.restore();
    }

    // Clouds
    drawClouds(sY, nightFactor);

    // Ground
    const gGrad = ctx.createLinearGradient(0, sY - 8, 0, sY + 20);
    gGrad.addColorStop(0, sc.grass2);
    gGrad.addColorStop(0.4, sc.grass1);
    gGrad.addColorStop(1, '#4a2c18');
    ctx.fillStyle = gGrad;
    ctx.fillRect(0, sY - 8, W(), 28);

    // Flowers and grass
    drawGrassAndFlowers(sY, sc, season);
  }

  // Underground - BRIGHTER and more colorful for kids!
  const startY = view === 'surface' ? sY : 0;
  const soilGrad = ctx.createLinearGradient(0, startY, 0, H());
  soilGrad.addColorStop(0, '#5a3318');   // warmer brown at top
  soilGrad.addColorStop(0.3, '#3d200c');
  soilGrad.addColorStop(0.7, '#2a1508');
  soilGrad.addColorStop(1, '#1a0c04');
  ctx.fillStyle = soilGrad;
  ctx.fillRect(0, startY, W(), H() - startY);

  // Soil texture - richer
  ctx.fillStyle = 'rgba(255,200,100,0.06)';
  for (let i = 0; i < 300; i++) {
    const tx = (i * 173.1 % 1) * W();
    const ty = startY + (i * 97.7 % 1) * (H() - startY);
    ctx.fillRect(tx, ty, 2 + (i % 3), 2);
  }

  // Colorful rocks with highlights
  const rockColors = ['rgba(180,140,100,0.2)', 'rgba(150,160,170,0.15)', 'rgba(140,120,100,0.2)'];
  for (let r = 0; r < 30; r++) {
    const rx = (r * 137.5 % 1) * W();
    const ry = startY + (r * 91.3 % 1) * (H() - startY);
    const rs = 3 + ((r * 71.1 % 1) * 6);
    ctx.fillStyle = rockColors[r % 3];
    ctx.beginPath();
    ctx.ellipse(rx, ry, rs, rs * 0.6, r * 0.5, 0, Math.PI * 2);
    ctx.fill();
    // Highlight
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    ctx.beginPath();
    ctx.ellipse(rx - rs * 0.2, ry - rs * 0.2, rs * 0.4, rs * 0.3, r * 0.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // Sparkling gems underground!
  const gemColors = ['#44ddff', '#ff44aa', '#44ff88', '#ffaa44', '#aa88ff', '#ff6666'];
  for (let g = 0; g < 15; g++) {
    const gx = (g * 137.5 + 0.3) % 1 * W();
    const gy = startY + 30 + (g * 91.3 + 0.2) % 1 * (H() - startY - 40);
    const gs = 2 + (g % 3);
    const gc = gemColors[g % gemColors.length];
    const shimmer = 0.3 + Math.sin(tick * 0.04 + g * 2) * 0.3;

    ctx.save();
    ctx.shadowBlur = 8;
    ctx.shadowColor = gc;
    ctx.globalAlpha = shimmer;
    ctx.fillStyle = gc;

    // Diamond shape
    ctx.beginPath();
    ctx.moveTo(gx, gy - gs);
    ctx.lineTo(gx + gs, gy);
    ctx.lineTo(gx, gy + gs * 0.6);
    ctx.lineTo(gx - gs, gy);
    ctx.closePath();
    ctx.fill();

    // Inner shine
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.beginPath();
    ctx.arc(gx - gs * 0.2, gy - gs * 0.2, gs * 0.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Underground mushrooms (bioluminescent!)
  for (let m = 0; m < 8; m++) {
    const mx = (m * 173 + 0.15) % 1 * W();
    const my = startY + 50 + (m * 97 + 0.4) % 1 * (H() - startY - 60);
    const ms = 4 + (m % 3) * 2;
    const glowColor = m % 2 === 0 ? '#44ffaa' : '#8866ff';
    const glow = 0.2 + Math.sin(tick * 0.02 + m * 1.5) * 0.15;

    ctx.save();
    ctx.globalAlpha = glow + 0.3;

    // Glow
    ctx.shadowBlur = 10;
    ctx.shadowColor = glowColor;

    // Stem
    ctx.fillStyle = 'rgba(200,180,140,0.4)';
    ctx.fillRect(mx - 1, my, 2, ms);

    // Cap
    ctx.fillStyle = glowColor;
    ctx.beginPath();
    ctx.ellipse(mx, my, ms * 0.8, ms * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Spots on cap
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.beginPath();
    ctx.arc(mx - 1, my - 1, 1, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(mx + 2, my + 0.5, 0.7, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  // Root tendrils (thicker, more organic)
  ctx.strokeStyle = 'rgba(100,70,35,0.25)';
  ctx.lineWidth = 2;
  for (let rt = 0; rt < 10; rt++) {
    const rx = (rt * 97 + 0.1) % 1 * W();
    ctx.beginPath();
    ctx.moveTo(rx, startY);
    let cx2 = rx, cy2 = startY;
    for (let seg = 0; seg < 7; seg++) {
      cx2 += Math.sin(rt * 3.7 + seg) * 25;
      cy2 += 15 + ((rt * 7 + seg * 13) % 15);
      ctx.lineTo(cx2, cy2);
    }
    ctx.stroke();

    // Little root hairs
    ctx.strokeStyle = 'rgba(100,70,35,0.12)';
    ctx.lineWidth = 0.5;
    for (let h = 0; h < 3; h++) {
      const hx = rx + Math.sin(rt * 2 + h) * 20;
      const hy = startY + 20 + h * 25;
      ctx.beginPath();
      ctx.moveTo(hx, hy);
      ctx.lineTo(hx + (Math.random() > 0.5 ? 8 : -8), hy + 10);
      ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(100,70,35,0.25)';
    ctx.lineWidth = 2;
  }

  // Underground worms (cute wiggly ones!)
  for (let w = 0; w < 4; w++) {
    const wx = (w * 173 + 0.6) % 1 * W();
    const wy = startY + 80 + (w * 137 + 0.3) % 1 * (H() - startY - 100);
    const wiggle = Math.sin(tick * 0.05 + w * 3);

    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.strokeStyle = '#cc8899';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(wx, wy);
    for (let s = 0; s < 5; s++) {
      ctx.lineTo(wx + s * 4 + Math.sin(tick * 0.03 + w + s * 0.8) * 3, wy + wiggle * 2 + Math.cos(s + tick * 0.02) * 2);
    }
    ctx.stroke();

    // Cute face on worm
    ctx.fillStyle = '#111';
    ctx.beginPath();
    ctx.arc(wx + 1, wy - 1, 0.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(wx - 1, wy - 1, 0.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Water droplets on tunnel ceilings
  if (tick % 120 < 3) {
    for (let d = 0; d < 2; d++) {
      const dx = (d * 200 + tick) % W();
      const dy = startY + 20 + (d * 150) % (H() - startY - 30);
      spawnParticle(dx, dy, 'sparkle');
    }
  }
}

function drawClouds(sY, nightFactor) {
  if (nightFactor < 0.4) return;
  ctx.fillStyle = `rgba(255,255,255,${nightFactor * 0.15})`;
  for (let c = 0; c < 5; c++) {
    const cx = ((c * 200 + tick * 0.05) % (W() + 100)) - 50;
    const cy = sY * 0.15 + c * 20;
    ctx.beginPath();
    ctx.ellipse(cx, cy, 40 + c * 8, 12 + c * 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx + 25, cy - 5, 30, 10, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawGrassAndFlowers(sY, sc, season) {
  // Grass blades
  ctx.strokeStyle = sc.grass2;
  ctx.lineWidth = 1.5;
  for (let g = 0; g < W(); g += 7) {
    const h = 8 + Math.sin(g * 0.3) * 4 + Math.cos(g * 0.17) * 3;
    const sway = Math.sin(tick * 0.02 + g * 0.1) * 2;
    ctx.beginPath();
    ctx.moveTo(g, sY - 4);
    ctx.quadraticCurveTo(g + sway, sY - h * 0.5, g + sway * 1.5, sY - h);
    ctx.stroke();
  }

  // Flowers (spring/summer)
  if (season === 'SPRING' || season === 'SUMMER') {
    const flowerColors = ['#ff6b9d', '#ffdd44', '#ff8844', '#aa66ff', '#66ccff'];
    for (let f = 0; f < 12; f++) {
      const fx = (f * 137.5 % 1) * W();
      const fy = sY - 12 - Math.sin(f * 2.3) * 6;
      const fc = flowerColors[f % flowerColors.length];
      const sway = Math.sin(tick * 0.015 + f * 1.7) * 1.5;

      // Stem
      ctx.strokeStyle = '#3a7a1a';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(fx, sY - 4);
      ctx.quadraticCurveTo(fx + sway, fy + 4, fx + sway, fy);
      ctx.stroke();

      // Petals
      ctx.fillStyle = fc;
      for (let p = 0; p < 5; p++) {
        const pa = (p / 5) * Math.PI * 2 + tick * 0.005;
        ctx.beginPath();
        ctx.ellipse(fx + sway + Math.cos(pa) * 3, fy + Math.sin(pa) * 3, 2.5, 1.5, pa, 0, Math.PI * 2);
        ctx.fill();
      }
      // Center
      ctx.fillStyle = '#ffee44';
      ctx.beginPath();
      ctx.arc(fx + sway, fy, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Autumn leaves falling
  if (season === 'AUTUMN') {
    ctx.fillStyle = 'rgba(200,120,30,0.6)';
    for (let l = 0; l < 8; l++) {
      const lx = ((l * 173 + tick * 0.3) % W());
      const ly = ((l * 97 + tick * 0.5) % (sY - 20)) + 10;
      const lr = Math.sin(tick * 0.03 + l) * 0.5;
      ctx.save();
      ctx.translate(lx, ly);
      ctx.rotate(lr);
      ctx.beginPath();
      ctx.ellipse(0, 0, 4, 2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  // Snow in winter
  if (season === 'WINTER') {
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    for (let s = 0; s < 50; s++) {
      const sx = ((s * 137 + tick * 0.2 + Math.sin(s + tick * 0.01) * 20) % W());
      const sy = ((s * 97 + tick * 0.8) % sY);
      const snowSize = 1 + Math.sin(s * 0.5) * 1;
      ctx.beginPath();
      ctx.arc(sx, sy, snowSize, 0, Math.PI * 2);
      ctx.fill();
    }
    // Snow on ground - thicker
    ctx.fillStyle = 'rgba(230,240,255,0.4)';
    ctx.fillRect(0, sY - 8, W(), 6);
    // Snowdrifts
    ctx.fillStyle = 'rgba(240,248,255,0.25)';
    for (let d = 0; d < 10; d++) {
      const dx = (d * 137.5 % 1) * W();
      ctx.beginPath();
      ctx.ellipse(dx, sY - 4, 15 + d * 3, 5, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Butterflies (spring/summer) - kids love these!
  if (season === 'SPRING' || season === 'SUMMER') {
    const butterflyColors = ['#ff6b9d', '#ffaa44', '#66ccff', '#aa66ff', '#ffdd44'];
    for (let b = 0; b < 5; b++) {
      const bx = ((b * 200 + tick * 0.3 + Math.sin(tick * 0.01 + b * 2) * 50) % (W() + 40)) - 20;
      const by = sY * 0.3 + Math.sin(tick * 0.02 + b * 3) * sY * 0.15;
      const wingFlap = Math.sin(tick * 0.15 + b * 2) * 0.7;
      const bc = butterflyColors[b % butterflyColors.length];

      ctx.save();
      ctx.translate(bx, by);

      // Left wing
      ctx.fillStyle = bc;
      ctx.globalAlpha = 0.7;
      ctx.beginPath();
      ctx.ellipse(-4, 0, 5, 3 * Math.abs(Math.cos(wingFlap)), wingFlap * 0.3, 0, Math.PI * 2);
      ctx.fill();

      // Right wing
      ctx.beginPath();
      ctx.ellipse(4, 0, 5, 3 * Math.abs(Math.cos(wingFlap)), -wingFlap * 0.3, 0, Math.PI * 2);
      ctx.fill();

      // Body
      ctx.globalAlpha = 0.8;
      ctx.fillStyle = '#333';
      ctx.fillRect(-0.5, -3, 1, 6);

      // Antennae
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(0, -3);
      ctx.lineTo(-3, -6);
      ctx.moveTo(0, -3);
      ctx.lineTo(3, -6);
      ctx.stroke();

      ctx.restore();
    }
  }

  // Ladybugs crawling on ground (cute!)
  for (let lb = 0; lb < 3; lb++) {
    const lbx = ((lb * 230 + tick * 0.15) % W());
    const lby = sY - 6;
    ctx.save();
    ctx.translate(lbx, lby);
    // Shell
    ctx.fillStyle = '#ee3333';
    ctx.beginPath();
    ctx.ellipse(0, 0, 4, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    // Head
    ctx.fillStyle = '#222';
    ctx.beginPath();
    ctx.arc(4, 0, 2, 0, Math.PI * 2);
    ctx.fill();
    // Spots
    ctx.fillStyle = '#111';
    ctx.beginPath();
    ctx.arc(-1, -1, 1, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(1, 1, 0.8, 0, Math.PI * 2);
    ctx.fill();
    // Center line
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(-3, 0);
    ctx.lineTo(2, 0);
    ctx.stroke();
    ctx.restore();
  }
}

// ─── TUNNELS ───────────────────────────────────────────────
export function drawTunnels() {
  for (const t of G.tunnels) {
    const grad = ctx.createLinearGradient(t.x, t.y, t.x, t.y + t.h);
    if (t.type === 'chamber') {
      grad.addColorStop(0, 'rgba(80,45,20,0.9)');
      grad.addColorStop(1, 'rgba(55,28,10,0.9)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.ellipse(t.x + t.w / 2, t.y + t.h / 2, t.w / 2, t.h / 2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(160,100,50,0.3)';
      ctx.lineWidth = 1;
      ctx.stroke();
    } else if (t.type === 'storage') {
      grad.addColorStop(0, 'rgba(80,55,15,0.9)');
      grad.addColorStop(1, 'rgba(60,38,8,0.9)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.ellipse(t.x + t.w / 2, t.y + t.h / 2, t.w / 2, t.h / 2, 0, 0, Math.PI * 2);
      ctx.fill();
      // Food dots
      const foodLevel = Math.min(8, Math.floor(G.food / 25));
      ctx.fillStyle = 'rgba(255,200,50,0.6)';
      for (let d = 0; d < foodLevel; d++) {
        ctx.beginPath();
        ctx.arc(t.x + 3 + d * 3, t.y + t.h / 2 + (d % 2) * 2, 2, 0, Math.PI * 2);
        ctx.fill();
      }
      // Label
      ctx.fillStyle = 'rgba(255,200,50,0.3)';
      ctx.font = '7px Cinzel';
      ctx.fillText('FOOD', t.x + 2, t.y + t.h / 2 - 4);
    } else if (t.type === 'nursery') {
      grad.addColorStop(0, 'rgba(60,50,80,0.9)');
      grad.addColorStop(1, 'rgba(40,30,55,0.9)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.ellipse(t.x + t.w / 2, t.y + t.h / 2, t.w / 2, t.h / 2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(140,120,200,0.3)';
      ctx.font = '7px Cinzel';
      ctx.fillText('NURSERY', t.x + 1, t.y + t.h / 2 - 4);
    } else {
      ctx.fillStyle = 'rgba(60,35,15,0.85)';
      ctx.beginPath();
      if (t.w > t.h) {
        ctx.ellipse(t.x + t.w / 2, t.y + t.h / 2, t.w / 2, t.h / 2 + 1, 0, 0, Math.PI * 2);
      } else {
        ctx.ellipse(t.x + t.w / 2, t.y + t.h / 2, t.w / 2 + 1, t.h / 2, 0, 0, Math.PI * 2);
      }
      ctx.fill();
    }
  }

  // Draw dig sites (in-progress tunnels)
  for (const ds of G.digSites) {
    ctx.save();
    ctx.strokeStyle = `rgba(255,179,71,${0.3 + Math.sin(tick * 0.05) * 0.2})`;
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.ellipse(ds.x, ds.y, ds.w / 2, ds.h / 2, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // Progress fill
    ctx.fillStyle = `rgba(60,35,15,${ds.progress * 0.85})`;
    ctx.beginPath();
    ctx.ellipse(ds.x, ds.y, ds.w / 2 * ds.progress, ds.h / 2 * ds.progress, 0, 0, Math.PI * 2);
    ctx.fill();

    // Progress text
    ctx.fillStyle = 'rgba(255,179,71,0.7)';
    ctx.font = '8px Cinzel';
    ctx.textAlign = 'center';
    ctx.fillText(`${Math.floor(ds.progress * 100)}%`, ds.x, ds.y + 3);
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
        ctx.fillStyle = `rgba(80,255,80,${fi * 0.35})`;
        ctx.fillRect(gx * cellW, gy * cellH, cellW, cellH);
      }
      if (hi > 0.05) {
        ctx.fillStyle = `rgba(80,140,255,${hi * 0.25})`;
        ctx.fillRect(gx * cellW, gy * cellH, cellW, cellH);
      }
    }
  }
}

// ─── FOOD ITEMS ────────────────────────────────────────────
export function drawFoodItems() {
  for (const f of G.foodItems) {
    if (view === 'underground' && f.y > surfaceY()) continue;
    if (view === 'surface' && f.y < 0) continue;
    const colors = { seed: '#e8c060', fruit: '#e05050', insect: '#80c040' };
    ctx.save();
    ctx.shadowBlur = 8;
    ctx.shadowColor = colors[f.type] || '#ffd700';
    ctx.fillStyle = colors[f.type] || '#ffd700';
    ctx.beginPath();
    if (f.type === 'insect') {
      ctx.ellipse(f.x, f.y, f.size * 0.7, f.size * 0.4, 0, 0, Math.PI * 2);
      // Little legs for insects
      ctx.strokeStyle = colors[f.type];
      ctx.lineWidth = 0.5;
      for (let l = 0; l < 3; l++) {
        ctx.moveTo(f.x - 2 + l * 2, f.y);
        ctx.lineTo(f.x - 2 + l * 2 - 2, f.y + f.size * 0.5);
        ctx.moveTo(f.x - 2 + l * 2, f.y);
        ctx.lineTo(f.x - 2 + l * 2 + 2, f.y - f.size * 0.5);
      }
      ctx.stroke();
    } else if (f.type === 'fruit') {
      ctx.arc(f.x, f.y, f.size * 0.6, 0, Math.PI * 2);
      ctx.fill();
      // Leaf on fruit
      ctx.fillStyle = '#4a8a1e';
      ctx.beginPath();
      ctx.ellipse(f.x + f.size * 0.4, f.y - f.size * 0.5, 3, 1.5, 0.5, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Seed
      ctx.ellipse(f.x, f.y, f.size * 0.5, f.size * 0.3, 0.3, 0, Math.PI * 2);
    }
    ctx.fill();
    ctx.restore();
  }
}

// ─── NEST ──────────────────────────────────────────────────
export function drawNest() {
  if (view === 'surface') {
    const ex = G.nestX, ey = surfaceY() - 2;
    ctx.save();
    ctx.shadowBlur = 15;
    ctx.shadowColor = 'rgba(255,180,50,0.5)';

    // Mound shape
    ctx.fillStyle = '#8b5a30';
    ctx.beginPath();
    ctx.moveTo(ex - 18, ey + 3);
    ctx.quadraticCurveTo(ex, ey - 10, ex + 18, ey + 3);
    ctx.fill();

    // Entrance hole
    ctx.fillStyle = '#3a1808';
    ctx.beginPath();
    ctx.ellipse(ex, ey, 6, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#c07830';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();

    // Dirt particles around entrance
    ctx.fillStyle = '#8b5030';
    for (let d = 0; d < 6; d++) {
      const dx = ex + (Math.sin(d * 1.2) * 12);
      const dy = ey + 2 + Math.cos(d * 0.8) * 3;
      ctx.beginPath();
      ctx.arc(dx, dy, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Queen chamber glow
  ctx.save();
  const qGrad = ctx.createRadialGradient(G.queenX, G.queenY, 2, G.queenX, G.queenY, 35);
  qGrad.addColorStop(0, 'rgba(255,200,50,0.15)');
  qGrad.addColorStop(1, 'rgba(255,200,50,0)');
  ctx.fillStyle = qGrad;
  ctx.beginPath();
  ctx.arc(G.queenX, G.queenY, 35, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// ─── ENEMY NEST ────────────────────────────────────────────
export function drawEnemy() {
  const ec = G.enemyColony;
  ctx.save();
  ctx.shadowBlur = 10;
  ctx.shadowColor = 'rgba(200,30,0,0.4)';

  // Pulsing effect
  const pulse = 1 + Math.sin(tick * 0.03) * 0.1;

  ctx.fillStyle = 'rgba(150,20,0,0.5)';
  ctx.beginPath();
  ctx.arc(ec.x, ec.y, 18 * pulse, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(220,60,0,0.6)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Skull icon
  ctx.fillStyle = 'rgba(220,60,0,0.5)';
  ctx.font = '10px serif';
  ctx.textAlign = 'center';
  ctx.fillText('☠', ec.x, ec.y + 4);
  ctx.textAlign = 'start';

  ctx.restore();
}

// ─── ANT DRAWING ───────────────────────────────────────────
export function drawAnt(ant) {
  const sY = surfaceY();
  if (view === 'surface' && ant.y > sY + 20) return;
  if (view === 'underground' && ant.y < sY - 10) return;

  const isCarrying = ant.carryFood > 0;
  const isFighting = ant.state === STATE.FIGHT;
  const isDigging = ant.state === STATE.DIG;

  ctx.save();
  ctx.translate(ant.x, ant.y);

  let bodyColor, headColor;
  if (ant.isEnemy) {
    bodyColor = isFighting ? '#ff3300' : '#aa1800';
    headColor = '#cc2000';
  } else if (ant.type === TYPE.QUEEN) {
    bodyColor = '#c8a000';
    headColor = '#ffd700';
  } else if (ant.type === TYPE.SOLDIER) {
    bodyColor = isFighting ? '#ff6600' : '#8b3a00';
    headColor = '#cc5500';
  } else if (ant.type === TYPE.NURSE) {
    bodyColor = '#336699';
    headColor = '#4488bb';
  } else {
    bodyColor = isCarrying ? '#5a9a30' : isDigging ? '#8a6a30' : '#3a2010';
    headColor = isCarrying ? '#7acc40' : isDigging ? '#aa8a40' : '#5a3518';
  }

  const angle = Math.atan2(ant.vy, ant.vx);
  ctx.rotate(angle);

  if (ant.type === TYPE.QUEEN || isFighting) {
    ctx.shadowBlur = ant.type === TYPE.QUEEN ? 8 : 4;
    ctx.shadowColor = ant.type === TYPE.QUEEN ? '#ffd700' : '#ff4400';
  }

  // BIGGER ants - more visible and fun for kids!
  const sz = ant.type === TYPE.QUEEN ? 2.2 : ant.type === TYPE.SOLDIER ? 1.8 : 1.4;

  // Legs
  ctx.strokeStyle = bodyColor;
  ctx.lineWidth = 0.6;
  for (let l = 0; l < 3; l++) {
    const lx = -2 + l * 2;
    const legAngle = Math.sin(ant.timer * 0.3 + l * 1.2) * 0.6;
    ctx.beginPath();
    ctx.moveTo(lx, 0);
    ctx.lineTo(lx + Math.cos(legAngle) * 4 * sz, Math.sin(legAngle) * 3 * sz);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(lx, 0);
    ctx.lineTo(lx + Math.cos(-legAngle) * 4 * sz, -Math.sin(-legAngle) * 3 * sz);
    ctx.stroke();
  }

  // Abdomen
  ctx.fillStyle = bodyColor;
  ctx.beginPath();
  ctx.ellipse(-2 * sz, 0, 3.5 * sz, 2 * sz, 0, 0, Math.PI * 2);
  ctx.fill();

  // Abdomen stripes for soldiers
  if (ant.type === TYPE.SOLDIER && !ant.isEnemy) {
    ctx.fillStyle = 'rgba(255,150,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(-2 * sz, 0, 2 * sz, 1.2 * sz, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Thorax
  ctx.fillStyle = headColor;
  ctx.beginPath();
  ctx.ellipse(1 * sz, 0, 2 * sz, 1.5 * sz, 0, 0, Math.PI * 2);
  ctx.fill();

  // Head
  ctx.fillStyle = headColor;
  ctx.beginPath();
  ctx.ellipse(3.5 * sz, 0, 2 * sz, 1.8 * sz, 0, 0, Math.PI * 2);
  ctx.fill();

  // Big cute cartoon eyes!
  // White of eye
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(4 * sz, -1.2 * sz, 1.1 * sz, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(4 * sz, 1.2 * sz, 1.1 * sz, 0, Math.PI * 2);
  ctx.fill();
  // Pupil
  ctx.fillStyle = ant.isEnemy ? '#ff0000' : '#222222';
  ctx.beginPath();
  ctx.arc(4.2 * sz, -1.2 * sz, 0.6 * sz, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(4.2 * sz, 1.2 * sz, 0.6 * sz, 0, Math.PI * 2);
  ctx.fill();
  // Eye shine
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.beginPath();
  ctx.arc(4.4 * sz, -1.4 * sz, 0.3 * sz, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(4.4 * sz, 1.0 * sz, 0.3 * sz, 0, Math.PI * 2);
  ctx.fill();

  // Mandibles for soldiers
  if (ant.type === TYPE.SOLDIER || ant.type === TYPE.ENEMY_SOLDIER) {
    ctx.strokeStyle = headColor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(5 * sz, -0.8 * sz);
    ctx.lineTo(6.5 * sz, -2 * sz);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(5 * sz, 0.8 * sz);
    ctx.lineTo(6.5 * sz, 2 * sz);
    ctx.stroke();
  }

  // Antennae
  ctx.strokeStyle = headColor;
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  ctx.moveTo(4.5 * sz, -0.5 * sz);
  ctx.quadraticCurveTo(6 * sz, -3 * sz, 7 * sz + Math.sin(ant.timer * 0.1) * 1.5, -4 * sz);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(4.5 * sz, 0.5 * sz);
  ctx.quadraticCurveTo(6 * sz, 3 * sz, 7 * sz + Math.cos(ant.timer * 0.1) * 1.5, 4 * sz);
  ctx.stroke();

  // Crown for queen
  if (ant.type === TYPE.QUEEN) {
    ctx.fillStyle = '#ffd700';
    ctx.beginPath();
    ctx.moveTo(2 * sz, -3.5 * sz);
    ctx.lineTo(1 * sz, -5 * sz);
    ctx.lineTo(2.5 * sz, -4.5 * sz);
    ctx.lineTo(3.5 * sz, -6 * sz);
    ctx.lineTo(4.5 * sz, -4.5 * sz);
    ctx.lineTo(5 * sz, -5 * sz);
    ctx.lineTo(5 * sz, -3.5 * sz);
    ctx.closePath();
    ctx.fill();
  }

  // Carrying food
  if (isCarrying) {
    ctx.fillStyle = '#ffd700';
    ctx.shadowBlur = 6;
    ctx.shadowColor = '#ffd700';
    ctx.beginPath();
    ctx.arc(-3 * sz, -3 * sz, 2 * sz, 0, Math.PI * 2);
    ctx.fill();
  }

  // Dig sparkles - spray dirt particles!
  if (isDigging && Math.random() < 0.15) {
    spawnParticle(ant.x, ant.y, 'dirt');
  }

  // Fight sparkles!
  if (isFighting && Math.random() < 0.2) {
    spawnParticle(ant.x, ant.y, 'fight');
  }

  // Happy sparkle when carrying food
  if (isCarrying && Math.random() < 0.05) {
    spawnParticle(ant.x, ant.y - 5, 'sparkle');
  }

  // HP bar
  if (ant.hp < ant.maxHp * 0.8) {
    ctx.rotate(-angle);
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(-5, -8, 10, 2);
    ctx.fillStyle = ant.hp > ant.maxHp * 0.5 ? '#4aee44' : '#ee4444';
    ctx.fillRect(-5, -8, 10 * (ant.hp / ant.maxHp), 2);
  }

  ctx.restore();
}

// ─── LARVAE & EGGS ─────────────────────────────────────────
export function drawLarvae() {
  for (let i = 0; i < G.larvae.length; i++) {
    const l = G.larvae[i];
    const lx = G.nestX + (i % 5 - 2) * 12;
    const ly = G.nestY + Math.floor(i / 5) * 10 + 5;
    if (view === 'surface' && ly > surfaceY()) continue;

    // Larva body (worm-like with segments)
    ctx.fillStyle = `rgba(230,200,150,${0.5 + l.progress * 0.5})`;
    for (let seg = 0; seg < 3; seg++) {
      ctx.beginPath();
      ctx.ellipse(lx + seg * 2.5, ly, 2.5 - seg * 0.3, 2, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Progress ring
    if (l.progress > 0.1) {
      ctx.strokeStyle = `rgba(255,200,50,${l.progress * 0.6})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(lx, ly, 5, -Math.PI / 2, -Math.PI / 2 + l.progress * Math.PI * 2);
      ctx.stroke();
    }
  }

  // Eggs
  for (let i = 0; i < G.eggs; i++) {
    const ex = G.nestX - 15 + (i % 4) * 6;
    const ey = G.nestY - 8 + Math.floor(i / 4) * 6;
    if (view === 'surface' && ey > surfaceY()) continue;
    ctx.fillStyle = 'rgba(255,240,200,0.7)';
    ctx.beginPath();
    ctx.ellipse(ex, ey, 2.5, 2, 0, 0, Math.PI * 2);
    ctx.fill();
    // Sheen
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.beginPath();
    ctx.ellipse(ex - 0.5, ey - 0.5, 1, 0.7, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function drawQueen() {
  if (view === 'surface' && G.queenY > surfaceY()) return;
  drawAnt({
    type: TYPE.QUEEN, x: G.queenX, y: G.queenY, vx: 0.3, vy: 0,
    state: STATE.IDLE, hp: G.queenHP, maxHp: 100, carryFood: 0,
    timer: tick, isEnemy: false, speed: 0.5
  });
}

// ─── MINIMAP ───────────────────────────────────────────────
export function drawMinimap() {
  const mc = minimapCtx;
  const mw = 100, mh = 60;
  const sx = mw / W(), sy = mh / H();

  // Background
  mc.fillStyle = '#150a04';
  mc.fillRect(0, 0, mw, mh);

  // Surface line
  mc.fillStyle = '#2d4a1a';
  mc.fillRect(0, 0, mw, surfaceY() * sy);

  // Tunnels
  mc.fillStyle = '#4a2810';
  for (const t of G.tunnels) {
    mc.fillRect(t.x * sx, t.y * sy, Math.max(1, t.w * sx), Math.max(1, t.h * sy));
  }

  // Player nest
  mc.fillStyle = '#ffd700';
  mc.fillRect(G.nestX * sx - 2, G.nestY * sy - 1, 4, 2);

  // Enemy nest
  mc.fillStyle = '#cc2200';
  mc.fillRect(G.enemyColony.x * sx - 1, G.enemyColony.y * sy - 1, 3, 2);

  // Friendly ants
  mc.fillStyle = '#4a8a1e';
  for (const ant of G.ants) {
    mc.fillRect(ant.x * sx, ant.y * sy, 1, 1);
  }

  // Enemy ants
  mc.fillStyle = '#aa1800';
  for (const ant of G.enemyColony.ants) {
    mc.fillRect(ant.x * sx, ant.y * sy, 1, 1);
  }

  // Food
  mc.fillStyle = '#ffd700';
  for (const f of G.foodItems) {
    mc.fillRect(f.x * sx, f.y * sy, 1, 1);
  }
}
