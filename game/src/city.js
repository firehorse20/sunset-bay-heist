// Sunset Bay itself: a sun-soaked grid city built from three.js boxes, with a bay at
// its southern edge. Buildings get canvas window textures, roads get dashed centre
// lines, and the mission landmarks (bank, docks, warehouse, garage, safehouse, marina)
// are distinctive buildings so the player can find them by sight as well as by beacon.
import * as THREE from 'three';
import { CITY_HALF, PALETTE, ROADS, ROAD_WIDTH } from './config.js';
import { pick, range } from './random.js';

const BUILDING_COLORS = [0xd8a06a, 0xc98a7a, 0x9ab8c9, 0xb5a06a, 0x8fa88f, 0xd0b49a, 0xa88fc9, 0x7a9ac9];
const LANDMARKS = {
  bank: { at: [0, -160], color: 0xe8dcc0, height: 34, label: 'SUNSET BANK' },
  docks: { at: [150, 150], color: 0x7a8a9a, height: 16, label: 'DOCKS' },
  warehouse: { at: [-140, -140], color: 0x9a7a5a, height: 14, label: 'WAREHOUSE' },
  garage: { at: [140, -40], color: 0x5a7a9a, height: 12, label: 'GARAGE' },
  safehouse: { at: [-150, 150], color: 0x8f7a9a, height: 12, label: 'SAFEHOUSE' },
  marina: { at: [160, 170], color: 0x5a9a8a, height: 10, label: 'MARINA' },
};

function makeFacadeTexture(random, baseColor) {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, 128, 256);
  for (let row = 0; row < 10; row += 1) {
    for (let col = 0; col < 5; col += 1) {
      const lit = random() < 0.45;
      ctx.fillStyle = lit ? '#ffd98a' : '#2a3348';
      ctx.fillRect(12 + col * 23, 14 + row * 24, 14, 15);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createCity(scene, random) {
  const colliders = [];
  const group = new THREE.Group();
  scene.add(group);

  scene.background = new THREE.Color(PALETTE.skyHorizon);
  scene.fog = new THREE.Fog(PALETTE.fog, 120, 420);

  const hemi = new THREE.HemisphereLight(0xffd9b0, 0x3a2a4a, 0.9);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffb347, 1.6);
  sun.position.set(-120, 90, -80);
  scene.add(sun);
  const fill = new THREE.DirectionalLight(0x8a7ad6, 0.35);
  fill.position.set(100, 60, 120);
  scene.add(fill);

  // Ground, sand and the bay itself.
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(CITY_HALF * 2 + 60, CITY_HALF * 2 + 60),
    new THREE.MeshLambertMaterial({ color: PALETTE.ground }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, 0, 0);
  group.add(ground);
  const sand = new THREE.Mesh(
    new THREE.PlaneGeometry(CITY_HALF * 2 + 60, 26),
    new THREE.MeshLambertMaterial({ color: PALETTE.sand }),
  );
  sand.rotation.x = -Math.PI / 2;
  sand.position.set(0, 0.02, CITY_HALF + 13);
  group.add(sand);
  const sea = new THREE.Mesh(
    new THREE.PlaneGeometry(CITY_HALF * 2 + 300, 160),
    new THREE.MeshLambertMaterial({ color: PALETTE.sea }),
  );
  sea.rotation.x = -Math.PI / 2;
  sea.position.set(0, 0.05, CITY_HALF + 106);
  group.add(sea);

  // Roads: dark strips along every grid line, with dashed centre lines.
  const roadMat = new THREE.MeshLambertMaterial({ color: PALETTE.road });
  const dashMat = new THREE.MeshBasicMaterial({ color: PALETTE.roadLine });
  const dashGeo = new THREE.BoxGeometry(0.5, 0.06, 4);
  const dashes = [];
  for (const r of ROADS) {
    const along = new THREE.Mesh(new THREE.PlaneGeometry(CITY_HALF * 2, ROAD_WIDTH), roadMat);
    along.rotation.x = -Math.PI / 2;
    along.position.set(0, 0.03, r);
    group.add(along);
    const across = new THREE.Mesh(new THREE.PlaneGeometry(ROAD_WIDTH, CITY_HALF * 2), roadMat);
    across.rotation.x = -Math.PI / 2;
    across.position.set(r, 0.03, 0);
    group.add(across);
    for (let p = -CITY_HALF + 10; p < CITY_HALF; p += 16) {
      if (Math.abs(p - r) < 9) continue;
      const d1 = new THREE.Mesh(dashGeo, dashMat);
      d1.position.set(p, 0.06, r);
      group.add(d1);
      const d2 = new THREE.Mesh(dashGeo, dashMat);
      d2.rotation.y = Math.PI / 2;
      d2.position.set(r, 0.06, p);
      group.add(d2);
      dashes.push(d1, d2);
    }
  }

  // Buildings: one or two per block, with lit-window facades.
  const facadeTextures = [];
  const baseColors = ['#d8a06a', '#c98a7a', '#9ab8c9', '#b5a06a', '#8fa88f', '#a88fc9'];
  for (const c of baseColors) facadeTextures.push(makeFacadeTexture(random, c));
  const roofMat = new THREE.MeshLambertMaterial({ color: 0x3a3a44 });
  for (let ix = 0; ix < ROADS.length - 1; ix += 1) {
    for (let iz = 0; iz < ROADS.length - 1; iz += 1) {
      const cx = (ROADS[ix] + ROADS[ix + 1]) / 2;
      const cz = (ROADS[iz] + ROADS[iz + 1]) / 2;
      const blockHalf = 13;
      const count = random() < 0.6 ? 2 : 1;
      for (let b = 0; b < count; b += 1) {
        const w = range(random, 12, 20);
        const d = range(random, 12, 20);
        const h = range(random, 9, 42);
        const ox = count === 1 ? 0 : (b === 0 ? -7 : 7);
        const oz = count === 1 ? 0 : (b === 0 ? 6 : -6);
        const x = cx + ox;
        const z = cz + oz;
        if (Math.abs(x) > CITY_HALF || Math.abs(z) > CITY_HALF) continue;
        const tex = pick(random, facadeTextures);
        const mat = new THREE.MeshLambertMaterial({ map: tex });
        const building = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
        building.position.set(x, h / 2, z);
        group.add(building);
        const roof = new THREE.Mesh(new THREE.BoxGeometry(w * 0.4, 1.6, d * 0.4), roofMat);
        roof.position.set(x, h + 0.8, z);
        group.add(roof);
        colliders.push({ x, z, hx: w / 2 + 0.3, hz: d / 2 + 0.3 });
      }
      // A tree or two on the block corner.
      if (random() < 0.7) {
        const tx = cx + (random() < 0.5 ? -blockHalf + 2 : blockHalf - 2);
        const tz = cz + (random() < 0.5 ? -blockHalf + 2 : blockHalf - 2);
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.4, 2.4, 6), new THREE.MeshLambertMaterial({ color: 0x6a4a2a }));
        trunk.position.set(tx, 1.2, tz);
        group.add(trunk);
        const leaves = new THREE.Mesh(new THREE.ConeGeometry(2.2, 5, 7), new THREE.MeshLambertMaterial({ color: 0x3d7a3d }));
        leaves.position.set(tx, 4.6, tz);
        group.add(leaves);
      }
    }
  }

  // Landmark buildings at the mission points, each with a sign board.
  for (const [name, lm] of Object.entries(LANDMARKS)) {
    const [lx, lz] = lm.at;
    const mat = new THREE.MeshLambertMaterial({ color: lm.color });
    const building = new THREE.Mesh(new THREE.BoxGeometry(22, lm.height, 16), mat);
    building.position.set(lx, lm.height / 2, lz);
    group.add(building);
    const signCanvas = document.createElement('canvas');
    signCanvas.width = 256;
    signCanvas.height = 64;
    const sctx = signCanvas.getContext('2d');
    sctx.fillStyle = '#1a1a2e';
    sctx.fillRect(0, 0, 256, 64);
    sctx.fillStyle = '#ffd23d';
    sctx.font = 'bold 30px sans-serif';
    sctx.textAlign = 'center';
    sctx.fillText(lm.label, 128, 42);
    const signTex = new THREE.CanvasTexture(signCanvas);
    signTex.colorSpace = THREE.SRGBColorSpace;
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(20, 5), new THREE.MeshBasicMaterial({ map: signTex }));
    sign.position.set(lx, lm.height + 2.5, lz + 8.2);
    group.add(sign);
    // A second sign on the east face, so the name reads from the road as well.
    const signEast = new THREE.Mesh(new THREE.PlaneGeometry(20, 5), new THREE.MeshBasicMaterial({ map: signTex }));
    signEast.rotation.y = Math.PI / 2;
    signEast.position.set(lx + 11.2, lm.height + 2.5, lz);
    group.add(signEast);
    colliders.push({ x: lx, z: lz, hx: 11.3, hz: 8.3 });
  }

  // A yacht at the marina, waiting for the escape.
  const hull = new THREE.Mesh(new THREE.BoxGeometry(6, 2, 16), new THREE.MeshLambertMaterial({ color: 0xf2f2f2 }));
  hull.position.set(160, 1, 186);
  group.add(hull);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(4, 2, 8), new THREE.MeshLambertMaterial({ color: 0x2a5a8a }));
  cabin.position.set(160, 3, 186);
  group.add(cabin);
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 10, 6), new THREE.MeshLambertMaterial({ color: 0x888888 }));
  mast.position.set(160, 8, 186);
  group.add(mast);

  // Street lamps along the main avenues.
  const lampMat = new THREE.MeshLambertMaterial({ color: 0x2a2a33 });
  const bulbMat = new THREE.MeshBasicMaterial({ color: 0xffe9a8 });
  for (const r of [-120, 0, 120]) {
    for (let p = -160; p <= 160; p += 40) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 6, 6), lampMat);
      pole.position.set(p, 3, r + 8);
      group.add(pole);
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 6), bulbMat);
      bulb.position.set(p, 6.2, r + 8);
      group.add(bulb);
    }
  }

  // The objective beacon: a glowing column the missions move around the city.
  const beacon = new THREE.Group();
  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(1.2, 1.2, 60, 12, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xffd23d, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false }),
  );
  beam.position.y = 30;
  beacon.add(beam);
  const diamond = new THREE.Mesh(new THREE.OctahedronGeometry(1.6), new THREE.MeshBasicMaterial({ color: 0xffd23d }));
  diamond.position.y = 12;
  beacon.add(diamond);
  const ring = new THREE.Mesh(new THREE.RingGeometry(5, 6.5, 32), new THREE.MeshBasicMaterial({ color: 0xffd23d, transparent: true, opacity: 0.8, side: THREE.DoubleSide }));
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.15;
  beacon.add(ring);
  beacon.visible = false;
  scene.add(beacon);

  return { group, colliders, beacon, landmarks: LANDMARKS };
}

// Push a circle (x, z, radius) out of every building it overlaps. Returns true on hit.
export function collideCircle(colliders, x, z, radius) {
  let hit = false;
  for (const c of colliders) {
    const dx = x - Math.max(c.x - c.hx, Math.min(x, c.x + c.hx));
    const dz = z - Math.max(c.z - c.hz, Math.min(z, c.z + c.hz));
    const d2 = dx * dx + dz * dz;
    if (d2 < radius * radius) {
      hit = true;
      const d = Math.sqrt(d2) || 0.001;
      const push = radius - d;
      // Push along the smallest penetration axis for stable sliding.
      if (Math.abs(dx) > Math.abs(dz)) x += (dx / d) * push;
      else z += (dz / d) * push;
    }
  }
  return { x, z, hit };
}

export function nearestRoadCoord(v) {
  let best = ROADS[0];
  for (const r of ROADS) if (Math.abs(v - r) < Math.abs(v - best)) best = r;
  return best;
}
