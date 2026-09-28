import Link from "next/link";
import type { ReactNode } from "react";
import { Undo2 } from "lucide-react";
import { BlackLink } from "@/components/BlackScreen";
import { WiiBowlingLogo } from "./WiiBowlingLogo";

/**
 * The frame for the bowling menus, modeled on Wii Sports: a gray title tab and
 * the logo on white, a blue middle for the panels, and a round Back button in
 * the bottom left.
 */
export function BowlingScreen({
  title,
  backHref,
  backLabel = "Back",
  footerRight,
  children,
}: {
  title: string;
  backHref: string;
  backLabel?: string;
  /** Extra controls in the footer, like the Start button. */
  footerRight?: ReactNode;
  children: ReactNode;
}) {
  const BackLink = backHref === "/" ? BlackLink : Link;
  return (
    <div className="flex min-h-dvh flex-col bg-white">
      <header className="flex items-end justify-between gap-4 pt-4 sm:pt-6">
        <h1 className="bg-gradient-to-b from-[#8e8e8e] to-[#6f6f6f] py-2 pr-16 pl-[4%] text-2xl font-bold text-white [clip-path:polygon(0_0,calc(100%-3rem)_0,100%_100%,0_100%)] sm:pr-20 sm:text-4xl">
          {title}
        </h1>
        <WiiBowlingLogo className="pr-[3%] pb-1 text-3xl sm:text-5xl" />
      </header>
      <div className="h-1 bg-[#b9b9b9]" />

      <main className="bowling-backdrop flex flex-1 items-center justify-center px-4 py-6 sm:px-8 sm:py-8">
        <div className="wii-enter w-full max-w-7xl">{children}</div>
      </main>

      <div className="h-1 bg-[#b9b9b9]" />
      <footer className="flex items-center justify-between gap-4 py-3 pr-[4%]">
        {/* Backing out to the home menu quits the game, which goes through the black screen. */}
        <BackLink
          href={backHref}
          className="group flex items-center gap-3 bg-gradient-to-b from-[#a4a4a4] to-[#7c7c7c] py-2 pr-16 pl-[3%] text-2xl font-bold text-white [clip-path:polygon(0_0,100%_0,calc(100%-3rem)_100%,0_100%)] sm:text-3xl"
        >
          <span className="flex size-12 items-center justify-center rounded-full border-[3px] border-white bg-gradient-to-b from-[#f2f2f2] to-[#b8b8b8] text-[#555] transition group-hover:from-[#e4f8ff] group-hover:to-[#8fdcf7] sm:size-14">
            <Undo2 aria-hidden="true" strokeWidth={3} className="size-6 sm:size-7" />
          </span>
          {backLabel}
        </BackLink>
        {footerRight}
      </footer>
    </div>
  );
}

/** A dark panel with a title strip, like "Select the number of players." */
export function BowlingPanel({
  title,
  className = "",
  children,
}: {
  title: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={`bowl-panel ${className}`}>
      <h2 className="bowl-panel-title">{title}</h2>
      <div className="flex flex-1 flex-col p-4 sm:p-6">{children}</div>
    </section>
  );
}
