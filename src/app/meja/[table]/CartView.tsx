"use client";
import type { JSX } from "react";
import { FoodTile, QtyStepper } from "@/components";
import { Bean } from "@/components/glyphs";
import { rupiah } from "@/lib/constants";
import { CartHeader, OptsLine, Row, type ResolvedLine } from "./shared";

interface CartViewProps {
  lines: ResolvedLine[];
  subtotal: number;
  serviceFee: number;
  onQty: (key: string, qty: number) => void;
  onMenu: () => void;
  onCheckout: () => void;
}

export default function CartView({ lines, subtotal, serviceFee, onQty, onMenu, onCheckout }: CartViewProps): JSX.Element {
  if (!lines.length) {
    return (
      <>
        <CartHeader title="Keranjang" onBack={onMenu} />
        <div className="meja-body" style={{ display: "grid", placeItems: "center", textAlign: "center", padding: 30 }}>
          <div>
            <div style={{ opacity: 0.3 }}>
              <Bean color="var(--green-800)" size={70} />
            </div>
            <div style={{ fontWeight: 700, marginTop: 12, fontSize: 16 }}>Keranjang masih kosong</div>
            <div style={{ color: "#8b7f6c", fontSize: 13, marginTop: 4 }}>Yuk pilih menu favoritmu dulu ☕</div>
            <button
              type="button"
              onClick={onMenu}
              className="btn btn-green"
              style={{ marginTop: 18, borderRadius: 13, padding: "12px 22px" }}
            >
              Lihat Menu
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <CartHeader title="Keranjang Kamu" onBack={onMenu} />
      <div className="meja-body" style={{ background: "var(--cream)" }}>
        <div style={{ padding: "16px 18px 8px", display: "flex", flexDirection: "column", gap: 11 }}>
          {lines.map((l) => (
            <div
              key={l.key}
              style={{
                display: "flex",
                gap: 13,
                background: "#fff",
                borderRadius: 18,
                padding: 11,
                border: "1px solid var(--cream-200)",
                boxShadow: "var(--shadow-sm)",
              }}
            >
              <div style={{ borderRadius: 13, overflow: "hidden", width: 64, height: 64, flex: "0 0 auto" }}>
                <FoodTile item={l.product} h={64} glyphSize={30} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 13.5, lineHeight: 1.2 }}>{l.product.name}</div>
                <OptsLine opts={l.opts} />
                <div className="num" style={{ color: "var(--coffee)", fontSize: 15, marginTop: 4 }}>
                  {rupiah(l.unit)}
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "flex-end" }}>
                <QtyStepper qty={l.qty} min={0} size="sm" onChange={(q) => onQty(l.key, q)} />
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={onMenu}
            style={{
              alignSelf: "center",
              marginTop: 6,
              background: "none",
              border: "none",
              color: "var(--green-700)",
              fontWeight: 700,
              fontSize: 13.5,
              cursor: "pointer",
              textDecoration: "underline",
            }}
          >
            + Tambah menu lain
          </button>
        </div>
        <div style={{ padding: "14px 18px 130px" }}>
          <div style={{ background: "#fff", borderRadius: 18, padding: "16px 17px", border: "1px solid var(--cream-200)" }}>
            <Row k="Subtotal" v={rupiah(subtotal)} />
            <Row k="Biaya layanan" v={rupiah(lines.length ? serviceFee : 0)} />
            <div style={{ height: 1, background: "var(--line)", margin: "11px 0" }} />
            <Row k="Total" v={rupiah(subtotal + (lines.length ? serviceFee : 0))} big />
          </div>
        </div>
      </div>
      <div className="meja-fab">
        <button
          type="button"
          onClick={onCheckout}
          className="btn btn-gold"
          style={{
            width: "100%",
            borderRadius: 18,
            padding: "15px",
            fontSize: 15,
            display: "flex",
            justifyContent: "center",
            gap: 8,
            boxShadow: "var(--shadow-md)",
          }}
        >
          Lanjut ke Pembayaran →
        </button>
      </div>
    </>
  );
}
