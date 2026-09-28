"use client";

import { useEffect } from "react";
import { coverWithBlack } from "@/components/BlackScreen";

/**
 * Rendered in a channel's layout. Leaving the channel always goes through the
 * black screen, like quitting a Wii game; the channel's own exits use BlackLink,
 * and this covers the browser's Back and Forward.
 */
export function InChannel({ href }: { href: string }) {
  useEffect(() => {
    const onPopState = () => {
      const path = location.pathname;
      if (path !== href && !path.startsWith(`${href}/`)) coverWithBlack(path);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [href]);
  return null;
}
