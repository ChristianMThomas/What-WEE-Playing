// Login and signup run in the browser, not as Server Functions, so Supabase sees
// each player's own IP. Its per-IP auth rate limits would otherwise count every
// attempt against the Next server, and one person could lock everyone out.
// The session cookies are set by the browser client, and the database checks
// the username and avatar ids again, so nothing here needs to be trusted.

import { parseLogin, parseRegistration, type FieldErrors, type Registration } from "@/lib/auth/validation";
import { createClient } from "@/lib/supabase/client";

export interface RegisterState {
  errors?: FieldErrors<keyof Registration>;
  message?: string;
  /** Signup worked but the account needs email confirmation before logging in. */
  confirmEmail?: boolean;
  /** Signed in; the form sends the player on to the boot notice. */
  signedIn?: boolean;
}

export interface LoginState {
  errors?: FieldErrors<"email" | "password">;
  message?: string;
  /** Echoed back so the email field survives a failed attempt. */
  email?: string;
  /** Signed in; the form sends the player on to the boot notice. */
  signedIn?: boolean;
}

const TRY_AGAIN = "Something went wrong. Please try again.";

export async function register(_prev: RegisterState, form: FormData): Promise<RegisterState> {
  const parsed = parseRegistration(form);
  if (!parsed.ok) return { errors: parsed.errors };
  const { email, password, username, skinTone, hairstyle, hairColor, outfit } = parsed.data;

  const supabase = createClient();

  // The on_auth_user_created trigger fails signup on a taken username with a
  // generic error, so check first to give a useful message.
  const { data: available, error: checkError } = await supabase.rpc("username_available", {
    name: username,
  });
  if (checkError) return { message: TRY_AGAIN };
  if (!available) return { errors: { username: "That username is taken." } };

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    // Read by the on_auth_user_created trigger to create the profile.
    options: { data: { username, skin_tone: skinTone, hairstyle, hair_color: hairColor, outfit } },
  });

  if (error) {
    switch (error.code) {
      case "user_already_exists":
      case "email_exists":
        return { errors: { email: "An account with this email already exists." } };
      case "weak_password":
        return { errors: { password: error.message } };
      case "email_address_invalid":
        return { errors: { email: "Enter a valid email address." } };
      case "over_request_rate_limit":
      case "over_email_send_rate_limit":
        return { message: "Too many attempts. Wait a few minutes and try again." };
      case "unexpected_failure":
        // Most likely someone took the username between the check and signup.
        return { errors: { username: "That username was just taken. Try another." } };
      default:
        return { message: TRY_AGAIN };
    }
  }

  if (!data.session) return { confirmEmail: true };
  return { signedIn: true };
}

export async function login(_prev: LoginState, form: FormData): Promise<LoginState> {
  const parsed = parseLogin(form);
  if (!parsed.ok) return { errors: parsed.errors, email: String(form.get("email") ?? "") };
  const { email, password } = parsed.data;

  const supabase = createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    const message =
      error.code === "email_not_confirmed"
        ? "Confirm your email first, using the link we sent you."
        : error.code === "invalid_credentials"
          ? "That email and password don't match."
          : error.code === "over_request_rate_limit"
            ? "Too many attempts. Wait a few minutes and try again."
            : TRY_AGAIN;
    return { message, email };
  }
  return { email, signedIn: true };
}
