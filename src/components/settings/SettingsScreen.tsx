import Link from "next/link";
import type { ReactNode } from "react";

/**
 * The frame shared by the settings screens, modeled on the Wii's settings menus:
 * black, a title tab and logo up top, pinstripes between two rules, and a Back
 * pill along the bottom.
 */
export function SettingsScreen({
  title,
  backHref,
  footerRight,
  children,
}: {
  /** Shown in the gray tab at the top left. */
  title: string;
  backHref: string;
  /** Extra controls in the footer, like page numbers. */
  footerRight?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div data-sound="settings-select" data-hover-sound="settings-hover" className="flex min-h-dvh flex-col bg-black text-white">
      <header className="flex items-end justify-between gap-4 px-[3%] pt-6 sm:pt-8">
        <h1 className="rounded-t-2xl bg-gradient-to-b from-[#9d9d9d] to-[#7c7c7c] px-5 pt-2 pb-1 text-2xl font-semibold text-[#1c1c1c] sm:px-8 sm:text-4xl">
          {title}
        </h1>
        <span className="pb-2 text-3xl font-black tracking-tight text-[#8d8d8d] sm:text-5xl">
          W<span className="text-[#b5b5b5]">ii</span>
        </span>
      </header>
      <div className="mx-[1%] h-[3px] bg-[#a3a3a3]" />

      <main className="settings-stripes flex flex-1 items-center justify-center px-4 py-8 sm:px-10">
        <div className="wii-enter w-full">{children}</div>
      </main>

      <div className="mx-[1%] h-[3px] bg-[#e6e6e6]" />
      <footer className="flex items-center justify-between gap-4 px-[6%] py-5 sm:py-6">
        <Link href={backHref} data-sound="settings-back" className="wii-back">
          Back
        </Link>
        {footerRight}
      </footer>
    </div>
  );
}
