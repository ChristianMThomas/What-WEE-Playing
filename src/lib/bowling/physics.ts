// The roll, simulated with deterministic Rapier (md/11-realtime-and-physics.md).
// Every client runs simulateRoll() on the same Launch and pin mask and gets the
// same result bit for bit, so this file follows the determinism rules:
// - a fixed timestep, never tied to the render loop;
// - the starting state built only from the constants in ./lane.ts;
// - no randomness, wall-clock time or trig inside the simulation.
//
// The whole roll is simulated up front (a few thousand small steps) and
// recorded; the renderer plays the recording back in real time.

import type RAPIER from "@dimforge/rapier3d-deterministic-compat";
import type { ColliderDesc, World } from "@dimforge/rapier3d-deterministic-compat";
import { APPROACH_LENGTH, BALL_RADIUS, GUTTER_WIDTH, LANE_LENGTH, LANE_WIDTH, PIN_SPOTS } from "./lane";
import { isStanding, type PinMask } from "./pins";
import type { Launch } from "./shot";

type Rapier = typeof RAPIER;

/** Physics steps per second. */
export const STEP_RATE = 120;
/** Recorded frames per second (every other step). */
export const RECORD_RATE = 60;
/** Floats per body per recorded frame: position xyz, then rotation quaternion xyzw. */
export const BODY_STRIDE = 7;
/** Bodies per recorded frame: the ball, then the ten pins. */
export const BODIES = 11;

const GUTTER_DEPTH = 0.05;
const PIT_DEPTH = 0.35;
const PIT_LENGTH = 0.9;
/** The oiled front of the lane, where the ball skids instead of hooking. */
const OIL_LENGTH = 12;
/** Sideways acceleration per rad/s of spin once the ball reaches the dry end, m/s². */
const HOOK_GAIN = 0.09;
/** How long pins keep falling after the ball is gone, in steps. */
const SETTLE_STEPS = 2.5 * STEP_RATE;
const MAX_STEPS = 16 * STEP_RATE;
/** A pin tipped further than this (cosine of ~35°) counts as down. */
const UPRIGHT_COS = 0.82;
/** Where a pin that isn't on the deck is recorded, so the renderer hides it. */
export const HIDDEN_Y = -100;

const BALL_MASS = 6.5; // kg, a 14 lb ball
const PIN_MASS = 1.55; // kg

export interface RollResult {
  /** BODIES × BODY_STRIDE floats per recorded frame, at RECORD_RATE. */
  recording: Float32Array;
  frames: number;
  /** Pins still standing at the end. */
  standing: PinMask;
}

/** A bowling pin as a stack of simple shapes, from its base up. Origin at the base center. */
function pinColliders(R: Rapier): ColliderDesc[] {
  const parts = [
    R.ColliderDesc.cylinder(0.02, 0.03).setTranslation(0, 0.02, 0), // foot
    R.ColliderDesc.cylinder(0.085, 0.058).setTranslation(0, 0.125, 0), // belly
    R.ColliderDesc.cylinder(0.075, 0.03).setTranslation(0, 0.285, 0), // neck
    R.ColliderDesc.ball(0.028).setTranslation(0, 0.353, 0), // head
  ];
  const volume = Math.PI * (0.03 ** 2 * 0.04 + 0.058 ** 2 * 0.17 + 0.03 ** 2 * 0.15) + (4 / 3) * Math.PI * 0.028 ** 3;
  return parts.map((part) => part.setDensity(PIN_MASS / volume).setFriction(0.4).setRestitution(0.5));
}

function buildLane(R: Rapier, world: World) {
  const body = world.createRigidBody(R.RigidBodyDesc.fixed());
  const add = (desc: ColliderDesc) => world.createCollider(desc, body);
  const halfLane = LANE_WIDTH / 2;
  const outer = halfLane + GUTTER_WIDTH;

  // The approach and the lane, one slick surface with its top at y = 0.
  const laneStart = APPROACH_LENGTH;
  const laneEnd = -LANE_LENGTH;
  add(
    R.ColliderDesc.cuboid(halfLane, 0.05, (laneStart - laneEnd) / 2)
      .setTranslation(0, -0.05, (laneStart + laneEnd) / 2)
      .setFriction(0.04),
  );
  // The approach is wider than the lane; this keeps a ball from dropping off its sides.
  add(R.ColliderDesc.cuboid(outer + 0.5, 0.05, laneStart / 2).setTranslation(0, -0.05, laneStart / 2).setFriction(0.04));

  for (const side of [-1, 1]) {
    // Gutter floor, a little below the lane.
    add(
      R.ColliderDesc.cuboid(GUTTER_WIDTH / 2, 0.05, LANE_LENGTH / 2)
        .setTranslation(side * (halfLane + GUTTER_WIDTH / 2), -GUTTER_DEPTH - 0.05, -LANE_LENGTH / 2)
        .setFriction(0.2),
    );
    // Kickback walls along the outside of the gutters and the pit.
    add(
      R.ColliderDesc.cuboid(0.05, 0.4, (LANE_LENGTH + PIT_LENGTH) / 2)
        .setTranslation(side * (outer + 0.05), 0.2, -(LANE_LENGTH + PIT_LENGTH) / 2)
        .setRestitution(0.3),
    );
  }

  // The pit behind the deck, and the cushion at its back.
  add(
    R.ColliderDesc.cuboid(outer, 0.05, PIT_LENGTH / 2)
      .setTranslation(0, -PIT_DEPTH - 0.05, laneEnd - PIT_LENGTH / 2)
      .setFriction(0.6),
  );
  add(
    R.ColliderDesc.cuboid(outer, 0.6, 0.05)
      .setTranslation(0, 0.2, laneEnd - PIT_LENGTH - 0.05)
      .setRestitution(0.05)
      .setFriction(0.8),
  );
}

/**
 * Simulates one roll. `pins` is what's standing before it; standing pins are
 * always re-spotted on their marks first, like a pinsetter does, so the pin
 * mask is the only state carried between rolls.
 */
export function simulateRoll(R: Rapier, launch: Launch, pins: PinMask): RollResult {
  const world = new R.World({ x: 0, y: -9.81, z: 0 });
  world.timestep = 1 / STEP_RATE;
  try {
    buildLane(R, world);

    const pinBodies = PIN_SPOTS.map(([x, z], i) => {
      if (!isStanding(pins, i)) return null;
      const body = world.createRigidBody(R.RigidBodyDesc.dynamic().setTranslation(x, 0, z));
      for (const part of pinColliders(R)) world.createCollider(part, body);
      return body;
    });

    // Rolling from the start (ω = up × v / r), so it doesn't skid off the hand.
    const ball = world.createRigidBody(
      R.RigidBodyDesc.dynamic()
        .setTranslation(launch.x, BALL_RADIUS, 0.4)
        .setLinvel(launch.vx, 0, launch.vz)
        .setAngvel({ x: launch.vz / BALL_RADIUS, y: 0, z: -launch.vx / BALL_RADIUS })
        .setCcdEnabled(true),
    );
    const ballVolume = (4 / 3) * Math.PI * BALL_RADIUS ** 3;
    world.createCollider(
      R.ColliderDesc.ball(BALL_RADIUS).setDensity(BALL_MASS / ballVolume).setFriction(0.04).setRestitution(0.2),
      ball,
    );

    const frames: Float32Array[] = [];
    const record = () => {
      const frame = new Float32Array(BODIES * BODY_STRIDE);
      [ball, ...pinBodies].forEach((body, i) => {
        const o = i * BODY_STRIDE;
        if (!body) {
          frame[o + 1] = HIDDEN_Y;
          frame[o + 6] = 1;
          return;
        }
        const p = body.translation();
        const q = body.rotation();
        frame.set([p.x, p.y, p.z, q.x, q.y, q.z, q.w], o);
      });
      frames.push(frame);
    };

    const hookForce = BALL_MASS * HOOK_GAIN * launch.spin;
    let ballDoneAt: number | null = null;
    record();
    for (let step = 1; step <= MAX_STEPS; step++) {
      const p = ball.translation();
      ball.resetForces(false);
      // Past the oil, and still rolling on the lane itself, side spin hooks the ball.
      if (hookForce !== 0 && p.z < -OIL_LENGTH && p.y > BALL_RADIUS - 0.01 && Math.abs(p.x) < LANE_WIDTH / 2) {
        ball.addForce({ x: hookForce, y: 0, z: 0 }, true);
      }
      world.step();
      if (step % (STEP_RATE / RECORD_RATE) === 0) record();

      if (ballDoneAt === null) {
        const q = ball.translation();
        const v = ball.linvel();
        const stopped = step > STEP_RATE && v.x * v.x + v.z * v.z < 0.05 * 0.05;
        if (q.z < -LANE_LENGTH - 0.2 || stopped) ballDoneAt = step;
      } else if (step - ballDoneAt >= SETTLE_STEPS) {
        break;
      }
    }

    let standing = 0;
    pinBodies.forEach((body, i) => {
      if (!body) return;
      const p = body.translation();
      const q = body.rotation();
      // The pin's up axis after rotation; its y part is 1 - 2(x² + z²).
      const upright = 1 - 2 * (q.x * q.x + q.z * q.z) > UPRIGHT_COS;
      const onDeck = p.y > -0.02 && p.z > -LANE_LENGTH && Math.abs(p.x) < LANE_WIDTH / 2;
      if (upright && onDeck) standing |= 1 << i;
    });

    const recording = new Float32Array(frames.length * BODIES * BODY_STRIDE);
    frames.forEach((frame, i) => recording.set(frame, i * BODIES * BODY_STRIDE));
    return { recording, frames: frames.length, standing };
  } finally {
    world.free();
  }
}
