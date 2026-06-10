// Order status pill with colored dot. Pure display.
import type { JSX } from "react";
import type { OrderStatus } from "@/lib/types";

interface PillColors {
  c: string;
  bg: string;
}

const STATUS_COLORS: Record<OrderStatus, PillColors> = {
  "Menunggu Pembayaran": { c: "var(--orange-600)", bg: "#F8EAD6" },
  "Dibayar": { c: "var(--green-ok)", bg: "var(--green-ok-bg)" },
  "Diproses": { c: "var(--blue)", bg: "#E0EAF0" },
  "Selesai": { c: "#6f6353", bg: "#ECE5D5" },
  "Dibatalkan": { c: "#9CA3AF", bg: "#F3F4F6" },
};

export interface StatusPillProps {
  status: OrderStatus;
}

export function StatusPill({ status }: StatusPillProps): JSX.Element {
  const { c, bg } = STATUS_COLORS[status];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        fontSize: 11,
        fontWeight: 700,
        padding: "4px 10px",
        borderRadius: 999,
        color: c,
        background: bg,
        whiteSpace: "nowrap",
      }}
    >
      <span style={{ width: 7, height: 7, borderRadius: 999, background: c, flex: "0 0 auto" }} />
      {status}
    </span>
  );
}
