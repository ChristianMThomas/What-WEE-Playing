import { QrCode, Smartphone } from "lucide-react";
import { BowlingPanel } from "./BowlingScreen";

/**
 * Stands in for Wii Sports' "Wii Remotes" sidebar: shows whether this player's
 * phone controller is paired. Design pass: always "not paired" until QR
 * pairing (md/02, the pairings table) is built.
 */
export function PhoneRemotePanel() {
  return (
    <BowlingPanel title="Phone Remote">
      <div className="flex flex-1 flex-col items-center justify-center gap-3 py-2 text-center text-white">
        <div className="relative">
          <Smartphone aria-hidden="true" strokeWidth={1.25} className="size-24 text-white/35 sm:size-32" />
          <span className="absolute right-0 bottom-2 size-5 rounded-full border-2 border-[#0d2c4d] bg-[#9a9a9a]" />
        </div>
        <p className="text-lg font-bold sm:text-xl">Not paired</p>
        <p className="max-w-[16rem] text-sm text-white/75 sm:text-base">
          Your phone is your remote. Scan a code with it to pair.
        </p>
      </div>
      <button type="button" className="bowl-choice mt-4 h-16 text-xl font-bold sm:h-20 sm:text-2xl" aria-disabled="true" title="Coming soon">
        <span className="flex items-center gap-2">
          <QrCode aria-hidden="true" className="size-6" />
          Pair Phone
        </span>
      </button>
    </BowlingPanel>
  );
}
