"use client";

import type { RealtimeChannel } from "@supabase/supabase-js";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  controllerTopic,
  EVENTS,
  parseButton,
  parseThrow,
  PRESENCE,
  type Button,
  type ButtonMessage,
  type ThrowMessage,
} from "@/lib/controller/protocol";
import { useProfile } from "@/components/session/SessionProvider";
import { createClient } from "@/lib/supabase/client";

const SEEN_LIMIT = 100;

export interface Pairing {
  /** What the QR code opens on the phone. */
  url: string;
  expiresAt: Date;
}

interface Remote {
  /** Whether the paired phone is on the channel right now. */
  connected: boolean;
  /** Where this site is reachable from a phone; used to warn when it's only localhost. */
  origin: string;
  /** Makes a fresh 5-minute pairing code, dropping this desktop's unused ones. */
  createPairing(): Promise<Pairing>;
  /** Forgets the phone: it has to scan a new code to reconnect. */
  unpair(): Promise<void>;
  /** Calls the listener for each valid throw from the phone; returns an unsubscribe. */
  onThrow(listener: (message: ThrowMessage) => void): () => void;
  /**
   * Calls the listener each time a phone button goes down or up; returns an
   * unsubscribe. If the phone drops off while a button is down, the listener
   * gets its release, so nothing stays stuck (e.g. a bowler sliding forever).
   */
  onButton(listener: (message: ButtonMessage) => void): () => void;
}

const RemoteContext = createContext<Remote | null>(null);

export function useRemote(): Remote {
  const remote = useContext(RemoteContext);
  if (!remote) throw new Error("useRemote must be used inside RemoteProvider");
  return remote;
}

/**
 * The desktop's end of the phone controller (md/11). Holds the private
 * controller:{userId} channel for as long as the player is in Bowling, so the
 * pairing carries across menus and into the game. Presence tells it when the
 * phone is connected; throws arrive as broadcasts.
 */
/**
 * Where a phone can reach this site, for the pairing QR code: NEXT_PUBLIC_APP_URL
 * when set (the https tunnel in development, see README → Testing on a phone),
 * otherwise the address this page was loaded from.
 */
function publicOrigin() {
  if (process.env.NEXT_PUBLIC_APP_URL) return new URL(process.env.NEXT_PUBLIC_APP_URL).origin;
  return typeof window === "undefined" ? "" : window.location.origin;
}

export function RemoteProvider({ children }: { children: ReactNode }) {
  const userId = useProfile().id;
  const [origin] = useState(publicOrigin);
  const [connected, setConnected] = useState(false);
  const channel = useRef<RealtimeChannel | null>(null);
  const listeners = useRef(new Set<(message: ThrowMessage) => void>());
  // Recent throw ids, so a repeated delivery isn't bowled twice. Capped, so a
  // misbehaving phone can't grow it forever.
  const seen = useRef(new Set<string>());
  const buttonListeners = useRef(new Set<(message: ButtonMessage) => void>());
  const held = useRef(new Set<Button>());

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;
    let joined: RealtimeChannel | null = null;

    (async () => {
      // Private channels authorize with the session's token.
      await supabase.realtime.setAuth();
      if (cancelled) return;
      joined = supabase.channel(controllerTopic(userId), {
        config: { private: true, presence: { key: PRESENCE.desktop }, broadcast: { self: false } },
      });
      joined
        .on("presence", { event: "sync" }, () => {
          const phone = PRESENCE.phone in joined!.presenceState();
          setConnected(phone);
          if (!phone) {
            for (const button of held.current) {
              for (const listener of buttonListeners.current) listener({ v: 1, button, pressed: false });
            }
            held.current.clear();
          }
        })
        .on("broadcast", { event: EVENTS.button }, ({ payload }) => {
          const message = parseButton(payload);
          if (!message) return;
          if (message.pressed) held.current.add(message.button);
          else held.current.delete(message.button);
          for (const listener of buttonListeners.current) listener(message);
        })
        .on("broadcast", { event: EVENTS.throw }, ({ payload }) => {
          const message = parseThrow(payload);
          if (!message || seen.current.has(message.id)) return;
          seen.current.add(message.id);
          if (seen.current.size > SEEN_LIMIT) seen.current.delete(seen.current.values().next().value!);
          for (const listener of listeners.current) listener(message);
        })
        .subscribe((status) => {
          if (status === "SUBSCRIBED") joined?.track({ role: PRESENCE.desktop });
        });
      channel.current = joined;
    })();

    return () => {
      cancelled = true;
      channel.current = null;
      if (joined) supabase.removeChannel(joined);
    };
  }, [userId]);

  const createPairing = useCallback(async (): Promise<Pairing> => {
    const supabase = createClient();
    await supabase.from("pairings").delete().eq("user_id", userId).is("claimed_at", null);
    const { data, error } = await supabase.from("pairings").insert({ user_id: userId }).select("token, expires_at").single();
    if (error || !data) throw error ?? new Error("No pairing returned");
    return { url: `${origin}/controller?t=${data.token}`, expiresAt: new Date(data.expires_at) };
  }, [userId, origin]);

  const unpair = useCallback(async () => {
    await channel.current?.send({ type: "broadcast", event: EVENTS.unpaired, payload: {} });
    await createClient().from("pairings").delete().eq("user_id", userId);
    setConnected(false);
  }, [userId]);

  const onThrow = useCallback((listener: (message: ThrowMessage) => void) => {
    listeners.current.add(listener);
    return () => void listeners.current.delete(listener);
  }, []);

  const onButton = useCallback((listener: (message: ButtonMessage) => void) => {
    buttonListeners.current.add(listener);
    return () => void buttonListeners.current.delete(listener);
  }, []);

  const value = useMemo(
    () => ({ connected, origin, createPairing, unpair, onThrow, onButton }),
    [connected, origin, createPairing, unpair, onThrow, onButton],
  );
  return <RemoteContext.Provider value={value}>{children}</RemoteContext.Provider>;
}
