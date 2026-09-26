import type { Metadata } from "next";
import { SystemSettings } from "./SystemSettings";

export const metadata: Metadata = { title: "System Settings · WhatWiPlaying" };

export default function SystemSettingsPage() {
  return <SystemSettings />;
}
