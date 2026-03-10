// ─── ANT TYPES ─────────────────────────────────────────────
export const TYPE = {
  WORKER: 'worker',
  SOLDIER: 'soldier',
  NURSE: 'nurse',
  QUEEN: 'queen',
  ENEMY_WORKER: 'enemy_worker',
  ENEMY_SOLDIER: 'enemy_soldier'
};

// ─── ANT STATES ────────────────────────────────────────────
export const STATE = {
  IDLE: 'idle',
  FORAGE: 'forage',
  CARRY: 'carry',
  RETURN: 'return',
  FIGHT: 'fight',
  WANDER: 'wander',
  PATROL: 'patrol',
  NURSE_DUTY: 'nurse',
  TUNNEL: 'tunnel',
  DIG: 'dig'
};

// ─── SEASONS ───────────────────────────────────────────────
export const SEASONS = ['SPRING', 'SUMMER', 'AUTUMN', 'WINTER'];

export const SEASON_COLORS = {
  SPRING: { sky1: '#a8d8a8', sky2: '#c8f0b8', grass1: '#2d6e1a', grass2: '#4a9e2e' },
  SUMMER: { sky1: '#87ceeb', sky2: '#c0e8ff', grass1: '#3a8a1e', grass2: '#5ab832' },
  AUTUMN: { sky1: '#d4956a', sky2: '#f0c080', grass1: '#8a5a1a', grass2: '#c07828' },
  WINTER: { sky1: '#8899aa', sky2: '#bbccdd', grass1: '#445566', grass2: '#667788' }
};

// ─── SURFACE RATIO ─────────────────────────────────────────
export const SURFACE_RATIO = 0.35;

// ─── PHEROMONE GRID ────────────────────────────────────────
export const PW = 80;
export const PH = 50;

// ─── UPGRADES CONFIG ───────────────────────────────────────
export const UPGRADES = {
  workerSpeed: {
    name: 'Swift Legs',
    desc: 'Workers move faster',
    icon: '🏃',
    maxLevel: 5,
    baseCost: 30,
    costMult: 1.8,
    effect: level => 1 + level * 0.15
  },
  soldierStrength: {
    name: 'Iron Mandibles',
    desc: 'Soldiers deal more damage',
    icon: '⚔️',
    maxLevel: 5,
    baseCost: 40,
    costMult: 2.0,
    effect: level => 1 + level * 0.25
  },
  queenFertility: {
    name: 'Royal Vigor',
    desc: 'Queen lays eggs faster',
    icon: '👑',
    maxLevel: 5,
    baseCost: 50,
    costMult: 2.2,
    effect: level => 1 + level * 0.2
  },
  storageCapacity: {
    name: 'Deep Stores',
    desc: 'Increase max food storage',
    icon: '📦',
    maxLevel: 5,
    baseCost: 35,
    costMult: 1.6,
    effect: level => 200 + level * 100
  },
  nurseSkill: {
    name: 'Tender Care',
    desc: 'Larvae develop faster',
    icon: '🍼',
    maxLevel: 5,
    baseCost: 35,
    costMult: 1.7,
    effect: level => 1 + level * 0.2
  },
  tunnelSpeed: {
    name: 'Earth Shapers',
    desc: 'Dig tunnels faster',
    icon: '⛏',
    maxLevel: 3,
    baseCost: 25,
    costMult: 2.0,
    effect: level => 1 + level * 0.3
  }
};

// ─── RANDOM EVENTS ─────────────────────────────────────────
export const EVENTS = [
  { icon: '🌧', title: 'HEAVY RAIN', desc: 'Flooding threatens surface workers. Pheromone trails washed away. Recall your foragers!' },
  { icon: '🦎', title: 'PREDATOR!', desc: 'A lizard raids the surface. Several workers lost to its quick tongue.' },
  { icon: '🍄', title: 'FUNGAL BLOOM', desc: 'A massive mushroom appeared nearby. Food reserves surge!' },
  { icon: '❄️', title: 'EARLY FROST', desc: 'Winter bites early. Larvae development slows. Stock your food stores.' },
  { icon: '☀️', title: 'DROUGHT', desc: 'The soil hardens. Tunneling slows. But food on the surface is plentiful.' },
  { icon: '🐛', title: 'CATERPILLAR BONANZA', desc: 'Dozens of caterpillars wander nearby. Workers are bringing in huge hauls!' },
  { icon: '⚔️', title: 'RIVAL SCOUTS', desc: 'Enemy colony scouts detected. Expect an attack soon. Ready your soldiers!' },
  { icon: '🌸', title: 'MATING SEASON', desc: 'Winged ants emerge across the territory. Your queen lays extra eggs this cycle.' },
  { icon: '💧', title: 'UNDERGROUND SPRING', desc: 'A new water source discovered. Tunnel expansion unlocked this season.' },
  { icon: '🔥', title: 'WILDFIRE NEARBY', desc: 'Smoke fills the air. Surface ants retreat underground. Food gathering halted briefly.' },
  { icon: '🕷', title: 'SPIDER NEST', desc: 'A spider has moved in nearby. Soldiers must clear it before it preys on workers.' },
  { icon: '🌊', title: 'FLASH FLOOD', desc: 'Water rushes through shallow tunnels. Some passages may collapse!' }
];
