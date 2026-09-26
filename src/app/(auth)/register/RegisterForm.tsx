"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Avatar, EYE_CENTER, type Gaze } from "@/components/Avatar";
import { SelectField, TextField } from "@/components/Field";
import {
  DEFAULT_AVATAR,
  HAIR_COLORS,
  HAIRSTYLES,
  OUTFITS,
  SKIN_TONES,
  type AvatarLook,
} from "@/lib/avatar";
import { passwordChecks } from "@/lib/auth/validation";
import { register, type RegisterState } from "../client-auth";
import { useGoToNoticeOnSignIn } from "../useGoToNoticeOnSignIn";

const LOOK_AHEAD: Gaze = { x: 0, y: 0 };
// How far (px) the cursor must be from the eyes for the pupils to reach the edge.
const FULL_GAZE_DISTANCE = 150;

/**
 * Makes the avatar's eyes follow the pointer while it's over the panel the
 * form sits in. The panel belongs to the (server-rendered) page, so this
 * listens on it directly rather than through React props.
 */
function useGaze() {
  const avatarRef = useRef<HTMLDivElement>(null);
  const [gaze, setGaze] = useState<Gaze>(LOOK_AHEAD);

  useEffect(() => {
    const avatar = avatarRef.current;
    const area = avatar?.closest<HTMLElement>(".wii-panel") ?? avatar;
    if (!avatar || !area) return;

    let pointer: { x: number; y: number } | null = null;
    let frame: number | null = null;

    const update = () => {
      frame = null;
      const svg = avatar.querySelector("svg");
      if (!svg || !pointer) return;
      const box = svg.getBoundingClientRect();
      const dx = pointer.x - (box.left + (box.width * EYE_CENTER.x) / 100);
      const dy = pointer.y - (box.top + (box.height * EYE_CENTER.y) / 120);
      const distance = Math.hypot(dx, dy);
      if (distance < 1) return setGaze(LOOK_AHEAD);
      const strength = Math.min(distance / FULL_GAZE_DISTANCE, 1);
      setGaze({ x: (dx / distance) * strength, y: (dy / distance) * strength });
    };
    // One update per animation frame, however fast the pointer moves.
    const onMove = (e: PointerEvent) => {
      pointer = { x: e.clientX, y: e.clientY };
      frame ??= requestAnimationFrame(update);
    };
    const onLeave = () => {
      pointer = null;
      if (frame !== null) cancelAnimationFrame(frame);
      frame = null;
      setGaze(LOOK_AHEAD);
    };

    area.addEventListener("pointermove", onMove);
    area.addEventListener("pointerleave", onLeave);
    return () => {
      area.removeEventListener("pointermove", onMove);
      area.removeEventListener("pointerleave", onLeave);
      if (frame !== null) cancelAnimationFrame(frame);
    };
  }, []);

  return { avatarRef, gaze };
}

export function RegisterForm() {
  const [state, formAction, pending] = useActionState<RegisterState, FormData>(register, {});
  useGoToNoticeOnSignIn(state.signedIn);
  const busy = pending || state.signedIn;
  // Controlled so values survive a failed submit and the preview updates live.
  const [fields, setFields] = useState({ email: "", password: "", username: "" });
  const [look, setLook] = useState<AvatarLook>(DEFAULT_AVATAR);
  const { avatarRef, gaze } = useGaze();
  // The avatar shuts its eyes while you're in the password field, so it can't peek.
  const [passwordFocused, setPasswordFocused] = useState(false);

  if (state.confirmEmail) {
    return (
      <p role="status" className="text-center text-lg">
        Almost there! We sent a confirmation link to <strong>{fields.email}</strong>. Open it, then log in.
      </p>
    );
  }

  const text = (name: keyof typeof fields) => ({
    name,
    value: fields[name],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => setFields({ ...fields, [name]: e.target.value }),
    error: state.errors?.[name],
  });

  return (
    <form action={formAction} className="grid gap-8 sm:grid-cols-[auto_1fr]" noValidate>
      <fieldset className="flex flex-col items-center gap-4">
        <legend className="sr-only">Your avatar</legend>
        <div ref={avatarRef} className="rounded-[1.5rem] border-2 border-wii-line bg-wii-bg px-6 pt-4">
          <Avatar look={look} size={140} gaze={gaze} eyesClosed={passwordFocused} />
        </div>
        <div className="flex w-full flex-col gap-3 sm:w-48">
          <SelectField
            name="skinTone"
            label="Skin tone"
            options={SKIN_TONES}
            value={look.skinTone}
            onChange={(e) => setLook({ ...look, skinTone: e.target.value as AvatarLook["skinTone"] })}
            error={state.errors?.skinTone}
          />
          <SelectField
            name="hairstyle"
            label="Hairstyle"
            options={HAIRSTYLES}
            value={look.hairstyle}
            onChange={(e) => setLook({ ...look, hairstyle: e.target.value as AvatarLook["hairstyle"] })}
            error={state.errors?.hairstyle}
          />
          <SelectField
            name="hairColor"
            label="Hair color"
            options={HAIR_COLORS}
            value={look.hairColor}
            onChange={(e) => setLook({ ...look, hairColor: e.target.value as AvatarLook["hairColor"] })}
            error={state.errors?.hairColor}
          />
          <SelectField
            name="outfit"
            label="Outfit"
            options={OUTFITS}
            value={look.outfit}
            onChange={(e) => setLook({ ...look, outfit: e.target.value as AvatarLook["outfit"] })}
            error={state.errors?.outfit}
          />
        </div>
      </fieldset>

      <div className="flex flex-col gap-4">
        <TextField
          {...text("username")}
          label="Username"
          autoComplete="username"
          required
          maxLength={20}
          hint="What other players see. 3–20 letters, numbers or underscores."
        />
        <TextField {...text("email")} label="Email" type="email" autoComplete="email" required />
        <TextField
          {...text("password")}
          label="Password"
          type="password"
          autoComplete="new-password"
          required
          aria-describedby={state.errors?.password ? "field-password-error password-rules" : "password-rules"}
          onFocus={() => setPasswordFocused(true)}
          onBlur={() => setPasswordFocused(false)}
        />
        <ul id="password-rules" className="-mt-2 grid gap-x-4 gap-y-0.5 pl-2 text-sm sm:grid-cols-2">
          {passwordChecks(fields.password).map(({ label, met }) => (
            <li key={label} className={met ? "font-semibold text-emerald-600" : ""}>
              <span aria-hidden="true">{met ? "✓" : "○"}</span> {label}
              <span className="sr-only">{met ? " (done)" : " (still needed)"}</span>
            </li>
          ))}
        </ul>
        {state.message && (
          <p role="alert" className="text-center font-semibold text-wii-error">
            {state.message}
          </p>
        )}
        <button type="submit" className="wii-button wii-button-primary mt-2" disabled={busy}>
          {busy ? "Creating account…" : "Create account"}
        </button>
      </div>
    </form>
  );
}
