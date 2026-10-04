"use client";

import { useState } from "react";
import { Smartphone } from "lucide-react";
import { PairPhoneDialog } from "@/components/controller/PairPhoneDialog";
import { useRemote } from "@/components/controller/RemoteProvider";

/**
 * The home menu's remote button, where the Wii shows its connected remotes:
 * pair a phone from here, so it can point at the menu itself rather than only
 * at a game. Once one is connected it shows as much and unpairs on a click.
 */
export function PairPhoneButton({ className }: { className: string }) {
  const { connected, unpair } = useRemote();
  const [pairing, setPairing] = useState(false);

  return (
    <>
      <button
        type="button"
        data-sound="settings"
        className={`relative ${className}`}
        aria-label={connected ? "Phone remote connected. Unpair it." : "Pair a phone as your remote"}
        title={connected ? "Phone remote connected" : "Pair Phone"}
        onClick={() => (connected ? void unpair() : setPairing(true))}
      >
        <Smartphone aria-hidden="true" strokeWidth={2.25} className="size-8 text-[#8a8f94] sm:size-9" />
        <span
          className={`absolute right-2 bottom-2 size-3 rounded-full border-2 border-white ${connected ? "bg-[#4cd964]" : "bg-[#c3c8cd]"}`}
        />
      </button>
      {pairing && <PairPhoneDialog onClose={() => setPairing(false)} />}
    </>
  );
}
