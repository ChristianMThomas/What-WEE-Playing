"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type ComponentProps, type MouseEvent } from "react";

const FADE_MS = 400;
/** How long the screen stays black once the new page is there, so it and its music can settle. */
const HOLD_MS = 900;
/** Fade back in even if the page never arrives, e.g. the session guard redirected. */
const GIVE_UP_MS = 5000;
const EVENT = "wwp:black-screen";

type Request = { href: string; replace: boolean } | { cover: string };

const withoutSlash = (path: string) => (path.length > 1 ? path.replace(/\/+$/, "") : path);

/** Fades to black, opens the page behind it, then fades back in, like a Wii game loading. */
export function goThroughBlack(href: string, { replace = false } = {}) {
  window.dispatchEvent(new CustomEvent<Request>(EVENT, { detail: { href, replace } }));
}

/** Blacks out the screen at once for a navigation that's already happening, like the browser's Back. */
export function coverWithBlack(path: string) {
  window.dispatchEvent(new CustomEvent<Request>(EVENT, { detail: { cover: path } }));
}

/** A link that goes through the black screen. */
export function BlackLink({
  href,
  replace = false,
  onClick,
  ...props
}: ComponentProps<typeof Link> & { href: string }) {
  return (
    <Link
      href={href}
      replace={replace}
      onClick={(e: MouseEvent<HTMLAnchorElement>) => {
        onClick?.(e);
        // Let new-tab and other modified clicks behave like a normal link.
        if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        e.preventDefault();
        goThroughBlack(href, { replace });
      }}
      {...props}
    />
  );
}

/** The full-screen black overlay. Lives in the root layout so it stays up while the page changes. */
export function BlackScreen() {
  const router = useRouter();
  const path = withoutSlash(usePathname());
  const [visible, setVisible] = useState(false);
  const [instant, setInstant] = useState(false);
  /** The page being waited for. */
  const [target, setTarget] = useState<string | null>(null);
  const navigate = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    const onRequest = (e: Event) => {
      const request = (e as CustomEvent<Request>).detail;
      clearTimeout(navigate.current);
      setVisible(true);
      if ("cover" in request) {
        setInstant(true);
        setTarget(withoutSlash(request.cover));
        return;
      }
      setInstant(false);
      setTarget(withoutSlash(new URL(request.href, location.origin).pathname));
      navigate.current = setTimeout(
        () => (request.replace ? router.replace(request.href) : router.push(request.href)),
        FADE_MS,
      );
    };
    window.addEventListener(EVENT, onRequest);
    return () => window.removeEventListener(EVENT, onRequest);
  }, [router]);

  const hide = useCallback(() => {
    setVisible(false);
    setInstant(false);
    setTarget(null);
  }, []);

  // Once the page is there, hold, then fade back in.
  const arrived = target !== null && path === target;
  useEffect(() => {
    if (!arrived) return;
    const timer = setTimeout(hide, HOLD_MS);
    return () => clearTimeout(timer);
  }, [arrived, hide]);

  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(hide, GIVE_UP_MS);
    return () => clearTimeout(timer);
  }, [visible, hide]);

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 z-[100] bg-black transition-opacity ease-in-out"
      style={{
        opacity: visible ? 1 : 0,
        pointerEvents: visible ? "auto" : "none",
        transitionDuration: `${instant ? 0 : FADE_MS}ms`,
      }}
    />
  );
}
