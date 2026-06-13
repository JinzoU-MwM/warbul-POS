"use client";
// Thermal receipt content (#rcpt is required — globals.css scopes @media print to it)
// plus a modal wrapper with Tutup / Cetak Struk actions.
import { useState, type JSX } from "react";
import type { Order, StoreSettings } from "@/lib/types";
import { rupiah } from "@/lib/constants";
import {
  printReceiptViaRawBT,
  getPaperWidth,
  setPaperWidth,
  type PaperWidth,
} from "@/lib/escpos";
import { Bean } from "./glyphs";
import { Icons } from "./icons";

const dash: React.CSSProperties = {
  border: "none",
  borderTop: "1.5px dashed #c9bfa6",
  margin: "9px 0",
};

function RcptRow({ k, v }: { k: string; v: string }): JSX.Element {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, color: "#5b5145", padding: "2px 0" }}>
      <span>{k}</span>
      <span className="num">{v}</span>
    </div>
  );
}

export interface ReceiptProps {
  order: Order;
  settings?: StoreSettings | null;
  cashierName?: string;
}

export function Receipt({ order, settings, cashierName }: ReceiptProps): JSX.Element {
  const storeName = settings?.storeName ?? "Warbul Coffee";
  const address = settings?.address ?? "Jl. Dipatiukur No. 42, Bandung";
  const tableLabel = order.table === 0 ? "Bawa Pulang" : "Meja " + String(order.table).padStart(2, "0");
  const stamp = new Date(order.createdAt).toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  const method = order.method === "qris" ? "QRIS" : order.payDetail || "Kasir";

  return (
    <div
      id="rcpt"
      className="receipt"
      style={{
        background: "#fff",
        borderRadius: 14,
        padding: "22px 20px",
        overflowY: "auto",
        boxShadow: "var(--shadow-lg)",
      }}
    >
      <div style={{ textAlign: "center" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/warbul-logo.png"
          alt="Warbul"
          width={48}
          height={48}
          style={{ borderRadius: "50%", display: "inline-block" }}
        />
        <div className="brand" style={{ fontSize: 20, fontWeight: 800, color: "var(--green-900)", marginTop: 4 }}>
          {storeName}
        </div>
        <div style={{ fontSize: 11, color: "#8b7f6c" }}>{address}</div>
      </div>

      <hr style={dash} />

      <div style={{ fontSize: 12, color: "#5b5145", display: "flex", justifyContent: "space-between" }}>
        <span>{order.id}</span>
        <span>{tableLabel}</span>
      </div>
      <div style={{ fontSize: 12, color: "#8b7f6c", marginTop: 2 }}>
        {stamp}
        {cashierName ? " · Kasir: " + cashierName : ""}
      </div>

      <hr style={dash} />

      {order.items.map((it, i) => (
        <div key={i} style={{ marginBottom: 7 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, fontWeight: 600 }}>
            <span>
              {it.qty}× {it.name}
            </span>
            <span className="num">{rupiah(it.price * it.qty)}</span>
          </div>
          {it.opts && it.opts.length > 0 && (
            <div style={{ fontSize: 11, color: "#8b7f6c", paddingLeft: 16 }}>{it.opts.join(", ")}</div>
          )}
        </div>
      ))}

      <hr style={dash} />

      <RcptRow k="Subtotal" v={rupiah(order.subtotal != null ? order.subtotal : order.total)} />
      {order.promo?.length ? order.promo.map((d) => (
        <RcptRow key={d.id} k={`Diskon (${d.name})`} v={"−" + rupiah(d.amount)} />
      )) : order.discount > 0 ? (
        <RcptRow k="Diskon" v={"−" + rupiah(order.discount)} />
      ) : null}
      <RcptRow k="Biaya layanan" v={rupiah(order.service)} />
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontWeight: 800, fontSize: 14 }}>
        <span>TOTAL</span>
        <span className="num" style={{ color: "var(--coffee)" }}>
          {rupiah(order.total)}
        </span>
      </div>
      <RcptRow k="Metode" v={method} />

      <hr style={dash} />

      <div style={{ textAlign: "center", fontSize: 11.5, color: "#8b7f6c", lineHeight: 1.6 }}>
        Terima kasih sudah ngopi di Warbul ☕
        <br />
        Simpan struk ini sebagai bukti pembayaran
      </div>
      <div style={{ textAlign: "center", marginTop: 10, opacity: 0.5 }}>
        <Bean color="#21342A" size={20} />
      </div>
    </div>
  );
}

export interface ReceiptModalProps extends ReceiptProps {
  onClose: () => void;
}

export function ReceiptModal({ order, settings, cashierName, onClose }: ReceiptModalProps): JSX.Element {
  // Cetak Struk: on Android route raw ESC/POS to a Bluetooth printer via RawBT;
  // otherwise (desktop/iOS) fall back to the browser print dialog.
  const handlePrint = () => {
    if (!printReceiptViaRawBT(order, settings, cashierName)) window.print();
  };
  // Paper width is per-device (persisted), so a cashier picks it once.
  const [paper, setPaper] = useState<PaperWidth>(getPaperWidth());
  const changePaper = (w: PaperWidth) => {
    setPaper(w);
    setPaperWidth(w);
  };
  const paperBtn = (w: PaperWidth): React.CSSProperties => ({
    flex: 1,
    borderRadius: 9,
    padding: "7px 0",
    fontSize: 12.5,
    fontWeight: 700,
    cursor: "pointer",
    fontFamily: "inherit",
    border: "1.5px solid " + (paper === w ? "var(--green-900)" : "var(--line)"),
    background: paper === w ? "var(--green-900)" : "#fff",
    color: paper === w ? "#fff" : "var(--ink)",
  });
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(28,20,12,.5)",
        display: "grid",
        placeItems: "center",
        zIndex: 80,
        padding: 18,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "relative",
          width: "100%",
          maxWidth: 320,
          maxHeight: "92%",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Receipt order={order} settings={settings} cashierName={cashierName} />
        <div
          className="rcpt-paper"
          style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12 }}
        >
          <span style={{ fontSize: 12, color: "#8b7f6c", whiteSpace: "nowrap" }}>Lebar kertas</span>
          <div style={{ display: "flex", gap: 6, flex: 1 }}>
            <button type="button" onClick={() => changePaper(58)} style={paperBtn(58)}>
              58mm
            </button>
            <button type="button" onClick={() => changePaper(80)} style={paperBtn(80)}>
              80mm
            </button>
          </div>
        </div>
        <div className="rcpt-actions" style={{ display: "flex", gap: 10, marginTop: 10 }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              flex: 1,
              background: "#fff",
              border: "1.5px solid var(--line)",
              borderRadius: 13,
              padding: "13px",
              fontWeight: 700,
              fontSize: 14,
              cursor: "pointer",
              fontFamily: "inherit",
              color: "var(--ink)",
            }}
          >
            Tutup
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="btn btn-green"
            style={{
              flex: 1.4,
              borderRadius: 13,
              padding: "13px",
              fontSize: 14,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            <Icons.printer /> Cetak Struk
          </button>
        </div>
      </div>
    </div>
  );
}
