// Menu sound effects, played with Web Audio so rapid sounds overlap instead of
// cutting each other off, and keep playing across page changes. Browser only.

const FILES = {
  "home-click": "/audio/home-click.mp3",
  "home-hover": "/audio/home-hover.wav",
  settings: "/audio/settings.wav",
  "settings-hover": "/audio/settings-hover.wav",
  "settings-select": "/audio/settings-select.wav",
  "settings-back": "/audio/settings-back.wav",
  "zoom-in-game": "/audio/zoom-in-game.wav",
  "zoom-out-game": "/audio/zoom-out-game.wav",
  "bowling-startup": "/audio/bowling-startup.mp3",
} as const;

export type SoundName = keyof typeof FILES;

const VOLUME = 0.6;
// A sound asked for while it's still decoding plays late, unless it's this late.
const MAX_DELAY_MS = 250;

let ctx: AudioContext | null = null;
let output: GainNode | null = null;
const files = new Map<SoundName, Promise<ArrayBuffer>>();
const buffers = new Map<SoundName, Promise<AudioBuffer>>();

export function isSoundName(name: string): name is SoundName {
  return Object.hasOwn(FILES, name);
}

/** Downloads every sound so they're ready to decode once audio is unlocked. */
export function preloadSounds() {
  for (const name of Object.keys(FILES) as SoundName[]) {
    if (files.has(name)) continue;
    const file = fetch(FILES[name]).then((r) => {
      if (!r.ok) throw new Error(`${FILES[name]}: ${r.status}`);
      return r.arrayBuffer();
    });
    file.catch(() => {});
    files.set(name, file);
  }
}

/**
 * Starts audio. Browsers only allow it after the player interacts with the page,
 * so call this from a pointer or key press.
 */
export function unlockSounds() {
  if (ctx) {
    if (ctx.state === "suspended") ctx.resume().catch(() => {});
    return;
  }
  preloadSounds();
  ctx = new AudioContext();
  output = ctx.createGain();
  output.gain.value = VOLUME;
  output.connect(ctx.destination);
  for (const [name, file] of files) {
    const buffer = file.then((data) => ctx!.decodeAudioData(data));
    buffer.catch(() => {});
    buffers.set(name, buffer);
  }
}

/** Plays a sound. Does nothing until audio is unlocked or if the file failed to load. */
export function playSound(name: SoundName) {
  const buffer = buffers.get(name);
  if (!ctx || !output || !buffer) return;
  const asked = performance.now();
  buffer
    .then((b) => {
      if (!ctx || !output || performance.now() - asked > MAX_DELAY_MS) return;
      const source = ctx.createBufferSource();
      source.buffer = b;
      source.connect(output);
      source.start();
    })
    .catch(() => {});
}
