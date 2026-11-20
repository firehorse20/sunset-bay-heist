// Rook Marlowe on foot and behind the wheel, plus the people of Sunset Bay:
// pedestrians who stroll the sidewalks and flee from trouble, and the Bayview
// gangsters who shoot at Rook during the bank job. Combat is a simple pistol with
// a raycast, a tracer line and a muzzle flash — no hitscan magic, no gore.
import * as THREE from 'three';
import { CAR, CITY_HALF, PLAYER, WANTED } from './config.js';
import { collideCircle, nearestRoadCoord } from './city.js';
import { pick, range } from './random.js';

const PED_COLORS = [0xe8b04b, 0x7fb069, 0xd6688a, 0x5a8fd6, 0xc9c9c9, 0x8a6fd6, 0xe07a5f];

function makePersonMesh(jacketColor, pantsColor) {
  const group = new THREE.Group();
  const jacket = new THREE.MeshLambertMaterial({ color: jacketColor });
  const pants = new THREE.MeshLambertMaterial({ color: pantsColor });
  const skin = new THREE.MeshLambertMaterial({ color: 0xd9a066 });
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.75, 0.36), jacket);
  torso.position.y = 1.05;
  group.add(torso);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.26, 10, 8), skin);
  head.position.y = 1.62;
  group.add(head);
  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.7, 0.24), pants);
  legL.position.set(-0.16, 0.35, 0);
  group.add(legL);
  const legR = legL.clone();
  legR.position.x = 0.16;
  group.add(legR);
  const armL = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.65, 0.18), jacket);
  armL.position.set(-0.4, 1.05, 0);
  group.add(armL);
  const armR = armL.clone();
  armR.position.x = 0.4;
  group.add(armR);
  group.userData.legL = legL;
  group.userData.legR = legR;
  group.userData.armL = armL;
  group.userData.armR = armR;
  return group;
}

export function createPlayer(scene) {
  const mesh = makePersonMesh(0x2e86c1, 0x2a2a33);
  mesh.position.set(0, 0, 20);
  scene.add(mesh);
  return {
    mesh, angle: 0, speed: 0, health: PLAYER.healthMax, cash: 0,
    wanted: 0, ammo: PLAYER.pistolAmmo, inCar: false, car: null,
    quietTime: 0, lastCrimeAt: -999, hurtTimer: 0, walkPhase: 0,
  };
}

export function createPedestrians(scene, random, count) {
  const peds = [];
  for (let i = 0; i < count; i += 1) {
    const mesh = makePersonMesh(pick(random, PED_COLORS), pick(random, [0x2a2a33, 0x5a4a3a, 0x3a3a4a]));
    const road = nearestRoadCoord(range(random, -170, 170));
    const along = range(random, -170, 170);
    const onXRoad = random() < 0.5;
    mesh.position.set(onXRoad ? along : road + (random() < 0.5 ? 9 : -9), 0, onXRoad ? road + (random() < 0.5 ? 9 : -9) : along);
    scene.add(mesh);
    peds.push({
      mesh, angle: random() * Math.PI * 2, speed: range(random, 1.2, 2.2),
      state: 'walk', fleeTimer: 0, down: false, walkPhase: random() * 6,
    });
  }
  return peds;
}

export function createGangsters(scene, positions) {
  const gang = [];
  for (const [x, z] of positions) {
    const mesh = makePersonMesh(0xc0392b, 0x1a1a1a);
    mesh.position.set(x, 0, z);
    scene.add(mesh);
    gang.push({ mesh, angle: 0, health: 100, alive: true, shootTimer: range(Math.random, 0.5, 1.5), walkPhase: 0 });
  }
  return gang;
}

function animateWalk(mesh, phase, speedNorm) {
  const swing = Math.sin(phase) * 0.5 * speedNorm;
  mesh.userData.legL.rotation.x = swing;
  mesh.userData.legR.rotation.x = -swing;
  mesh.userData.armL.rotation.x = -swing * 0.8;
  mesh.userData.armR.rotation.x = swing * 0.8;
}

export function addWanted(player, stars, now) {
  player.wanted = Math.min(WANTED.maxStars, player.wanted + stars);
  player.lastCrimeAt = now;
  player.quietTime = 0;
}

export function updatePlayer(G, dt) {
  const { player, input, audio } = G;
  const now = G.time;
  if (player.hurtTimer > 0) player.hurtTimer -= dt;
  // Wanted decays after a quiet spell with no new crime.
  if (player.wanted > 0) {
    if (now - player.lastCrimeAt > WANTED.decayQuietSeconds) {
      player.quietTime += dt;
      if (player.quietTime > WANTED.decayStepSeconds) {
        player.wanted -= 1;
        player.quietTime = 0;
        if (player.wanted === 0) G.showMessage('You lost them. The heat is off.');
      }
    } else player.quietTime = 0;
  }

  if (player.inCar && player.car) {
    updateDriving(G, dt);
    return;
  }

  // On foot: WASD relative to the camera yaw.
  const drag = input.takeDrag();
  G.cameraYaw -= drag.yaw;
  G.cameraPitch = Math.max(-0.15, Math.min(0.55, G.cameraPitch + drag.pitch));
  const fwd = input.forward();
  const str = input.strafe();
  const moving = fwd !== 0 || str !== 0;
  const speed = input.run() ? PLAYER.runSpeed : PLAYER.walkSpeed;
  if (moving) {
    const sin = Math.sin(G.cameraYaw);
    const cos = Math.cos(G.cameraYaw);
    let dx = (-sin * fwd + cos * str);
    let dz = (-cos * fwd - sin * str);
    const len = Math.hypot(dx, dz) || 1;
    dx /= len;
    dz /= len;
    let nx = player.mesh.position.x + dx * speed * dt;
    let nz = player.mesh.position.z + dz * speed * dt;
    nx = Math.max(-CITY_HALF, Math.min(CITY_HALF, nx));
    nz = Math.max(-CITY_HALF, Math.min(CITY_HALF, nz));
    const res = collideCircle(G.city.colliders, nx, nz, PLAYER.radius);
    player.mesh.position.x = res.x;
    player.mesh.position.z = res.z;
    player.angle = Math.atan2(dx, dz);
    player.mesh.rotation.y = player.angle;
    player.walkPhase += dt * speed * 1.4;
    animateWalk(player.mesh, player.walkPhase, 1);
    player.speed = speed;
  } else {
    animateWalk(player.mesh, player.walkPhase, 0);
    player.speed = 0;
  }
  audio.setEngine(false, 0);
  G.nearestCar = nearestCar(G, 4.5);
}

function nearestCar(G, maxDist) {
  let best = null;
  let bestDist = maxDist;
  for (const car of [...G.parkedCars, ...G.trafficCars]) {
    if (car.kind === 'player') continue;
    const d = car.mesh.position.distanceTo(G.player.mesh.position);
    if (d < bestDist) { bestDist = d; best = car; }
  }
  return best;
}

export function enterCar(G) {
  const { player } = G;
  if (player.inCar) {
    // Step out beside the car.
    const car = player.car;
    player.inCar = false;
    player.car = null;
    car.kind = 'parked';
    const side = Math.cos(player.angle) > 0 ? 1 : -1;
    player.mesh.position.set(car.mesh.position.x + side * 2.6, 0, car.mesh.position.z + 1.5);
    player.mesh.visible = true;
    G.showMessage('You got out of the car.');
    return;
  }
  const car = G.nearestCar;
  if (!car) return;
  player.inCar = true;
  player.car = car;
  car.kind = 'player';
  car.stolen = true;
  car.speed = 0;
  player.mesh.visible = false;
  addWanted(player, 1, G.time);
  G.audio.crash();
  G.showMessage('Car stolen! The police are on to you.');
  G.onCarStolen?.();
}

function updateDriving(G, dt) {
  const { player, input, audio } = G;
  const car = player.car;
  let fwd = input.forward();
  let steer = input.strafe();
  if (G.autopilot && G.autopilotTarget) {
    // Drive toward the target point: full throttle, steer by the angle to it.
    fwd = 1;
    const dx = G.autopilotTarget.x - car.mesh.position.x;
    const dz = G.autopilotTarget.z - car.mesh.position.z;
    const want = Math.atan2(dx, dz);
    let diff = want - car.angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    steer = Math.max(-1, Math.min(1, diff * 2));
  }
  const handbrake = input.handbrake();
  const drag = input.takeDrag();
  G.cameraYaw -= drag.yaw;
  G.cameraPitch = Math.max(-0.1, Math.min(0.5, G.cameraPitch + drag.pitch));
  if (fwd > 0) car.speed += CAR.accel * dt;
  else if (fwd < 0) car.speed -= (car.speed > 0 ? CAR.brake : CAR.reverseAccel) * dt;
  else car.speed -= Math.sign(car.speed) * Math.min(Math.abs(car.speed), 8 * dt);
  if (handbrake) car.speed -= Math.sign(car.speed) * Math.min(Math.abs(car.speed), 30 * dt);
  car.speed = Math.max(-CAR.maxReverse, Math.min(CAR.maxSpeed, car.speed));
  if (Math.abs(car.speed) > 0.3) {
    const steerAmount = steer * CAR.steer * dt * Math.sign(car.speed) * Math.min(1, Math.abs(car.speed) / 10 + 0.35);
    car.angle += steerAmount;
  }
  let nx = car.mesh.position.x + Math.sin(car.angle) * car.speed * dt;
  let nz = car.mesh.position.z + Math.cos(car.angle) * car.speed * dt;
  nx = Math.max(-CITY_HALF, Math.min(CITY_HALF, nx));
  nz = Math.max(-CITY_HALF, Math.min(CITY_HALF, nz));
  const res = collideCircle(G.city.colliders, nx, nz, CAR.radius);
  if (res.hit && Math.abs(car.speed) > 8) {
    car.speed *= 0.4;
    car.health -= 6;
    audio.crash();
    if (car.health <= 0) {
      G.showMessage('The car is wrecked! Get out!');
      enterCar(G);
      return;
    }
  }
  car.mesh.position.x = res.x;
  car.mesh.position.z = res.z;
  car.mesh.rotation.y = car.angle;
  player.angle = car.angle;
  for (const w of car.mesh.userData.wheels) w.rotation.x += car.speed * dt * 2;
  // Running over a pedestrian is a crime — and it is felt.
  for (const ped of G.pedestrians) {
    if (ped.down) continue;
    const d = ped.mesh.position.distanceTo(car.mesh.position);
    if (d < 2.4 && Math.abs(car.speed) > 5) {
      ped.down = true;
      ped.mesh.rotation.z = Math.PI / 2;
      ped.mesh.position.y = 0.4;
      addWanted(player, 2, G.time);
      audio.crash();
      G.showMessage('You hit a pedestrian! Wanted level up.');
    }
  }
  audio.setEngine(true, Math.abs(car.speed) / CAR.maxSpeed);
  G.nearestCar = null;
}

export function shootPistol(G) {
  const { player, audio } = G;
  if (player.inCar || player.ammo <= 0) {
    if (!player.inCar && player.ammo <= 0) G.showMessage('Out of ammo — press R to reload.');
    return;
  }
  player.ammo -= 1;
  audio.gunshot();
  addWanted(player, 1, G.time);
  // Muzzle flash + tracer from the player toward the camera's aim.
  const origin = player.mesh.position.clone();
  origin.y = 1.4;
  const dir = new THREE.Vector3(-Math.sin(G.cameraYaw), 0, -Math.cos(G.cameraYaw));
  const end = origin.clone().add(dir.clone().multiplyScalar(PLAYER.pistolRange));
  const flash = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffe9a8 }));
  flash.position.copy(origin).add(dir.clone().multiplyScalar(0.8));
  G.scene.add(flash);
  const lineGeo = new THREE.BufferGeometry().setFromPoints([origin, end]);
  const line = new THREE.Line(lineGeo, new THREE.LineBasicMaterial({ color: 0xffe9a8, transparent: true, opacity: 0.9 }));
  G.scene.add(line);
  setTimeout(() => { G.scene.remove(flash); G.scene.remove(line); }, 90);
  // Hit the nearest gangster or police car near the aim line.
  let best = null;
  let bestD = PLAYER.pistolRange;
  for (const g of G.gangsters) {
    if (!g.alive) continue;
    const to = g.mesh.position.clone().sub(origin);
    const along = to.dot(dir);
    if (along < 0 || along > PLAYER.pistolRange) continue;
    const perp = to.clone().sub(dir.clone().multiplyScalar(along)).length();
    if (perp < 1.6 && along < bestD) { bestD = along; best = { kind: 'gangster', obj: g }; }
  }
  for (const car of G.police.cars) {
    const to = car.mesh.position.clone().sub(origin);
    const along = to.dot(dir);
    if (along < 0 || along > PLAYER.pistolRange) continue;
    const perp = to.clone().sub(dir.clone().multiplyScalar(along)).length();
    if (perp < 2.4 && along < bestD) { bestD = along; best = { kind: 'police', obj: car }; }
  }
  if (best) {
    if (best.kind === 'gangster') {
      best.obj.health -= PLAYER.pistolDamage;
      if (best.obj.health <= 0) {
        best.obj.alive = false;
        best.obj.mesh.rotation.z = Math.PI / 2;
        best.obj.mesh.position.y = 0.4;
        G.showMessage('Gangster down.');
      }
    } else {
      best.obj.health -= PLAYER.pistolDamage;
      if (best.obj.health <= 0) {
        best.obj.speed = 0;
        G.showMessage('Police car disabled!');
      }
    }
  }
  // Nearby pedestrians scatter at the sound.
  for (const ped of G.pedestrians) {
    if (!ped.down && ped.mesh.position.distanceTo(origin) < 25) {
      ped.state = 'flee';
      ped.fleeTimer = 3;
    }
  }
}

export function updatePedestrians(G, dt) {
  const { player } = G;
  for (const ped of G.pedestrians) {
    if (ped.down) continue;
    const pos = ped.mesh.position;
    let speed = ped.speed;
    if (ped.state === 'flee') {
      ped.fleeTimer -= dt;
      speed = 5;
      const away = pos.clone().sub(player.mesh.position).setY(0).normalize();
      ped.angle = Math.atan2(away.x, away.z);
      if (ped.fleeTimer <= 0) ped.state = 'walk';
    } else {
      // Stroll along a sidewalk; turn at random.
      if (Math.random() < dt * 0.08) ped.angle += (Math.random() - 0.5) * 1.6;
      // Stay near a road line.
      const rx = nearestRoadCoord(pos.x);
      const rz = nearestRoadCoord(pos.z);
      if (Math.abs(pos.x - rx) > 10 && Math.abs(pos.z - rz) > 10) ped.angle = Math.atan2(rx - pos.x, rz - pos.z);
    }
    let nx = pos.x + Math.sin(ped.angle) * speed * dt;
    let nz = pos.z + Math.cos(ped.angle) * speed * dt;
    nx = Math.max(-CITY_HALF, Math.min(CITY_HALF, nx));
    nz = Math.max(-CITY_HALF, Math.min(CITY_HALF, nz));
    const res = collideCircle(G.city.colliders, nx, nz, 0.5);
    pos.x = res.x;
    pos.z = res.z;
    ped.mesh.rotation.y = ped.angle;
    ped.walkPhase += dt * speed * 2;
    animateWalk(ped.mesh, ped.walkPhase, 0.8);
  }
}

export function updateGangsters(G, dt) {
  const { player } = G;
  for (const g of G.gangsters) {
    if (!g.alive) continue;
    const pos = g.mesh.position;
    const dist = pos.distanceTo(player.mesh.position);
    g.angle = Math.atan2(player.mesh.position.x - pos.x, player.mesh.position.z - pos.z);
    g.mesh.rotation.y = g.angle;
    g.shootTimer -= dt;
    if (dist < 42 && g.shootTimer <= 0) {
      g.shootTimer = 1.4 + Math.random() * 0.8;
      // A red tracer back at the player; a hit hurts unless Rook is far or in a car.
      const origin = pos.clone(); origin.y = 1.4;
      const target = player.mesh.position.clone(); target.y = 1.2;
      const lineGeo = new THREE.BufferGeometry().setFromPoints([origin, target]);
      const line = new THREE.Line(lineGeo, new THREE.LineBasicMaterial({ color: 0xff4444, transparent: true, opacity: 0.8 }));
      G.scene.add(line);
      setTimeout(() => G.scene.remove(line), 120);
      G.audio.gunshot();
      if (dist < 30 && player.hurtTimer <= 0 && !G.shotMode) {
        player.health -= player.inCar ? 3 : 8;
        player.hurtTimer = 0.6;
        if (player.health <= 0) G.onPlayerDown?.();
      }
    }
  }
}
