"use client";
// Cashier Orders dashboard ("Pesanan Masuk") — live incoming orders with a
// filterable list on the left and an order detail / payment panel on the right.
import { useEffect, useState, type JSX } from "react";
import type { Order } from "@/lib/types";
import { ORDER_STATUS, rupiah } from "@/lib/constants";
import { useLive } from "@/lib/use-live";
import { listOrders, patchOrder } from "@/lib/api";
import { Icons, StatusPill, Cup } from "@/components";
import { OrderDetail } from "./OrderDetail";

export interface OrdersViewProps {
  cashierName: string;
}

type FilterKey = "active" | typeof ORDER_STATUS.WAIT_PAY | typeof ORDER_STATUS.COOKING | typeof ORDER_STATUS.DONE;

const FILTERS: { k: FilterKey; l: string }[] = [
  { k: "active", l: "Aktif" },
  { k: ORDER_STATUS.WAIT_PAY, l: "Perlu Bayar" },
  { k: ORDER_STATUS.COOKING, l: "Diproses" },
  { k: ORDER_STATUS.DONE, l: "Selesai" },
];

function timeAgo(t: number): string {
  const d = Math.floor((Date.now() - t) / 1000);
  if (d < 60) return d + "d lalu";
  const m = Math.floor(d / 60);
  if (m < 60) return m + "m lalu";
  return Math.floor(m / 60) + "j lalu";
}

function clockStr(): string {
  return new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}

export function OrdersView({ cashierName }: OrdersViewProps): JSX.Element {
  const [orders, setOrders] = useState<Order[]>([]);
  const [sel, setSel] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterKey>("active");
  const [, setTick] = useState(0);

  const refresh = () => listOrders("all").then(setOrders).catch(() => {});
  useEffect(() => { refresh(); }, []);
  useLive(["orders", "menu"], () => { refresh(); });

  // tick drives age labels + the "BARU" pulse window
  useEffect(() => {
    const id = setInterval(() => setTick(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const list =
    filter === "active"
      ? orders.filter((o) => o.status !== ORDER_STATUS.DONE && o.status !== ORDER_STATUS.CANCELLED)
      : orders.filter((o) => o.status === filter);

  // Resolve the detail selection within the CURRENT filtered list only, so an
  // empty filter (e.g. no active orders) shows the placeholder instead of
  // falling back to some unrelated order from another status.
  const selected = list.find((o) => o.id === sel) ?? list[0] ?? null;
  const needPay = orders.filter((o) => o.status === ORDER_STATUS.WAIT_PAY).length;

  // auto-select first order on load if none selected
  useEffect(() => {
    if (!sel && selected) setSel(selected.id);
  }, [sel, selected]);

  async function handlePatch(id: string, patch: Partial<Order>) {
    try {
      await patchOrder(id, patch);
    } finally {
      // SSE will also refresh, but refresh immediately so the panel updates
      const next = await listOrders("all").catch(() => null);
      if (next) {
        setOrders(next);
        setSel(id); // keep the same order selected after the patch
      }
    }
  }

  return (
    <div className="ov-scope" style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "20px 28px",
          borderBottom: "1px solid var(--line)",
          background: "var(--paper-2)",
          flex: "0 0 auto",
        }}
      >
        <div>
          <div className="brand" style={{ fontSize: 23, fontWeight: 700 }}>Pesanan Masuk</div>
          <div style={{ fontSize: 13, color: "#8b7f6c", marginTop: 2 }}>
            {needPay > 0 ? (
              <span style={{ color: "var(--orange-600)", fontWeight: 700 }}>{needPay} pesanan menunggu pembayaran</span>
            ) : (
              "Semua pesanan tertangani"
            )}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <span className="ov-pill" style={{ background: "var(--green-ok-bg)", color: "var(--green-ok)" }}>
            <span className="ov-livedot" style={{ width: 8, height: 8, borderRadius: 9, background: "var(--green-ok)" }} />
            LIVE
          </span>
          <span style={{ display: "flex", gap: 7, alignItems: "center", color: "#6f6353", fontSize: 14, fontWeight: 600 }}>
            <Icons.clock />
            {clockStr()}
          </span>
        </div>
      </header>

      <div className="ordersplit" style={{ flex: 1, display: "flex", minHeight: 0 }}>
        {/* list */}
        <div className="orderlist" style={{ width: 374, borderRight: "1px solid var(--line)", display: "flex", flexDirection: "column", minHeight: 0 }}>
          <div style={{ display: "flex", gap: 7, padding: "14px 18px", overflowX: "auto", flex: "0 0 auto" }}>
            {FILTERS.map((f) => {
              const on = filter === f.k;
              return (
                <button
                  key={f.k}
                  type="button"
                  onClick={() => setFilter(f.k)}
                  className="ov-act"
                  style={{
                    padding: "7px 13px",
                    fontSize: 13,
                    background: on ? "var(--green-800)" : "#fff",
                    color: on ? "var(--cream)" : "var(--green-800)",
                    border: "1.5px solid " + (on ? "var(--green-800)" : "var(--line)"),
                    whiteSpace: "nowrap",
                  }}
                >
                  {f.l}
                </button>
              );
            })}
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: "2px 16px 18px", display: "flex", flexDirection: "column", gap: 11 }}>
            {list.length === 0 && (
              <div style={{ textAlign: "center", color: "#a99c86", fontSize: 14, padding: "50px 20px" }}>Belum ada pesanan di sini.</div>
            )}
            {list.map((o) => {
              const isNew = o.status === ORDER_STATUS.WAIT_PAY && Date.now() - o.createdAt < 12000;
              const isSel = selected != null && selected.id === o.id;
              const ta = o.table === 0;
              return (
                <div
                  key={o.id}
                  onClick={() => setSel(o.id)}
                  className={isNew ? "ov-inpop" : undefined}
                  style={{
                    cursor: "pointer",
                    borderRadius: 16,
                    padding: "14px 15px",
                    background: "#fff",
                    border: "2px solid " + (isSel ? "var(--green-700)" : "var(--cream-200)"),
                    boxShadow: "var(--shadow-sm)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
                      <div style={{ width: 46, height: 46, borderRadius: 13, background: "var(--green-800)", color: "var(--gold)", display: "grid", placeItems: "center", lineHeight: 1, flex: "0 0 auto" }}>
                        <div style={{ textAlign: "center" }}>
                          <div style={{ fontSize: 9, opacity: 0.7, fontWeight: 700 }}>{ta ? "BUNGKUS" : "MEJA"}</div>
                          <div className="brand" style={{ fontSize: ta ? 14 : 18, fontWeight: 800 }}>{ta ? "TA" : String(o.table).padStart(2, "0")}</div>
                        </div>
                      </div>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: 14 }}>
                          {o.id}
                          {isNew && (
                            <span style={{ marginLeft: 7, fontSize: 9.5, fontWeight: 800, color: "#fff", background: "var(--orange)", padding: "2px 7px", borderRadius: 999, verticalAlign: "middle" }}>BARU</span>
                          )}
                        </div>
                        <div style={{ fontSize: 12, color: "#8b7f6c", marginTop: 2 }}>
                          {o.items.reduce((a, b) => a + b.qty, 0)} item · {timeAgo(o.createdAt)}
                        </div>
                      </div>
                    </div>
                    <StatusPill status={o.status} />
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 11, paddingTop: 11, borderTop: "1px dashed var(--line)" }}>
                    <span className="ov-pill" style={{ background: "var(--cream)", color: "var(--coffee)" }}>
                      {o.method === "qris" ? <Icons.qr /> : <Icons.cash />}
                      {o.method === "qris" ? "QRIS" : "Bayar di Kasir"}
                    </span>
                    <span className="num" style={{ fontSize: 16, color: "var(--coffee)" }}>{rupiah(o.total)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* detail */}
        <div className="orderdetail" style={{ flex: 1, minWidth: 0, overflowY: "auto", background: "var(--paper)" }}>
          {selected ? (
            <OrderDetail key={selected.id} order={selected} cashierName={cashierName} onPatch={handlePatch} />
          ) : (
            <div style={{ height: "100%", display: "grid", placeItems: "center", color: "#a99c86" }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ opacity: 0.3 }}>
                  <Cup color="var(--green-800)" size={64} />
                </div>
                <div style={{ marginTop: 12, fontSize: 15, fontWeight: 600 }}>Pilih pesanan untuk melihat rincian</div>
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .ov-scope .ov-pill{font-size:11.5px;font-weight:700;padding:4px 10px;border-radius:999px;display:inline-flex;align-items:center;gap:5px;white-space:nowrap}
        .ov-scope .ov-act{border:none;cursor:pointer;font-weight:700;border-radius:13px;font-family:inherit;transition:.15s}
        .ov-scope .ov-inpop{animation:ov-inpop .35s ease, ov-glow 2.2s ease 2}
        .ov-scope .ov-livedot{animation:ov-glowdot 1.6s infinite}
        @keyframes ov-inpop{from{transform:translateY(-8px) scale(.98);opacity:0}}
        @keyframes ov-glow{0%,100%{box-shadow:var(--shadow-sm)}50%{box-shadow:0 0 0 4px rgba(221,138,62,.25)}}
        @keyframes ov-glowdot{0%,100%{box-shadow:0 0 0 0 rgba(62,124,83,.0)}50%{box-shadow:0 0 0 4px rgba(62,124,83,.25)}}
        @media(max-width:860px){
          .ov-scope .ordersplit{flex-direction:column}
          .ov-scope .orderlist{width:100%!important;border-right:none!important;border-bottom:1px solid var(--line);max-height:42%}
        }
      `}</style>
    </div>
  );
}
