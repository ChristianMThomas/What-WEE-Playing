import { isHairColor, isHairstyle, isOutfit, isSkinTone, type AvatarLook } from "@/lib/avatar";

// Must match the profiles.username check constraint in supabase/migrations.
export const USERNAME_PATTERN = /^[A-Za-z0-9_]{3,20}$/;
// Must match auth.minimum_password_length in supabase/config.toml (and the hosted project).
export const MIN_PASSWORD_LENGTH = 8;
// bcrypt, which Supabase uses, ignores anything past 72 bytes.
const MAX_PASSWORD_LENGTH = 72;

// The symbols Supabase counts for password_requirements = "lower_upper_letters_digits_symbols"
// (supabase/config.toml). Kept identical so the form never passes a password Supabase rejects.
const PASSWORD_SYMBOLS = "!@#$%^&*()_+-=[]{};'\\:\"|<>?,./`~";

/** Each password rule and whether it's met, for the live checklist and for validation. */
export function passwordChecks(password: string) {
  return [
    { label: `At least ${MIN_PASSWORD_LENGTH} characters`, met: password.length >= MIN_PASSWORD_LENGTH },
    { label: "An uppercase letter", met: /[A-Z]/.test(password) },
    { label: "A lowercase letter", met: /[a-z]/.test(password) },
    { label: "A number", met: /[0-9]/.test(password) },
    { label: "A symbol (like ! ? # or @)", met: [...password].some((c) => PASSWORD_SYMBOLS.includes(c)) },
  ];
}

function checkPassword(password: string) {
  if (password.length > MAX_PASSWORD_LENGTH) return `Use ${MAX_PASSWORD_LENGTH} characters or fewer.`;
  const missing = passwordChecks(password).filter((c) => !c.met);
  if (missing.length === 0) return undefined;
  return `Your password needs: ${missing.map((c) => c.label.toLowerCase()).join(", ")}.`;
}

export type FieldErrors<F extends string> = Partial<Record<F, string>>;

export interface Registration extends AvatarLook {
  email: string;
  password: string;
  username: string;
}

const text = (form: FormData, key: string) => {
  const value = form.get(key);
  return typeof value === "string" ? value : "";
};

function checkEmail(email: string) {
  // Supabase does the real check; this only catches obvious typos before a round trip.
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? undefined : "Enter a valid email address.";
}

export function parseRegistration(
  form: FormData,
): { ok: true; data: Registration } | { ok: false; errors: FieldErrors<keyof Registration> } {
  const data = {
    email: text(form, "email").trim(),
    password: text(form, "password"),
    username: text(form, "username").trim(),
    skinTone: text(form, "skinTone"),
    hairstyle: text(form, "hairstyle"),
    hairColor: text(form, "hairColor"),
    outfit: text(form, "outfit"),
  };

  const errors: FieldErrors<keyof Registration> = {
    email: checkEmail(data.email),
    password: checkPassword(data.password),
    username: USERNAME_PATTERN.test(data.username)
      ? undefined
      : "Use 3–20 letters, numbers or underscores.",
    skinTone: isSkinTone(data.skinTone) ? undefined : "Pick a skin tone.",
    hairstyle: isHairstyle(data.hairstyle) ? undefined : "Pick a hairstyle.",
    hairColor: isHairColor(data.hairColor) ? undefined : "Pick a hair color.",
    outfit: isOutfit(data.outfit) ? undefined : "Pick an outfit.",
  };

  for (const key of Object.keys(errors) as (keyof Registration)[]) {
    if (!errors[key]) delete errors[key];
  }
  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, data: data as Registration };
}

export function parseLogin(
  form: FormData,
): { ok: true; data: { email: string; password: string } } | { ok: false; errors: FieldErrors<"email" | "password"> } {
  const email = text(form, "email").trim();
  const password = text(form, "password");
  const errors: FieldErrors<"email" | "password"> = {};
  const emailError = checkEmail(email);
  if (emailError) errors.email = emailError;
  if (!password) errors.password = "Enter your password.";
  return Object.keys(errors).length > 0 ? { ok: false, errors } : { ok: true, data: { email, password } };
}
