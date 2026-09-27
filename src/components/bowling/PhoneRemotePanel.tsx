"use client";

import { useState } from "react";
import { QrCode, Smartphone } from "lucide-react";
import { PairPhoneDialog } from "@/components/controller/PairPhoneDialog";
import { useRemote } from "@/components/controller/RemoteProvider";
import { BowlingPanel } from "./BowlingScreen";

/**
 * Stands in for Wii Sports' "Wii Remotes" sidebar: whether this player's phone
 * controller is connected, and the button to pair one.
 */
export function PhoneRemotePanel() {
  const { connected, unpair } = useRemote();
  const [pairing, setPairing] = useState(false);

  return (
    <BowlingPanel title="Phone Remote">
      <div className="flex flex-1 flex-col items-center justify-center gap-3 py-2 text-center text-white">
        <div className="relative">
          <Smartphone
            aria-hidden="true"
            strokeWidth={1.25}
            className={`size-24 sm:size-32 ${connected ? "text-white" : "text-white/35"}`}
          />
          <span
            className={`absolute right-0 bottom-2 size-5 rounded-full border-2 border-[#0d2c4d] ${connected ? "bg-[#4cd964]" : "bg-[#9a9a9a]"}`}
          />
        </div>
        <p role="status" className="text-lg font-bold sm:text-xl">
          {connected ? "Connected" : "Not connected"}
        </p>
        <p className="max-w-[16rem] text-sm text-white/75 sm:text-base">
          {connected ? "Hold the button on your phone, swing, and let go to bowl." : "Your phone is your remote. Scan a code with it to pair."}
        </p>
      </div>
      {connected ? (
        <button type="button" className="bowl-choice mt-4 h-16 text-xl font-bold sm:h-20 sm:text-2xl" onClick={() => void unpair()}>
          Unpair
        </button>
      ) : (
        <button type="button" className="bowl-choice mt-4 h-16 text-xl font-bold sm:h-20 sm:text-2xl" onClick={() => setPairing(true)}>
          <span className="flex items-center gap-2">
            <QrCode aria-hidden="true" className="size-6" />
            Pair Phone
          </span>
        </button>
      )}
      {pairing && <PairPhoneDialog onClose={() => setPairing(false)} />}
    </BowlingPanel>
  );
}
