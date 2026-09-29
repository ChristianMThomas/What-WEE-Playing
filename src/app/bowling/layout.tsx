import { InChannel } from "@/components/home/InChannel";

// The phone remote itself comes from RemoteProvider in the root layout.
export default function BowlingLayout({ children }: LayoutProps<"/bowling">) {
  return (
    <>
      {/* The sports menu sounds for everything in the channel (see UiSounds). Start buttons use "sports-ready". */}
      <div data-sound="sports-click" data-hover-sound="sports-scroll" className="contents">
        {children}
      </div>
      <InChannel href="/bowling" />
    </>
  );
}
