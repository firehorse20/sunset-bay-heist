// Cars: a box-built car factory, the traffic that fills the roads, and the police
// that chase the player when the wanted level rises. Traffic follows the road grid
// in lanes and slows for the car ahead; police steer straight at the player.
import * as THREE from 'three';
import { CITY_HALF, POLICE, ROADS } from './config.js';
import { pick, range } from './random.js';

const TRAFFIC_COLORS = [0xc0392b, 0x2e86c1, 0x28a745, 0xf39c12, 0x8e44ad, 0x95a5a6, 0xe74c3c, 0x16a085, 0xd4ac0d, 0x5d6d7e];
const TRAFFIC_COUNT = 14;

export function createCarMesh(color, kind) {
  const group = new THREE.Group();
  const bodyMat = new THREE.MeshLambertMaterial({ color });
  const darkMat = new THREE.MeshLambertMaterial({ color: 0x1a1a22 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(2, 0.7, 4.4), bodyMat);
  body.position.y = 0.65;
  group.add(body);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.65, 2.2), new THREE.MeshLambertMaterial({ color: 0x222a38 }));
  cabin.position.set(0, 1.3, -0.2);
  group.add(cabin);
  const wheelGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.35, 12);
  const wheels = [];
  for (const [wx, wz] of [[-0.95, 1.4], [0.95, 1.4], [-0.95, -1.4], [0.95, -1.4]]) {
    const wheel = new THREE.Mesh(wheelGeo, darkMat);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(wx, 0.42, wz);
    group.add(wheel);
    wheels.push(wheel);
  }
  const lightMat = new THREE.MeshBasicMaterial({ color: 0xfff2b0 });
  for (const wx of [-0.6, 0.6]) {
    const light = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.2, 0.1), lightMat);
    light.position.set(wx, 0.7, 2.25);
    group.add(light);
  }
  const tailMat = new THREE.MeshBasicMaterial({ color: 0xff2a2a });
  for (const wx of [-0.6, 0.6]) {
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.2, 0.1), tailMat);
    tail.position.set(wx, 0.7, -2.25);
    group.add(tail);
  }
  let lightBar = null;
  if (kind === 'police') {
    lightBar = new THREE.Group();
    const red = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.25, 0.5), new THREE.MeshBasicMaterial({ color: 0xff2222 }));
    red.position.set(-0.35, 1.75, -0.2);
    const blue = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.25, 0.5), new THREE.MeshBasicMaterial({ color: 0x2266ff }));
    blue.position.set(0.35, 1.75, -0.2);
    lightBar.add(red, blue);
    lightBar.userData.red = red;
    lightBar.userData.blue = blue;
    group.add(lightBar);
  }
  group.userData.wheels = wheels;
  group.userData.lightBar = lightBar;
  return group;
}

function randomLaneSpot(random) {
  const road = pick(random, ROADS);
  const alongX = random() < 0.5;
  const lane = range(random, -2.2, 2.2) + (random() < 0.5 ? -2.2 : 2.2);
  const along = range(random, -CITY_HALF, CITY_HALF);
  if (alongX) return { x: along, z: road + lane, angle: lane > 0 ? Math.PI / 2 : -Math.PI / 2, axis: 'x', dir: lane > 0 ? 1 : -1, road };
  return { x: road + lane, z: along, angle: lane > 0 ? 0 : Math.PI, axis: 'z', dir: lane > 0 ? 1 : -1, road };
}

export function createTraffic(scene, random) {
  const cars = [];
  for (let i = 0; i < TRAFFIC_COUNT; i += 1) {
    const spot = randomLaneSpot(random);
    const mesh = createCarMesh(pick(random, TRAFFIC_COLORS), 'traffic');
    mesh.position.set(spot.x, 0, spot.z);
    mesh.rotation.y = spot.angle;
    scene.add(mesh);
    cars.push({
      mesh, kind: 'traffic', angle: spot.angle, speed: range(random, 8, 14),
      cruiseSpeed: range(random, 8, 14),
      axis: spot.axis, dir: spot.dir, road: spot.road, health: 100, stolen: false,
    });
  }
  return cars;
}

export function createParkedCars(scene, random) {
  const cars = [];
  const spots = [
    [6, 20, 0.3], [-6, 44, -0.2], [44, 6, 1.4], [-44, -6, -1.5], [86, -34, 0.1],
    [-86, 34, 0.5], [126, 46, 1.6], [-126, -46, -0.4], [46, -86, 0.2], [-46, 86, 1.2],
    [166, -6, 0.0], [-166, 6, 3.1], [6, -166, 1.57], [-6, 166, -1.57],
  ];
  for (const [x, z, angle] of spots) {
    const mesh = createCarMesh(pick(random, TRAFFIC_COLORS), 'parked');
    mesh.position.set(x, 0, z);
    mesh.rotation.y = angle;
    scene.add(mesh);
    cars.push({ mesh, kind: 'parked', angle, speed: 0, health: 100, stolen: false });
  }
  return cars;
}

export function updateTraffic(cars, dt, playerPos) {
  for (const car of cars) {
    if (car.kind !== 'traffic') continue;
    // Slow down for the car ahead in the same lane.
    let targetSpeed = car.cruiseSpeed || car.speed;
    for (const other of cars) {
      if (other === car || other.kind !== 'traffic') continue;
      const dx = other.mesh.position.x - car.mesh.position.x;
      const dz = other.mesh.position.z - car.mesh.position.z;
      const ahead = car.axis === 'x' ? dx * car.dir : dz * car.dir;
      const side = car.axis === 'x' ? Math.abs(dz) : Math.abs(dx);
      if (ahead > 0 && ahead < 9 && side < 3) { targetSpeed = Math.min(targetSpeed, 4); break; }
    }
    // Flee a little when the player barrels through.
    const pd = car.mesh.position.distanceTo(playerPos);
    if (pd < 6) targetSpeed = Math.min(targetSpeed, 6);
    car.speed += (targetSpeed - car.speed) * Math.min(1, dt * 2);
    if (car.axis === 'x') {
      car.mesh.position.x += car.dir * car.speed * dt;
      if (car.mesh.position.x > CITY_HALF + 10) car.mesh.position.x = -CITY_HALF - 10;
      if (car.mesh.position.x < -CITY_HALF - 10) car.mesh.position.x = CITY_HALF + 10;
    } else {
      car.mesh.position.z += car.dir * car.speed * dt;
      if (car.mesh.position.z > CITY_HALF + 10) car.mesh.position.z = -CITY_HALF - 10;
      if (car.mesh.position.z < -CITY_HALF - 10) car.mesh.position.z = CITY_HALF + 10;
    }
    car.mesh.rotation.y = car.angle;
    for (const w of car.mesh.userData.wheels) w.rotation.x += car.speed * dt * 2;
  }
}

export function createPolice(scene) {
  return { cars: [], spawnTimer: 0 };
}

export function updatePolice(police, scene, dt, playerPos, playerInCar, wanted, onRam, random) {
  const wantCount = wanted === 0 ? 0 : Math.min(POLICE.maxCars, wanted);
  police.spawnTimer -= dt;
  if (police.cars.length < wantCount && police.spawnTimer <= 0) {
    police.spawnTimer = 2.5;
    const angle = random() * Math.PI * 2;
    const x = playerPos.x + Math.cos(angle) * 70;
    const z = playerPos.z + Math.sin(angle) * 70;
    const mesh = createCarMesh(0xf2f2f2, 'police');
    mesh.position.set(Math.max(-CITY_HALF, Math.min(CITY_HALF, x)), 0, Math.max(-CITY_HALF, Math.min(CITY_HALF, z)));
    scene.add(mesh);
    police.cars.push({ mesh, kind: 'police', angle: 0, speed: 0, health: 100 });
  }
  // Too many police for the current wanted level drive off.
  while (police.cars.length > wantCount) {
    const car = police.cars.pop();
    scene.remove(car.mesh);
  }
  for (const car of police.cars) {
    // Staged police (screenshot scenes) hold a fixed spot ahead of the player
    // so the chase reads in the frame, instead of driving past out of view.
    if (car.staged) {
      car.mesh.position.x = playerPos.x + car.staged.dx;
      car.mesh.position.z = playerPos.z + car.staged.dz;
      car.angle = 0;
      car.mesh.rotation.y = 0;
      for (const w of car.mesh.userData.wheels) w.rotation.x += 30 * dt * 2;
      const bar = car.mesh.userData.lightBar;
      if (bar) {
        const phase = Math.floor(performance.now() / 250) % 2 === 0;
        bar.userData.red.material.color.setHex(phase ? 0xff2222 : 0x550000);
        bar.userData.blue.material.color.setHex(phase ? 0x112266 : 0x2266ff);
      }
      continue;
    }
    const dx = playerPos.x - car.mesh.position.x;
    const dz = playerPos.z - car.mesh.position.z;
    const dist = Math.hypot(dx, dz) || 0.001;
    const targetAngle = Math.atan2(dx, dz);
    let diff = targetAngle - car.angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    car.angle += Math.max(-2.4 * dt, Math.min(2.4 * dt, diff));
    car.speed = Math.min(POLICE.chaseSpeed, car.speed + 18 * dt);
    if (dist < 12) car.speed = Math.min(car.speed, 26);
    car.mesh.position.x += Math.sin(car.angle) * car.speed * dt;
    car.mesh.position.z += Math.cos(car.angle) * car.speed * dt;
    car.mesh.rotation.y = car.angle;
    for (const w of car.mesh.userData.wheels) w.rotation.x += car.speed * dt * 2;
    const bar = car.mesh.userData.lightBar;
    if (bar) {
      const phase = Math.floor(performance.now() / 250) % 2 === 0;
      bar.userData.red.material.color.setHex(phase ? 0xff2222 : 0x550000);
      bar.userData.blue.material.color.setHex(phase ? 0x112266 : 0x2266ff);
    }
    if (dist < 3.4) {
      onRam(dt);
      car.speed = Math.max(0, car.speed - 20 * dt);
    }
  }
}
