import type { Metadata } from "next";
import { Nunito } from "next/font/google";
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

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${nunito.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        {children}
        <MenuMusic />
      </body>
    </html>
  );
}
