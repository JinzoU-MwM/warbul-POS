"use client";
// Order detail + payment confirmation panel for the cashier Orders dashboard.
import { useState, type JSX } from "react";
import type { Order } from "@/lib/types";
import { ORDER_STATUS, rupiah } from "@/lib/constants";
import { Icons, StatusPill, ReceiptModal } from "@/components";

export interface OrderDetailProps {
  order: Order;
  cashierName: string;
  /** Apply a patch and let the parent refresh the list / re-find the selection. */
  onPatch: (id: string, patch: Partial<Order>) => void | Promise<void>;
}

function tableBadge(table: number, big: boolean): JSX.Element {
  const ta = table === 0;
  return (
    <div
      style={{
        width: big ? 64 : 46,
        height: big ? 64 : 46,
        borderRadius: big ? 17 : 13,
        background: "var(--green-800)",
        color: "var(--gold)",
        display: "grid",
        placeItems: "center",
        lineHeight: 1,
        flex: "0 0 auto",
      }}
    >
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: big ? 10 : 9, opacity: 0.7, fontWeight: 700 }}>{ta ? "BUNGKUS" : "MEJA"}</div>
        <div className="brand" style={{ fontSize: ta ? (big ? 18 : 14) : big ? 26 : 18, fontWeight: 800, lineHeight: 1 }}>
          {ta ? "TA" : String(table).padStart(2, "0")}
        </div>
      </div>
    </div>
  );
}

function timeAgo(t: number): string {
  const d = Math.floor((Date.now() - t) / 1000);
  if (d < 60) return d + "d lalu";
  const m = Math.floor(d / 60);
  if (m < 60) return m + "m lalu";
  return Math.floor(m / 60) + "j lalu";
}

function Line({ k, v }: { k: string; v: string }): JSX.Element {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: 13.5 }}>
      <span style={{ color: "#6f6353" }}>{k}</span>
      <span style={{ fontWeight: 600 }}>{v}</span>
    </div>
  );
}

export function OrderDetail({ order, cashierName, onPatch }: OrderDetailProps): JSX.Element {
  const [payOpen, setPayOpen] = useState(false);
  const [receipt, setReceipt] = useState(false);

  const claimed =
    order.method === "qris" && !!order.note && order.note.indexOf("verifikasi kasir") >= 0 && !order.paid;

  const receive = (how: string) => {
    void onPatch(order.id, { paid: true, status: ORDER_STATUS.COOKING, payDetail: how, note: "Diteruskan ke dapur" });
    setPayOpen(false);
  };
  const finish = () => void onPatch(order.id, { status: ORDER_STATUS.DONE, note: "Pesanan selesai" });
  const methodLabel = order.method === "qris" ? "QRIS" : "Bayar di Kasir";

  return (
    <div className="od-scope" style={{ padding: "24px 28px 40px", maxWidth: 620 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
        <div style={{ display: "flex", gap: 15, alignItems: "center" }}>
          {tableBadge(order.table, true)}
          <div>
            <div className="brand" style={{ fontSize: 22, fontWeight: 700 }}>{order.id}</div>
            <div style={{ fontSize: 13, color: "#8b7f6c", marginTop: 2, display: "flex", gap: 8, alignItems: "center" }}>
              <Icons.clock />
              {new Date(order.createdAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })} · {timeAgo(order.createdAt)}
            </div>
          </div>
        </div>
        <StatusPill status={order.status} />
      </div>

      {claimed && order.status === ORDER_STATUS.WAIT_PAY && (
        <div
          style={{
            display: "flex",
            gap: 11,
            alignItems: "center",
            background: "#F8EAD6",
            border: "1px solid #ECCF9E",
            borderRadius: 14,
            padding: "13px 15px",
            marginTop: 20,
            color: "var(--orange-600)",
            fontWeight: 600,
            fontSize: 13.5,
          }}
        >
          <span style={{ fontSize: 18 }}>🔔</span> Pelanggan menyatakan sudah membayar via QRIS. Mohon cek mutasi lalu verifikasi.
        </div>
      )}

      {/* items */}
      <div className="od-card" style={{ marginTop: 20, padding: "6px 18px" }}>
        {order.items.map((it, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 14,
              padding: "13px 0",
              borderBottom: i < order.items.length - 1 ? "1px solid var(--line)" : "none",
            }}
          >
            <span className="brand" style={{ fontSize: 15, fontWeight: 800, color: "var(--green-700)", minWidth: 30, paddingTop: 1 }}>{it.qty}×</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 14.5 }}>{it.name}</div>
              {it.opts && it.opts.length > 0 && (
                <div style={{ fontSize: 12, color: "#8b7f6c", marginTop: 2 }}>{it.opts.join(" · ")}</div>
              )}
            </div>
            <span style={{ color: "#8b7f6c", fontSize: 13.5, paddingTop: 1 }}>{rupiah(it.price)}</span>
            <span className="num" style={{ fontSize: 15, minWidth: 80, textAlign: "right", paddingTop: 1 }}>{rupiah(it.price * it.qty)}</span>
          </div>
        ))}
      </div>

      {/* totals */}
      <div className="od-card" style={{ marginTop: 14, padding: "15px 18px" }}>
        <Line k="Subtotal" v={rupiah(order.subtotal != null ? order.subtotal : order.total)} />
        {order.discount > 0 && (
          <Line k={"Diskon" + (order.promo ? " (" + order.promo.code + ")" : "")} v={"−" + rupiah(order.discount)} />
        )}
        <Line k="Biaya layanan" v={rupiah(order.service)} />
        <Line k={"Metode · " + methodLabel} v={order.payDetail ? order.payDetail : order.paid ? "Lunas" : "Belum bayar"} />
        <div style={{ height: 1, background: "var(--line)", margin: "11px 0" }} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontWeight: 700, fontSize: 16 }}>Total</span>
          <span className="num" style={{ fontSize: 24, color: "var(--coffee)" }}>{rupiah(order.total)}</span>
        </div>
      </div>

      {/* actions */}
      <div style={{ marginTop: 22 }}>
        {order.status === ORDER_STATUS.WAIT_PAY &&
          (!payOpen ? (
            <button
              type="button"
              onClick={() => (order.method === "qris" ? receive("QRIS terverifikasi") : setPayOpen(true))}
              className="btn btn-gold od-act"
              style={{ width: "100%", padding: "16px", fontSize: 15.5, display: "flex", alignItems: "center", justifyContent: "center", gap: 9 }}
            >
              <Icons.check />
              {order.method === "qris" ? "Verifikasi Pembayaran QRIS" : "Terima Pembayaran"}
            </button>
          ) : (
            <div className="od-card" style={{ padding: 18, border: "2px solid var(--green-700)" }}>
              <div style={{ fontWeight: 700, fontSize: 14.5, marginBottom: 12 }}>Tagih {rupiah(order.total)} — pilih metode:</div>
              <div style={{ display: "flex", gap: 11 }}>
                <button type="button" onClick={() => receive("Tunai")} className="btn btn-green od-act" style={{ flex: 1, padding: "14px" }}>💵 Tunai</button>
                <button
                  type="button"
                  onClick={() => receive("Kartu / Debit")}
                  className="btn od-act"
                  style={{ flex: 1, padding: "14px", background: "var(--cream)", color: "var(--green-800)", border: "1.5px solid var(--green-700)" }}
                >
                  💳 Kartu
                </button>
              </div>
              <button
                type="button"
                onClick={() => setPayOpen(false)}
                style={{ width: "100%", marginTop: 10, background: "none", border: "none", color: "#8b7f6c", fontSize: 13, cursor: "pointer", fontWeight: 600, fontFamily: "inherit" }}
              >
                Batal
              </button>
            </div>
          ))}

        {order.status === ORDER_STATUS.COOKING && (
          <button
            type="button"
            onClick={finish}
            className="btn btn-gold od-act"
            style={{ width: "100%", padding: "16px", fontSize: 15.5, display: "flex", alignItems: "center", justifyContent: "center", gap: 9 }}
          >
            <Icons.check />
            Tandai Pesanan Selesai
          </button>
        )}

        {order.status === ORDER_STATUS.PAID && (
          <button
            type="button"
            onClick={() => void onPatch(order.id, { status: ORDER_STATUS.COOKING })}
            className="btn btn-gold od-act"
            style={{ width: "100%", padding: "16px", fontSize: 15.5 }}
          >
            Proses ke Dapur
          </button>
        )}

        {order.status === ORDER_STATUS.DONE && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              padding: "16px",
              borderRadius: 13,
              background: "var(--green-ok-bg)",
              color: "var(--green-ok)",
              fontWeight: 700,
              fontSize: 15,
            }}
          >
            <Icons.check />
            Pesanan telah selesai
          </div>
        )}

        <button
          type="button"
          onClick={() => setReceipt(true)}
          className="btn od-act"
          style={{
            width: "100%",
            marginTop: 12,
            padding: "14px",
            background: "#fff",
            color: "var(--green-800)",
            border: "1.5px solid var(--green-700)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 9,
          }}
        >
          <Icons.printer />
          Cetak Struk
        </button>
      </div>

      {receipt && <ReceiptModal order={order} cashierName={cashierName} onClose={() => setReceipt(false)} />}

      <style>{`
        .od-scope .od-card{background:#fff;border:1px solid var(--cream-200);border-radius:18px}
        .od-scope .od-act{border-radius:13px;font-size:14.5px;font-weight:700;transition:.15s}
        .od-scope .od-act:hover{filter:brightness(.97)}
      `}</style>
    </div>
  );
}
