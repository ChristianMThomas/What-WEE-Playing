"use client";

import { useEffect, useRef } from "react";

/**
 * The full-screen Continue button. Clicking, tapping or Enter work natively;
 * this adds the A key, like pressing A on the Wii remote.
 */
export function PressAToContinue({ children }: { children: React.ReactNode }) {
  const button = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    button.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "a" && !e.repeat && !e.ctrlKey && !e.metaKey && !e.altKey) {
        button.current?.form?.requestSubmit(button.current);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <button
      ref={button}
      type="submit"
      aria-label="Continue"
      className="flex min-h-dvh w-full cursor-pointer flex-col items-center justify-center gap-8 px-6 py-12 text-center focus:outline-none sm:gap-12"
    >
      {children}
    </button>
  );
}
