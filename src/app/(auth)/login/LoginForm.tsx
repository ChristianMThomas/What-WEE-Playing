"use client";

import { useActionState } from "react";
import { TextField } from "@/components/Field";
import { login, type LoginState } from "../client-auth";
import { useGoToNoticeOnSignIn } from "../useGoToNoticeOnSignIn";

export function LoginForm() {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(login, {});
  useGoToNoticeOnSignIn(state.signedIn);
  const busy = pending || state.signedIn;

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      <TextField
        name="email"
        label="Email"
        type="email"
        autoComplete="email"
        required
        defaultValue={state.email}
        // Remount after each attempt so the echoed email shows up.
        key={state.email}
        error={state.errors?.email}
      />
      <TextField
        name="password"
        label="Password"
        type="password"
        autoComplete="current-password"
        required
        error={state.errors?.password}
      />
      {state.message && (
        <p role="alert" className="text-center font-semibold text-wii-error">
          {state.message}
        </p>
      )}
      <button type="submit" className="wii-button wii-button-primary mt-2" disabled={busy}>
        {busy ? "Logging in…" : "Log in"}
      </button>
    </form>
  );
}
