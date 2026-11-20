// ===== IRONCOLD — WebGL scenes (hero emblem + product carousel) =====
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EMBLEM_POLYGONS } from './emblem-shape.js';

const REDUCE = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const ICE = 0xa6dcff;
const lerp = (a, b, k) => a + (b - a) * k;
const damp = (a, b, lambda, dt) => lerp(a, b, 1 - Math.exp(-lambda * dt));
const smooth = (e0, e1, x) => { const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t); };

function makeRenderer(canvas) {
  const r = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  r.setPixelRatio(Math.min(window.devicePixelRatio || 1, window.innerWidth < 750 ? 1.5 : 1.75));
  r.toneMapping = THREE.ACESFilmicToneMapping;
  r.toneMappingExposure = 1.05;
  r.setClearColor(0x000000, 0);
  return r;
}

function radialTexture(stops) {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  stops.forEach(([o, col]) => grd.addColorStop(o, col));
  g.fillStyle = grd;
  g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// Runs fn(dt, t) on rAF only while `el` is on screen and the tab is visible.
function loopWhenVisible(el, fn) {
  let visible = true, raf = 0, last = performance.now();
  const frame = (now) => {
    raf = 0;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    fn(dt, now / 1000);
    if (visible && !document.hidden) raf = requestAnimationFrame(frame);
  };
  const start = () => { if (!raf && visible && !document.hidden) { last = performance.now(); raf = requestAnimationFrame(frame); } };
  new IntersectionObserver((es) => { visible = es[0].isIntersecting; start(); }, { rootMargin: '100px' }).observe(el);
  document.addEventListener('visibilitychange', start);
  start();
  return { kick: start };
}

function snowField(count, sx, sy, sz, size) {
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(count * 3);
  const spd = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    pos[i * 3] = (Math.random() - 0.5) * sx;
    pos[i * 3 + 1] = (Math.random() - 0.5) * sy;
    pos[i * 3 + 2] = (Math.random() - 0.5) * sz;
    spd[i] = 0.12 + Math.random() * 0.38;
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({
    size, map: radialTexture([[0, 'rgba(255,255,255,1)'], [0.35, 'rgba(210,238,255,.55)'], [1, 'rgba(166,220,255,0)']]),
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: 0xd8efff, opacity: 0.85, sizeAttenuation: true
  });
  const pts = new THREE.Points(geo, mat);
  pts.userData.update = (dt, t) => {
    for (let i = 0; i < count; i++) {
      const k = i * 3;
      pos[k + 1] -= spd[i] * dt;
      pos[k] += Math.sin(t * 0.6 + i) * 0.0025;
      if (pos[k + 1] < -sy / 2) { pos[k + 1] = sy / 2; pos[k] = (Math.random() - 0.5) * sx; }
    }
    geo.attributes.position.needsUpdate = true;
  };
  return pts;
}

/* =======================================================================
   HERO — chrome-ice extruded IC emblem, orbit rings, ice shards, snow
   ======================================================================= */
export function initHero(canvas, opts) {
  opts = opts || {};
  const host = canvas.parentElement;
  let renderer;
  try { renderer = makeRenderer(canvas); } catch (e) { host.classList.add('no-webgl'); return; }

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
  camera.position.set(0, 0, 10);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(renderer), 0.04).texture;

  // lights tint the chrome with ice
  scene.add(new THREE.AmbientLight(0x9fc8ff, 0.25));
  const key = new THREE.DirectionalLight(0xffffff, 1.6); key.position.set(3, 4, 6); scene.add(key);
  const rimA = new THREE.PointLight(0x58b9ff, 30, 0, 2); rimA.position.set(-3.5, 1.5, -1.5); scene.add(rimA);
  const rimB = new THREE.PointLight(0xbfe9ff, 18, 0, 2); rimB.position.set(3, -2.5, 2.5); scene.add(rimB);

  const root = new THREE.Group();   // layout position / scale
  const spin = new THREE.Group();   // rotation (pointer, scroll, click)
  root.add(spin);
  scene.add(root);
  root.visible = opts.emblem !== false; // photo hero: keep only snow + light

  // emblem
  const shapes = EMBLEM_POLYGONS.map((poly) => {
    const s = new THREE.Shape();
    poly.forEach(([x, y], i) => (i ? s.lineTo(x, y) : s.moveTo(x, y)));
    s.closePath();
    return s;
  });
  const geo = new THREE.ExtrudeGeometry(shapes, { depth: 0.3, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.032, bevelSegments: 5, curveSegments: 1 });
  geo.center();
  const capMat = new THREE.MeshPhysicalMaterial({ color: 0xeaf6ff, metalness: 1, roughness: 0.14, clearcoat: 1, clearcoatRoughness: 0.06, iridescence: 0.35, iridescenceIOR: 1.35, envMapIntensity: 1.6 });
  const sideMat = new THREE.MeshPhysicalMaterial({ color: 0x6d8296, metalness: 1, roughness: 0.28, envMapIntensity: 1.3 });
  const emblem = new THREE.Mesh(geo, [capMat, sideMat]);
  spin.add(emblem);

  // halo behind the emblem
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({
    map: radialTexture([[0, 'rgba(140,210,255,.55)'], [0.4, 'rgba(88,185,255,.16)'], [1, 'rgba(88,185,255,0)']]),
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
  }));
  halo.scale.set(6.5, 6.5, 1);
  halo.position.z = -1.2;
  root.add(halo);

  // orbit rings with a glowing satellite each
  const rings = [];
  const dotTex = radialTexture([[0, 'rgba(255,255,255,1)'], [0.3, 'rgba(166,220,255,.8)'], [1, 'rgba(166,220,255,0)']]);
  [[1.75, 1.15, 0.35], [2.05, -0.5, 1.2]].forEach(([r, tiltX, tiltZ], i) => {
    const g = new THREE.Group();
    g.rotation.set(tiltX, 0, tiltZ);
    const torus = new THREE.Mesh(new THREE.TorusGeometry(r, 0.006, 6, 220), new THREE.MeshBasicMaterial({ color: ICE, transparent: true, opacity: 0.45 }));
    g.add(torus);
    const sat = new THREE.Sprite(new THREE.SpriteMaterial({ map: dotTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    sat.scale.set(0.32, 0.32, 1);
    g.add(sat);
    g.userData = { r, sat, speed: i ? -0.55 : 0.8, phase: i * 2 };
    root.add(g);
    rings.push(g);
  });

  // ice shards
  const shardMat = new THREE.MeshPhysicalMaterial({ color: 0xcfeeff, metalness: 0.2, roughness: 0.05, transparent: true, opacity: 0.55, envMapIntensity: 2.2, flatShading: true });
  const shards = [];
  for (let i = 0; i < 10; i++) {
    const m = new THREE.Mesh(new THREE.OctahedronGeometry(0.035 + Math.random() * 0.07, 0), shardMat);
    const a = (i / 10) * Math.PI * 2;
    m.userData = { a, r: 1.9 + Math.random() * 0.9, y: (Math.random() - 0.5) * 2.6, z: (Math.random() - 0.5) * 1.6, s: 0.2 + Math.random() * 0.5 };
    m.scale.y = 1.6;
    root.add(m);
    shards.push(m);
  }

  const snow = snowField(window.innerWidth < 750 ? 380 : 800, 22, 14, 10, 0.06);
  scene.add(snow);

  // ----- layout -----
  let vh = 1, mobile = false;
  const base = new THREE.Vector3();
  let baseScale = 1;
  function layout() {
    const w = canvas.clientWidth || host.clientWidth, h = canvas.clientHeight || host.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    vh = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z;
    const vw = vh * camera.aspect;
    mobile = camera.aspect < 1.05;
    if (mobile) { base.set(0, vh * 0.22, 0); baseScale = Math.min(vh * 0.17, vw * 0.3); }
    else { base.set(vw * 0.2, -vh * 0.01, 0); baseScale = vh * 0.24; }
  }
  layout();
  window.addEventListener('resize', layout);

  // ----- input -----
  const pointer = { x: 0, y: 0 };
  window.addEventListener('pointermove', (e) => {
    pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.y = (e.clientY / window.innerHeight) * 2 - 1;
  }, { passive: true });
  let spinBoost = 0, spinTarget = 0, downX = 0, downY = 0;
  canvas.addEventListener('pointerdown', (e) => { downX = e.clientX; downY = e.clientY; });
  canvas.addEventListener('pointerup', (e) => {
    if (Math.hypot(e.clientX - downX, e.clientY - downY) < 8) spinTarget += Math.PI * 2;
  });

  // ----- loop -----
  const intro = { t: 0 };
  let rx = 0, ry = 0;
  loopWhenVisible(host, (dt, t) => {
    intro.t = Math.min(1, intro.t + dt / 1.8);
    const ease = 1 - Math.pow(1 - intro.t, 4);
    const sp = Math.min(1, Math.max(0, window.scrollY / Math.max(1, host.offsetHeight)));

    root.position.set(base.x, base.y + sp * vh * 0.25 + Math.sin(t * 0.9) * 0.06, base.z);
    root.scale.setScalar(baseScale * (0.55 + 0.45 * ease) * (1 - sp * 0.15));

    const osc = REDUCE ? 0 : Math.sin(t * 0.45) * 0.38;
    rx = damp(rx, pointer.y * 0.18, 4, dt);
    ry = damp(ry, pointer.x * 0.32, 4, dt);
    spinBoost = damp(spinBoost, spinTarget, 2.6, dt);
    spin.rotation.set(rx + sp * 0.4, osc + ry + spinBoost + (1 - ease) * -Math.PI * 1.5 + sp * Math.PI * 0.9, Math.sin(t * 0.6) * 0.04);

    halo.material.opacity = 0.75 + Math.sin(t * 1.7) * 0.2;
    rings.forEach((g) => {
      const u = g.userData;
      g.rotation.y += dt * u.speed * 0.4;
      const a = t * u.speed + u.phase;
      u.sat.position.set(Math.cos(a) * u.r, Math.sin(a) * u.r, 0);
    });
    shards.forEach((m, i) => {
      const u = m.userData;
      const a = u.a + t * 0.12 * (i % 2 ? 1 : -1);
      m.position.set(Math.cos(a) * u.r, u.y + Math.sin(t * u.s + i) * 0.25, u.z + Math.sin(a) * 0.8);
      m.rotation.x += dt * u.s; m.rotation.y += dt * u.s * 1.3;
    });
    snow.userData.update(dt, t);
    snow.position.x = damp(snow.position.x, pointer.x * 0.4, 2, dt);

    camera.position.x = damp(camera.position.x, pointer.x * 0.25, 2, dt);
    camera.position.y = damp(camera.position.y, -pointer.y * 0.15, 2, dt);
    camera.lookAt(0, 0, 0);
    renderer.render(scene, camera);
  });
  canvas.addEventListener('webglcontextlost', () => host.classList.add('no-webgl'));
}

/* =======================================================================
   CAROUSEL — draggable 3D ring of product photos with reflections
   ======================================================================= */
function roundedRect(w, h, r) {
  const s = new THREE.Shape();
  const x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  return s;
}
function shapeGeo(shape, w, h) {
  const g = new THREE.ShapeGeometry(shape, 10);
  const pos = g.attributes.position, uv = g.attributes.uv;
  for (let i = 0; i < pos.count; i++) uv.setXY(i, (pos.getX(i) + w / 2) / w, (pos.getY(i) + h / 2) / h);
  return g;
}

export function initCarousel(canvas, opts) {
  const host = canvas.parentElement;
  let renderer;
  try { renderer = makeRenderer(canvas); } catch (e) { host.classList.add('no-webgl'); return null; }

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
  const items = opts.items;
  const n = items.length;
  const W = 1.55, H = W / 0.694, R = (n * (W + 0.42)) / (Math.PI * 2);
  const step = (Math.PI * 2) / n;

  const ring = new THREE.Group();
  scene.add(ring);
  const shape = roundedRect(W, H, 0.09);
  const geo = shapeGeo(shape, W, H);
  const outline = new THREE.BufferGeometry().setFromPoints(shape.getPoints(12).map((p) => new THREE.Vector3(p.x, p.y, 0.002)));

  // reflection fade (alpha strongest next to the panel's bottom edge)
  const fc = document.createElement('canvas'); fc.width = 4; fc.height = 128;
  const fg = fc.getContext('2d');
  const grd = fg.createLinearGradient(0, 128, 0, 0);
  grd.addColorStop(0, '#fff'); grd.addColorStop(0.45, '#000'); grd.addColorStop(1, '#000');
  fg.fillStyle = grd; fg.fillRect(0, 0, 4, 128);
  const fadeTex = new THREE.CanvasTexture(fc);

  // card back: dark ice with the emblem
  const bc = document.createElement('canvas'); bc.width = 450; bc.height = 648;
  const bg = bc.getContext('2d');
  const lg = bg.createLinearGradient(0, 0, 450, 648); lg.addColorStop(0, '#16202b'); lg.addColorStop(1, '#07090c');
  bg.fillStyle = lg; bg.fillRect(0, 0, 450, 648);
  const backTex = new THREE.CanvasTexture(bc); backTex.colorSpace = THREE.SRGBColorSpace;
  const em = new Image();
  em.onload = () => { bg.globalAlpha = 0.9; bg.drawImage(em, 450 / 2 - 70, 648 / 2 - 103, 140, 206); backTex.needsUpdate = true; };
  em.src = 'images/web/emblem-white.png';

  const loader = new THREE.TextureLoader();
  const maxAniso = renderer.capabilities.getMaxAnisotropy();
  const panels = items.map((it, i) => {
    const g = new THREE.Group();
    const a = i * step;
    g.position.set(Math.sin(a) * R, 0, Math.cos(a) * R);
    g.rotation.y = a;
    const tex = loader.load(it.src, () => kick());
    tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = Math.min(8, maxAniso);
    const front = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }));
    front.userData.index = i;
    const back = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: backTex, toneMapped: false }));
    back.rotation.y = Math.PI; back.position.z = -0.002;
    const line = new THREE.LineLoop(outline, new THREE.LineBasicMaterial({ color: ICE, transparent: true, opacity: 0 }));
    const refl = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: tex, alphaMap: fadeTex, transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false, toneMapped: false }));
    refl.scale.y = -1; refl.position.y = -H - 0.05;
    g.add(front, back, line, refl);
    ring.add(g);
    return { g, front, line, refl, a };
  });

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({
    map: radialTexture([[0, 'rgba(120,200,255,.5)'], [0.5, 'rgba(88,185,255,.12)'], [1, 'rgba(88,185,255,0)']]),
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
  }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = -H / 2 - 0.02; floor.scale.set(R * 4, R * 3, 1);
  scene.add(floor);
  const snow = snowField(window.innerWidth < 750 ? 160 : 320, 16, 9, 8, 0.045);
  scene.add(snow);

  function layout() {
    const w = canvas.clientWidth || host.clientWidth, h = canvas.clientHeight || host.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    const mobile = camera.aspect < 0.9;
    camera.fov = mobile ? 40 : 34;
    camera.updateProjectionMatrix();
    const tanH = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const needW = (2 * R + W) * (mobile ? 0.82 : 1.12);
    let d = needW / (2 * tanH * camera.aspect);
    d = Math.max(d, (H * 2.25) / (2 * tanH));
    camera.position.set(0, d * 0.13, d + R);
    camera.lookAt(0, mobile ? 0.15 : 0.05, 0);
  }
  layout();
  window.addEventListener('resize', layout);

  // ----- interaction -----
  let rot = 0, target = 0, dragging = false, startX = 0, startT = 0, lastX = 0, vel = 0, moved = 0, lastInteract = -10;
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const pxToRad = () => (window.innerWidth < 750 ? 0.011 : 0.006);
  canvas.addEventListener('pointerdown', (e) => {
    dragging = true; moved = 0; startX = lastX = e.clientX; startT = target; vel = 0;
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const dx = e.clientX - lastX; lastX = e.clientX;
    moved += Math.abs(dx);
    vel = dx;
    target = startT + (e.clientX - startX) * pxToRad();
    lastInteract = performance.now() / 1000;
    kick();
  });
  const release = (e) => {
    if (!dragging) return;
    dragging = false;
    if (moved < 6 && e.type === 'pointerup') {
      const r = canvas.getBoundingClientRect();
      ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      const hit = ray.intersectObjects(panels.map((p) => p.front))[0];
      if (hit) {
        const i = hit.object.userData.index;
        if (i === frontIndex()) opts.onOpen && opts.onOpen(items[i]);
        else goTo(i);
      }
    } else {
      target += vel * pxToRad() * 6;
      target = Math.round(target / step) * step;
    }
    lastInteract = performance.now() / 1000;
  };
  canvas.addEventListener('pointerup', release);
  canvas.addEventListener('pointercancel', release);

  function frontIndex() { return (((Math.round(-rot / step)) % n) + n) % n; }
  function goTo(i) {
    const cur = frontIndex();
    let diff = i - cur;
    if (diff > n / 2) diff -= n;
    if (diff < -n / 2) diff += n;
    target = Math.round(target / step) * step - diff * step;
    lastInteract = performance.now() / 1000;
    kick();
  }
  const api = {
    next: () => { target = Math.round(target / step) * step - step; lastInteract = performance.now() / 1000; kick(); },
    prev: () => { target = Math.round(target / step) * step + step; lastInteract = performance.now() / 1000; kick(); },
    goTo
  };

  let shown = -1, autoT = 0;
  const { kick } = loopWhenVisible(host, (dt, t) => {
    // autoplay: one step every 3.4s when idle
    if (!REDUCE && !dragging && t - lastInteract > 5) {
      autoT += dt;
      if (autoT > 3.4) { autoT = 0; target = Math.round(target / step) * step - step; }
    } else autoT = 0;

    rot = damp(rot, target, dragging ? 14 : 5, dt);
    ring.rotation.y = rot;
    ring.position.y = Math.sin(t * 0.8) * 0.04;

    panels.forEach((p) => {
      const facing = Math.cos(p.a + rot);
      const lit = 0.28 + 0.72 * smooth(-0.3, 1, facing);
      p.front.material.color.setScalar(lit);
      p.refl.material.opacity = 0.22 * lit;
      const f = Math.pow(Math.max(0, facing), 6);
      p.g.scale.setScalar(1 + f * 0.07);
      p.line.material.opacity = f * 0.8;
    });

    const fi = frontIndex();
    if (fi !== shown) { shown = fi; opts.onFront && opts.onFront(items[fi], fi); }
    snow.userData.update(dt, t);
    renderer.render(scene, camera);
  });
  return api;
}
