export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`font-extrabold tracking-tight text-wii-ink ${className}`}>
      What <span className="text-wii-blue">Wii</span> Playing?
    </span>
  );
}
