// The five jobs of Sunset Bay Heist, in story order. Each mission is a list of
// stages — steal a car, reach a marker, wait somewhere, lose the police, beat a
// clock — and the game advances a stage when its condition is met. Completing a
// mission pays cash, saves the game and starts the next one; finishing the fifth
// is the win. The beacon in the city always points at the current target.
import { MISSIONS } from './config.js';
import { addWanted, createGangsters } from './player.js';

export function createMissions() {
  return { index: 0, stage: 0, timer: 0, waitTimer: 0, done: false, won: false, gangstersSpawned: false };
}

export function currentMission(missions) {
  return MISSIONS[missions.index] || null;
}

export function currentStage(missions) {
  const m = currentMission(missions);
  return m ? m.stages[missions.stage] : null;
}

export function saveGame(player, missions) {
  try {
    window.localStorage.setItem('sunset-bay-heist.save.v1', JSON.stringify({
      cash: player.cash, missionIndex: missions.index, health: player.health,
    }));
  } catch { /* storage can be off; the game still plays */ }
}

export function loadSave() {
  try {
    const raw = window.localStorage.getItem('sunset-bay-heist.save.v1');
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function applySave(player, missions, save) {
  if (!save) return false;
  player.cash = save.cash || 0;
  player.health = save.health || 100;
  missions.index = Math.min(save.missionIndex || 0, MISSIONS.length - 1);
  missions.stage = 0;
  return true;
}

function stageTarget(stage) {
  return stage && stage.at ? { x: stage.at[0], z: stage.at[1] } : null;
}

export function updateMissions(G, dt) {
  const { missions, player } = G;
  if (missions.done) return;
  const mission = currentMission(missions);
  if (!mission) { missions.done = true; return; }
  const stage = currentStage(missions);
  if (!stage) return;
  const pos = player.inCar && player.car ? player.car.mesh.position : player.mesh.position;
  const target = stageTarget(stage);

  // Move the beacon to the current target.
  if (target) {
    G.city.beacon.visible = true;
    G.city.beacon.position.set(target.x, 0, target.z);
  } else {
    G.city.beacon.visible = false;
  }

  // The bank job spawns its gangsters once, when Rook arrives at the bank.
  if (mission.id === 'the-big-score' && !missions.gangstersSpawned && stage.kind === 'wait') {
    missions.gangstersSpawned = true;
    const spots = [[-8, -152], [8, -152], [-14, -168], [14, -168]];
    G.gangsters.push(...createGangsters(G.scene, spots));
    G.showMessage('Bayview crew! They are guarding the bank — fight through!');
  }

  function completeStage() {
    missions.stage += 1;
    missions.waitTimer = 0;
    G.audio.pickup();
    if (missions.stage >= mission.stages.length) {
      player.cash += mission.reward;
      G.showMessage(`${mission.title} complete! +$${mission.reward}`);
      G.audio.missionDone();
      saveGame(player, missions);
      missions.index += 1;
      missions.stage = 0;
      missions.gangstersSpawned = false;
      if (missions.index >= MISSIONS.length) {
        missions.done = true;
        missions.won = true;
        G.onWin?.();
      }
    }
  }

  if (stage.kind === 'steal-car') {
    if (player.inCar) completeStage();
    return;
  }
  if (stage.kind === 'goto' || stage.kind === 'timed') {
    if (stage.wanted && player.wanted < stage.wanted) addWanted(player, stage.wanted - player.wanted, G.time);
    if (stage.kind === 'timed') {
      if (missions.timer <= 0) missions.timer = stage.seconds;
      missions.timer -= dt;
      if (missions.timer <= 0) {
        G.onMissionFailed?.('Out of time! The run is blown — try the job again.');
        missions.stage = 0;
        missions.timer = 0;
        return;
      }
    }
    if (target) {
      const d = Math.hypot(pos.x - target.x, pos.z - target.z);
      if (d < stage.radius) {
        missions.timer = 0;
        completeStage();
      }
    }
    return;
  }
  if (stage.kind === 'wait') {
    if (stage.wanted && player.wanted < stage.wanted) addWanted(player, stage.wanted - player.wanted, G.time);
    if (target) {
      const d = Math.hypot(pos.x - target.x, pos.z - target.z);
      if (d < stage.radius) {
        missions.waitTimer += dt;
        if (missions.waitTimer >= stage.seconds) completeStage();
      } else missions.waitTimer = 0;
    }
    return;
  }
  if (stage.kind === 'lose-wanted') {
    if (player.wanted === 0) completeStage();
  }
}
