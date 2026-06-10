"use client";
// Availability toggle. 42x24 track, 20x20 knob sliding 2px<->20px.
import type { JSX } from "react";

export interface SwitchProps {
  on: boolean;
  onClick: () => void;
}

export function Switch({ on, onClick }: SwitchProps): JSX.Element {
  return (
    <div
      role="switch"
      aria-checked={on}
      onClick={onClick}
      style={{
        width: 42,
        height: 24,
        borderRadius: 999,
        position: "relative",
        cursor: "pointer",
        transition: ".2s",
        flex: "0 0 auto",
        background: on ? "var(--green-ok)" : "var(--cream-300)",
      }}
    >
      <i
        style={{
          position: "absolute",
          top: 2,
          left: on ? 20 : 2,
          width: 20,
          height: 20,
          borderRadius: "50%",
          background: "#fff",
          transition: ".2s",
          boxShadow: "0 1px 3px rgba(0,0,0,.25)",
        }}
      />
    </div>
  );
}
