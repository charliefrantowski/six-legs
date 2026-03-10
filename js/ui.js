import { TYPE, SEASONS, SEASON_COLORS, UPGRADES } from './constants.js';
import { G, getUpgradeCost, getUpgradeEffect, purchaseUpgrade, showUpgrades, showStats } from './state.js';

// ─── UPDATE HUD ────────────────────────────────────────────
export function updateHUD() {
  const workers = G.ants.filter(a => a.type === TYPE.WORKER).length;
  const soldiers = G.ants.filter(a => a.type === TYPE.SOLDIER).length;
  const nurses = G.ants.filter(a => a.type === TYPE.NURSE).length;
  const total = G.ants.length;
  const maxAnts = 80;

  document.getElementById('foodCount').textContent = Math.floor(G.food);
  document.getElementById('queenHP').textContent = Math.floor(G.queenHP);
  document.getElementById('totalAnts').textContent = total;
  document.getElementById('dayNum').textContent = G.day;

  const sb = document.getElementById('seasonBadge');
  const season = SEASONS[G.seasonIdx];
  sb.textContent = season;
  const sc = SEASON_COLORS[season];
  sb.style.borderColor = sc.grass2;
  sb.style.color = sc.grass2;

  document.getElementById('wCount').textContent = workers;
  document.getElementById('sCount').textContent = soldiers;
  document.getElementById('nCount').textContent = nurses;
  document.getElementById('lCount').textContent = G.larvae.length + G.eggs;
  document.getElementById('eCount').textContent = G.enemyColony.ants.length;

  document.getElementById('wBar').style.width = Math.min(100, workers / maxAnts * 100 * 3) + '%';
  document.getElementById('sBar').style.width = Math.min(100, soldiers / maxAnts * 100 * 5) + '%';
  document.getElementById('nBar').style.width = Math.min(100, nurses / maxAnts * 100 * 5) + '%';
  document.getElementById('lBar').style.width = Math.min(100, (G.larvae.length + G.eggs) / 20 * 100) + '%';

  // Update breed ratio display
  document.getElementById('ratioW').textContent = G.breedRatio.worker + '%';
  document.getElementById('ratioS').textContent = G.breedRatio.soldier + '%';
  document.getElementById('ratioN').textContent = G.breedRatio.nurse + '%';

  // Update upgrades panel
  if (showUpgrades) {
    updateUpgradePanel();
  }
}

// ─── UPGRADE PANEL ─────────────────────────────────────────
export function updateUpgradePanel() {
  const container = document.getElementById('upgradeList');
  container.innerHTML = '';

  for (const [key, u] of Object.entries(UPGRADES)) {
    const level = G.upgrades[key];
    const cost = getUpgradeCost(key);
    const maxed = level >= u.maxLevel;
    const canAfford = G.food >= cost;

    const item = document.createElement('div');
    item.className = 'upgrade-item';
    item.innerHTML = `
      <div class="upgrade-info">
        <div class="upgrade-name">${u.icon} ${u.name}</div>
        <div class="upgrade-desc">${u.desc}</div>
        <div class="upgrade-level">Lv ${level}/${u.maxLevel}</div>
      </div>
      <button class="upgrade-btn" ${maxed || !canAfford ? 'disabled' : ''} data-key="${key}">
        ${maxed ? 'MAX' : `${cost} 🍎`}
      </button>
    `;
    container.appendChild(item);
  }

  // Attach click handlers
  container.querySelectorAll('.upgrade-btn:not([disabled])').forEach(btn => {
    btn.addEventListener('click', () => {
      const key = btn.dataset.key;
      if (purchaseUpgrade(key)) {
        updateUpgradePanel();
        updateHUD();
      }
    });
  });
}

// ─── STATS OVERLAY ─────────────────────────────────────────
export function updateStatsOverlay() {
  const workers = G.ants.filter(a => a.type === TYPE.WORKER).length;
  const soldiers = G.ants.filter(a => a.type === TYPE.SOLDIER).length;
  const nurses = G.ants.filter(a => a.type === TYPE.NURSE).length;
  const season = SEASONS[G.seasonIdx];

  document.getElementById('statsContent').innerHTML = `
    <div class="stat-row"><span class="stat-lbl">Day</span><span class="stat-val">${G.day}</span></div>
    <div class="stat-row"><span class="stat-lbl">Season</span><span class="stat-val">${season}</span></div>
    <div class="stat-row"><span class="stat-lbl">Food Stored</span><span class="stat-val">${Math.floor(G.food)} / ${getUpgradeEffect('storageCapacity')}</span></div>
    <div class="stat-row"><span class="stat-lbl">Queen Health</span><span class="stat-val">${Math.floor(G.queenHP)}%</span></div>

    <div class="stat-section">
      <div class="stat-section-title">POPULATION</div>
      <div class="stat-row"><span class="stat-lbl">Workers</span><span class="stat-val">${workers}</span></div>
      <div class="stat-row"><span class="stat-lbl">Soldiers</span><span class="stat-val">${soldiers}</span></div>
      <div class="stat-row"><span class="stat-lbl">Nurses</span><span class="stat-val">${nurses}</span></div>
      <div class="stat-row"><span class="stat-lbl">Larvae/Eggs</span><span class="stat-val">${G.larvae.length + G.eggs}</span></div>
      <div class="stat-row"><span class="stat-lbl">Peak Population</span><span class="stat-val">${G.peakPopulation}</span></div>
    </div>

    <div class="stat-section">
      <div class="stat-section-title">LIFETIME</div>
      <div class="stat-row"><span class="stat-lbl">Total Born</span><span class="stat-val">${G.born}</span></div>
      <div class="stat-row"><span class="stat-lbl">Enemies Killed</span><span class="stat-val">${G.kills}</span></div>
      <div class="stat-row"><span class="stat-lbl">Food Collected</span><span class="stat-val">${Math.floor(G.foodCollected)}</span></div>
      <div class="stat-row"><span class="stat-lbl">Tunnels Dug</span><span class="stat-val">${G.tunnelsDug}</span></div>
    </div>
  `;
}

// ─── GAME OVER STATS ───────────────────────────────────────
export function showGameOverStats() {
  const statsDiv = document.getElementById('goStats');
  if (statsDiv) {
    statsDiv.innerHTML = `
      Survived <span>${G.day}</span> days<br>
      Peak colony: <span>${G.peakPopulation}</span> ants<br>
      Enemies defeated: <span>${G.kills}</span><br>
      Food gathered: <span>${Math.floor(G.foodCollected)}</span><br>
      Tunnels dug: <span>${G.tunnelsDug}</span>
    `;
  }
}
