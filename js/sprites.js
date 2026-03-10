// ─── PIXEL ART SPRITE SYSTEM ──────────────────────────────
// Stardew Valley-inspired pixel sprites drawn to offscreen canvases
// Each sprite is a small canvas rendered at integer pixel scale

const spriteCache = {};

function createCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

// Draw pixel data onto a canvas. pixels is array of [x, y, color]
function drawPixels(canvas, pixels) {
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  for (const [x, y, color] of pixels) {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, 1, 1);
  }
  return canvas;
}

// ─── ANT SPRITES ──────────────────────────────────────────
export function getAntSprite(type, isEnemy, frame) {
  const key = `ant_${type}_${isEnemy ? 'e' : 'f'}_${frame % 4}`;
  if (spriteCache[key]) return spriteCache[key];

  const c = createCanvas(16, 12);
  const px = [];
  const f = frame % 4;

  // Color palettes - BRIGHT Stardew style
  let body, head, accent;
  if (isEnemy) {
    body = '#e63946'; head = '#ff6b6b'; accent = '#ff9999';
  } else if (type === 'worker') {
    body = '#6a4c2a'; head = '#8b6914'; accent = '#c8a653';
  } else if (type === 'soldier') {
    body = '#cc5500'; head = '#ff7722'; accent = '#ffaa44';
  } else if (type === 'nurse') {
    body = '#3388cc'; head = '#55aaee'; accent = '#88ccff';
  } else if (type === 'queen') {
    body = '#daa520'; head = '#ffd700'; accent = '#fff8dc';
  } else {
    body = '#8b4513'; head = '#a0522d'; accent = '#cd853f';
  }

  // Abdomen (back, 3x3 oval)
  px.push([2, 4, body], [3, 4, body], [4, 4, body]);
  px.push([1, 5, body], [2, 5, body], [3, 5, body], [4, 5, body], [5, 5, body]);
  px.push([2, 6, body], [3, 6, body], [4, 6, body]);
  // Abdomen stripe
  px.push([2, 5, accent], [4, 5, accent]);

  // Thorax (middle)
  px.push([6, 4, head], [7, 4, head]);
  px.push([6, 5, head], [7, 5, head]);
  px.push([6, 6, head], [7, 6, head]);

  // Head
  px.push([9, 4, head], [10, 4, head]);
  px.push([8, 5, head], [9, 5, head], [10, 5, head], [11, 5, head]);
  px.push([9, 6, head], [10, 6, head]);

  // Eyes - big white with dark pupil (cute!)
  px.push([10, 4, '#ffffff'], [11, 4, '#ffffff']);
  px.push([11, 4, '#222222']);
  px.push([10, 6, '#ffffff'], [11, 6, '#ffffff']);
  px.push([11, 6, '#222222']);

  // Antennae
  px.push([12, 3, head], [13, 2, head]);
  px.push([12, 7, head], [13, 8, head]);

  // Legs - animated!
  const legOffsets = [
    [0, -1, 0, 1],   // frame 0
    [1, 0, -1, 0],   // frame 1
    [0, 1, 0, -1],   // frame 2
    [-1, 0, 1, 0],   // frame 3
  ][f];

  // 3 pairs of legs
  px.push([3, 2 + legOffsets[0], body], [3, 1 + legOffsets[0], body]);
  px.push([3, 8 + legOffsets[1], body], [3, 9 + legOffsets[1], body]);
  px.push([6, 2 + legOffsets[2], body], [6, 1 + legOffsets[2], body]);
  px.push([6, 8 + legOffsets[3], body], [6, 9 + legOffsets[3], body]);
  px.push([8, 3 + legOffsets[0], body]);
  px.push([8, 7 + legOffsets[1], body]);

  // Mandibles for soldiers
  if (type === 'soldier' || type === 'enemy_soldier') {
    px.push([12, 4, accent], [13, 3, accent]);
    px.push([12, 6, accent], [13, 7, accent]);
  }

  // Crown for queen
  if (type === 'queen') {
    px.push([9, 2, '#ffd700'], [10, 1, '#ffd700'], [11, 2, '#ffd700']);
    px.push([10, 2, '#fff44f']);
  }

  // Carrying food indicator
  spriteCache[key] = drawPixels(c, px);
  return spriteCache[key];
}

// ─── FOOD CARRY SPRITE ────────────────────────────────────
export function getFoodCarrySprite() {
  const key = 'food_carry';
  if (spriteCache[key]) return spriteCache[key];
  const c = createCanvas(4, 4);
  drawPixels(c, [
    [1, 0, '#ffdd44'], [2, 0, '#ffdd44'],
    [0, 1, '#ffcc22'], [1, 1, '#ffee66'], [2, 1, '#ffee66'], [3, 1, '#ffcc22'],
    [0, 2, '#ffcc22'], [1, 2, '#ffdd44'], [2, 2, '#ffdd44'], [3, 2, '#ffcc22'],
    [1, 3, '#ddaa00'], [2, 3, '#ddaa00'],
  ]);
  spriteCache[key] = c;
  return c;
}

// ─── TILE SPRITES ─────────────────────────────────────────
const TILE_SIZE = 8;
export { TILE_SIZE };

export function getSoilTile(variant) {
  const key = `soil_${variant}`;
  if (spriteCache[key]) return spriteCache[key];
  const c = createCanvas(TILE_SIZE, TILE_SIZE);
  const px = [];

  // Base soil colors - rich earthy tones
  const soils = [
    { base: '#5c3a1e', mid: '#4a2e16', dark: '#3a200e', accent: '#6b4426' },
    { base: '#634122', mid: '#52341a', dark: '#3e2610', accent: '#7a5230' },
    { base: '#553618', mid: '#462a12', dark: '#34200c', accent: '#6e4828' },
  ];
  const s = soils[variant % 3];

  // Fill base
  for (let y = 0; y < TILE_SIZE; y++) {
    for (let x = 0; x < TILE_SIZE; x++) {
      px.push([x, y, s.base]);
    }
  }
  // Add texture
  px.push([1, 1, s.dark], [5, 2, s.dark], [3, 5, s.mid], [6, 6, s.dark]);
  px.push([2, 3, s.accent], [7, 1, s.accent], [4, 7, s.mid]);
  // Random pebble
  if (variant % 2 === 0) {
    px.push([4, 3, '#8a7a6a'], [5, 3, '#8a7a6a'], [4, 4, '#7a6a5a']);
  }

  spriteCache[key] = drawPixels(c, px);
  return c;
}

export function getTunnelTile(variant) {
  const key = `tunnel_${variant}`;
  if (spriteCache[key]) return spriteCache[key];
  const c = createCanvas(TILE_SIZE, TILE_SIZE);
  const px = [];

  // Tunnel interior - warm amber glow
  const base = variant === 0 ? '#3d2810' : variant === 1 ? '#4a3015' : '#352208';
  for (let y = 0; y < TILE_SIZE; y++) {
    for (let x = 0; x < TILE_SIZE; x++) {
      px.push([x, y, base]);
    }
  }
  // Ambient texture
  px.push([2, 2, '#4a3218'], [5, 5, '#4a3218']);
  px.push([1, 6, '#332010'], [6, 1, '#332010']);

  spriteCache[key] = drawPixels(c, px);
  return c;
}

export function getGrassTile(variant, season) {
  const key = `grass_${variant}_${season}`;
  if (spriteCache[key]) return spriteCache[key];
  const c = createCanvas(TILE_SIZE, TILE_SIZE);
  const px = [];

  const palettes = {
    SPRING: { base: '#4abe3a', light: '#6ede5e', dark: '#2a8e1a', flower: '#ff88aa' },
    SUMMER: { base: '#3aaa2a', light: '#5acc4a', dark: '#228812', flower: '#ffdd44' },
    AUTUMN: { base: '#aa7722', light: '#cc9944', dark: '#886611', flower: '#dd6622' },
    WINTER: { base: '#667788', light: '#88aacc', dark: '#445566', flower: '#ddeeff' },
  };
  const p = palettes[season] || palettes.SPRING;

  // Fill base grass
  for (let y = 0; y < TILE_SIZE; y++) {
    for (let x = 0; x < TILE_SIZE; x++) {
      px.push([x, y, p.base]);
    }
  }
  // Grass blade highlights
  px.push([1, 0, p.light], [3, 1, p.light], [6, 0, p.light]);
  px.push([2, 2, p.dark], [5, 3, p.dark], [7, 1, p.dark]);

  // Occasional flower
  if (variant % 4 === 0 && (season === 'SPRING' || season === 'SUMMER')) {
    px.push([4, 1, p.flower], [3, 0, '#ffffff'], [5, 0, '#ffffff']);
  }

  spriteCache[key] = drawPixels(c, px);
  return c;
}

export function getSkyTile(variant, isDark) {
  const key = `sky_${variant}_${isDark}`;
  if (spriteCache[key]) return spriteCache[key];
  const c = createCanvas(TILE_SIZE, TILE_SIZE);
  const px = [];

  const base = isDark ? '#1a1a3e' : '#66bbee';
  const accent = isDark ? '#222255' : '#88ddff';

  for (let y = 0; y < TILE_SIZE; y++) {
    for (let x = 0; x < TILE_SIZE; x++) {
      px.push([x, y, base]);
    }
  }
  if (variant % 3 === 0) {
    px.push([3, 3, accent], [4, 3, accent], [5, 3, accent]);
  }

  spriteCache[key] = drawPixels(c, px);
  return c;
}

// ─── FOOD SPRITES ─────────────────────────────────────────
export function getFoodSprite(type) {
  const key = `food_${type}`;
  if (spriteCache[key]) return spriteCache[key];
  const c = createCanvas(8, 8);
  const px = [];

  if (type === 'fruit') {
    // Bright red apple
    px.push([3, 1, '#22aa22']); // leaf
    px.push([2, 2, '#ff3344'], [3, 2, '#ff4455'], [4, 2, '#ff3344']);
    px.push([1, 3, '#ff2233'], [2, 3, '#ff5566'], [3, 3, '#ff6677'], [4, 3, '#ff5566'], [5, 3, '#ff2233']);
    px.push([1, 4, '#ee1122'], [2, 4, '#ff4455'], [3, 4, '#ff5566'], [4, 4, '#ff4455'], [5, 4, '#ee1122']);
    px.push([2, 5, '#dd1122'], [3, 5, '#ee2233'], [4, 5, '#dd1122']);
    // Shine
    px.push([2, 2, '#ffaaaa']);
  } else if (type === 'seed') {
    // Golden seed
    px.push([3, 2, '#ddaa33']);
    px.push([2, 3, '#ccaa22'], [3, 3, '#ffcc44'], [4, 3, '#ccaa22']);
    px.push([2, 4, '#bbaa11'], [3, 4, '#ddbb33'], [4, 4, '#bbaa11']);
    px.push([3, 5, '#aa8800']);
    px.push([3, 3, '#ffeebb']); // shine
  } else { // insect
    // Bright green bug
    px.push([3, 2, '#44dd44'], [4, 2, '#44dd44']);
    px.push([2, 3, '#33cc33'], [3, 3, '#66ff66'], [4, 3, '#66ff66'], [5, 3, '#33cc33']);
    px.push([3, 4, '#33cc33'], [4, 4, '#33cc33']);
    // Legs
    px.push([1, 3, '#228822'], [6, 3, '#228822']);
    px.push([2, 2, '#228822'], [5, 2, '#228822']);
    // Eyes
    px.push([3, 2, '#ffffff'], [4, 2, '#ffffff']);
  }

  spriteCache[key] = drawPixels(c, px);
  return c;
}

// ─── NEST/STRUCTURE SPRITES ───────────────────────────────
export function getNestSprite() {
  const key = 'nest_entrance';
  if (spriteCache[key]) return spriteCache[key];
  const c = createCanvas(16, 12);
  const px = [];

  // Mound
  for (let x = 2; x < 14; x++) {
    const h = 6 - Math.abs(x - 8) * 0.6;
    for (let y = Math.floor(8 - h); y < 8; y++) {
      if (y >= 0) px.push([x, y, '#8b6530']);
    }
  }
  // Dirt highlights
  px.push([5, 5, '#a07840'], [9, 4, '#a07840'], [7, 3, '#a07840']);
  // Entrance hole
  px.push([7, 6, '#1a0a04'], [8, 6, '#1a0a04']);
  px.push([6, 7, '#1a0a04'], [7, 7, '#1a0a04'], [8, 7, '#1a0a04'], [9, 7, '#1a0a04']);
  // Ground
  for (let x = 0; x < 16; x++) {
    px.push([x, 8, '#4abe3a'], [x, 9, '#3a9a2a'], [x, 10, '#2a7a1a'], [x, 11, '#1a5a0a']);
  }

  spriteCache[key] = drawPixels(c, px);
  return c;
}

export function getEnemyNestSprite() {
  const key = 'enemy_nest';
  if (spriteCache[key]) return spriteCache[key];
  const c = createCanvas(16, 12);
  const px = [];

  // Dark mound
  for (let x = 3; x < 13; x++) {
    const h = 5 - Math.abs(x - 8) * 0.5;
    for (let y = Math.floor(8 - h); y < 8; y++) {
      if (y >= 0) px.push([x, y, '#5a2020']);
    }
  }
  px.push([6, 5, '#7a3030'], [9, 4, '#7a3030']);
  // Red glow entrance
  px.push([7, 6, '#330000'], [8, 6, '#330000']);
  px.push([7, 7, '#440000'], [8, 7, '#440000']);
  // Skull-like marking
  px.push([7, 4, '#cc4444'], [8, 4, '#cc4444']);
  px.push([7, 5, '#aa3333']);

  spriteCache[key] = drawPixels(c, px);
  return c;
}

// ─── GEM SPRITES ──────────────────────────────────────────
export function getGemSprite(color) {
  const key = `gem_${color}`;
  if (spriteCache[key]) return spriteCache[key];
  const c = createCanvas(6, 6);
  const lighter = lightenColor(color, 60);
  const darker = darkenColor(color, 40);
  drawPixels(c, [
    [2, 0, color], [3, 0, color],
    [1, 1, color], [2, 1, lighter], [3, 1, lighter], [4, 1, color],
    [0, 2, darker], [1, 2, color], [2, 2, lighter], [3, 2, color], [4, 2, color], [5, 2, darker],
    [0, 3, darker], [1, 3, color], [2, 3, color], [3, 3, darker], [4, 3, color], [5, 3, darker],
    [1, 4, darker], [2, 4, darker], [3, 4, darker], [4, 4, darker],
    [2, 5, darker], [3, 5, darker],
  ]);
  spriteCache[key] = c;
  return c;
}

// ─── MUSHROOM SPRITE ──────────────────────────────────────
export function getMushroomSprite(glowColor) {
  const key = `mush_${glowColor}`;
  if (spriteCache[key]) return spriteCache[key];
  const c = createCanvas(8, 10);
  const px = [];
  // Stem
  px.push([3, 6, '#ccbb99'], [4, 6, '#ccbb99']);
  px.push([3, 7, '#bbaa88'], [4, 7, '#bbaa88']);
  px.push([3, 8, '#aa9977'], [4, 8, '#aa9977']);
  px.push([3, 9, '#998866'], [4, 9, '#998866']);
  // Cap
  px.push([2, 3, glowColor], [3, 3, glowColor], [4, 3, glowColor], [5, 3, glowColor]);
  px.push([1, 4, glowColor], [2, 4, glowColor], [3, 4, glowColor], [4, 4, glowColor], [5, 4, glowColor], [6, 4, glowColor]);
  px.push([2, 5, glowColor], [3, 5, glowColor], [4, 5, glowColor], [5, 5, glowColor]);
  // Spots
  px.push([3, 3, '#ffffff'], [5, 4, '#ffffff']);
  // Glow highlight
  px.push([2, 3, lightenColor(glowColor, 40)]);
  spriteCache[key] = drawPixels(c, px);
  return c;
}

// ─── EGG / LARVA SPRITES ─────────────────────────────────
export function getEggSprite() {
  const key = 'egg';
  if (spriteCache[key]) return spriteCache[key];
  const c = createCanvas(4, 5);
  drawPixels(c, [
    [1, 0, '#fff8e0'], [2, 0, '#fff8e0'],
    [0, 1, '#ffeecc'], [1, 1, '#fffae8'], [2, 1, '#fffae8'], [3, 1, '#ffeecc'],
    [0, 2, '#ffeecc'], [1, 2, '#fff4d8'], [2, 2, '#fff4d8'], [3, 2, '#ffeecc'],
    [0, 3, '#ffe8bb'], [1, 3, '#ffeecc'], [2, 3, '#ffeecc'], [3, 3, '#ffe8bb'],
    [1, 4, '#ffdda0'], [2, 4, '#ffdda0'],
  ]);
  spriteCache[key] = c;
  return c;
}

export function getLarvaSprite(progress) {
  const key = `larva_${Math.floor(progress * 4)}`;
  if (spriteCache[key]) return spriteCache[key];
  const c = createCanvas(8, 4);
  const brightness = Math.floor(180 + progress * 75);
  const col = `rgb(${brightness},${brightness - 30},${brightness - 80})`;
  const lite = `rgb(${Math.min(255, brightness + 30)},${Math.min(255, brightness)},${Math.min(255, brightness - 50)})`;
  drawPixels(c, [
    [1, 1, col], [2, 1, lite], [3, 1, col], [4, 1, lite], [5, 1, col], [6, 1, col],
    [1, 2, col], [2, 2, col], [3, 2, lite], [4, 2, col], [5, 2, col], [6, 2, col],
    // Eyes if almost hatched
    ...(progress > 0.7 ? [[6, 1, '#222222'], [6, 2, '#222222']] : []),
  ]);
  spriteCache[key] = c;
  return c;
}

// ─── DIG TILE SPRITES ─────────────────────────────────────
export function getDigTile(progress) {
  const key = `dig_${Math.floor(progress * 5)}`;
  if (spriteCache[key]) return spriteCache[key];
  const c = createCanvas(TILE_SIZE, TILE_SIZE);
  const ctx = c.getContext('2d');

  // Cracked soil getting hollowed out
  const alpha = 1 - progress * 0.8;
  ctx.fillStyle = `rgba(80, 50, 25, ${alpha})`;
  ctx.fillRect(0, 0, TILE_SIZE, TILE_SIZE);

  // Cracks
  ctx.strokeStyle = `rgba(40, 25, 10, ${alpha})`;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(TILE_SIZE, TILE_SIZE);
  ctx.moveTo(TILE_SIZE, 0);
  ctx.lineTo(0, TILE_SIZE);
  ctx.stroke();

  // Progress dots
  const dotCount = Math.floor(progress * 4);
  ctx.fillStyle = '#ffaa44';
  for (let i = 0; i < dotCount; i++) {
    ctx.fillRect(2 + i * 2, 3, 1, 1);
  }

  spriteCache[key] = c;
  return c;
}

// ─── UTILITY ──────────────────────────────────────────────
function lightenColor(hex, amount) {
  const r = Math.min(255, parseInt(hex.slice(1, 3), 16) + amount);
  const g = Math.min(255, parseInt(hex.slice(3, 5), 16) + amount);
  const b = Math.min(255, parseInt(hex.slice(5, 7), 16) + amount);
  return `rgb(${r},${g},${b})`;
}

function darkenColor(hex, amount) {
  const r = Math.max(0, parseInt(hex.slice(1, 3), 16) - amount);
  const g = Math.max(0, parseInt(hex.slice(3, 5), 16) - amount);
  const b = Math.max(0, parseInt(hex.slice(5, 7), 16) - amount);
  return `rgb(${r},${g},${b})`;
}

// Clear sprite cache (for season changes etc)
export function clearSpriteCache(prefix) {
  for (const key of Object.keys(spriteCache)) {
    if (!prefix || key.startsWith(prefix)) delete spriteCache[key];
  }
}
