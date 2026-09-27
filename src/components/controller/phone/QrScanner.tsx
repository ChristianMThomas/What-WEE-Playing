"use client";

import { useEffect, useRef, useState } from "react";

const SCAN_EVERY_MS = 150;
const MAX_WIDTH = 640;

/**
 * Reads the desktop's pairing QR code with the phone's back camera. Uses jsQR
 * on video frames, since iPhone Safari has no BarcodeDetector. Only codes that
 * open this site's /controller with a token are accepted.
 */
export function QrScanner({ onToken, onCancel }: { onToken: (token: string) => void; onCancel: () => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const [message, setMessage] = useState("Point your camera at the code on your screen.");

  useEffect(() => {
    let stream: MediaStream | null = null;
    let timer: ReturnType<typeof setInterval> | undefined;
    let stopped = false;
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d", { willReadFrequently: true })!;

    (async () => {
      try {
        const [{ default: jsQR }, media] = await Promise.all([
          import("jsqr"),
          navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false }),
        ]);
        stream = media;
        if (stopped || !video.current) return media.getTracks().forEach((t) => t.stop());
        video.current.srcObject = media;
        await video.current.play();

        timer = setInterval(() => {
          const v = video.current;
          if (!v || v.videoWidth === 0) return;
          const scale = Math.min(1, MAX_WIDTH / v.videoWidth);
          canvas.width = Math.round(v.videoWidth * scale);
          canvas.height = Math.round(v.videoHeight * scale);
          context.drawImage(v, 0, 0, canvas.width, canvas.height);
          const image = context.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(image.data, image.width, image.height, { inversionAttempts: "dontInvert" });
          if (!code) return;
          const token = pairingToken(code.data);
          if (token) {
            clearInterval(timer);
            onToken(token);
          } else {
            setMessage("That isn't a WhatWiiPlaying pairing code.");
          }
        }, SCAN_EVERY_MS);
      } catch {
        if (!stopped) setMessage("Couldn't open the camera. Allow camera access, or scan with your Camera app instead.");
      }
    })();

    return () => {
      stopped = true;
      clearInterval(timer);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [onToken]);

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative aspect-square w-full max-w-sm overflow-hidden rounded-3xl bg-black">
        <video ref={video} playsInline muted className="h-full w-full object-cover" />
        <div aria-hidden="true" className="absolute inset-[15%] rounded-2xl border-4 border-white/80" />
      </div>
      <p role="status" className="text-center text-lg">
        {message}
      </p>
      <button type="button" className="bowl-choice h-14 w-full max-w-sm text-xl font-bold" onClick={onCancel}>
        Cancel
      </button>
    </div>
  );
}

/** The token from a scanned URL, if it's this site's controller link. */
function pairingToken(text: string): string | null {
  try {
    const url = new URL(text);
    if (url.origin !== window.location.origin || url.pathname !== "/controller") return null;
    return url.searchParams.get("t");
  } catch {
    return null;
  }
}
