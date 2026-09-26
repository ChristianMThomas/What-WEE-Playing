import type { ReactNode } from "react";
import { HAIR_COLORS, HAIRSTYLES, OUTFITS, SKIN_TONES, type AvatarLook, type Hairstyle } from "@/lib/avatar";

// Drawn on a 100×120 canvas, head centered at (50, 42) with radius 24.
// Each style has an optional back layer (behind the head) and front layer (over it),
// drawn in the hair color: fills inherit it, and strokes use currentColor.
// Keyed by Hairstyle, so TypeScript flags a new style in avatar.ts until it's drawn here.

// A cap of hair over the top of the head, shared by several styles.
const CAP = "M26 40 Q26 16 50 16 Q74 16 74 40 Q66 28 50 28 Q34 28 26 40Z";

// Points around a circle, for cloud-like curly outlines.
function ring(cx: number, cy: number, radius: number, count: number, from = 0, to = 360) {
  return Array.from({ length: count }, (_, i) => {
    const angle = ((from + ((to - from) * i) / (count - 1)) * Math.PI) / 180;
    return { x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) };
  });
}

// Thick rounded strands from [x1, y1] to [x2, y2], with faint bands so they read as locs.
function Locs({ locs, width }: { locs: [number, number, number, number][]; width: number }) {
  return (
    <g strokeLinecap="round" fill="none">
      {locs.map(([x1, y1, x2, y2]) => (
        <g key={`${x1},${y1}`}>
          <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="currentColor" strokeWidth={width} />
          <line
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke="rgb(0 0 0 / 0.22)"
            strokeWidth={width}
            strokeLinecap="butt"
            strokeDasharray="1 3.5"
          />
        </g>
      ))}
    </g>
  );
}

const HAIR: Record<Hairstyle, { back?: ReactNode; front?: ReactNode }> = {
  short: { front: <path d={CAP} /> },

  spiky: {
    front: <path d="M26 38 L30 16 L38 26 L44 10 L50 24 L56 10 L62 26 L70 16 L74 38 Q62 28 50 28 Q38 28 26 38Z" />,
  },

  "high-top-fade": {
    front: (
      <>
        {/* Faded temples: short hair, so drawn lighter. */}
        <path d="M26.5 48 Q25 38 28 30 L32 30 Q29 38 30 48Z" opacity={0.5} />
        <path d="M73.5 48 Q75 38 72 30 L68 30 Q71 38 70 48Z" opacity={0.5} />
        {/* The flat-topped block, about as wide as the head. */}
        <path d="M27 36 L28 11 Q28 6 34 5.5 Q50 4 66 5.5 Q72 6 72 11 L73 36 Q66 28 50 28 Q34 28 27 36Z" />
      </>
    ),
  },

  afro: {
    back: (
      <>
        <circle cx={50} cy={38} r={31} />
        {ring(50, 38, 31, 16, 0, 360 - 360 / 16).map(({ x, y }, i) => (
          <circle key={i} cx={x} cy={y} r={7} />
        ))}
      </>
    ),
    front: <path d="M27 36 Q28 18 50 18 Q72 18 73 36 Q66 27 50 27 Q34 27 27 36Z" />,
  },

  // 12 locs: 8 hanging around the sides and back to about jaw length, 4 short
  // ones over the forehead, on a cap covering the scalp.
  dreadlocks: {
    back: (
      <Locs
        width={4.6}
        locs={[
          [24, 36, 19, 60],
          [27, 28, 22, 64],
          [31, 22, 27, 67],
          [37, 19, 32, 68],
          [63, 19, 68, 68],
          [69, 22, 73, 67],
          [73, 28, 78, 64],
          [76, 36, 81, 60],
        ]}
      />
    ),
    front: (
      <>
        <path d="M25 42 Q24 15 50 15 Q76 15 75 42 Q68 27 50 27 Q32 27 25 42Z" />
        <Locs
          width={4.4}
          locs={[
            [37, 19, 33, 35],
            [45, 17, 43, 31],
            [55, 17, 57, 31],
            [63, 19, 67, 35],
          ]}
        />
      </>
    ),
  },

  curly: {
    front: (
      <>
        {[26, 34, 42, 50, 58, 66, 74].map((x, i) => (
          <circle key={x} cx={x} cy={i % 2 ? 20 : 25} r={8} />
        ))}
        <circle cx={27} cy={35} r={6} />
        <circle cx={73} cy={35} r={6} />
      </>
    ),
  },

  long: {
    back: <path d="M24 70 L24 40 Q24 14 50 14 Q76 14 76 40 L76 70Z" />,
    front: <path d={CAP} />,
  },

  "long-curly": {
    back: (
      <>
        <ellipse cx={50} cy={46} rx={30} ry={32} />
        {/* Curls framing the face and falling past the shoulders. */}
        {ring(50, 42, 30, 13, 150, 390).map(({ x, y }, i) => (
          <circle key={i} cx={x} cy={y} r={9} />
        ))}
        {[18, 20, 80, 82].map((x, i) => (
          <circle key={x} cx={x} cy={i % 2 ? 76 : 64} r={8} />
        ))}
      </>
    ),
    front: (
      <>
        {[32, 41, 50, 59, 68].map((x, i) => (
          <circle key={x} cx={x} cy={i === 0 || i === 4 ? 26 : i === 2 ? 19 : 21} r={7} />
        ))}
      </>
    ),
  },

  ponytail: {
    front: (
      <>
        <path d={CAP} />
        <ellipse cx={80} cy={40} rx={7} ry={14} />
      </>
    ),
  },

  "big-bun": {
    front: (
      <>
        {/* Hair pulled up smooth, with the bun on top. */}
        <path d="M26 42 Q26 18 50 18 Q74 18 74 42 Q68 26 50 25 Q32 26 26 42Z" />
        <circle cx={50} cy={11} r={11} />
        <path d="M43 20 Q50 23 57 20" stroke="rgb(0 0 0 / 0.25)" strokeWidth={2} fill="none" />
      </>
    ),
  },

  bald: {},
};

/** Where the pupils look: x and y from -1 (left/up) to 1 (right/down). */
export interface Gaze {
  x: number;
  y: number;
}

// The eyes, in canvas coordinates, so callers can aim the gaze at them.
export const EYE_CENTER = { x: 50, y: 44 } as const;
const PUPIL_TRAVEL = { x: 1.6, y: 1.5 };

/** Mii-style 2D avatar. Purely presentational; pass a normalized look from avatarFromProfile(). */
export function Avatar({
  look,
  size = 120,
  title,
  gaze = { x: 0, y: 0 },
  eyesClosed = false,
}: {
  look: AvatarLook;
  size?: number;
  title?: string;
  gaze?: Gaze;
  eyesClosed?: boolean;
}) {
  const skin = SKIN_TONES.find((o) => o.id === look.skinTone) ?? SKIN_TONES[0];
  const outfit = OUTFITS.find((o) => o.id === look.outfit) ?? OUTFITS[0];
  const hairColor = HAIR_COLORS.find((o) => o.id === look.hairColor) ?? HAIR_COLORS[0];
  const hairLabel = HAIRSTYLES.find((o) => o.id === look.hairstyle)?.label ?? "";
  const hair = HAIR[look.hairstyle] ?? {};
  const pupil = { x: gaze.x * PUPIL_TRAVEL.x, y: gaze.y * PUPIL_TRAVEL.y };

  return (
    <svg
      viewBox="0 0 100 120"
      width={size}
      height={size * 1.2}
      role="img"
      aria-label={
        title ??
        `Avatar: ${skin.label.toLowerCase()} skin, ${hairColor.label.toLowerCase()} ${hairLabel.toLowerCase()} hair, ${outfit.label.toLowerCase()}`
      }
    >
      {/* Hair behind the head */}
      <g fill={hairColor.color} color={hairColor.color}>
        {hair.back}
      </g>
      {/* Body */}
      <path d="M22 118 Q22 76 50 76 Q78 76 78 118Z" fill={outfit.color} />
      {outfit.id === "blue-jersey" && <path d="M40 78 L50 90 L60 78" stroke={outfit.accent} strokeWidth={3} fill="none" />}
      {outfit.id === "bowling-shirt" && <rect x={36} y={80} width={6} height={38} fill={outfit.accent} />}
      {outfit.id === "green-hoodie" && <path d="M36 78 Q50 92 64 78" stroke={outfit.accent} strokeWidth={3} fill="none" />}
      {outfit.id === "purple-sweater" && <rect x={22} y={100} width={56} height={4} fill={outfit.accent} />}
      {outfit.id === "red-tee" && <path d="M42 77 Q50 84 58 77" stroke={outfit.accent} strokeWidth={2} fill="none" />}
      {/* Neck and head */}
      <rect x={44} y={62} width={12} height={16} rx={4} fill={skin.color} />
      <circle cx={50} cy={42} r={24} fill={skin.color} />
      {/* Hair over the head */}
      <g fill={hairColor.color} color={hairColor.color}>
        {hair.front}
      </g>
      {/* Face */}
      {[-9, 9].map((dx) =>
        eyesClosed ? (
          <path
            key={dx}
            d={`M${EYE_CENTER.x + dx - 4} ${EYE_CENTER.y} Q${EYE_CENTER.x + dx} ${EYE_CENTER.y + 4} ${EYE_CENTER.x + dx + 4} ${EYE_CENTER.y}`}
            stroke="#212121"
            strokeWidth={2}
            fill="none"
            strokeLinecap="round"
          />
        ) : (
          <g key={dx}>
            <ellipse cx={EYE_CENTER.x + dx} cy={EYE_CENTER.y} rx={4} ry={4.8} fill="#ffffff" />
            <ellipse
              cx={EYE_CENTER.x + dx + pupil.x}
              cy={EYE_CENTER.y + pupil.y}
              rx={2.3}
              ry={3}
              fill="#212121"
            />
          </g>
        ),
      )}
      <path d="M43 54 Q50 59 57 54" stroke="#212121" strokeWidth={2} fill="none" strokeLinecap="round" />
    </svg>
  );
}
