// Every tuning number and city constant in one place. Sunset Bay is a 400 by 400
// metre grid city: roads run every 40 metres, blocks between them hold the buildings,
// and the bay itself laps the southern edge. Nothing here depends on screen size.

export const STEP = 1 / 60;
export const SAVE_KEY = 'sunset-bay-heist.save.v1';
export const CITY_HALF = 190;
export const ROADS = [-160, -120, -80, -40, 0, 40, 80, 120, 160];
export const ROAD_WIDTH = 14;

export const PLAYER = {
  walkSpeed: 7,
  runSpeed: 12,
  radius: 0.6,
  healthMax: 100,
  pistolAmmo: 12,
  pistolDamage: 34,
  pistolRange: 60,
};

export const CAR = {
  accel: 22,
  brake: 34,
  reverseAccel: 12,
  maxSpeed: 42,
  maxReverse: 12,
  steer: 1.9,
  radius: 2.2,
};

export const WANTED = {
  decayQuietSeconds: 18,
  decayStepSeconds: 9,
  maxStars: 5,
};

export const POLICE = {
  maxCars: 4,
  chaseSpeed: 44,
  ramDamage: 6,
};

export const MISSIONS = [
  {
    id: 'first-wheels',
    title: 'Job 1 — First Wheels',
    text: 'Steal any car, then drive to the docks marker on the north-east side.',
    reward: 500,
    stages: [
      { kind: 'steal-car', text: 'Steal a car — walk up to one and press E.' },
      { kind: 'goto', at: [150, 150], radius: 8, text: 'Drive to the docks marker.' },
    ],
  },
  {
    id: 'the-pickup',
    title: 'Job 2 — The Pickup',
    text: 'Collect the package at the old warehouse, then deliver it to the garage. The crew tipped off the police — expect heat.',
    reward: 800,
    stages: [
      { kind: 'goto', at: [-140, -140], radius: 8, text: 'Drive to the warehouse pickup.' },
      { kind: 'wait', at: [-140, -140], radius: 8, seconds: 3, text: 'Wait for the package to be loaded…' },
      { kind: 'goto', at: [140, -40], radius: 8, text: 'Deliver the package to the garage.', wanted: 1 },
    ],
  },
  {
    id: 'heat-on-harbor',
    title: 'Job 3 — Heat on Harbor',
    text: 'The police are on you. Lose the wanted level, then lay low at the safehouse.',
    reward: 1000,
    stages: [
      { kind: 'lose-wanted', text: 'Lose the police — stay out of trouble until the stars clear.' },
      { kind: 'goto', at: [-150, 150], radius: 8, text: 'Reach the safehouse on the south-west side.' },
    ],
  },
  {
    id: 'bay-bridge-run',
    title: 'Job 4 — Bay Bridge Run',
    text: 'A timed run across the city. Hit every checkpoint before the clock runs out.',
    reward: 1500,
    stages: [
      { kind: 'timed', at: [120, -120], radius: 9, seconds: 100, text: 'Checkpoint 1 of 3 — north-east bridge.' },
      { kind: 'timed', at: [-120, -120], radius: 9, seconds: 100, text: 'Checkpoint 2 of 3 — north-west bridge.' },
      { kind: 'timed', at: [0, 160], radius: 9, seconds: 100, text: 'Checkpoint 3 of 3 — the marina.' },
    ],
  },
  {
    id: 'the-big-score',
    title: 'Job 5 — The Big Score',
    text: 'Rob the Sunset Bank, then escape to the yacht. The whole city will be after you.',
    reward: 5000,
    stages: [
      { kind: 'goto', at: [0, -160], radius: 9, text: 'Reach the Sunset Bank on the north side.' },
      { kind: 'wait', at: [0, -160], radius: 9, seconds: 8, text: 'Robbing the bank — hold on!', wanted: 3 },
      { kind: 'goto', at: [160, 170], radius: 9, text: 'Escape to the yacht at the marina!' },
    ],
  },
];

export const PALETTE = {
  skyTop: 0x2a1650,
  skyHorizon: 0xff8a3d,
  fog: 0xe88a4d,
  ground: 0x55555f,
  road: 0x33333d,
  roadLine: 0xd8c25a,
  sidewalk: 0x4a4a52,
  sea: 0x1d4e6b,
  sand: 0xc9a86a,
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';
