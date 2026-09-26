/** The game's wordmark: "Wii" in gray, "Bowling" in italic blue, like Wii Sports' logo. */
export function WiiBowlingLogo({ className = "", light = false }: { className?: string; light?: boolean }) {
  return (
    <span className={`inline-flex items-baseline gap-[0.12em] font-black leading-none tracking-tight ${className}`}>
      <span className={light ? "text-white" : "text-[#7d7d7d]"}>Wii</span>
      <span className="italic text-[#4aaee0]">Bowling</span>
    </span>
  );
}
