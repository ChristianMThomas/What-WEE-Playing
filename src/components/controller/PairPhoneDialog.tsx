"use client";

import { useEffect, useRef, useState } from "react";
import { QrCode } from "./QrCode";
import { useRemote, type Pairing } from "./RemoteProvider";

// Make a new code this long before the old one expires, so a scan never lands on a dead one.
const REFRESH_EARLY_MS = 15_000;

/**
 * Shows a QR code the phone's camera opens as the controller. The code is
 * replaced before it expires, and the dialog closes itself once the phone connects.
 */
export function PairPhoneDialog({ onClose }: { onClose: () => void }) {
  const { connected, origin, createPairing } = useRemote();
  const [pairing, setPairing] = useState<Pairing | null>(null);
  const [error, setError] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const close = useRef<HTMLButtonElement>(null);
  const wasConnected = useRef(connected);

  useEffect(() => close.current?.focus(), []);

  // A new code when the dialog opens and each time the current one is about to expire.
  const expiresAt = pairing?.expiresAt.getTime();
  useEffect(() => {
    let cancelled = false;
    const delay = expiresAt === undefined ? 0 : Math.max(0, expiresAt - Date.now() - REFRESH_EARLY_MS);
    const timer = setTimeout(() => {
      createPairing()
        .then((p) => !cancelled && setPairing(p))
        .catch(() => !cancelled && setError(true));
    }, delay);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [expiresAt, createPairing]);

  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(tick);
  }, []);

  // Close once a phone connects (not if one was already connected when it opened).
  useEffect(() => {
    if (connected && !wasConnected.current) onClose();
    wasConnected.current = connected;
  }, [connected, onClose]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const localOnly = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
  const secondsLeft = expiresAt ? Math.max(0, Math.round((expiresAt - now) / 1000)) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="pair-title"
        onClick={(e) => e.stopPropagation()}
        className="bowl-panel w-full max-w-md text-white"
      >
        <h2 id="pair-title" className="bowl-panel-title">
          Pair your phone
        </h2>
        <div className="flex flex-col items-center gap-4 p-6 text-center">
          {pairing ? (
            <QrCode value={pairing.url} size={260} label="Pairing code: scan it with your phone's camera" />
          ) : (
            <div className="flex size-[260px] items-center justify-center rounded-lg bg-white/10 text-lg">
              {error ? "Couldn't make a code." : "Making a code…"}
            </div>
          )}
          <p className="text-lg font-bold">Scan this with your phone&apos;s camera.</p>
          <p className="text-sm text-white/75">
            Your phone becomes the remote. Nothing to install or sign in to.
            {secondsLeft !== null && <> A new code appears in {Math.max(0, secondsLeft - REFRESH_EARLY_MS / 1000)}s.</>}
          </p>
          {localOnly && (
            <p role="note" className="rounded-lg bg-[#f7941d]/20 p-3 text-sm text-[#ffd29a]">
              This code points at {origin}, which your phone can&apos;t open. Set NEXT_PUBLIC_APP_URL to your https tunnel
              (README → Testing on a phone).
            </p>
          )}
          {/* The token stays out of the page, tooltip included: it is a bearer string. */}
          {pairing && (
            <p className="max-w-full truncate font-mono text-xs text-white/50">
              {pairing.url.replace(/\?t=.*/, "?t=…")}
            </p>
          )}
          <button ref={close} type="button" className="bowl-choice h-14 w-full text-xl font-bold" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
