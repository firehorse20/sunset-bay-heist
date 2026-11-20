// The HUD: cash, health, wanted stars, the mission objective and its distance,
// the speedometer, ammo, and a circular minimap drawn on a 2D canvas — roads as
// lines, the player as a yellow arrow, police as flashing dots, the mission
// marker as a gold diamond, traffic as white dots.
import { CITY_HALF, ROADS } from './config.js';
import { currentMission, currentStage } from './missions.js';

export function createHud() {
  const el = {
    hud: document.getElementById('hud'),
    cash: document.getElementById('cash'),
    healthFill: document.getElementById('healthFill'),
    wanted: document.getElementById('wanted'),
    objTitle: document.getElementById('objectiveTitle'),
    objText: document.getElementById('objectiveText'),
    objDist: document.getElementById('objectiveDist'),
    timer: document.getElementById('timer'),
    speed: document.getElementById('speed'),
    ammo: document.getElementById('ammo'),
    carHint: document.getElementById('carHint'),
    message: document.getElementById('message'),
    crosshair: document.getElementById('crosshair'),
    minimap: document.getElementById('minimap'),
  };
  const mctx = el.minimap.getContext('2d');
  let messageTimer = null;
  let lastCash = -1;
  let lastHealth = -1;
  let lastWanted = -1;

  function showMessage(text, seconds) {
    el.message.textContent = text;
    el.message.style.display = 'block';
    if (messageTimer) clearTimeout(messageTimer);
    messageTimer = setTimeout(() => { el.message.style.display = 'none'; }, (seconds || 3.5) * 1000);
  }

  function drawMinimap(G) {
    const size = 180;
    const scale = size / (CITY_HALF * 2 + 40);
    const toMap = (x, z) => [(x + CITY_HALF + 20) * scale, (z + CITY_HALF + 20) * scale];
    mctx.clearRect(0, 0, size, size);
    mctx.fillStyle = 'rgba(20,20,40,0.9)';
    mctx.fillRect(0, 0, size, size);
    // Roads.
    mctx.strokeStyle = 'rgba(200,200,220,0.55)';
    mctx.lineWidth = 2;
    for (const r of ROADS) {
      const [x1, y1] = toMap(r, -CITY_HALF - 20);
      const [x2, y2] = toMap(r, CITY_HALF + 20);
      mctx.beginPath(); mctx.moveTo(x1, y1); mctx.lineTo(x2, y2); mctx.stroke();
      const [x3, y3] = toMap(-CITY_HALF - 20, r);
      const [x4, y4] = toMap(CITY_HALF + 20, r);
      mctx.beginPath(); mctx.moveTo(x3, y3); mctx.lineTo(x4, y4); mctx.stroke();
    }
    // The bay.
    mctx.fillStyle = 'rgba(40,110,150,0.8)';
    const [, bayY] = toMap(0, CITY_HALF);
    mctx.fillRect(0, bayY, size, size - bayY);
    // Mission marker.
    const stage = currentStage(G.missions);
    if (stage && stage.at) {
      const [mx, my] = toMap(stage.at[0], stage.at[1]);
      mctx.fillStyle = '#ffd23d';
      mctx.beginPath();
      mctx.moveTo(mx, my - 7); mctx.lineTo(mx + 6, my); mctx.lineTo(mx, my + 7); mctx.lineTo(mx - 6, my);
      mctx.closePath(); mctx.fill();
    }
    // Traffic.
    mctx.fillStyle = 'rgba(255,255,255,0.85)';
    for (const car of G.trafficCars) {
      const [cx, cy] = toMap(car.mesh.position.x, car.mesh.position.z);
      mctx.fillRect(cx - 1.5, cy - 1.5, 3, 3);
    }
    // Police, flashing.
    const flash = Math.floor(performance.now() / 300) % 2 === 0;
    mctx.fillStyle = flash ? '#ff3333' : '#3388ff';
    for (const car of G.police.cars) {
      const [cx, cy] = toMap(car.mesh.position.x, car.mesh.position.z);
      mctx.beginPath(); mctx.arc(cx, cy, 4, 0, Math.PI * 2); mctx.fill();
    }
    // The player, as a yellow arrow pointing the way they face.
    const p = G.player.inCar && G.player.car ? G.player.car.mesh.position : G.player.mesh.position;
    const [px, py] = toMap(p.x, p.z);
    const angle = G.player.angle;
    mctx.fillStyle = '#ffe14d';
    mctx.beginPath();
    mctx.moveTo(px + Math.sin(angle) * 8, py + Math.cos(angle) * 8);
    mctx.lineTo(px + Math.sin(angle + 2.5) * 6, py + Math.cos(angle + 2.5) * 6);
    mctx.lineTo(px + Math.sin(angle - 2.5) * 6, py + Math.cos(angle - 2.5) * 6);
    mctx.closePath(); mctx.fill();
    mctx.strokeStyle = 'rgba(255,255,255,0.6)';
    mctx.beginPath(); mctx.arc(size / 2, size / 2, size / 2 - 1, 0, Math.PI * 2); mctx.stroke();
  }

  function update(G) {
    const { player, missions } = G;
    if (player.cash !== lastCash) { el.cash.textContent = `$${player.cash.toLocaleString()}`; lastCash = player.cash; }
    if (Math.round(player.health) !== lastHealth) {
      el.healthFill.style.width = `${Math.max(0, player.health)}%`;
      lastHealth = Math.round(player.health);
    }
    if (player.wanted !== lastWanted) {
      el.wanted.textContent = '★'.repeat(player.wanted) + '☆'.repeat(5 - player.wanted);
      lastWanted = player.wanted;
    }
    const mission = currentMission(missions);
    const stage = currentStage(missions);
    if (mission && stage) {
      el.objTitle.textContent = mission.title;
      let text = stage.text;
      if (stage.kind === 'wait' && missions.waitTimer > 0) {
        text += ` ${Math.ceil(stage.seconds - missions.waitTimer)}s…`;
      }
      el.objText.textContent = text;
      if (stage.at) {
        const pos = player.inCar && player.car ? player.car.mesh.position : player.mesh.position;
        const d = Math.hypot(pos.x - stage.at[0], pos.z - stage.at[1]);
        el.objDist.textContent = `${Math.round(d)}m away`;
      } else el.objDist.textContent = '';
    } else if (missions.won) {
      el.objTitle.textContent = 'The Big Score — done!';
      el.objText.textContent = 'Sunset Bay is yours, Rook.';
      el.objDist.textContent = '';
    }
    el.timer.textContent = missions.timer > 0 ? `${Math.ceil(missions.timer)}s` : '';
    if (player.inCar && player.car) {
      el.speed.innerHTML = `${Math.round(Math.abs(player.car.speed) * 3.6)} <small>km/h</small>`;
      el.ammo.textContent = '';
      el.crosshair.style.display = 'none';
    } else {
      el.speed.textContent = '';
      el.ammo.textContent = `Pistol ${player.ammo} / 12 — F to fire, R to reload`;
      el.crosshair.style.display = 'block';
    }
    el.carHint.style.display = (!player.inCar && G.nearestCar) ? 'block' : 'none';
    drawMinimap(G);
  }

  return { el, update, showMessage };
}
