"use client";

import { useSyncExternalStore } from "react";

// Check every second, but the snapshot only changes once a minute, so the
// clock re-renders at most once a minute.
const subscribe = (onChange: () => void) => {
  const id = setInterval(onChange, 1000);
  return () => clearInterval(id);
};
const currentMinute = () => Math.floor(Date.now() / 60_000);
// The server doesn't know the visitor's time zone, so the clock renders only in the browser.
const noTimeOnServer = () => null;

/** The Wii menu's clock and date, e.g. "8:39 AM" over "Tue 8/7". */
export function Clock() {
  const minute = useSyncExternalStore(subscribe, currentMinute, noTimeOnServer);

  if (minute === null) return <div className="h-[4.5rem] sm:h-24" aria-hidden="true" />;

  const now = new Date(minute * 60_000);
  const [time, period] = now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }).split(" ");
  const weekday = now.toLocaleDateString("en-US", { weekday: "short" });

  return (
    <time dateTime={now.toISOString()} className="flex flex-col items-center leading-none text-[#8a8f94]">
      <span className="text-5xl font-light tabular-nums sm:text-6xl">
        {time}
        <span className="ml-1 text-lg font-semibold sm:text-xl">{period}</span>
      </span>
      <span className="mt-2 text-xl font-bold text-[#6f7479] sm:text-2xl">
        {weekday} {now.getMonth() + 1}/{now.getDate()}
      </span>
    </time>
  );
}
