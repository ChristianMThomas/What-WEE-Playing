import { encode } from "uqr";

/** A QR code drawn as one SVG path of dark modules, with a quiet-zone border. */
export function QrCode({ value, size = 240, label }: { value: string; size?: number; label: string }) {
  const { data, size: modules } = encode(value, { ecc: "M", border: 2 });
  let path = "";
  data.forEach((row, y) =>
    row.forEach((dark, x) => {
      if (dark) path += `M${x} ${y}h1v1h-1z`;
    }),
  );
  return (
    <svg
      viewBox={`0 0 ${modules} ${modules}`}
      width={size}
      height={size}
      role="img"
      aria-label={label}
      shapeRendering="crispEdges"
      className="rounded-lg bg-white"
    >
      <path d={path} fill="#111" />
    </svg>
  );
}
