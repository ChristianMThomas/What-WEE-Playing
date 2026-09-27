"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { markNoticeSeen, safeNext } from "@/lib/notice";
import { PressAToContinue } from "./PressAToContinue";

/**
 * The boot notice, modeled on the Wii's health and safety screen. The session
 * guard (src/components/session/SessionProvider.tsx) sends each new browser
 * session here first; continuing goes on to the page they were headed for.
 */
export function NoticeScreen() {
  const router = useRouter();
  const next = safeNext(useSearchParams().get("next"));

  return (
    <form
      className="flex min-h-dvh flex-col bg-black text-white"
      onSubmit={(e) => {
        e.preventDefault();
        markNoticeSeen();
        router.replace(next);
      }}
    >
      <PressAToContinue>
        <h1 className="notice-fade flex items-center gap-3 text-2xl font-black tracking-wide sm:gap-4 sm:text-5xl">
          <svg viewBox="0 0 48 42" className="w-10 shrink-0 sm:w-16" aria-hidden="true">
            <path d="M24 2 L46 40 L2 40Z" fill="#ffe000" stroke="#ffe000" strokeWidth="3" strokeLinejoin="round" />
            <rect x="21.5" y="13" width="5" height="15" rx="1.5" fill="#111" />
            <rect x="21.5" y="31" width="5" height="5" rx="1.5" fill="#111" />
          </svg>
          NOTICE – FAN PROJECT &amp; SAFETY
        </h1>

        <p className="notice-fade max-w-4xl text-lg font-extrabold uppercase leading-relaxed tracking-wide sm:text-3xl sm:leading-relaxed">
          WhatWiiPlaying is a fan-made web app inspired by the Nintendo Wii. It is not the Wii, and it
          is not made, endorsed or sponsored by Nintendo.
        </p>

        <div className="notice-fade flex max-w-3xl flex-col gap-3 text-base font-semibold text-[#d8d8d8] sm:text-xl">
          <p>
            Wii and Nintendo are trademarks of Nintendo. This is a free, just-for-fun project made by
            fans. <span className="text-[#7fb8ff]">Please don&apos;t sue us, Nintendo!</span>
          </p>
          <p>
            Play in an open space, keep a firm grip on your phone when you swing it, and take a break
            every so often. Bright flashes and screen shake can be turned down in Settings.
          </p>
        </div>

        <p className="notice-prompt flex items-center gap-3 text-2xl font-extrabold text-[#8a8a8a] sm:text-4xl">
          Press
          <span
            aria-hidden="true"
            className="inline-flex size-10 items-center justify-center rounded-full border-[3px] border-current text-xl sm:size-14 sm:text-3xl"
          >
            A
          </span>
          or click to continue.
        </p>
      </PressAToContinue>
    </form>
  );
}
