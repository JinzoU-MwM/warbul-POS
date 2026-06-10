// Decorative QR-looking grid (21x21). Deterministic, not a real QR code.
import type { JSX } from "react";

export interface QRCodePlaceholderProps {
  size?: number;
}

export function QRCodePlaceholder({ size = 180 }: QRCodePlaceholderProps): JSX.Element {
  const n = 21;
  const cells: JSX.Element[] = [];
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const finder = (x < 7 && y < 7) || (x > n - 8 && y < 7) || (x < 7 && y > n - 8);
      const on = finder
        ? x === 0 || x === 6 || y === 0 || y === 6 || (x >= 2 && x <= 4 && y >= 2 && y <= 4)
          ? true
          : ((x < 7 && y < 7) || (x > n - 8 && y < 7) || (x < 7 && y > n - 8)) &&
            (x % 6 === 0 || y % 6 === 0)
        : (x * 7 + y * 13 + x * y) % 3 === 0;
      if (on) {
        cells.push(<rect key={x + "-" + y} x={x} y={y} width="1" height="1" fill="#21342A" />);
      }
    }
  }
  return (
    <svg
      viewBox={`0 0 ${n} ${n}`}
      width={size}
      height={size}
      style={{ display: "block", margin: "0 auto" }}
      shapeRendering="crispEdges"
    >
      <rect width={n} height={n} fill="#fff" />
      {cells}
    </svg>
  );
}
