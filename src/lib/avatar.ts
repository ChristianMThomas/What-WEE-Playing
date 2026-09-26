// Avatar choices (md/07-avatar-system.md). Profiles store the option ids; the
// database doesn't constrain them, so always read them through avatarFromProfile().

export const SKIN_TONES = [
  { id: "porcelain", label: "Porcelain", color: "#f9dcc4" },
  { id: "light", label: "Light", color: "#f1c27d" },
  { id: "medium", label: "Medium", color: "#d9a066" },
  { id: "tan", label: "Tan", color: "#c68642" },
  { id: "brown", label: "Brown", color: "#8d5524" },
  { id: "deep", label: "Deep", color: "#5c3a1e" },
] as const;

export const HAIRSTYLES = [
  { id: "short", label: "Short" },
  { id: "spiky", label: "Spiky" },
  { id: "high-top-fade", label: "High-top fade" },
  { id: "afro", label: "Afro" },
  { id: "dreadlocks", label: "Dreadlocks" },
  { id: "curly", label: "Curly" },
  { id: "long", label: "Long straight" },
  { id: "long-curly", label: "Long curly" },
  { id: "ponytail", label: "Ponytail" },
  { id: "big-bun", label: "Big bun" },
  { id: "bald", label: "Bald" },
] as const;

// Dark brown comes first: it's the default, and what every avatar had before hair color existed.
export const HAIR_COLORS = [
  { id: "dark-brown", label: "Dark brown", color: "#3e2723" },
  { id: "black", label: "Black", color: "#1a1a1a" },
  { id: "brown", label: "Brown", color: "#6d4c41" },
  { id: "auburn", label: "Auburn", color: "#8b3a1f" },
  { id: "red", label: "Red", color: "#c1440e" },
  { id: "blonde", label: "Blonde", color: "#e6c068" },
  { id: "platinum", label: "Platinum", color: "#ece6d6" },
  { id: "gray", label: "Gray", color: "#9e9e9e" },
  { id: "pink", label: "Pink", color: "#f06292" },
  { id: "blue", label: "Blue", color: "#42a5f5" },
  { id: "purple", label: "Purple", color: "#9c6ade" },
  { id: "green", label: "Green", color: "#4caf50" },
] as const;

export const OUTFITS = [
  { id: "red-tee", label: "Red tee", color: "#e53935", accent: "#b71c1c" },
  { id: "blue-jersey", label: "Blue jersey", color: "#1e88e5", accent: "#ffffff" },
  { id: "bowling-shirt", label: "Bowling shirt", color: "#26a69a", accent: "#f9a825" },
  { id: "green-hoodie", label: "Green hoodie", color: "#43a047", accent: "#1b5e20" },
  { id: "purple-sweater", label: "Purple sweater", color: "#8e24aa", accent: "#ce93d8" },
] as const;

export type SkinTone = (typeof SKIN_TONES)[number]["id"];
export type Hairstyle = (typeof HAIRSTYLES)[number]["id"];
export type HairColor = (typeof HAIR_COLORS)[number]["id"];
export type Outfit = (typeof OUTFITS)[number]["id"];

export interface AvatarLook {
  skinTone: SkinTone;
  hairstyle: Hairstyle;
  hairColor: HairColor;
  outfit: Outfit;
}

export const DEFAULT_AVATAR: AvatarLook = {
  skinTone: SKIN_TONES[1].id,
  hairstyle: HAIRSTYLES[0].id,
  hairColor: HAIR_COLORS[0].id,
  outfit: OUTFITS[0].id,
};

function pick<T extends string>(options: readonly { id: T }[], value: unknown, fallback: T): T {
  return options.find((o) => o.id === value)?.id ?? fallback;
}

/** Maps stored values to a valid look; unknown values (like the column default "default") fall back. */
export function avatarFromProfile(profile: {
  skin_tone?: unknown;
  hairstyle?: unknown;
  hair_color?: unknown;
  outfit?: unknown;
}): AvatarLook {
  return {
    skinTone: pick(SKIN_TONES, profile.skin_tone, DEFAULT_AVATAR.skinTone),
    hairstyle: pick(HAIRSTYLES, profile.hairstyle, DEFAULT_AVATAR.hairstyle),
    hairColor: pick(HAIR_COLORS, profile.hair_color, DEFAULT_AVATAR.hairColor),
    outfit: pick(OUTFITS, profile.outfit, DEFAULT_AVATAR.outfit),
  };
}

export function isSkinTone(value: unknown): value is SkinTone {
  return SKIN_TONES.some((o) => o.id === value);
}
export function isHairstyle(value: unknown): value is Hairstyle {
  return HAIRSTYLES.some((o) => o.id === value);
}
export function isHairColor(value: unknown): value is HairColor {
  return HAIR_COLORS.some((o) => o.id === value);
}
export function isOutfit(value: unknown): value is Outfit {
  return OUTFITS.some((o) => o.id === value);
}
