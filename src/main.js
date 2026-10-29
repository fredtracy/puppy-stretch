// Workout timer: a 5-second countdown to get into position, then Darla barks
// and you hold for 30 seconds, then the countdown again, and so on. She and
// Miranda keep time beside you — Miranda squats and Darla sits on the first
// bark, both stand back up on the next, and so on.
//
// A spin-off of puppy-run rather than a mode of the game. It has copies of
// the two character modules and nothing else (no yard, no house, no trees),
// so it loads in a moment on a phone propped against the garage wall. And it
// only renders when the pose changes: a still frame is all a 30-second hold
// needs, and the phone is going to be awake for the whole workout.

import * as THREE from 'three';
import { createDarla } from './darla.js';
import { createMom, setMomNight } from './mom.js';
import { drawDarlaPortrait } from './portrait-darla.js';

// ?s=45 for longer holds. 30 is the default because it's what every stretch
// and side plank in the routine currently uses.
const INTERVAL = (() => {
  const s = Number(new URLSearchParams(location.search).get('s'));
  return Number.isFinite(s) && s >= 5 && s <= 600 ? s : 30;
})();

// Seconds to get into the next position before each bark, on top of the hold.
const PREP = 5;
const CYCLE = PREP + INTERVAL;

// Fairy by day, goth by night, same as the yard. Decided once at load — a
// workout doesn't last long enough to cross the line in a way that matters.
const hour = new Date().getHours();
const NIGHT = hour >= 19 || hour < 7;
document.body.classList.toggle('night', NIGHT);

const $ = (id) => document.getElementById(id);
// Same tab icon as the game: Darla's hand-drawn face.
const faviconCanvas = document.createElement('canvas');
faviconCanvas.width = faviconCanvas.height = 64;
drawDarlaPortrait(faviconCanvas.getContext('2d'), 64);
$('favicon').href = faviconCanvas.toDataURL('image/png');

$('count').textContent = INTERVAL;
$('blurb').textContent = `${PREP}-second countdown, then Darla barks every ${INTERVAL} seconds`;

// ── scene ─────────────────────────────────────────────────────────────────

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.85;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.setClearColor(0x000000, 0);
$('stage').appendChild(renderer.domElement);

const scene = new THREE.Scene();

// The same warm key / cool fill as the loading-screen portrait, so they look
// like themselves.
scene.add(new THREE.AmbientLight(0xffffff, NIGHT ? 1.2 : 1.8));
const key = new THREE.DirectionalLight(NIGHT ? 0xd8c8ff : 0xfff1d8, NIGHT ? 2.6 : 3.4);
key.position.set(2.5, 3, 2);
key.castShadow = true;
key.shadow.mapSize.set(1024, 1024);
Object.assign(key.shadow.camera, { left: -2, right: 2, top: 2, bottom: -2, near: 0.1, far: 10 });
key.shadow.bias = -0.0005;
scene.add(key);
const fill = new THREE.DirectionalLight(0xcfe0ff, 1.1);
fill.position.set(-2, 0.6, -1.5);
scene.add(fill);

// Only the shadow is drawn — the ground itself is the page background.
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(8, 8),
  new THREE.ShadowMaterial({ opacity: NIGHT ? 0.35 : 0.22 })
);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

const MOM_HOME = new THREE.Vector3(-0.75, 0, -0.1);
const DARLA_HOME = new THREE.Vector3(0.75, 0, 0.3);

// Turned to face each other in three-quarter profile, which is the angle a
// squat reads from: straight on you can't see the hips go back. YXZ so the
// lean and pitch the poses set happen in their own frame, after the turn.
const mom = createMom();
if (NIGHT) setMomNight(mom, true);
mom.rotation.order = 'YXZ';
mom.rotation.y = 1.2;
scene.add(mom);

const darla = createDarla();
darla.rotation.order = 'YXZ';
darla.rotation.y = -0.6;
scene.add(darla);

// ── poses ─────────────────────────────────────────────────────────────────
// s runs 0 (standing) → 1 (down). The game's rigs hinge each leg only at the
// hip, which can't squat — swinging a straight leg forward is sitting on the
// floor. So the timer gives them joints of its own, here rather than in the
// models: Miranda gets a knee and an ankle on each leg, Darla a hock on each
// back leg. Standing, every new joint is at zero and nothing has moved.
//
// After posing, the whole figure is settled back onto the ground with its
// feet where they started, which is what makes it read as going down in
// place rather than sliding about.

// Re-parent everything below `y` on a leg into a new pivot at that height,
// keeping it exactly where it was.
function addJoint(parent, y, below) {
  const joint = new THREE.Group();
  joint.position.y = y;
  for (const child of [...parent.children]) {
    if (child.position.y < below) {
      joint.add(child);
      child.position.y -= y;
    }
  }
  parent.add(joint);
  return joint;
}

// Miranda: knee where the thigh ends (-0.335), ankle at the top of the foot
// (-0.6, i.e. -0.265 below the knee). Thigh stays on the hip; calf, boot
// shaft, laces and ankle chain go to the knee; foot and sole to the ankle.
const momJoints = Object.values(mom.userData.legs).map((hip) => {
  const knee = addJoint(hip, -0.335, -0.3);
  const ankle = addJoint(knee, -0.265, -0.59 + 0.335);
  return { hip, knee, ankle };
});

// Darla: the hock where her upper back leg meets the lower (-0.22). The
// front legs stay straight — a sitting dog keeps them planted and upright.
const { legFR, legFL, legBR, legBL } = darla.userData.legs;
const darlaHocks = [legBR, legBL].map((hip) => ({ hip, hock: addJoint(hip, -0.22, -0.2) }));

const box = new THREE.Box3();
function boundsOf(nodes) {
  box.makeEmpty();
  for (const node of nodes) {
    node.updateWorldMatrix(true, true);
    node.traverseVisible((m) => {
      if (m.isMesh) box.expandByObject(m);
    });
  }
  return box;
}

// Feet on the floor and on their mark. `anchors` are the parts whose leading
// edge stays put, measured along the way the figure faces; the mark is taken
// from the standing pose the first time through.
const toeLine = new Map();
const facing = new THREE.Vector3();
const corner = new THREE.Vector3();
function settle(obj, home, anchors) {
  obj.position.set(home.x, 0, home.z);
  const minY = boundsOf([obj]).min.y;
  facing.set(Math.sin(obj.rotation.y), 0, Math.cos(obj.rotation.y));
  const b = boundsOf(anchors);
  let toe = -Infinity;
  for (let i = 0; i < 8; i++) {
    corner.set(i & 1 ? b.max.x : b.min.x, 0, i & 4 ? b.max.z : b.min.z);
    toe = Math.max(toe, corner.dot(facing));
  }
  if (!toeLine.has(obj)) toeLine.set(obj, toe);
  obj.position.y = -minY;
  obj.position.addScaledVector(facing, toeLine.get(obj) - toe);
}

// Angles are worked out in the world (from vertical, negative = swung
// forward) and converted to each joint's local rotation by subtracting
// everything above it.
function poseMom(s) {
  const lean = 0.5 * s; // chest forward over the knees
  const thigh = -1.35 * s; // nearly level with the floor at the bottom
  const shin = 0.45 * s; // knees out past the toes
  mom.rotation.x = lean;
  for (const { hip, knee, ankle } of momJoints) {
    hip.rotation.x = thigh - lean;
    knee.rotation.x = shin - thigh;
    ankle.rotation.x = -shin; // foot flat
  }
  // Arms straight out in front for balance, head up to look ahead.
  const { armL, armR } = mom.userData.arms;
  armL.rotation.x = armR.rotation.x = -1.5 * s - lean;
  mom.userData.headGroup.rotation.x = -0.35 * s;
  settle(mom, MOM_HOME, momJoints.map((j) => j.ankle));
}

function poseDarla(s) {
  // A sit: chest up, rump down, front legs vertical, back legs tucked under
  // her with the paw resting flat out in front. Both halves of the back leg
  // swing forward, the lower more than the upper — bending the joint the
  // other way, as a real hock does, reads as a broken leg on a rig this
  // simple.
  const pitch = -0.45 * s;
  darla.rotation.x = pitch;
  legFR.rotation.x = legFL.rotation.x = -pitch;
  for (const { hip, hock } of darlaHocks) {
    const upper = -0.8 * s; // hip forward and down, like a haunch
    const lower = -1.5 * s; // on to the paw, nearly flat along the ground
    hip.rotation.x = upper - pitch;
    hock.rotation.x = lower - upper;
  }
  darla.userData.tail.rotation.x = -0.4 * s;
  settle(darla, DARLA_HOME, [legFR, legFL]);
}

let current = 0;
function applyPose(s) {
  current = s;
  poseMom(s);
  poseDarla(s);
}

// ── camera ────────────────────────────────────────────────────────────────
// Orthographic, three-quarter view from the front right. Framed once off the
// standing pose (the tallest one), then refitted to whatever shape the phone
// is in.

const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 50);
camera.position.set(2.3, 1.25, 4.4);
camera.lookAt(0.05, 0.7, 0.1);
camera.updateMatrixWorld(true);

applyPose(0);
const span = (() => {
  const b = boundsOf([mom, darla]).clone();
  const v = new THREE.Vector3();
  const inv = camera.matrixWorldInverse;
  const out = { minU: Infinity, maxU: -Infinity, minV: Infinity, maxV: -Infinity };
  for (let i = 0; i < 8; i++) {
    v.set(i & 1 ? b.max.x : b.min.x, i & 2 ? b.max.y : b.min.y, i & 4 ? b.max.z : b.min.z);
    v.applyMatrix4(inv);
    out.minU = Math.min(out.minU, v.x);
    out.maxU = Math.max(out.maxU, v.x);
    out.minV = Math.min(out.minV, v.y);
    out.maxV = Math.max(out.maxV, v.y);
  }
  return out;
})();

// They fill the middle of the screen, below the countdown and above the
// buttons, standing on the grass the background draws below 58%.
function fit() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  renderer.setSize(w, h);
  const aspect = w / h;
  const spanU = span.maxU - span.minU;
  const spanV = span.maxV - span.minV;
  let viewH = spanV / 0.46;
  if (viewH * aspect < spanU * 1.08) viewH = (spanU * 1.08) / aspect;
  const viewW = viewH * aspect;
  const midU = (span.minU + span.maxU) / 2;
  // Feet 20% up from the bottom: on the grass, clear of the buttons, and low
  // enough that her head stays under the countdown.
  camera.bottom = span.minV - viewH * 0.2;
  camera.top = camera.bottom + viewH;
  camera.left = midU - viewW / 2;
  camera.right = midU + viewW / 2;
  camera.updateProjectionMatrix();
  render();
}

function render() {
  renderer.render(scene, camera);
}

window.addEventListener('resize', fit);
fit();

// ?pose=1 holds them down (any 0–1) with the start screen out of the way,
// for looking at a pose without starting the timer — and its bark.
const POSE_PIN = (() => {
  const raw = new URLSearchParams(location.search).get('pose');
  const v = raw === null ? NaN : Number(raw);
  return Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : null;
})();
if (POSE_PIN !== null) {
  applyPose(POSE_PIN);
  render();
  $('start-screen').hidden = true;
}

// Ease between poses over most of a second, rendering only while moving.
let anim = null;
function moveTo(target) {
  const from = current;
  const start = performance.now();
  const duration = 700;
  if (anim) cancelAnimationFrame(anim);
  const step = (t) => {
    const k = Math.min(1, (t - start) / duration);
    const e = k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2;
    applyPose(from + (target - from) * e);
    render();
    anim = k < 1 ? requestAnimationFrame(step) : null;
  };
  anim = requestAnimationFrame(step);
}

// ── bark, buzz and staying awake ─────────────────────────────────────────

let audio = null;

// The cue is Darla's real bark, the same sample the game uses, loaded on the
// Start tap (it needs the AudioContext to decode). Fetched straight from
// public/audio rather than through audio.js, which would bring the game's
// music with it. A cue that lands before it has loaded — the one at Start —
// waits for it rather than going silent.
let barkSample = null;
let barkWaiting = false;
function loadBark() {
  fetch(`${import.meta.env.BASE_URL}audio/bark.wav`)
    .then((res) => res.arrayBuffer())
    .then((data) => audio.decodeAudioData(data))
    .then((buffer) => {
      barkSample = buffer;
      if (barkWaiting) playBark();
    })
    .catch(() => {});
}

function playBark() {
  barkWaiting = false;
  const source = audio.createBufferSource();
  source.buffer = barkSample;
  const gain = audio.createGain();
  gain.gain.value = 0.6;
  source.connect(gain).connect(audio.destination);
  source.start();
}

function cue() {
  navigator.vibrate?.(150);
  if (!audio) return;
  if (barkSample) playBark();
  else barkWaiting = true;
}

// A short, soft blip on each number of the countdown, so you can hear it
// coming without looking at the phone. Synthesised, so it never waits on a
// download.
function tick() {
  navigator.vibrate?.(40);
  if (!audio) return;
  const osc = audio.createOscillator();
  const gain = audio.createGain();
  osc.frequency.value = 880;
  const t = audio.currentTime;
  gain.gain.setValueAtTime(0.25, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
  osc.connect(gain).connect(audio.destination);
  osc.start(t);
  osc.stop(t + 0.12);
}

// The browser drops the lock whenever the page is hidden, so it's asked for
// again each time the page comes back.
let wakeLock = null;
async function keepAwake() {
  try {
    wakeLock = (await navigator.wakeLock?.request('screen')) ?? null;
  } catch {
    wakeLock = null;
  }
}
function letSleep() {
  wakeLock?.release().catch(() => {});
  wakeLock = null;
}

// ── the timer ─────────────────────────────────────────────────────────────
// Driven off the clock rather than counting ticks, so a throttled or late
// tick can't make it drift: the round is always derived from elapsed time.

let started = false; // between Start and Stop, paused or not
let running = false;
let startedAt = 0;
let pausedAt = 0;
let barked = -1; // last round whose bark has gone off
let ticked = -1; // last countdown number blipped, counted across rounds

function elapsed() {
  return ((running ? performance.now() : pausedAt) - startedAt) / 1000;
}

// Each round is the countdown (the first PREP seconds) then the hold.
function update() {
  if (!started) return;
  const e = elapsed();
  const r = Math.floor(e / CYCLE);
  const t = e - r * CYCLE;
  const count = $('count');
  if (t < PREP) {
    const n = r * PREP + Math.floor(t);
    if (running && n > ticked) {
      ticked = n;
      tick();
    }
    count.classList.add('prep');
    count.textContent = Math.ceil(PREP - t);
    $('status').textContent = running ? 'Get ready' : 'Paused · get ready';
    return;
  }
  if (running && r > barked) {
    barked = r;
    cue();
    // Down on even rounds, starting with the first bark.
    moveTo(r % 2 === 0 ? 1 : 0);
    count.classList.add('pop');
    setTimeout(() => count.classList.remove('pop'), 180);
  }
  count.classList.remove('prep');
  count.textContent = Math.ceil(CYCLE - t) || INTERVAL;
  $('status').textContent = running ? `Round ${r + 1}` : `Paused · round ${r + 1}`;
}
setInterval(update, 100);

$('start').addEventListener('click', () => {
  // Audio has to be created inside a tap or the browser keeps it muted.
  if (!audio) {
    audio = new (window.AudioContext || window.webkitAudioContext)();
    loadBark();
  }
  audio.resume();
  barked = -1;
  ticked = -1;
  startedAt = performance.now();
  started = true;
  running = true;
  keepAwake();
  $('start-screen').hidden = true;
  $('controls').hidden = false;
  $('pause').textContent = 'Pause';
  update();
});

$('pause').addEventListener('click', () => {
  if (running) {
    pausedAt = performance.now();
    running = false;
    letSleep();
    $('pause').textContent = 'Resume';
  } else {
    startedAt += performance.now() - pausedAt;
    running = true;
    audio?.resume();
    keepAwake();
    $('pause').textContent = 'Pause';
  }
  update();
});

$('stop').addEventListener('click', () => {
  started = false;
  running = false;
  letSleep();
  moveTo(0);
  $('count').classList.remove('prep');
  $('count').textContent = INTERVAL;
  $('status').textContent = 'Ready';
  $('controls').hidden = true;
  $('start-screen').hidden = false;
});

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && running) {
    keepAwake();
    audio?.resume();
  }
});
