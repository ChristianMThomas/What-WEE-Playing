import { RemoteProvider } from "@/components/controller/RemoteProvider";
import { InChannel } from "@/components/home/InChannel";

export default function BowlingLayout({ children }: LayoutProps<"/bowling">) {
  return (
    <RemoteProvider>
      {children}
      <InChannel href="/bowling" />
    </RemoteProvider>
  );
}
