import type { Metadata } from "next";
import { Nunito } from "next/font/google";
import { connection } from "next/server";
import { MenuMusic } from "@/components/MenuMusic";
import "./globals.css";

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "WhatWiPlaying",
  description: "Wii-style games in your browser, with your phone as the remote.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Render every page per request: the CSP nonce (src/proxy.ts) can only be
  // added to scripts at request time, and prerendered pages would be blocked.
  await connection();
  return (
    <html lang="en" className={`${nunito.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        {children}
        <MenuMusic />
      </body>
    </html>
  );
}
