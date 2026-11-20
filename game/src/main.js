// Sunset Bay Heist — boot and the one loop. The game moves between title, play,
// paused and end screens; the world advances in fixed 1/60 s steps and the
// renderer paints what is there. ?shot=chase|drive|mission|start (with &seed=N)
// stages that scene for a screenshot instead of waiting for a player, drives it
// with an autopilot, and sets window.__shotReady when the frame is ready.
import * as THREE from 'three';
import { CITY_HALF, STEP } from './config.js';
import { createRandom } from './random.js';
import { createInput, ACTION_ENTER_CAR, ACTION_SHOOT, ACTION_RELOAD, ACTION_PAUSE, ACTION_MUTE } from './input.js';
import { createAudio } from './audio.js';
import { createCity } from './city.js';
import { createTraffic, createParkedCars, createPolice, updateTraffic, updatePolice } from './vehicles.js';
import { createPlayer, createPedestrians, enterCar, shootPistol, updatePlayer, updatePedestrians, updateGangsters, addWanted } from './player.js';
import { createMissions, updateMissions, saveGame, loadSave, applySave, currentMission } from './missions.js';
import { createHud } from './hud.js';
import { stageShot } from './shots.js';

const MAX_FRAME = 0.25;
const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 900);

const random = createRandom(seed);
const audio = createAudio();
const input = createInput(canvas);
const hud = createHud();
const city = createCity(scene, random);
const trafficCars = createTraffic(scene, random);
const parkedCars = createParkedCars(scene, random);
const police = createPolice(scene);
const player = createPlayer(scene);
const pedestrians = createPedestrians(scene, random, 22);
const missions = createMissions();

const G = {
  scene, camera, renderer, city, input, audio, hud,
  trafficCars, parkedCars, police, player, pedestrians,
  gangsters: [], missions, time: 0, cameraYaw: 0, cameraPitch: 0.32,
  nearestCar: null, autopilot: false, autopilotTarget: null,
  showMessage: (t, s) => hud.showMessage(t, s),
  onCarStolen: null,
  onWin: null,
  onPlayerDown: null,
  onMissionFailed: null,
  shotMode: !!shot,
};
window.__G = G;

let screen = 'title';
let paused = false;
let accumulator = 0;
let shotReady = false;

function announce(message) { status.textContent = message; }

function updateCamera(dt) {
  const pos = player.inCar && player.car ? player.car.mesh.position : player.mesh.position;
  if (screen === 'title') {
    const t = G.time * 0.05;
    camera.position.set(Math.cos(t) * 130, 55 + Math.sin(t * 0.7) * 8, Math.sin(t) * 130);
    camera.lookAt(0, 8, 0);
    return;
  }
  const dist = player.inCar ? 11 : 7.5;
  const height = player.inCar ? 4.6 : 3.6;
  const fx = -Math.sin(G.cameraYaw);
  const fz = -Math.cos(G.cameraYaw);
  const tx = pos.x - fx * dist;
  const tz = pos.z - fz * dist;
  camera.position.x += (tx - camera.position.x) * Math.min(1, dt * 6);
  camera.position.y += (pos.y + height - camera.position.y) * Math.min(1, dt * 6);
  camera.position.z += (tz - camera.position.z) * Math.min(1, dt * 6);
  camera.lookAt(pos.x + fx * 5, pos.y + 1.6, pos.z + fz * 5);
}

function showEnd(title, text) {
  screen = 'over';
  document.getElementById('endTitle').textContent = title;
  document.getElementById('endText').textContent = text;
  document.getElementById('endScreen').classList.remove('hidden');
  hud.el.hud.style.display = 'none';
  audio.setEngine(false, 0);
  audio.setSiren(false, 0);
  audio.busted();
  announce(`${title}. ${text}`);
}

G.onWin = () => {
  saveGame(player, missions);
  showEnd('THE BIG SCORE!', `You robbed the Sunset Bank and escaped to the yacht with $${player.cash.toLocaleString()}. Sunset Bay is yours, Rook — the crew is paid, the debt is gone, and the sun is still setting over the bay.`);
};
G.onPlayerDown = () => {
  player.health = 0;
  showEnd('WASTED', 'The Bayview crew got you. Rook Marlowe is done — but the city forgets fast. Try the job again.');
};
G.onMissionFailed = (text) => {
  hud.showMessage(text, 4);
  audio.busted();
};

function startGame(fromSave) {
  const save = fromSave ? loadSave() : null;
  if (save) applySave(player, missions, save);
  else {
    player.cash = 0;
    player.health = 100;
    player.wanted = 0;
    missions.index = 0;
    missions.stage = 0;
  }
  document.getElementById('titleScreen').classList.add('hidden');
  document.getElementById('endScreen').classList.add('hidden');
  document.getElementById('pauseScreen').classList.add('hidden');
  hud.el.hud.style.display = 'block';
  screen = 'play';
  audio.unlock();
  audio.click();
  announce('Playing. Steal a car and run the first job.');
  hud.showMessage(currentMission(missions) ? currentMission(missions).text : 'Free roam — Sunset Bay is yours.', 5);
}

function togglePause() {
  if (screen !== 'play' && !paused) return;
  paused = !paused;
  document.getElementById('pauseScreen').classList.toggle('hidden', !paused);
  announce(paused ? 'Paused.' : 'Playing.');
}

function handleActions() {
  const actions = input.takeActions();
  if (actions & ACTION_MUTE) audio.setMuted(!audio.isMuted());
  if (screen === 'play') {
    if (actions & ACTION_PAUSE) togglePause();
    if (paused) return;
    if (actions & ACTION_ENTER_CAR) enterCar(G);
    if (actions & ACTION_SHOOT) shootPistol(G);
    if (actions & ACTION_RELOAD) {
      player.ammo = 12;
      hud.showMessage('Reloaded.');
      audio.click();
    }
  }
}

function step(dt) {
  G.time += dt;
  if (screen !== 'play' || paused) return;
  updatePlayer(G, dt);
  updateTraffic(trafficCars, dt, player.mesh.position);
  updatePolice(police, scene, dt, player.inCar && player.car ? player.car.mesh.position : player.mesh.position, player.inCar, player.wanted, (d) => {
    if (player.hurtTimer <= 0) {
      player.health -= 4;
      player.hurtTimer = 0.5;
      if (player.health <= 0) { showEnd('BUSTED', 'The Sunset Bay police ran you down. The cell door is already closing — try the job again.'); }
    }
  }, random);
  updatePedestrians(G, dt);
  updateGangsters(G, dt);
  updateMissions(G, dt);
  audio.setSiren(player.wanted > 0, dt);
  // The beacon's diamond spins above the current objective.
  if (city.beacon.visible) {
    city.beacon.children[1].rotation.y += dt * 2;
    city.beacon.children[1].position.y = 12 + Math.sin(G.time * 2) * 0.8;
  }
  if (player.health <= 0 && screen === 'play') {
    showEnd('WASTED', 'Rook is down. The city moves on — try the job again.');
  }
}

function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min((now - (frame.last || now)) / 1000, MAX_FRAME);
  frame.last = now;
  handleActions();
  if (screen === 'play' || screen === 'title') {
    accumulator += dt;
    while (accumulator >= STEP) { step(STEP); accumulator -= STEP; }
  }
  updateCamera(dt);
  hud.update(G);
  renderer.render(scene, camera);
  // In shot mode the scene is ready once the game has run a couple of seconds
  // (the autopilot has driven into frame and the chase is on), not after a
  // fixed number of frames — software rendering runs far slower than 60 fps.
  if (shot && !shotReady && G.time > 2.2) { window.__shotReady = true; shotReady = true; }
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

document.getElementById('startBtn').addEventListener('click', () => startGame(false));
document.getElementById('continueBtn').addEventListener('click', () => startGame(true));
document.getElementById('resumeBtn').addEventListener('click', togglePause);
document.getElementById('saveBtn').addEventListener('click', () => { saveGame(player, missions); hud.showMessage('Game saved.'); });
document.getElementById('restartBtn').addEventListener('click', () => window.location.reload());
document.getElementById('endRetryBtn').addEventListener('click', () => window.location.reload());
document.getElementById('endTitleBtn').addEventListener('click', () => window.location.reload());

// A saved game is offered on the title screen when one exists.
if (loadSave()) document.getElementById('continueBtn').classList.remove('hidden');

// Screenshot staging: set the scene up, then run the normal loop with an autopilot.
if (shot) {
  stageShot(G, shot);
  if (shot !== 'start') {
    document.getElementById('titleScreen').classList.add('hidden');
    hud.el.hud.style.display = 'block';
    screen = 'play';
  }
} else {
  announce('Sunset Bay Heist. Press Start to play.');
}

camera.position.set(0, 40, 120);
camera.lookAt(0, 0, 0);
requestAnimationFrame(frame);
