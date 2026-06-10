"use client";
import { useEffect, useState } from "react";
import type { JSX } from "react";
import type { Member, Order } from "@/lib/types";
import { ORDER_STATUS } from "@/lib/types";
import { Stepper, StampCard, ReceiptModal, Icons } from "@/components";
import { getMember, getOrder, patchOrder, pollPakasir } from "@/lib/api";
import { useLive } from "@/lib/use-live";
import { rupiah, SERVICE_FEE } from "@/lib/constants";
import { CartHeader, OptsLine, Row, pad2 } from "./shared";

interface StatusViewProps {
  orderId: string;
  onMenu: () => void;
}

export default function StatusView({ orderId, onMenu }: StatusViewProps): JSX.Element {
  const [order, setOrder] = useState<Order | null>(null);
  const [member, setMember] = useState<Member | null>(null);
  const [showQR, setShowQR] = useState(false);
  const [receipt, setReceipt] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [cancelStep, setCancelStep] = useState<"idle" | "confirm">("idle");
  const [cancelBusy, setCancelBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getOrder(orderId).then((o) => {
      if (cancelled) return;
      setOrder(o);
      setLoaded(true);
      if (o && o.method === "qris" && !o.paid) setShowQR(true);
    });
    return () => {
      cancelled = true;
    };
  }, [orderId]);

  useLive(["orders"], () => {
    getOrder(orderId).then((o) => setOrder(o));
  });

  // Auto-confirm QRIS payment by polling Pakasir while the order is unpaid.
  useEffect(() => {
    if (!order || order.method !== "qris" || order.paid) return;
    let cancelled = false;
    const id = setInterval(async () => {
      try {
        const r = await pollPakasir(orderId);
        if (!cancelled && r.order) setOrder(r.order);
      } catch {}
    }, 4000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [orderId, order?.method, order?.paid]);

  useEffect(() => {
    if (!order?.phone) {
      setMember(null);
      return;
    }
    let cancelled = false;
    getMember(order.phone).then((m) => {
      if (!cancelled) setMember(m);
    });
    return () => {
      cancelled = true;
    };
  }, [order?.phone]);

  if (!order) {
    return (
      <>
        <CartHeader title="Pesanan" onBack={onMenu} />
        <div className="meja-body" style={{ display: "grid", placeItems: "center" }}>
          {loaded ? "Pesanan tidak ditemukan." : "Memuat pesanan…"}
        </div>
      </>
    );
  }

  // Local QRIS payment panel (mirrors the prototype). Dismissing it does NOT call
  // any authed endpoint — the cashier-verification note already rides on the order.
  if (showQR && order.method === "qris" && !order.paid) {
    const qris = order.pakasir;
    const payTotal = qris?.totalPayment ?? order.total;
    return (
      <>
        <CartHeader title="Pembayaran QRIS" onBack={() => setShowQR(false)} />
        <div className="meja-body" style={{ background: "var(--cream)", padding: "22px 22px 40px", textAlign: "center" }}>
          <div style={{ fontSize: 13.5, color: "#6f6353" }}>
            Scan kode di bawah dengan aplikasi e-wallet / m-banking kamu
          </div>
          <div
            style={{
              background: "#fff",
              borderRadius: 24,
              padding: 22,
              margin: "18px auto 0",
              maxWidth: 280,
              border: "1px solid var(--cream-200)",
              boxShadow: "var(--shadow-md)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <span className="brand" style={{ fontWeight: 800, fontSize: 20, color: "var(--green-800)" }}>
                Warbul
              </span>
              <span style={{ fontWeight: 800, fontSize: 13, color: "#fff", background: "var(--green-800)", padding: "4px 9px", borderRadius: 6 }}>
                QRIS
              </span>
            </div>
            {qris?.paymentNumber ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`/api/qr?data=${encodeURIComponent(qris.paymentNumber)}`}
                alt="QRIS"
                width={180}
                height={180}
                style={{ display: "block", margin: "0 auto" }}
              />
            ) : (
              <div style={{ padding: "34px 14px", color: "#8b7f6c", fontSize: 13, lineHeight: 1.65 }}>
                Kode QRIS belum tersedia.
                <br />
                Coba buka lagi sebentar lagi, atau bayar langsung di kasir.
              </div>
            )}
            <div style={{ marginTop: 14, fontSize: 12, color: "#8b7f6c" }}>Total Pembayaran</div>
            <div className="num" style={{ fontSize: 26, color: "var(--coffee)" }}>
              {rupiah(payTotal)}
            </div>
          </div>
          {qris?.paymentNumber ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 9,
                marginTop: 20,
                color: "var(--green-ok)",
                fontWeight: 700,
                fontSize: 13.5,
              }}
            >
              <span className="meja-pulse" style={{ width: 9, height: 9, borderRadius: 9, background: "var(--green-ok)" }} />
              Menunggu pembayaran…
            </div>
          ) : null}
          <button
            type="button"
            onClick={() => setShowQR(false)}
            className="btn btn-green"
            style={{ marginTop: qris?.paymentNumber ? 16 : 24, width: "100%", maxWidth: 280, borderRadius: 15, padding: "15px", fontSize: 14.5 }}
          >
            {qris?.paymentNumber ? "Sembunyikan QR" : "Saya Sudah Bayar"}
          </button>
          <div style={{ fontSize: 12, color: "#8b7f6c", margin: "12px auto 0", maxWidth: 280 }}>
            {qris?.paymentNumber
              ? "Setelah kamu bayar, status pesanan akan otomatis diperbarui."
              : "Kasir akan memverifikasi pembayaranmu sebentar lagi."}
          </div>
        </div>
      </>
    );
  }

  const done = order.status === ORDER_STATUS.DONE;

  return (
    <>
      <div style={{ background: done ? "var(--green-ok)" : "var(--green-800)", flex: "0 0 auto", transition: ".3s" }}>
        <div style={{ padding: "20px 22px 26px", color: "var(--cream)", textAlign: "center" }}>
          <div
            className="meja-pop"
            style={{
              width: 64,
              height: 64,
              borderRadius: 50,
              background: "rgba(255,255,255,.14)",
              display: "grid",
              placeItems: "center",
              margin: "0 auto 14px",
            }}
          >
            {done ? (
              <span style={{ color: "#fff" }}>
                <Icons.check size={30} />
              </span>
            ) : (
              <span style={{ color: "var(--gold)" }}>
                <Icons.clock size={30} />
              </span>
            )}
          </div>
          <div className="brand" style={{ fontSize: 23, fontWeight: 700 }}>
            {done ? "Pesanan Selesai!" : "Pesanan Diterima"}
          </div>
          <div style={{ fontSize: 13, opacity: 0.85, marginTop: 4 }}>
            {order.id} · Meja {pad2(order.table)}
          </div>
        </div>
      </div>

      <div className="meja-body" style={{ background: "var(--cream)" }}>
        <div style={{ padding: "20px 22px 8px" }}>
          {order.method === "qris" && !order.paid && (
            <div
              onClick={() => setShowQR(true)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 11,
                background: "var(--gold)",
                color: "var(--coffee-900)",
                borderRadius: 14,
                padding: "12px 15px",
                marginBottom: 18,
                cursor: "pointer",
                fontWeight: 700,
                fontSize: 13.5,
              }}
            >
              <span>⚠︎</span> Belum bayar? Tap untuk buka QRIS lagi <span style={{ marginLeft: "auto" }}>→</span>
            </div>
          )}
          <Stepper status={order.status} note={order.note} />
        </div>

        {member && (
          <div style={{ padding: "6px 22px 0" }}>
            <StampCard member={member} />
          </div>
        )}

        <div style={{ padding: "18px 22px 40px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: ".06em", color: "#8b7f6c" }}>RINCIAN PESANAN</div>
            <button
              type="button"
              onClick={() => setReceipt(true)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                background: "none",
                border: "none",
                color: "var(--green-700)",
                fontWeight: 700,
                fontSize: 12.5,
                cursor: "pointer",
              }}
            >
              <Icons.print size={17} /> Struk
            </button>
          </div>
          <div style={{ background: "#fff", borderRadius: 18, padding: "15px 17px", border: "1px solid var(--cream-200)" }}>
            {order.items.map((it, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", fontSize: 13.5 }}>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span className="num" style={{ color: "var(--green-700)" }}>
                    {it.qty}×
                  </span>{" "}
                  {it.name}
                  <OptsLine opts={it.opts} />
                </span>
                <span className="num">{rupiah(it.price * it.qty)}</span>
              </div>
            ))}
            <div style={{ height: 1, background: "var(--line)", margin: "11px 0" }} />
            <Row k="Subtotal" v={rupiah(order.subtotal != null ? order.subtotal : order.total)} />
            {order.discount > 0 && (
              <Row k={"Diskon" + (order.promo ? " (" + order.promo.code + ")" : "")} v={"−" + rupiah(order.discount)} accent="var(--green-ok)" />
            )}
            <Row k="Biaya layanan" v={rupiah(order.service != null ? order.service : SERVICE_FEE)} />
            <Row k="Metode" v={order.method === "qris" ? "QRIS" : "Bayar di Kasir"} />
            <div style={{ height: 1, background: "var(--line)", margin: "11px 0" }} />
            <Row k="Total" v={rupiah(order.total)} big />
          </div>
          {order.status === ORDER_STATUS.WAIT_PAY && !order.paid && (
            <div style={{ marginTop: 14, border: cancelStep === "confirm" ? "1.5px solid #DC2626" : "1.5px dashed #C9B89A", borderRadius: 14, padding: "13px 15px", background: cancelStep === "confirm" ? "#FEF2F2" : "transparent" }}>
              {cancelStep === "idle" ? (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                  <span style={{ fontSize: 12.5, color: "#8b7f6c" }}>Salah pesan atau ingin mengubah?</span>
                  <button
                    type="button"
                    onClick={() => setCancelStep("confirm")}
                    style={{ border: "1.5px solid #DC2626", background: "transparent", color: "#DC2626", fontWeight: 700, fontSize: 12.5, padding: "7px 14px", borderRadius: 9, cursor: "pointer", whiteSpace: "nowrap", fontFamily: "inherit" }}
                  >
                    Batalkan Pesanan
                  </button>
                </div>
              ) : (
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#991B1B", marginBottom: 10 }}>Yakin ingin membatalkan pesanan ini?</div>
                  <div style={{ display: "flex", gap: 9, justifyContent: "center" }}>
                    <button
                      type="button"
                      disabled={cancelBusy}
                      onClick={() => setCancelStep("idle")}
                      style={{ border: "1.5px solid #D1D5DB", background: "#fff", color: "#555", fontWeight: 600, fontSize: 13, padding: "8px 18px", borderRadius: 9, cursor: "pointer", fontFamily: "inherit" }}
                    >
                      Tidak
                    </button>
                    <button
                      type="button"
                      disabled={cancelBusy}
                      onClick={async () => {
                        setCancelBusy(true);
                        try {
                          await patchOrder(orderId, { status: ORDER_STATUS.CANCELLED });
                          onMenu();
                        } catch {
                          setCancelBusy(false);
                          setCancelStep("idle");
                        }
                      }}
                      style={{ border: "none", background: "#DC2626", color: "#fff", fontWeight: 700, fontSize: 13, padding: "8px 18px", borderRadius: 9, cursor: cancelBusy ? "not-allowed" : "pointer", opacity: cancelBusy ? 0.6 : 1, fontFamily: "inherit" }}
                    >
                      {cancelBusy ? "Membatalkan…" : "Ya, Batalkan"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          <button
            type="button"
            onClick={onMenu}
            style={{
              width: "100%",
              marginTop: 16,
              background: "none",
              border: "1.5px solid var(--green-700)",
              color: "var(--green-700)",
              borderRadius: 14,
              padding: "13px",
              fontWeight: 700,
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            Pesan Lagi
          </button>
        </div>
      </div>

      {receipt && <ReceiptModal order={order} onClose={() => setReceipt(false)} />}
    </>
  );
}
