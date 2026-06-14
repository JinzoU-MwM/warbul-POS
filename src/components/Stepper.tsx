// Vertical 4-step order timeline. Pure display.
import type { JSX } from "react";
import type { OrderStatus } from "@/lib/types";
import { Icons } from "./icons";

const STEPS = ["Pesanan Diterima", "Pembayaran", "Diproses", "Selesai"] as const;

// How many steps are "reached" for a given status.
const REACHED: Record<OrderStatus, number> = {
  "Menunggu Pembayaran": 1,
  "Dibayar": 2,
  "Diproses": 3,
  "Selesai": 4,
  "Dibatalkan": 0,
};

export interface StepperProps {
  status: OrderStatus;
  note?: string;
}

export function Stepper({ status, note }: StepperProps): JSX.Element {
  const reachedCount = REACHED[status];
  const currentIdx = Math.min(reachedCount - 1, STEPS.length - 1);

  return (
    <div style={{ position: "relative", paddingLeft: 6 }}>
      {STEPS.map((label, i) => {
        const reached = i < reachedCount;
        const current = i === currentIdx;
        const last = i === STEPS.length - 1;
        return (
          <div
            key={label}
            style={{ display: "flex", gap: 15, position: "relative", paddingBottom: last ? 0 : 24 }}
          >
            {!last && (
              <div
                style={{
                  position: "absolute",
                  left: 14,
                  top: 30,
                  bottom: 0,
                  width: 3,
                  background: i < reachedCount - 1 ? "var(--green-700)" : "var(--cream-300)",
                }}
              />
            )}
            <div
              style={{
                flex: "0 0 auto",
                width: 30,
                height: 30,
                borderRadius: "50%",
                display: "grid",
                placeItems: "center",
                fontWeight: 700,
                fontSize: 14,
                background: reached ? "var(--green-700)" : "#fff",
                color: reached ? "#fff" : "var(--cream-400)",
                border: "2px solid " + (reached ? "var(--green-700)" : "var(--cream-300)"),
                zIndex: 2,
                boxShadow: current ? "0 0 0 5px rgba(62,92,70,.18)" : "none",
              }}
            >
              {reached ? <Icons.check size={14} /> : i + 1}
            </div>
            <div style={{ paddingTop: 3 }}>
              <div
                style={{
                  fontWeight: 700,
                  fontSize: 14.5,
                  color: current ? "var(--green-700)" : reached ? "var(--ink)" : "#a99c86",
                }}
              >
                {label}
              </div>
              {current && note && (
                <div style={{ fontSize: 12.5, color: "var(--green-700)", fontWeight: 600, marginTop: 2 }}>
                  {note}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
