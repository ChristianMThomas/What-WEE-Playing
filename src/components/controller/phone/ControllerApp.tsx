"use client";

import type { RealtimeChannel } from "@supabase/supabase-js";
import { useCallback, useEffect, useRef, useState } from "react";
import { controllerTopic, EVENTS, PRESENCE, type Button, type ThrowParams } from "@/lib/controller/protocol";
import { createControllerClient } from "@/lib/supabase/controller";
import { QrScanner } from "./QrScanner";
import { WiiRemote } from "./WiiRemote";

// The desktop this phone is paired with, so a reload reconnects without rescanning.
const DESKTOP_KEY = "wwp-controller-desktop";

type Step =
  | { kind: "pairing" }
  | { kind: "scan-prompt"; problem?: string }
  | { kind: "scanning" }
  | { kind: "start" }
  | { kind: "remote" };

/**
 * The phone controller (md/06, md/11). Pairs from the QR code's token with an
 * anonymous session, joins the private controller:{desktopId} channel, and
 * after a tap (which iPhone needs to allow motion data) turns the screen into
 * the Wii Remote (WiiRemote), whose buttons and throws go to the desktop.
 */
export function ControllerApp() {
  const [step, setStep] = useState<Step>({ kind: "pairing" });
  const [desktopId, setDesktopId] = useState<string | null>(null);
  const [desktopName, setDesktopName] = useState<string | null>(null);
  const [online, setOnline] = useState(false);
  const channel = useRef<RealtimeChannel | null>(null);

  const forget = useCallback((problem: string) => {
    localStorage.removeItem(DESKTOP_KEY);
    setDesktopId(null);
    setOnline(false);
    setStep({ kind: "scan-prompt", problem });
  }, []);

  const claim = useCallback(async (token: string) => {
    setStep({ kind: "pairing" });
    const supabase = createControllerClient();
    const { data: session } = await supabase.auth.getSession();
    if (!session.session) {
      const { error } = await supabase.auth.signInAnonymously();
      if (error) return setStep({ kind: "scan-prompt", problem: "Couldn't connect. Check your internet and try again." });
    }
    const { data, error } = await supabase.rpc("claim_pairing", { pairing_token: token });
    if (error || !data) {
      return setStep({
        kind: "scan-prompt",
        problem: "That code expired or was already used. Show a new one on your screen and scan it.",
      });
    }
    localStorage.setItem(DESKTOP_KEY, data);
    setDesktopId(data);
    setStep({ kind: "start" });
  }, []);

  // Stable, so the scanner doesn't restart the camera on every render.
  const scanned = useCallback((token: string) => void claim(token), [claim]);

  // First load: a token from the QR code, or reconnect to the desktop paired before.
  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get("t");
    // Off the address bar and history: the token is single-use, but no need to keep it around.
    if (token) window.history.replaceState(null, "", "/controller");
    const saved = localStorage.getItem(DESKTOP_KEY);
    // Deferred so the state updates don't run synchronously inside the effect.
    queueMicrotask(() => {
      if (token) void claim(token);
      else if (saved) {
        setDesktopId(saved);
        setStep({ kind: "start" });
      } else setStep({ kind: "scan-prompt" });
    });
  }, [claim]);

  // Join the desktop's channel as soon as we know it, so it shows "Connected" right away.
  useEffect(() => {
    if (!desktopId) return;
    const supabase = createControllerClient();
    let cancelled = false;
    let joined: RealtimeChannel | null = null;

    (async () => {
      await supabase.realtime.setAuth();
      if (cancelled) return;
      supabase
        .from("profiles")
        .select("username")
        .eq("id", desktopId)
        .maybeSingle()
        .then(({ data }) => !cancelled && setDesktopName(data?.username ?? null));

      joined = supabase.channel(controllerTopic(desktopId), {
        config: { private: true, presence: { key: PRESENCE.phone }, broadcast: { self: false } },
      });
      joined
        .on("broadcast", { event: EVENTS.unpaired }, () => forget("Your screen unpaired this phone. Scan a new code to reconnect."))
        .subscribe((status, err) => {
          if (cancelled) return;
          if (status === "SUBSCRIBED") {
            setOnline(true);
            joined?.track({ role: PRESENCE.phone });
          } else if (status === "CHANNEL_ERROR" && err?.message.includes("Unauthorized")) {
            // Refused: the pairing expired (12 hours), was replaced by another phone, or was unpaired.
            forget("This phone isn't paired anymore. Scan the code on your screen.");
          } else {
            // Network trouble: the client keeps rejoining on its own.
            setOnline(false);
          }
        });
      channel.current = joined;
    })();

    return () => {
      cancelled = true;
      channel.current = null;
      if (joined) supabase.removeChannel(joined);
    };
  }, [desktopId, forget]);

  const sendThrow = useCallback((params: ThrowParams) => {
    void channel.current?.send({
      type: "broadcast",
      event: EVENTS.throw,
      payload: { v: 1, id: crypto.randomUUID(), ...params },
    });
  }, []);

  const sendButton = useCallback((button: Button, pressed: boolean) => {
    void channel.current?.send({ type: "broadcast", event: EVENTS.button, payload: { v: 1, button, pressed } });
  }, []);

  return (
    <main className="flex h-dvh flex-col overflow-hidden bg-gradient-to-b from-[#eef2f5] to-[#cfd8de] px-5 py-4 text-[#222] select-none">
      <header className="mb-4 flex items-center justify-between gap-3">
        <h1 className="text-xl font-black tracking-tight">
          <span className="text-[#7d7d7d]">Wii</span> <span className="italic text-[#4aaee0]">Remote</span>
        </h1>
        {desktopId && (
          <p className="flex items-center gap-2 truncate text-sm font-semibold">
            <span className={`size-3 shrink-0 rounded-full ${online ? "bg-[#34c759]" : "bg-[#9a9a9a]"}`} />
            {online ? `Connected${desktopName ? ` to ${desktopName}` : ""}` : "Connecting…"}
          </p>
        )}
      </header>

      <div className="flex min-h-0 flex-1 flex-col justify-center">
        {step.kind === "pairing" && <p className="text-center text-xl font-bold">Pairing…</p>}

        {step.kind === "scan-prompt" && (
          <div className="flex flex-col items-center gap-5 text-center">
            {step.problem && (
              <p role="alert" className="rounded-2xl bg-[#fff1e0] p-4 font-semibold text-[#8a4b00]">
                {step.problem}
              </p>
            )}
            <p className="text-2xl font-bold">Scan the code on your screen.</p>
            <p className="text-[#555]">On your computer, open Bowling and press Pair Phone.</p>
            <button type="button" className="wii-pill" onClick={() => setStep({ kind: "scanning" })}>
              Scan Code
            </button>
          </div>
        )}

        {step.kind === "scanning" && (
          <QrScanner onToken={scanned} onCancel={() => setStep({ kind: "scan-prompt" })} />
        )}

        {step.kind === "start" && <StartStep onReady={() => setStep({ kind: "remote" })} />}

        {step.kind === "remote" && <WiiRemote online={online} onButton={sendButton} onThrow={sendThrow} />}
      </div>
    </main>
  );
}

/**
 * The tap iPhone needs before it hands a website motion data. Also keeps the
 * screen awake from here on.
 */
function StartStep({ onReady }: { onReady: () => void }) {
  const [problem, setProblem] = useState<string | null>(null);

  async function start() {
    const Motion = window.DeviceMotionEvent as unknown as { requestPermission?: () => Promise<"granted" | "denied"> } | undefined;
    if (!Motion) return setProblem("This browser doesn't share motion data, so it can't be a remote.");
    if (typeof Motion.requestPermission === "function") {
      const answer = await Motion.requestPermission().catch(() => "denied" as const);
      if (answer !== "granted") {
        return setProblem(
          "Motion access was turned down. To allow it, clear this site's data in Settings → Safari → Advanced → Website Data, then reload.",
        );
      }
    }
    onReady();
  }

  return (
    <div className="flex flex-col items-center gap-5 text-center">
      {problem && (
        <p role="alert" className="rounded-2xl bg-[#fff1e0] p-4 font-semibold text-[#8a4b00]">
          {problem}
        </p>
      )}
      <p className="text-2xl font-bold">Paired!</p>
      <p className="text-[#555]">Tap Start and allow motion access so your swings can bowl.</p>
      <button type="button" className="wii-pill" onClick={() => void start()}>
        Start
      </button>
    </div>
  );
}
