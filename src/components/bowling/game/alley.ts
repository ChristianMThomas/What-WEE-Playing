// The bowling alley in Three.js: lanes, pins and the approach behind the foul
// line, the bowler and their swing, and the camera shots. Rendering only: the
// roll itself comes from src/lib/bowling/physics.ts, simulated up front, and
// this plays its recording back.
//
// Loaded with a dynamic import behind the game's black loading screen, so
// Three.js stays out of the menus' bundles.

import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { Reflector } from "three/addons/objects/Reflector.js";
import {
  APPROACH_LENGTH,
  BALL_RADIUS,
  GUTTER_WIDTH,
  HEAD_PIN_DISTANCE,
  LANE_LENGTH,
  LANE_WIDTH,
  PIN_HEIGHT,
  PIN_SPOTS,
} from "@/lib/bowling/lane";
import { BODIES, BODY_STRIDE, HIDDEN_Y, RECORD_RATE, type RollResult } from "@/lib/bowling/physics";
import { ALL_PINS, isStanding, type PinMask } from "@/lib/bowling/pins";
import { STRAIGHT, type Aim } from "@/lib/bowling/shot";

/**
 * - intro: the pan across the pins at the start of the game.
 * - bowler: facing the bowler from down the lane, at the start of their turn.
 * - aim: behind the see-through bowler while they line up, walk and swing.
 * - roll: following the ball down the lane, then watching the pins.
 */
export type Shot = "intro" | "bowler" | "aim" | "roll";
export type AimMode = "move" | "turn";

/** How long the intro's pan across the pins lasts. */
export const INTRO_MS = 5000;
const BOWLER_ZOOM_MS = 1400;
/** The walk up to the foul line while B is held. */
const WALK_MS = 1100;
/** The forward swing, from letting go of B to the ball leaving the hand. */
const SWING_MS = 280;

const CAP_WIDTH = 0.1; // the gold capping between two lanes' gutters
const LANE_PITCH = LANE_WIDTH + 2 * GUTTER_WIDTH + CAP_WIDTH;
const LANES = [-3, -2, -1, 0, 1, 2, 3]; // the player's lane is 0
const PLAYER_LANE = LANES.indexOf(0);
const BACK_WALL_Z = -LANE_LENGTH - 0.7; // the masking unit above the pinsetters
const BOWLER_Z = APPROACH_LENGTH - 0.6;
/** Where the bowler stops at the foul line, so the ball leaves the hand where the physics starts it (z = 0.4). */
const RELEASE_Z = 0.85;
/** The held ball is drawn a little bigger than a real one, to suit the avatar's proportions. */
const HELD_SCALE = 0.135 / BALL_RADIUS;
/** Where the camera stops following the ball and watches the pins. */
const PIN_CAMERA_Z = -HEAD_PIN_DISTANCE + 4.2;

export interface Bowler {
  /** The avatar drawn as an image (the SVG from src/components/Avatar.tsx). */
  sprite: HTMLImageElement;
  skinColor: string;
  outfitColor: string;
}

export interface AlleyView {
  /** Cuts to a shot and restarts its camera move. */
  show(shot: Shot): void;
  /** Whose turn it is: swaps in their avatar and colors. */
  setBowler(index: number): void;
  /** Where the bowler stands and faces, and which way the d-pad arrows point. */
  setAim(aim: Aim, mode: AimMode): void;
  /** Re-spots the standing pins, like the pinsetter between rolls. */
  setPins(mask: PinMask): void;
  /** B went down: walk up to the line with the ball swinging back. */
  windUp(): void;
  /** B came up without a throw: go back and try again. */
  cancelWindUp(): void;
  /** Swing through, let go, and play the roll back; `onDone` runs when the pins have settled. */
  release(roll: RollResult, onDone: () => void): void;
  dispose(): void;
}

// Small seeded random numbers, so the procedural textures look the same every time.
function seeded(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 2 ** 32;
  };
}

function canvasTexture(width: number, height: number, draw: (g: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  draw(canvas.getContext("2d")!);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

/** Maple boards running down the lane, 39 across like a real one. */
function woodTexture() {
  const random = seeded(7);
  return canvasTexture(512, 1024, (g) => {
    const boards = 39;
    const w = 512 / boards;
    for (let i = 0; i < boards; i++) {
      const light = 62 + random() * 8;
      g.fillStyle = `hsl(33 58% ${light}%)`;
      g.fillRect(i * w, 0, w + 1, 1024);
      // Grain
      for (let k = 0; k < 40; k++) {
        g.fillStyle = `hsl(30 50% ${light - 8 - random() * 8}% / ${0.08 + random() * 0.1})`;
        g.fillRect(i * w + random() * w, random() * 1024, 1, 20 + random() * 120);
      }
      g.fillStyle = "rgb(120 72 30 / 0.35)";
      g.fillRect(i * w, 0, 1, 1024);
    }
  });
}

/** The white plaques on the masking panel: a bowtie over each lane, a pennant between lanes. */
function plaqueTexture(kind: "bowtie" | "pennant") {
  return canvasTexture(128, 128, (g) => {
    g.fillStyle = "#f7f7f2";
    g.strokeStyle = "#c9cdc6";
    g.lineWidth = 6;
    g.beginPath();
    g.roundRect(8, 8, 112, 112, 26);
    g.fill();
    g.stroke();
    g.fillStyle = "#ef6a3a";
    g.beginPath();
    if (kind === "bowtie") {
      g.moveTo(30, 40);
      g.lineTo(64, 64);
      g.lineTo(30, 88);
      g.closePath();
      g.moveTo(98, 40);
      g.lineTo(64, 64);
      g.lineTo(98, 88);
      g.closePath();
    } else {
      g.moveTo(92, 36);
      g.lineTo(92, 92);
      g.lineTo(36, 92);
      g.closePath();
    }
    g.fill();
  });
}

/** A bowling pin turned on a lathe, with the two red stripes around its neck. */
function pinGeometry() {
  // [radius, height] in inches, from the regulation pin outline.
  const outline: [number, number][] = [
    [0.01, 0], [1.0, 0], [1.55, 0.6], [2.0, 2.0], [2.383, 4.5], [2.28, 6.0], [1.85, 7.6],
    [1.2, 9.1], [0.92, 10.0], [0.98, 11.0], [1.22, 12.3], [1.27, 13.2], [1.1, 14.2], [0.6, 14.85], [0.01, 15],
  ];
  const scale = PIN_HEIGHT / 15;
  const curve = new THREE.SplineCurve(outline.map(([r, y]) => new THREE.Vector2(r * scale, y * scale)));
  const geometry = new THREE.LatheGeometry(curve.getPoints(90), 32);

  const stripes = [
    [9.35, 9.75],
    [10.25, 10.65],
  ].map(([a, b]) => [a * scale, b * scale]);
  const red = new THREE.Color("#d32f2f");
  const white = new THREE.Color("#ffffff");
  const colors: number[] = [];
  const positions = geometry.getAttribute("position");
  for (let i = 0; i < positions.count; i++) {
    const y = positions.getY(i);
    const c = stripes.some(([a, b]) => y >= a && y <= b) ? red : white;
    colors.push(c.r, c.g, c.b);
  }
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  return geometry;
}

/** A glossy ball with a marbled swirl, like the Wii's bowling balls. */
function ballMaterial(base: string, swirl: string) {
  const random = seeded(3);
  const map = canvasTexture(512, 256, (g) => {
    g.fillStyle = base;
    g.fillRect(0, 0, 512, 256);
    g.strokeStyle = swirl;
    g.lineCap = "round";
    for (let i = 0; i < 26; i++) {
      g.lineWidth = 3 + random() * 7;
      g.globalAlpha = 0.35 + random() * 0.4;
      g.beginPath();
      const x = random() * 512;
      const y = random() * 256;
      g.moveTo(x, y);
      g.bezierCurveTo(x + 60, y - 50, x + 110, y + 60, x + 170, y + random() * 40 - 20);
      g.stroke();
    }
  });
  map.wrapS = THREE.RepeatWrapping;
  return new THREE.MeshPhysicalMaterial({ map, roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.05 });
}

/** A unit-length arm segment; placeLimb() stretches it between two points each frame. */
function limb(radius: number, material: THREE.Material) {
  return new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, 1, 14), material);
}

const UP = new THREE.Vector3(0, 1, 0);
const along = new THREE.Vector3();
function placeLimb(mesh: THREE.Mesh, a: THREE.Vector3, b: THREE.Vector3) {
  along.subVectors(b, a);
  mesh.position.copy(a).lerp(b, 0.5);
  mesh.scale.set(1, Math.max(along.length(), 0.001), 1);
  mesh.quaternion.setFromUnitVectors(UP, along.normalize());
}

function box(w: number, h: number, d: number, material: THREE.Material, x: number, y: number, z: number) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  mesh.position.set(x, y, z);
  return mesh;
}

/** A flat arrow on the floor pointing along +x, for the Move/Turn guides. */
function arrowShape(length: number, width: number) {
  const head = width * 1.9;
  const shape = new THREE.Shape();
  shape.moveTo(0, -width / 2);
  shape.lineTo(length - head, -width / 2);
  shape.lineTo(length - head, -head / 2);
  shape.lineTo(length, 0);
  shape.lineTo(length - head, head / 2);
  shape.lineTo(length - head, width / 2);
  shape.lineTo(0, width / 2);
  shape.closePath();
  return new THREE.ShapeGeometry(shape);
}

const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
const easeInOut = (t: number) => t * t * (3 - 2 * t);
const easeOut = (t: number) => 1 - (1 - t) ** 3;

type Motion =
  | { kind: "idle" }
  | { kind: "windup"; start: number }
  | { kind: "release"; windStart: number; swingStart: number; roll: RollResult; onDone: () => void }
  | { kind: "rolling"; start: number; roll: RollResult; onDone: (() => void) | null };

export function createAlley(canvas: HTMLCanvasElement, bowlers: Bowler[]): AlleyView {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#1a1512");
  const pmrem = new THREE.PMREMGenerator(renderer);
  const environment = new RoomEnvironment();
  scene.environment = pmrem.fromScene(environment, 0.04).texture;
  scene.environmentIntensity = 0.55;

  const camera = new THREE.PerspectiveCamera(40, 16 / 9, 0.05, 80);

  // Lights: warm overall fill, plus a strip of light over the pin decks.
  scene.add(new THREE.HemisphereLight("#fff4e0", "#5a3f22", 1.4));
  const sun = new THREE.DirectionalLight("#fff8ee", 1.6);
  sun.position.set(2, 8, 6);
  scene.add(sun);
  const deckLight = new THREE.DirectionalLight("#ffffff", 1.4);
  deckLight.position.set(0, 3, -12);
  deckLight.target.position.set(0, 0, -HEAD_PIN_DISTANCE - 0.5);
  scene.add(deckLight, deckLight.target);

  const laneTotal = LANE_LENGTH + APPROACH_LENGTH;
  const floorWidth = LANES.length * LANE_PITCH;

  // A mirror under the see-through wood gives the lanes their polished reflections.
  const mirror = new Reflector(new THREE.PlaneGeometry(floorWidth, laneTotal), {
    color: 0x8a8a8a,
    textureWidth: 1024,
    textureHeight: 1024,
  });
  mirror.rotation.x = -Math.PI / 2;
  mirror.position.set(0, -0.002, APPROACH_LENGTH - laneTotal / 2);
  scene.add(mirror);

  const wood = woodTexture();
  wood.wrapS = wood.wrapT = THREE.RepeatWrapping;
  wood.repeat.set(1, 5);
  const laneMaterial = new THREE.MeshStandardMaterial({ map: wood, roughness: 0.35, transparent: true, opacity: 0.8 });
  const gutterMaterial = new THREE.MeshStandardMaterial({ color: "#3a2717", roughness: 0.4, side: THREE.DoubleSide });
  const capMaterial = new THREE.MeshStandardMaterial({ color: "#d9b233", metalness: 0.3, roughness: 0.35 });
  const kickbackMaterial = new THREE.MeshStandardMaterial({ color: "#e0bd3a", roughness: 0.5 });
  const arrowMaterial = new THREE.MeshStandardMaterial({ color: "#7a4a22", roughness: 0.6 });
  const pinMaterial = new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.3, clearcoat: 1 });

  const laneGeometry = new THREE.PlaneGeometry(LANE_WIDTH, LANE_LENGTH);
  const gutterGeometry = new THREE.CylinderGeometry(GUTTER_WIDTH / 2, GUTTER_WIDTH / 2, LANE_LENGTH, 16, 1, true, -Math.PI / 2, Math.PI);
  const arrowGeometry = new THREE.ShapeGeometry(
    new THREE.Shape([new THREE.Vector2(0, 0.12), new THREE.Vector2(-0.018, 0), new THREE.Vector2(0.018, 0)]),
  );
  const pinShape = pinGeometry();
  // The other lanes' racks never move, so they share one instanced mesh.
  const otherPins = new THREE.InstancedMesh(pinShape, pinMaterial, (LANES.length - 1) * PIN_SPOTS.length);
  const bowtie = new THREE.MeshBasicMaterial({ map: plaqueTexture("bowtie"), transparent: true });
  const pennant = new THREE.MeshBasicMaterial({ map: plaqueTexture("pennant"), transparent: true });
  const plaqueGeometry = new THREE.PlaneGeometry(0.26, 0.26);

  const matrix = new THREE.Matrix4();
  let otherIndex = 0;
  LANES.forEach((lane, laneIndex) => {
    const cx = lane * LANE_PITCH;

    const bed = new THREE.Mesh(laneGeometry, laneMaterial);
    bed.rotation.x = -Math.PI / 2;
    bed.position.set(cx, 0, -LANE_LENGTH / 2);
    scene.add(bed);

    for (const side of [-1, 1]) {
      const gutter = new THREE.Mesh(gutterGeometry, gutterMaterial);
      gutter.rotation.x = Math.PI / 2;
      gutter.position.set(cx + side * (LANE_WIDTH / 2 + GUTTER_WIDTH / 2), 0, -LANE_LENGTH / 2);
      scene.add(gutter);
    }
    // Capping and kickback on this lane's right, shared with the next lane.
    const edge = cx + LANE_PITCH / 2;
    scene.add(box(CAP_WIDTH, 0.03, LANE_LENGTH, capMaterial, edge, 0.015, -LANE_LENGTH / 2));
    scene.add(box(0.07, 0.62, 2.8, kickbackMaterial, edge, 0.31, -LANE_LENGTH + 0.9));

    // Aiming arrows, 15 ft out, in a shallow V.
    for (let a = -3; a <= 3; a++) {
      const arrow = new THREE.Mesh(arrowGeometry, arrowMaterial);
      arrow.rotation.x = -Math.PI / 2;
      arrow.position.set(cx + a * 5 * (LANE_WIDTH / 39), 0.001, -4.57 - (3 - Math.abs(a)) * 0.3);
      scene.add(arrow);
    }

    if (laneIndex !== PLAYER_LANE) {
      for (const [x, z] of PIN_SPOTS) {
        matrix.makeTranslation(cx + x, 0, z);
        otherPins.setMatrixAt(otherIndex++, matrix);
      }
    }

    const plaque = new THREE.Mesh(plaqueGeometry, bowtie);
    plaque.position.set(cx, 1.35, BACK_WALL_Z + 0.02);
    scene.add(plaque);
    const between = new THREE.Mesh(plaqueGeometry, pennant);
    between.position.set(edge - 0.3, 1.35, BACK_WALL_Z + 0.02);
    scene.add(between);
  });
  scene.add(otherPins);

  // The player's pins move, so each is its own mesh.
  const pins = PIN_SPOTS.map(() => {
    const pin = new THREE.Mesh(pinShape, pinMaterial);
    scene.add(pin);
    return pin;
  });

  // The approach behind the foul line is one wide floor with no gutters.
  const approachWood = wood.clone();
  approachWood.repeat.set(floorWidth / LANE_WIDTH, (5 * APPROACH_LENGTH) / LANE_LENGTH);
  approachWood.needsUpdate = true;
  const approach = new THREE.Mesh(
    new THREE.PlaneGeometry(floorWidth, APPROACH_LENGTH),
    new THREE.MeshStandardMaterial({ map: approachWood, roughness: 0.35, transparent: true, opacity: 0.8 }),
  );
  approach.rotation.x = -Math.PI / 2;
  approach.position.set(0, 0, APPROACH_LENGTH / 2);
  scene.add(approach);
  // The foul line.
  scene.add(box(floorWidth, 0.002, 0.03, new THREE.MeshBasicMaterial({ color: "#2a1a10" }), 0, 0.001, 0));

  // The pinsetter end: a dark opening behind the pins, wood trim, the mint
  // masking panel with its plaques, and a white shelf along the top.
  const dark = new THREE.MeshStandardMaterial({ color: "#0d0d0f", roughness: 0.9 });
  const trim = new THREE.MeshStandardMaterial({ color: "#8a6a45", roughness: 0.6 });
  const mint = new THREE.MeshStandardMaterial({ color: "#d6e8e0", roughness: 0.8 });
  const white = new THREE.MeshStandardMaterial({ color: "#f4f4f0", roughness: 0.5 });
  scene.add(box(floorWidth, 0.8, 0.05, dark, 0, 0.4, BACK_WALL_Z));
  scene.add(box(floorWidth, 0.1, 0.12, trim, 0, 0.85, BACK_WALL_Z + 0.03));
  scene.add(box(floorWidth, 1.5, 0.05, mint, 0, 1.65, BACK_WALL_Z - 0.02));
  scene.add(box(floorWidth, 0.08, 0.5, white, 0, 2.44, BACK_WALL_Z + 0.2));
  for (const lane of LANES) {
    scene.add(box(0.05, 1.5, 0.08, trim, lane * LANE_PITCH + LANE_PITCH / 2, 1.65, BACK_WALL_Z + 0.02));
  }
  // The pit floor behind the pin decks.
  scene.add(box(floorWidth, 0.02, 0.7, dark, 0, -0.35, -LANE_LENGTH - 0.35));

  // Behind the bowler: carpet, the ball returns either side, rows of seats and a warm back wall.
  const carpet = new THREE.MeshStandardMaterial({ color: "#6c7a5c", roughness: 1 });
  const wall = new THREE.MeshStandardMaterial({ color: "#eed9b6", roughness: 0.9 });
  const band = new THREE.MeshStandardMaterial({ color: "#d9b98a", roughness: 0.9 });
  const seat = new THREE.MeshStandardMaterial({ color: "#f1f1ec", roughness: 0.4 });
  const behind = APPROACH_LENGTH;
  scene.add(box(floorWidth + 10, 0.02, 12, carpet, 0, -0.01, behind + 6));
  scene.add(box(floorWidth + 10, 4, 0.1, wall, 0, 2, behind + 9));
  scene.add(box(floorWidth + 10, 0.3, 0.12, band, 0, 1.1, behind + 8.95));
  scene.add(box(floorWidth + 10, 0.1, 30, wall, 0, 3.4, -8));
  for (const x of [-LANE_PITCH / 2, LANE_PITCH / 2, -LANE_PITCH * 1.5, LANE_PITCH * 1.5]) {
    scene.add(box(0.45, 0.55, 1.3, seat, x, 0.28, behind - 0.9));
    const colors = ["#5bb5e8", "#e86b8f", "#8fd16a", "#f2c14e"];
    colors.forEach((color, i) => {
      const ball = new THREE.Mesh(
        new THREE.SphereGeometry(0.1, 24, 16),
        new THREE.MeshPhysicalMaterial({ color, roughness: 0.2, clearcoat: 1 }),
      );
      ball.position.set(x, 0.66, behind - 1.35 + i * 0.24);
      scene.add(ball);
    });
  }
  for (let row = 0; row < 2; row++) {
    for (let i = -6; i <= 6; i++) {
      const x = i * 0.9;
      const z = behind + 2.6 + row * 2.4;
      scene.add(box(0.6, 0.12, 0.55, seat, x, 0.42, z));
      scene.add(box(0.6, 0.55, 0.1, seat, x, 0.72, z + 0.3));
    }
  }

  // The bowler: the avatar sprite plus arms, in a group that stands where they
  // aim. The group's origin is the line the ball is released on (their right
  // hand), so moving it moves the ball's starting point and turning it turns
  // about that line. The avatar canvas is 100×120 units; at() maps a canvas
  // point into the group, facing down the lane (-z), with +x on the bowler's right.
  const spriteWidth = 0.75;
  const unit = spriteWidth / 100;
  const spriteTop = 1.8;
  const bodyX = -0.17; // the body sits left of the ball line
  const at = (cx: number, cy: number, dz = 0) =>
    // x is flipped: the sprite is turned around to face down the lane.
    new THREE.Vector3(-(cx - 50) * unit + bodyX, spriteTop - cy * unit, dz);

  const bowlerGroup = new THREE.Group();
  scene.add(bowlerGroup);

  const avatarTexture = new THREE.Texture(bowlers[0].sprite);
  avatarTexture.colorSpace = THREE.SRGBColorSpace;
  avatarTexture.needsUpdate = true;
  const spriteMaterial = new THREE.MeshBasicMaterial({
    map: avatarTexture,
    transparent: true,
    toneMapped: false,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const avatar = new THREE.Mesh(new THREE.PlaneGeometry(spriteWidth, spriteWidth * 1.2), spriteMaterial);
  avatar.position.copy(at(50, 60));
  // Face down the lane, toward the pins (and the camera in the bowler shot).
  avatar.rotation.y = Math.PI;
  bowlerGroup.add(avatar);

  const skin = new THREE.MeshStandardMaterial({ color: bowlers[0].skinColor, roughness: 0.7, transparent: true });
  const sleeve = new THREE.MeshStandardMaterial({ color: bowlers[0].outfitColor, roughness: 0.8, transparent: true });
  const shoulders = [at(28, 88, -0.02), at(72, 88, -0.02)]; // bowling (right) arm first
  const arms = shoulders.map(() => {
    const arm = limb(0.045, sleeve);
    const palm = new THREE.Mesh(new THREE.SphereGeometry(0.05, 20, 14), skin);
    palm.scale.set(0.9, 1.1, 0.8);
    bowlerGroup.add(arm, palm);
    return { arm, palm };
  });

  // Ball poses in the group, over the course of a throw.
  const HOLD = at(46, 97, -0.2); // at the chest, both hands on it
  const BACK = new THREE.Vector3(0, 0.55, 0.45); // top of the backswing
  const LET_GO = new THREE.Vector3(0, BALL_RADIUS, -0.45); // at the floor, just past the front foot
  const BALANCE = at(95, 85, -0.1); // the other hand out to the side while swinging

  const ball = new THREE.Mesh(new THREE.SphereGeometry(BALL_RADIUS, 48, 32), ballMaterial("#2f8f4e", "#bff0c8"));
  ball.rotation.set(0.4, 0.8, 0);
  scene.add(ball);

  // The aim guide on the floor: a dashed red line down the lane from the ball,
  // and red arrows showing what the d-pad does (Move: sideways, Turn: around).
  const guideMaterial = new THREE.MeshBasicMaterial({ color: "#ff3b1f", transparent: true, opacity: 0.85, depthWrite: false });
  const guide = new THREE.Group();
  for (let i = 0; i < 16; i++) {
    const dash = box(0.035, 0.001, 0.22, guideMaterial, 0, 0.004, -0.6 - i * 0.42);
    guide.add(dash);
  }
  const moveArrows = new THREE.Group();
  const sideArrow = arrowShape(0.55, 0.09);
  for (const side of [-1, 1]) {
    const arrow = new THREE.Mesh(sideArrow, guideMaterial);
    arrow.rotation.x = -Math.PI / 2;
    if (side < 0) arrow.rotation.z = Math.PI;
    arrow.position.set(side * 0.35, 0.005, -0.35);
    moveArrows.add(arrow);
  }
  const turnArrows = new THREE.Group();
  const turnArc = new THREE.RingGeometry(1.05, 1.13, 32, 1, Math.PI / 2 - 0.55, 1.1);
  const arc = new THREE.Mesh(turnArc, guideMaterial);
  arc.rotation.x = -Math.PI / 2;
  turnArrows.add(arc);
  const turnHead = arrowShape(0.2, 0.08);
  for (const side of [-1, 1]) {
    const head = new THREE.Mesh(turnHead, guideMaterial);
    head.rotation.x = -Math.PI / 2;
    // At the end of the arc, pointing along it (tangent), away from the middle.
    const end = 0.55 * side;
    head.position.set(Math.sin(end) * 1.09, 0.005, -Math.cos(end) * 1.09);
    head.rotation.z = side > 0 ? -end : Math.PI - end;
    turnArrows.add(head);
  }
  guide.add(moveArrows, turnArrows);
  bowlerGroup.add(guide);

  // State
  let shot: Shot = "intro";
  let shotStart = performance.now();
  let aim: Aim = STRAIGHT;
  let motion: Motion = { kind: "idle" };
  let pinMask: PinMask = ALL_PINS;

  function setPins(mask: PinMask) {
    pinMask = mask;
    PIN_SPOTS.forEach(([x, z], i) => {
      pins[i].visible = isStanding(mask, i);
      pins[i].position.set(x, 0, z);
      pins[i].quaternion.identity();
    });
  }
  setPins(ALL_PINS);

  function setOpacity(opacity: number) {
    for (const m of [spriteMaterial, skin, sleeve]) m.opacity = opacity;
  }

  const ballLocal = new THREE.Vector3();
  const hand = new THREE.Vector3();
  const other = new THREE.Vector3();
  const qa = new THREE.Quaternion();
  const qb = new THREE.Quaternion();

  /** Places the ball, pins and bowler for this frame of a roll's recording. */
  function playback(roll: RollResult, elapsed: number) {
    const f = Math.min((elapsed / 1000) * RECORD_RATE, roll.frames - 1);
    const i0 = Math.floor(f);
    const i1 = Math.min(i0 + 1, roll.frames - 1);
    const t = f - i0;
    const data = roll.recording;
    for (let body = 0; body < BODIES; body++) {
      const mesh = body === 0 ? ball : pins[body - 1];
      const a = (i0 * BODIES + body) * BODY_STRIDE;
      const b = (i1 * BODIES + body) * BODY_STRIDE;
      if (data[a + 1] <= HIDDEN_Y / 2) continue;
      mesh.position.set(
        THREE.MathUtils.lerp(data[a], data[b], t),
        THREE.MathUtils.lerp(data[a + 1], data[b + 1], t),
        THREE.MathUtils.lerp(data[a + 2], data[b + 2], t),
      );
      qa.set(data[a + 3], data[a + 4], data[a + 5], data[a + 6]);
      qb.set(data[b + 3], data[b + 4], data[b + 5], data[b + 6]);
      mesh.quaternion.slerpQuaternions(qa, qb, t);
    }
    return f >= roll.frames - 1;
  }

  /** Poses the bowler (and the ball while it's in their hand) for this frame. */
  function animate(now: number) {
    let walk = 0; // 0 at the start spot, 1 at the foul line
    let swingBack = 0; // 0 holding at the chest, 1 at the top of the backswing
    let swingForward = 0; // 0 at the top, 1 letting go
    let held = true;

    if (motion.kind === "windup") {
      walk = easeInOut(clamp01((now - motion.start) / WALK_MS));
      swingBack = walk;
    } else if (motion.kind === "release") {
      walk = easeInOut(clamp01((now - motion.windStart) / WALK_MS));
      swingBack = walk;
      swingForward = easeInOut(clamp01((now - motion.swingStart) / SWING_MS));
      if (now >= motion.swingStart + SWING_MS) {
        motion = { kind: "rolling", start: now, roll: motion.roll, onDone: motion.onDone };
        view.show("roll");
      }
    }
    if (motion.kind === "rolling") {
      walk = 1;
      swingBack = 1;
      swingForward = 1;
      held = false;
      if (playback(motion.roll, now - motion.start) && motion.onDone) {
        const done = motion.onDone;
        motion.onDone = null;
        done();
      }
    }

    bowlerGroup.position.set(aim.position, 0, THREE.MathUtils.lerp(BOWLER_Z, RELEASE_Z, walk));
    // Bend down into the release, so the bowling arm reaches the floor.
    bowlerGroup.scale.y = 1 - 0.22 * swingForward;
    bowlerGroup.rotation.y = (-aim.angle * Math.PI) / 180;
    guide.visible = shot === "aim" && motion.kind === "idle";

    // The ball: chest → backswing → release point, then it's the physics' ball.
    if (swingForward > 0) ballLocal.lerpVectors(BACK, LET_GO, swingForward);
    else ballLocal.lerpVectors(HOLD, BACK, swingBack);
    if (motion.kind === "idle" && shot === "bowler") {
      // A gentle breathing bob while they wait to bowl.
      ballLocal.y += Math.sin(now / 700) * 0.006;
    }
    if (held) {
      ball.position.copy(ballLocal);
      bowlerGroup.localToWorld(ball.position);
      ball.scale.setScalar(THREE.MathUtils.lerp(HELD_SCALE, 1, Math.max(swingBack, swingForward)));
    } else {
      ball.scale.setScalar(1);
    }

    // Arms: the bowling hand stays on the ball; the other lets go of it and
    // comes out to the side for balance once the swing starts.
    const swing = Math.max(swingBack, swingForward);
    hand.copy(held ? ballLocal : LET_GO).add(new THREE.Vector3(0, 0.1, 0));
    other.copy(HOLD).add(new THREE.Vector3(-0.12, -0.05, 0)).lerp(BALANCE, swing);
    [hand, other].forEach((point, i) => {
      placeLimb(arms[i].arm, shoulders[i], point);
      arms[i].palm.position.copy(point);
    });
  }

  function placeCamera(now: number) {
    const elapsed = now - shotStart;
    camera.fov = 40;
    if (shot === "intro") {
      // Low over the lanes, drifting right across the pin decks.
      const t = easeInOut(Math.min(elapsed / INTRO_MS, 1));
      const x = THREE.MathUtils.lerp(-1.1, 1.1, t);
      camera.position.set(x, 0.55, -HEAD_PIN_DISTANCE + 4.2);
      camera.lookAt(x * 0.8, 0.3, -HEAD_PIN_DISTANCE - 0.6);
    } else if (shot === "bowler") {
      // Facing the bowler from down the lane, pushing in to frame them.
      const t = easeOut(Math.min(elapsed / BOWLER_ZOOM_MS, 1));
      const distance = THREE.MathUtils.lerp(3.4, 1.9, t);
      const x = bowlerGroup.position.x + bodyX;
      camera.position.set(x, 1.42, BOWLER_Z - distance);
      camera.lookAt(x, 1.3, BOWLER_Z);
    } else if (shot === "aim") {
      // Behind the bowler, looking down the lane, following their walk.
      const { x, z } = bowlerGroup.position;
      camera.fov = 50;
      camera.position.set(x * 0.6, 1.75, z + 2.4);
      camera.lookAt(x * 0.3, 0.35, z - 7);
    } else {
      // Chase the ball down the lane, then stop short of the pins and watch.
      const z = Math.max(ball.position.z + 2.6, PIN_CAMERA_Z);
      const x = z === PIN_CAMERA_Z ? 0 : ball.position.x * 0.5;
      camera.position.set(x, z === PIN_CAMERA_Z ? 0.8 : 0.75, z);
      camera.lookAt(x * 0.5, 0.2, z - 5);
    }
    // See-through while we're behind them, like the Wii; solid when facing them.
    setOpacity(shot === "bowler" ? 1 : 0.45);
    camera.updateProjectionMatrix();
  }

  function resize() {
    const { clientWidth: w, clientHeight: h } = canvas;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
  }
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  resize();

  renderer.setAnimationLoop((now) => {
    animate(now);
    placeCamera(now);
    renderer.render(scene, camera);
  });

  const view: AlleyView = {
    show(next) {
      shot = next;
      shotStart = performance.now();
    },
    setBowler(index) {
      const b = bowlers[index];
      avatarTexture.image = b.sprite;
      avatarTexture.needsUpdate = true;
      skin.color.set(b.skinColor);
      sleeve.color.set(b.outfitColor);
    },
    setAim(next, mode) {
      aim = next;
      moveArrows.visible = mode === "move";
      turnArrows.visible = mode === "turn";
    },
    setPins(mask) {
      motion = { kind: "idle" };
      setPins(mask);
    },
    windUp() {
      if (motion.kind === "idle") motion = { kind: "windup", start: performance.now() };
    },
    cancelWindUp() {
      if (motion.kind === "windup") motion = { kind: "idle" };
    },
    release(roll, onDone) {
      const now = performance.now();
      // A throw without a wind-up (e.g. the bot) still walks up first.
      const windStart = motion.kind === "windup" ? motion.start : now;
      setPins(pinMask);
      motion = { kind: "release", windStart, swingStart: Math.max(now, windStart + WALK_MS), roll, onDone };
    },
    dispose() {
      renderer.setAnimationLoop(null);
      observer.disconnect();
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          for (const m of materials) {
            for (const value of Object.values(m)) if (value instanceof THREE.Texture) value.dispose();
            m.dispose();
          }
        }
      });
      mirror.dispose();
      scene.environment?.dispose();
      environment.dispose();
      pmrem.dispose();
      renderer.dispose();
    },
  };
  return view;
}
