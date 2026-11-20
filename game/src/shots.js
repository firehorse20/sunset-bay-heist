// The screenshot scenes behind ?shot=start|drive|chase|mission. Each one sets the
// real game up in a chosen state — a car on the avenue, a three-star police chase,
// Rook on foot at the bank with the Bayview crew — and the normal loop then runs
// it with an autopilot, so the frame is what a short game really looks like and
// the same seed always gives a similar frame. main.js sets window.__shotReady
// after the scene has had time to settle.
import { addWanted } from './player.js';
import { createGangsters } from './player.js';
import { createCarMesh } from './vehicles.js';

function putPlayerInCar(G, x, z, angle) {
  // Find the nearest parked car, move it to the spot, and get in silently.
  let best = null;
  let bestD = Infinity;
  for (const car of G.parkedCars) {
    const d = Math.hypot(car.mesh.position.x - x, car.mesh.position.z - z);
    if (d < bestD) { bestD = d; best = car; }
  }
  if (!best) return;
  best.mesh.position.set(x, 0, z);
  best.angle = angle;
  best.mesh.rotation.y = angle;
  best.kind = 'player';
  best.stolen = true;
  G.player.inCar = true;
  G.player.car = best;
  G.player.mesh.visible = false;
  G.player.angle = angle;
  G.cameraYaw = Math.atan2(-Math.sin(angle), -Math.cos(angle));
}

export function stageShot(G, name) {
  const { player } = G;
  if (name === 'start') {
    // Title screen over the city at sunset; the loop's title camera orbits.
    G.cameraYaw = 0;
    return;
  }
  if (name === 'drive') {
    putPlayerInCar(G, 0, 60, Math.PI);
    G.player.car.speed = 18;
    G.autopilot = true;
    G.autopilotTarget = { x: 0, z: -160 };
    G.missions.index = 0;
    G.missions.stage = 1;
    G.cameraPitch = 0.3;
    return;
  }
  if (name === 'chase') {
    putPlayerInCar(G, 0, 40, Math.PI);
    G.player.car.speed = 24;
    G.autopilot = true;
    G.autopilotTarget = { x: 0, z: -160 };
    addWanted(player, 3, 0);
    player.cash = 2300;
    G.missions.index = 1;
    G.missions.stage = 2;
    G.police.spawnTimer = 2.5;
    // Two police cars staged ahead of the player, in frame, with their light
    // bars flashing — the chase reads at a glance. They hold their spot
    // relative to the player while the shot is staged.
    for (const staged of [{ dx: -6, dz: -18 }, { dx: 7, dz: -27 }]) {
      const mesh = createCarMesh(0xf2f2f2, 'police');
      mesh.position.set(staged.dx, 0, staged.dz);
      mesh.rotation.y = 0;
      G.scene.add(mesh);
      G.police.cars.push({ mesh, kind: 'police', angle: 0, speed: 30, health: 100, staged });
    }
    G.cameraPitch = 0.3;
    return;
  }
  if (name === 'mission') {
    // Rook on foot on the bank's road, looking west at the Sunset Bank with
    // the Bayview crew in front of it, wanted two stars.
    player.mesh.position.set(20, 0, -160);
    player.angle = -Math.PI / 2;
    player.mesh.rotation.y = -Math.PI / 2;
    G.cameraYaw = Math.PI / 2;
    G.cameraPitch = 0.32;
    addWanted(player, 2, 0);
    player.cash = 1800;
    player.ammo = 9;
    G.missions.index = 4;
    G.missions.stage = 1;
    G.missions.gangstersSpawned = true;
    // No police spawn while the shot is staged — a patrol car would drive
    // straight into the frame and hide the bank.
    G.police.spawnTimer = 999;
    const spots = [[14, -154], [14, -166], [12, -160], [-16, -160]];
    G.gangsters.push(...createGangsters(G.scene, spots));
    return;
  }
  // Any other name is the title.
  G.cameraYaw = 0;
}
