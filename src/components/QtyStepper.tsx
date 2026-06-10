"use client";
// Quantity stepper: minus / number / plus.
import type { JSX } from "react";

export interface QtyStepperProps {
  qty: number;
  onChange: (qty: number) => void;
  min?: number;
  size?: "sm" | "md";
}

export function QtyStepper({ qty, onChange, min = 1, size = "md" }: QtyStepperProps): JSX.Element {
  const dim = size === "sm" ? 28 : 30;
  const fontSize = size === "sm" ? 17 : 20;
  const numSize = size === "sm" ? 15 : 18;
  const gap = size === "sm" ? 11 : 14;

  const btn = (extra: React.CSSProperties): React.CSSProperties => ({
    width: dim,
    height: dim,
    borderRadius: 9,
    fontSize,
    fontWeight: 700,
    cursor: "pointer",
    lineHeight: 1,
    ...extra,
  });

  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap }}>
      <button
        type="button"
        onClick={() => onChange(Math.max(min, qty - 1))}
        disabled={qty <= min}
        style={btn({
          border: "1.5px solid var(--line)",
          background: "#fff",
          color: "var(--green-800)",
          opacity: qty <= min ? 0.5 : 1,
        })}
      >
        −
      </button>
      <span className="num" style={{ fontSize: numSize, minWidth: 16, textAlign: "center" }}>
        {qty}
      </span>
      <button
        type="button"
        onClick={() => onChange(qty + 1)}
        style={btn({ border: "none", background: "var(--green-700)", color: "#fff" })}
      >
        +
      </button>
    </div>
  );
}
