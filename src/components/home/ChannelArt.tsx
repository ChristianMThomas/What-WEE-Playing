// Art for each home menu channel. All drawn here as SVG on a 160×100 canvas,
// which the tile crops to fit (the tiles are 16:10).
import { Avatar } from "@/components/Avatar";
import type { AvatarLook } from "@/lib/avatar";

const art = "absolute inset-0 h-full w-full";

const title = {
  fontFamily: "var(--font-sans)",
  fontWeight: 900,
  paintOrder: "stroke",
  strokeLinejoin: "round",
} as const;

// Pin positions in the rack, back row first, drawn small at the far end of the lane.
const PINS = [
  [71, 23], [77.7, 23], [84.3, 23], [91, 23],
  [74.3, 27], [81, 27], [87.7, 27],
  [77.7, 31], [84.3, 31],
  [81, 35],
];

export function BowlingArt({ showTitle = true }: { showTitle?: boolean }) {
  return (
    <svg viewBox="0 0 160 100" preserveAspectRatio="xMidYMid slice" className={art} aria-hidden="true">
      <defs>
        <linearGradient id="bowling-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#173a6b" />
          <stop offset="1" stopColor="#2f7dc4" />
        </linearGradient>
        <linearGradient id="bowling-lane" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#d9a864" />
          <stop offset="1" stopColor="#f2cf96" />
        </linearGradient>
      </defs>
      <rect width="160" height="100" fill="url(#bowling-bg)" />
      {/* Lane art, shifted right so the title has room on the left. */}
      <g transform="translate(24 0)">
        {/* Gutters, then the lane narrowing toward the pins. */}
        <path d="M36 100 L68 16 L94 16 L126 100Z" fill="#244a7a" />
        <path d="M44 100 L70 16 L92 16 L118 100Z" fill="url(#bowling-lane)" />
        {[60, 70, 81, 92, 102].map((x) => (
          <path key={x} d={`M${x} 100 L${81 + (x - 81) * 0.12} 16`} stroke="#c8914f" strokeWidth={0.4} opacity={0.6} />
        ))}
        {/* Aiming arrows */}
        {[66, 81, 96].map((x) => (
          <path key={x} d={`M${x} 70 l-2 4 h4Z`} fill="#8a5a2b" opacity={0.7} />
        ))}
        {PINS.map(([x, y]) => (
          <g key={`${x},${y}`}>
            <ellipse cx={x} cy={y} rx={1.7} ry={2.6} fill="#ffffff" />
            <circle cx={x} cy={y - 2.9} r={1.1} fill="#ffffff" />
            <rect x={x - 1.1} y={y - 2.2} width={2.2} height={0.6} fill="#e53935" />
          </g>
        ))}
        {/* The ball rolling up the lane */}
        <circle cx={84} cy={80} r={9} fill="#1e88e5" />
        <circle cx={81} cy={77} r={1.3} fill="#0d47a1" />
        <circle cx={85} cy={76} r={1.3} fill="#0d47a1" />
        <circle cx={83.5} cy={80.5} r={1.3} fill="#0d47a1" />
        <circle cx={80} cy={76} r={3} fill="#ffffff" opacity={0.25} />
      </g>
      {showTitle && (
        <text x="10" y="18" fontSize="15" fill="#ffffff" stroke="#173a6b" strokeWidth="3" style={title}>
          Bowling
        </text>
      )}
    </svg>
  );
}

export function JustDanceArt() {
  return (
    <svg viewBox="0 0 160 100" preserveAspectRatio="xMidYMid slice" className={art} aria-hidden="true">
      <defs>
        <linearGradient id="dance-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ff4fa3" />
          <stop offset="0.55" stopColor="#7b2ff7" />
          <stop offset="1" stopColor="#2ec5ff" />
        </linearGradient>
      </defs>
      <rect width="160" height="100" fill="url(#dance-bg)" />
      {/* Light rays from behind the dancer */}
      {[-60, -30, 0, 30, 60].map((angle) => (
        <path
          key={angle}
          d="M112 60 L104 -10 L120 -10Z"
          fill="#ffffff"
          opacity={0.12}
          transform={`rotate(${angle} 112 60)`}
        />
      ))}
      {/* A dancer mid-move, drawn as a bold silhouette */}
      <g stroke="#ffffff" strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" fill="none">
        <path d="M112 44 L108 64" />
        <path d="M110 48 L96 38 L90 26" />
        <path d="M110 48 L124 42 L132 30" />
        <path d="M108 64 L98 76 L92 88" />
        <path d="M108 64 L120 78 L130 82" />
      </g>
      <circle cx={114} cy={35} r={7} fill="#ffffff" />
      {/* Sparkles */}
      {[
        [26, 70, 3],
        [58, 84, 2],
        [140, 16, 2.5],
        [146, 64, 2],
      ].map(([x, y, r]) => (
        <path
          key={`${x},${y}`}
          d={`M${x} ${y - r * 2} Q${x} ${y} ${x + r * 2} ${y} Q${x} ${y} ${x} ${y + r * 2} Q${x} ${y} ${x - r * 2} ${y} Q${x} ${y} ${x} ${y - r * 2}Z`}
          fill="#fff59d"
        />
      ))}
      <text x="10" y="26" fontSize="15" fill="#ffffff" stroke="#5a1ab8" strokeWidth="3" style={title}>
        Just
      </text>
      <text x="10" y="44" fontSize="15" fill="#ffffff" stroke="#5a1ab8" strokeWidth="3" style={title}>
        Dance
      </text>
    </svg>
  );
}

export function PlayerArt({ look, username }: { look: AvatarLook; username: string }) {
  return (
    <div className="absolute inset-0 flex items-end justify-between bg-gradient-to-b from-[#f7fbfd] to-[#d7eef8] px-[8%] pt-[4%]">
      <div className="flex h-full flex-col justify-center gap-1 pb-[6%]">
        <span className="text-[clamp(0.7rem,1.6vw,1.1rem)] font-black text-wii-blue-dark">My Player</span>
        {/* React escapes the username; never render it as HTML. */}
        <span className="max-w-[9ch] truncate text-[clamp(0.6rem,1.2vw,0.9rem)] font-bold">{username}</span>
      </div>
      <div className="h-[92%] [&>svg]:h-full [&>svg]:w-auto">
        <Avatar look={look} size={100} title={`${username}'s avatar`} />
      </div>
    </div>
  );
}

export function LeaderboardsArt() {
  return (
    <svg viewBox="0 0 160 100" preserveAspectRatio="xMidYMid slice" className={art} aria-hidden="true">
      <defs>
        <linearGradient id="trophy-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff4c2" />
          <stop offset="1" stopColor="#ffd54f" />
        </linearGradient>
        <linearGradient id="trophy-gold" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#f9a825" />
          <stop offset="0.5" stopColor="#ffe082" />
          <stop offset="1" stopColor="#f9a825" />
        </linearGradient>
      </defs>
      <rect width="160" height="100" fill="url(#trophy-bg)" />
      {/* Podium */}
      <rect x="84" y="70" width="18" height="30" fill="#b0bec5" />
      <rect x="102" y="60" width="18" height="40" fill="#eceff1" />
      <rect x="120" y="76" width="18" height="24" fill="#bcaaa4" />
      <text x="111" y="75" fontSize="10" textAnchor="middle" fill="#90a4ae" style={title}>
        1
      </text>
      {/* Trophy on the top step */}
      <path d="M100 22 h22 v6 q0 16 -11 18 q-11 -2 -11 -18Z" fill="url(#trophy-gold)" />
      <path d="M100 26 q-7 0 -7 6 q0 6 8 8" stroke="#f9a825" strokeWidth={2} fill="none" />
      <path d="M122 26 q7 0 7 6 q0 6 -8 8" stroke="#f9a825" strokeWidth={2} fill="none" />
      <rect x="108" y="46" width="6" height="7" fill="#f9a825" />
      <rect x="103" y="53" width="16" height="5" rx="1.5" fill="#8d6e63" />
      <text x="10" y="26" fontSize="14" fill="#ffffff" stroke="#c77800" strokeWidth="3" style={title}>
        Leader-
      </text>
      <text x="10" y="43" fontSize="14" fill="#ffffff" stroke="#c77800" strokeWidth="3" style={title}>
        boards
      </text>
    </svg>
  );
}
