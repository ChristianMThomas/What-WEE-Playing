import type { Metadata, Viewport } from "next";
import { ControllerApp } from "@/components/controller/phone/ControllerApp";

export const metadata: Metadata = { title: "Remote · WhatWiiPlaying" };
export const viewport: Viewport = { themeColor: "#eef2f5" };

// The phone controller. Public (SessionProvider skips it): phones pair with an anonymous
// session from the desktop's QR code instead of logging in.
export default function ControllerPage() {
  return <ControllerApp />;
}
