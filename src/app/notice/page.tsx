import type { Metadata } from "next";
import { Suspense } from "react";
import { NoticeScreen } from "./NoticeScreen";

export const metadata: Metadata = { title: "Notice · WhatWiiPlaying" };

export default function NoticePage() {
  // The notice reads ?next= in the browser; Suspense is what static export needs for that.
  return (
    <Suspense>
      <NoticeScreen />
    </Suspense>
  );
}
