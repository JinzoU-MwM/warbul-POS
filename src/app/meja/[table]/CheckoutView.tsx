"use client";
import { useEffect, useState } from "react";
import type { JSX } from "react";
import type { AppliedDiscount, Member, OrderMethod, Totals } from "@/lib/types";
import { PromoBox, Icons, type PromoValue } from "@/components";
import { getMember } from "@/lib/api";
import { rupiah } from "@/lib/constants";
import { CartHeader, OptsLine, Row, pad2, type ResolvedLine } from "./shared";

interface CheckoutViewProps {
  table: number;
  lines: ResolvedLine[];
  subtotal: number;
  totals: Totals;
  method: OrderMethod;
  setMethod: (m: OrderMethod) => void;
  promo: PromoValue | null;
  setPromo: (p: PromoValue | null) => void;
  autoDiscounts: AppliedDiscount[];
  phone: string;
  setPhone: (p: string) => void;
  onBack: () => void;
  onPlace: () => void;
  placing: boolean;
}

const METHODS: { id: OrderMethod; name: string; desc: string; ico: "qr" | "cash" }[] = [
  { id: "qris", name: "QRIS", desc: "Scan & bayar langsung dari HP", ico: "qr" },
  { id: "kasir", name: "Bayar di Kasir", desc: "Bayar tunai / kartu saat ke kasir", ico: "cash" },
];

export default function CheckoutView({
  table,
  lines,
  subtotal,
  totals,
  method,
  setMethod,
  promo,
  setPromo,
  autoDiscounts,
  phone,
  setPhone,
  onBack,
  onPlace,
  placing,
}: CheckoutViewProps): JSX.Element {
  const [member, setMember] = useState<Member | null>(null);

  useEffect(() => {
    if (phone.length < 8) {
      setMember(null);
      return;
    }
    let cancelled = false;
    const t = setTimeout(() => {
      getMember(phone)
        .then((m) => {
          if (!cancelled) setMember(m);
        })
        .catch(() => {
          if (!cancelled) setMember(null);
        });
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [phone]);

  return (
    <>
      <CartHeader title="Pembayaran" onBack={onBack} />
      <div className="meja-body" style={{ background: "var(--cream)" }}>
        <div style={{ padding: "18px 18px 6px" }}>
          <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: ".06em", color: "#8b7f6c", marginBottom: 11 }}>
            METODE PEMBAYARAN
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
            {METHODS.map((m) => {
              const on = method === m.id;
              return (
                <div
                  key={m.id}
                  onClick={() => setMethod(m.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    background: "#fff",
                    borderRadius: 17,
                    padding: "15px 16px",
                    cursor: "pointer",
                    border: "2px solid " + (on ? "var(--green-700)" : "transparent"),
                    boxShadow: on ? "var(--shadow-sm)" : "none",
                    transition: ".15s",
                  }}
                >
                  <div
                    style={{
                      width: 46,
                      height: 46,
                      borderRadius: 13,
                      background: on ? "var(--green-700)" : "var(--cream)",
                      color: on ? "var(--gold)" : "var(--green-700)",
                      display: "grid",
                      placeItems: "center",
                    }}
                  >
                    {m.ico === "qr" ? <Icons.qr size={24} /> : <Icons.cash size={24} />}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>{m.name}</div>
                    <div style={{ fontSize: 12.5, color: "#8b7f6c", marginTop: 1 }}>{m.desc}</div>
                  </div>
                  <div
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 50,
                      border: "2px solid " + (on ? "var(--green-700)" : "var(--line)"),
                      display: "grid",
                      placeItems: "center",
                    }}
                  >
                    {on && <div style={{ width: 11, height: 11, borderRadius: 50, background: "var(--green-700)" }} />}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ padding: "14px 18px 4px" }}>
          <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: ".06em", color: "#8b7f6c", marginBottom: 11 }}>
            PROMO & POIN
          </div>
          {autoDiscounts.map((a) => (
            <div key={a.id} style={{
              background: "#f0f9f2", border: "1px solid #bbf7d0", borderRadius: 13,
              padding: "10px 14px", marginBottom: 8,
              display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 18 }}>🎉</span>
                <div>
                  <div style={{ fontWeight: 700, color: "#15803d", fontSize: 13 }}>{a.name} · otomatis</div>
                </div>
              </div>
              <span style={{ fontWeight: 800, color: "#15803d", fontSize: 13 }}>−{rupiah(a.amount)}</span>
            </div>
          ))}
          <PromoBox subtotal={subtotal} value={promo} onChange={setPromo} />
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              background: "#fff",
              borderRadius: 13,
              padding: "4px 6px 4px 14px",
              marginTop: 11,
              border: "1px solid var(--cream-200)",
            }}
          >
            <span style={{ color: "var(--gold-600)" }}>
              <Icons.star size={16} />
            </span>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, ""))}
              placeholder="No. HP — kumpulkan poin (opsional)"
              style={{
                flex: 1,
                border: "none",
                outline: "none",
                fontSize: 13,
                fontFamily: "inherit",
                padding: "10px 0",
                background: "none",
                color: "var(--ink)",
              }}
            />
          </div>
          {member && (
            <div style={{ fontSize: 12, color: "var(--green-ok)", fontWeight: 700, marginTop: 7 }}>
              ★ Member dikenali — {member.points} poin · {member.stamps}/10 stempel
            </div>
          )}
        </div>

        <div style={{ padding: "14px 18px 130px" }}>
          <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: ".06em", color: "#8b7f6c", marginBottom: 11 }}>
            RINGKASAN · MEJA {pad2(table)}
          </div>
          <div style={{ background: "#fff", borderRadius: 18, padding: "15px 17px", border: "1px solid var(--cream-200)" }}>
            {lines.map((l) => (
              <div key={l.key} style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "5px 0", fontSize: 13.5 }}>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span className="num" style={{ color: "var(--green-700)" }}>
                    {l.qty}×
                  </span>{" "}
                  {l.product.name}
                  <OptsLine opts={l.opts} />
                </span>
                <span className="num">{rupiah(l.unit * l.qty)}</span>
              </div>
            ))}
            <div style={{ height: 1, background: "var(--line)", margin: "11px 0" }} />
            <Row k="Subtotal" v={rupiah(totals.subtotal)} />
            {autoDiscounts.map((a) => (
              <Row key={a.id} k={`Diskon (${a.name})`} v={"−" + rupiah(a.amount)} accent="var(--green-ok)" />
            ))}
            {promo && promo.amount > 0 && (
              <Row k={`Diskon (${promo.code})`} v={"−" + rupiah(promo.amount)} accent="var(--green-ok)" />
            )}
            <Row k="Biaya layanan" v={rupiah(totals.service)} />
            <div style={{ height: 1, background: "var(--line)", margin: "11px 0" }} />
            <Row k="Total" v={rupiah(totals.total)} big />
          </div>
        </div>
      </div>

      <div className="meja-fab">
        <button
          type="button"
          onClick={onPlace}
          disabled={placing}
          className="btn btn-gold"
          style={{ width: "100%", borderRadius: 18, padding: "15px", fontSize: 15, boxShadow: "var(--shadow-md)", opacity: placing ? 0.7 : 1 }}
        >
          {method === "qris" ? `Bayar ${rupiah(totals.total)} via QRIS` : `Pesan Sekarang · ${rupiah(totals.total)}`}
        </button>
      </div>
    </>
  );
}
