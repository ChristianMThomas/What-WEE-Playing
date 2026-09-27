"use client";

import type RAPIER from "@dimforge/rapier3d-deterministic-compat";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Avatar } from "@/components/Avatar";
import { PairPhoneDialog } from "@/components/controller/PairPhoneDialog";
import { useRemote } from "@/components/controller/RemoteProvider";
import type { Button, ThrowParams } from "@/lib/controller/protocol";
import { OUTFITS, SKIN_TONES, type AvatarLook } from "@/lib/avatar";
import { simulateRoll } from "@/lib/bowling/physics";
import { ALL_PINS, countPins, isStanding, type PinMask } from "@/lib/bowling/pins";
import { frameState, scoreGame, type GameConfig } from "@/lib/bowling/scoring";
import { clampAim, launchFrom, MOVE_SPEED, STRAIGHT, TURN_SPEED, type Aim } from "@/lib/bowling/shot";
import type { AimMode, AlleyView } from "./alley";
import { Scoreboard } from "./Scoreboard";

/**
 * - loading: black screen while Three.js, Rapier and the scene load.
 * - intro: the pan across the pins.
 * - turn: facing the bowler, with their scorecard, before each of their frames.
 * - aim: behind the bowler; the d-pad moves or turns them, B throws.
 * - rolling: the ball is on its way.
 * - result: "Strike!", "Spare!" or the pin count, over the settled pins.
 * - over: final standings.
 */
type Phase = "loading" | "intro" | "turn" | "aim" | "rolling" | "result" | "over";

const FADE_MS = 400;
// Keep the black screen up at least this long, so a fast load still reads as a transition.
const MIN_LOADING_MS = 600;
const TURN_MS = 2200;
const RESULT_MS = 1800;
/** After B comes up, how long to wait for the phone's throw before calling it a miss. */
const THROW_GRACE_MS = 600;

interface Player {
  username: string;
  look: AvatarLook;
  isBot?: boolean;
}

type Rapier = typeof RAPIER;
/** rolls[player][frame] is that frame's rolls so far. */
type Rolls = number[][][];

interface Turn {
  player: number;
  /** 0-based. */
  frame: number;
  /** Standing pins for the next roll. */
  pins: PinMask;
}

const FIRST_TURN: Turn = { player: 0, frame: 0, pins: ALL_PINS };

/**
 * A bowling game against the bot (md/08-single-player.md), played with the
 * phone remote (md/06). Each turn opens facing the bowler, then cuts behind
 * them to aim: the d-pad moves them across the lane, A switches it to turning,
 * and holding B walks them up while the ball swings back. Letting go sends the
 * throw; the roll is simulated with deterministic Rapier and played back.
 * The keyboard works too: arrows, A or Enter, and hold Space.
 */
export function BowlingGame({ me, bot, config }: { me: Player; bot: Player; config: GameConfig }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const avatars = useRef<HTMLDivElement>(null);
  const view = useRef<AlleyView | null>(null);
  const rapier = useRef<Rapier | null>(null);
  const remote = useRemote();
  const players: Player[] = [me, { ...bot, isBot: true }];

  const [phase, setPhase] = useState<Phase>("loading");
  const [black, setBlack] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pairing, setPairing] = useState(false);
  const [paused, setPaused] = useState(false);
  const [rolls, setRolls] = useState<Rolls>(() => players.map(() => []));
  const [turn, setTurn] = useState<Turn>(FIRST_TURN);
  const [mode, setMode] = useState<AimMode>("move");
  const [result, setResult] = useState<string | null>(null);

  // Mutable game state the input handlers and timers read without re-subscribing.
  const live = useRef({ phase, turn, rolls, aim: STRAIGHT as Aim, mode, paused, windingUp: false });
  useEffect(() => {
    Object.assign(live.current, { phase, turn, rolls, mode, paused });
  }, [phase, turn, rolls, mode, paused]);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const later = useCallback((ms: number, run: () => void) => {
    timers.current.push(setTimeout(run, ms));
  }, []);

  const setAim = useCallback((aim: Aim, aimMode = live.current.mode) => {
    live.current.aim = aim;
    view.current?.setAim(aim, aimMode);
  }, []);

  /** Starts a bowler's turn: face them with their scorecard, then cut behind them to aim. */
  const startTurn = useCallback(
    (next: Turn, faceBowler: boolean) => {
      setTurn(next);
      live.current.turn = next;
      setResult(null);
      setMode("move");
      setAim(STRAIGHT, "move");
      view.current?.setBowler(next.player);
      view.current?.setPins(next.pins);
      const aim = () => {
        view.current?.show("aim");
        setPhase("aim");
      };
      if (faceBowler) {
        view.current?.show("bowler");
        setPhase("turn");
        later(TURN_MS, aim);
      } else {
        aim();
      }
    },
    [later, setAim],
  );

  /** Scores a settled roll and moves on to the next roll, bowler or frame. */
  const finishRoll = useCallback(
    (standing: PinMask) => {
      const { turn: t, rolls: all } = live.current;
      const knocked = countPins(t.pins) - countPins(standing);
      const frameRolls = [...(all[t.player][t.frame] ?? []), knocked];
      const nextRolls = all.map((r, i) => (i === t.player ? Object.assign([...r], { [t.frame]: frameRolls }) : r));
      setRolls(nextRolls);
      live.current.rolls = nextRolls;

      const state = frameState(frameRolls, t.frame + 1, config);
      const fullRack = t.pins === ALL_PINS;
      setResult(
        knocked === 10 && fullRack
          ? "Strike!"
          : standing === 0
            ? "Spare!"
            : knocked === 0
              ? "No pins"
              : `${knocked} ${knocked === 1 ? "pin" : "pins"}`,
      );
      setPhase("result");

      later(RESULT_MS, () => {
        if (!state.complete) {
          // The last frame's bonus rolls get a fresh rack after a strike or spare.
          return startTurn({ ...t, pins: state.pinsStanding === 10 ? ALL_PINS : standing }, false);
        }
        const nextPlayer = (t.player + 1) % players.length;
        const nextFrame = nextPlayer === 0 ? t.frame + 1 : t.frame;
        if (nextFrame >= config.frameCount) {
          setResult(null);
          setPhase("over");
          return;
        }
        startTurn({ player: nextPlayer, frame: nextFrame, pins: ALL_PINS }, true);
      });
    },
    [config, later, players.length, startTurn],
  );

  /** Throws from the current aim: simulate the whole roll, then play it back. */
  const bowl = useCallback(
    (swing: ThrowParams) => {
      const R = rapier.current;
      const { phase: p, turn: t, aim } = live.current;
      if (!R || !view.current || p !== "aim") return;
      live.current.windingUp = false;
      const roll = simulateRoll(R, launchFrom(aim, swing), t.pins);
      setPhase("rolling");
      live.current.phase = "rolling";
      view.current.release(roll, () => finishRoll(roll.standing));
    },
    [finishRoll],
  );

  const humanAiming = () => {
    const { phase: p, turn: t, paused: isPaused } = live.current;
    return p === "aim" && !players[t.player].isBot && !isPaused;
  };

  // Buttons, from the phone or the keyboard.
  const held = useRef(new Set<Button>());
  const bUpTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const press = useCallback(
    (button: Button, pressed: boolean) => {
      if (pressed) held.current.add(button);
      else held.current.delete(button);

      if (button === "home" && pressed && live.current.phase !== "loading") {
        setPaused((p) => !p);
        return;
      }
      if (!humanAiming()) return;
      if (button === "a" && pressed && !live.current.windingUp) {
        const next = live.current.mode === "move" ? "turn" : "move";
        setMode(next);
        live.current.mode = next;
        view.current?.setAim(live.current.aim, next);
      } else if (button === "b" && pressed) {
        if (bUpTimer.current) clearTimeout(bUpTimer.current);
        live.current.windingUp = true;
        view.current?.windUp();
      } else if (button === "b" && !pressed && live.current.windingUp) {
        // The phone sends its throw just before B comes up; if none arrives, the swing was too soft.
        bUpTimer.current = setTimeout(() => {
          if (live.current.windingUp && live.current.phase === "aim") {
            live.current.windingUp = false;
            view.current?.cancelWindUp();
          }
        }, THROW_GRACE_MS);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  useEffect(() => remote.onButton(({ button, pressed }) => press(button, pressed)), [remote, press]);
  useEffect(
    () =>
      remote.onThrow((message) => {
        if (humanAiming()) bowl(message);
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [remote, bowl],
  );

  // Keyboard: arrows, A or Enter to switch, and Space held like B. With no
  // motion to read, a longer hold bowls harder.
  useEffect(() => {
    const keys: Record<string, Button> = {
      ArrowLeft: "left",
      ArrowRight: "right",
      ArrowUp: "up",
      ArrowDown: "down",
      KeyA: "a",
      Enter: "a",
      Space: "b",
      Escape: "home",
    };
    let spaceDown = 0;
    const down = (e: KeyboardEvent) => {
      const button = keys[e.code];
      if (!button || e.repeat) return;
      e.preventDefault();
      if (button === "b") spaceDown = performance.now();
      press(button, true);
    };
    const up = (e: KeyboardEvent) => {
      const button = keys[e.code];
      if (!button) return;
      e.preventDefault();
      if (button === "b" && humanAiming() && live.current.windingUp) {
        const seconds = (performance.now() - spaceDown) / 1000;
        bowl({ speed: Math.min(9.5, 4 + seconds * 4), angle: 0, spin: 0 });
      }
      press(button, false);
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [press, bowl]);

  // Held arrows move or turn the bowler smoothly.
  useEffect(() => {
    let frame = 0;
    let last = performance.now();
    const tick = (now: number) => {
      // Capped, so coming back to a background tab doesn't jump the bowler across the lane.
      const dt = Math.min(0.25, (now - last) / 1000);
      last = now;
      const direction = (held.current.has("right") ? 1 : 0) - (held.current.has("left") ? 1 : 0);
      if (direction !== 0 && humanAiming() && !live.current.windingUp) {
        const { aim, mode: m } = live.current;
        setAim(
          clampAim(
            m === "move"
              ? { ...aim, position: aim.position + direction * MOVE_SPEED * dt }
              : { ...aim, angle: aim.angle + direction * TURN_SPEED * dt },
          ),
        );
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setAim]);

  // The bot lines up, then bowls a random ball (md/08: it doesn't try to win yet).
  useEffect(() => {
    if (phase !== "aim" || !players[turn.player].isBot) return;
    const aim = { position: (Math.random() - 0.5) * 0.3, angle: (Math.random() - 0.5) * 4 };
    const swing = { speed: 5.5 + Math.random() * 3.5, angle: 0, spin: (Math.random() - 0.5) * 12 };
    const lineUp = setTimeout(() => setAim(aim), 700);
    const windUp = setTimeout(() => view.current?.windUp(), 1300);
    const release = setTimeout(() => bowl(swing), 2100);
    return () => [lineUp, windUp, release].forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, turn]);

  // Load everything, then the intro, then the first turn.
  useEffect(() => {
    let cancelled = false;
    const pending = timers.current;

    (async () => {
      const [{ createAlley, INTRO_MS }, sprites, R] = await Promise.all([
        import("./alley"),
        Promise.all([...avatars.current!.querySelectorAll("svg")].map(avatarImage)),
        import("@dimforge/rapier3d-deterministic-compat").then(async (mod) => {
          await mod.default.init();
          return mod.default;
        }),
        new Promise((resolve) => setTimeout(resolve, MIN_LOADING_MS)),
      ]);
      if (cancelled || !canvas.current) return;
      rapier.current = R;

      view.current = createAlley(
        canvas.current,
        players.map((p, i) => ({
          sprite: sprites[i],
          skinColor: SKIN_TONES.find((o) => o.id === p.look.skinTone)!.color,
          outfitColor: OUTFITS.find((o) => o.id === p.look.outfit)!.color,
        })),
      );
      view.current.show("intro");
      setPhase("intro");
      setBlack(false);

      // Dip to black, then cut to the first bowler.
      later(INTRO_MS - FADE_MS, () => setBlack(true));
      later(INTRO_MS, () => {
        startTurn(FIRST_TURN, true);
        setBlack(false);
      });
    })().catch((e: unknown) => {
      console.error(e);
      if (!cancelled) setError("The game couldn't load. Your browser may not support WebGL.");
    });

    return () => {
      cancelled = true;
      pending.forEach(clearTimeout);
      view.current?.dispose();
      view.current = null;
    };
    // The players are fixed for the game; a new look mid-game doesn't restart it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function playAgain() {
    const fresh = players.map(() => []);
    setRolls(fresh);
    live.current.rolls = fresh;
    startTurn(FIRST_TURN, true);
  }

  const bowler = players[turn.player];
  const humanTurn = !bowler.isBot;
  const standings = players
    .map((p, i) => ({ ...p, total: scoreGame(rolls[i], config).total }))
    .sort((a, b) => b.total - a.total);

  return (
    <main className="fixed inset-0 overflow-hidden bg-black select-none">
      <h1 className="sr-only">Bowling</h1>
      <canvas ref={canvas} aria-hidden="true" className="absolute inset-0 h-full w-full" />

      {phase === "intro" && <IntroBanner username={players[0].username} />}

      {(phase === "turn" || phase === "aim" || phase === "result") && (
        <BowlerTag username={bowler.username} turn={turn.player} players={players.length} frame={turn.frame + 1} />
      )}

      {(phase === "turn" || phase === "result") && (
        <div className="absolute inset-x-0 bottom-[6%] flex justify-center px-4">
          <Scoreboard look={bowler.look} username={bowler.username} rolls={rolls[turn.player]} config={config} />
        </div>
      )}

      {phase === "aim" && (
        <>
          <PinDiagram pins={turn.pins} />
          {humanTurn && <AimHint mode={mode} />}
          {humanTurn && (
            <div className="banner-in absolute top-[5%] right-[3%] flex max-w-[40vw] flex-col items-end gap-2 text-right text-white">
              {remote.connected ? (
                <p className="rounded-xl bg-black/70 px-4 py-2 text-base font-semibold sm:text-lg">
                  Hold B, swing, and let go.
                </p>
              ) : (
                <>
                  <button
                    type="button"
                    className="rounded-xl bg-black/70 px-4 py-2 text-base font-semibold hover:bg-black/85 sm:text-lg"
                    onClick={() => setPairing(true)}
                  >
                    Pair your phone to bowl
                  </button>
                  <p className="rounded-xl bg-black/60 px-3 py-1.5 text-sm">
                    Or use the keyboard: arrows, A to switch, hold Space to bowl.
                  </p>
                </>
              )}
            </div>
          )}
        </>
      )}

      {phase === "result" && result && (
        <p className="result-pop absolute inset-x-0 top-[26%] text-center text-6xl font-black tracking-wide text-white italic drop-shadow-[0_4px_0_#1747b5] sm:text-8xl">
          {result}
        </p>
      )}

      {phase === "over" && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60 p-6">
          <div className="wii-panel flex w-full max-w-xl flex-col gap-5 p-6 text-[#222]">
            <h2 className="text-center text-3xl font-black">Results</h2>
            <ol className="flex flex-col gap-3">
              {standings.map((p, i) => (
                <li key={p.username} className="flex items-center gap-4 rounded-2xl bg-white/80 px-4 py-2">
                  <span className="w-8 text-2xl font-black text-[#1747b5]">{i + 1}</span>
                  <Avatar look={p.look} size={44} title="" />
                  <span className="flex-1 truncate text-xl font-bold">{p.username}</span>
                  <span className="text-2xl font-black">{p.total}</span>
                </li>
              ))}
            </ol>
            <div className="flex justify-center gap-3">
              <button type="button" className="wii-button wii-button-primary" onClick={playAgain}>
                Play Again
              </button>
              <Link href="/bowling/play" className="wii-button">
                Quit
              </Link>
            </div>
          </div>
        </div>
      )}

      {paused && phase !== "over" && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60 p-6">
          <div className="wii-panel flex w-full max-w-sm flex-col items-center gap-4 p-6 text-[#222]">
            <h2 className="text-2xl font-black">HOME Menu</h2>
            <button type="button" className="wii-button wii-button-primary w-full" onClick={() => setPaused(false)}>
              Resume
            </button>
            <Link href="/bowling/play" className="wii-button w-full text-center">
              Quit Game
            </Link>
          </div>
        </div>
      )}

      {pairing && <PairPhoneDialog onClose={() => setPairing(false)} />}
      <p role="status" className="sr-only">
        {phase === "loading"
          ? "Loading the game…"
          : phase === "intro"
            ? "Get ready."
            : phase === "over"
              ? "Game over."
              : result ?? `${bowler.username}'s turn, frame ${turn.frame + 1}.`}
      </p>

      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-0 bg-black transition-opacity ${black ? "opacity-100" : "opacity-0"}`}
        style={{ transitionDuration: `${FADE_MS}ms` }}
      />
      {error && (
        <p role="alert" className="absolute inset-0 flex items-center justify-center p-8 text-center text-xl text-white">
          {error}
        </p>
      )}

      {/* Drawn off screen and copied into the 3D scene as each bowler's sprite. */}
      <div ref={avatars} aria-hidden="true" className="pointer-events-none fixed -left-[9999px] top-0">
        {players.map((p) => (
          <Avatar key={p.username} look={p.look} size={480} title="" />
        ))}
      </div>
    </main>
  );
}

/** Turns a rendered avatar SVG into an image the 3D scene can use as a texture. */
async function avatarImage(svg: SVGSVGElement): Promise<HTMLImageElement> {
  const blob = new Blob([new XMLSerializer().serializeToString(svg)], { type: "image/svg+xml" });
  const url = URL.createObjectURL(blob);
  try {
    const image = new Image(480, 576);
    image.src = url;
    await image.decode();
    return image;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * The intro's name plate in the bottom left, on a pale band that fades out to
 * the right, like Wii Sports. Best score and skill level come later.
 */
function IntroBanner({ username }: { username: string }) {
  return (
    <div className="banner-in absolute bottom-[8%] left-0 w-[min(46rem,70%)] bg-gradient-to-r from-white/85 via-white/70 to-transparent py-3 sm:py-4">
      <div className="flex h-12 items-center bg-black pr-16 pl-[6%] shadow-[inset_0_-3px_0_#1e6bff,inset_0_3px_0_#1e6bff] [clip-path:polygon(0_0,100%_0,calc(100%-2.5rem)_100%,0_100%)] sm:h-16">
        <span className="truncate text-2xl font-bold text-white sm:text-4xl">{username}</span>
      </div>
    </div>
  );
}

/** The current bowler's tag in the top left, with a square per player and theirs lit. */
function BowlerTag({ username, turn, players, frame }: { username: string; turn: number; players: number; frame: number }) {
  return (
    <div className="banner-in absolute top-[5%] left-0 flex h-11 items-center gap-6 bg-black/90 pr-14 pl-[3%] shadow-[inset_0_-2px_0_#1e6bff,inset_0_2px_0_#1e6bff] [clip-path:polygon(0_0,100%_0,calc(100%-2rem)_100%,0_100%)] sm:h-14">
      <span className="max-w-[40vw] truncate text-xl font-bold text-white sm:text-3xl">{username}</span>
      <span className="flex gap-1.5" aria-label={`Player ${turn + 1} of ${players}`}>
        {Array.from({ length: players }, (_, i) => (
          <span key={i} className={`size-3 sm:size-4 ${i === turn ? "bg-[#35d0f5]" : "bg-[#8a8a8a]"}`} />
        ))}
      </span>
      <span className="text-base font-bold text-[#9fd8ff] sm:text-xl">Frame {frame}</span>
    </div>
  );
}

// The rack as seen from the bowler: back row first.
const RACK_ROWS = [
  [6, 7, 8, 9],
  [3, 4, 5],
  [1, 2],
  [0],
];

/** Which pins are standing, as numbered bubbles like Wii Sports' corner diagram. */
function PinDiagram({ pins }: { pins: PinMask }) {
  return (
    <div
      className="banner-in absolute top-[15%] left-[3%] flex flex-col items-center gap-1 sm:gap-1.5"
      role="img"
      aria-label={`${countPins(pins)} pins standing`}
    >
      {RACK_ROWS.map((row, r) => (
        <div key={r} className="flex gap-1 sm:gap-1.5">
          {row.map((pin) => (
            <span
              key={pin}
              className={`flex size-8 items-center justify-center rounded-full text-sm font-black sm:size-11 sm:text-lg ${
                isStanding(pins, pin)
                  ? "bg-gradient-to-b from-white to-[#d9dde3] text-[#333] shadow-[0_2px_4px_rgb(0_0_0/0.4)]"
                  : "border-2 border-white/40 text-white/40"
              }`}
            >
              {pin + 1}
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}

/** The bottom-left hint: what the d-pad does right now, and that A switches it. */
function AimHint({ mode }: { mode: AimMode }) {
  return (
    <div className="banner-in absolute bottom-[8%] left-[5%] flex flex-col gap-3 text-3xl font-black text-[#7fd4ff] drop-shadow-[0_2px_0_#0b3a73] sm:text-5xl">
      <p className="flex items-center gap-3">
        <span aria-hidden="true" className="flex size-12 items-center justify-center text-4xl text-white sm:size-16 sm:text-6xl">
          ✚
        </span>
        {mode === "move" ? "Move" : "Turn"}
      </p>
      <p className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className="flex size-12 items-center justify-center rounded-full border-4 border-white bg-[#e8e8e8] text-2xl text-[#555] sm:size-16 sm:text-3xl"
        >
          A
        </span>
        Switch
      </p>
    </div>
  );
}
