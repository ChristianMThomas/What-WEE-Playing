import type { ReactNode } from "react";

export const TILE =
  "relative aspect-[16/10] overflow-hidden rounded-[14px] border-[3px] border-[#c3c8cd] shadow-[inset_0_0_0_2px_#fff]";

export const TILE_HOVER =
  "transition duration-150 hover:-translate-y-0.5 hover:border-wii-blue hover:shadow-[0_0_0_4px_rgb(52_191_237/0.35)] focus-visible:border-wii-blue focus-visible:shadow-[0_0_0_4px_rgb(52_191_237/0.5)] focus-visible:outline-none";

/** Glossy highlight across the top, like the Wii's channel glass. */
export function ChannelGloss() {
  return <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/35 to-transparent to-45%" />;
}

/**
 * A channel that isn't playable yet: a picture with a hover glow, not a link.
 * Playable channels use ZoomChannel.
 */
export function Channel({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div
      role="img"
      data-hoverable
      aria-label={`${label} channel, coming soon`}
      title={`${label} · coming soon`}
      className={`${TILE} ${TILE_HOVER} bg-white`}
    >
      {children}
      <ChannelGloss />
    </div>
  );
}

/** An unused channel slot, shown as plain frosted glass like on the Wii. */
export function EmptyChannel({ className = "" }: { className?: string }) {
  return <div aria-hidden="true" className={`${TILE} bg-gradient-to-b from-white to-[#e9ecef] ${className}`} />;
}
