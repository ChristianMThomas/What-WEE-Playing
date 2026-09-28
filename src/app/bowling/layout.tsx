import { RemoteProvider } from "@/components/controller/RemoteProvider";
import { InChannel } from "@/components/home/InChannel";

export default function BowlingLayout({ children }: LayoutProps<"/bowling">) {
  return (
    <RemoteProvider>
      {/* The sports menu sounds for everything in the channel (see UiSounds). Start buttons use "sports-ready". */}
      <div data-sound="sports-click" data-hover-sound="sports-scroll" className="contents">
        {children}
      </div>
      <InChannel href="/bowling" />
    </RemoteProvider>
  );
}
