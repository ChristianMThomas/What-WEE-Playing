import type { Metadata } from "next";
import { Nunito } from "next/font/google";
import { UiSounds } from "@/components/UiSounds";
import { MenuMusic } from "@/components/MenuMusic";
import { SessionProvider } from "@/components/session/SessionProvider";
import "./globals.css";

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "WhatWiiPlaying",
  // A private fan project: keep it out of search engines and link previews.
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false, noimageindex: true } },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${nunito.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <SessionProvider>{children}</SessionProvider>
        <MenuMusic />
        <UiSounds />
      </body>
    </html>
  );
}
