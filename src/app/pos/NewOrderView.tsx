"use client";
// Walk-in order entry ("Buat Pesanan"). Two-column: menu picker + running
// ticket, with a modifier popover. Submits a pre-paid kitchen order.
import { useEffect, useMemo, useState } from "react";
import type { JSX } from "react";
import type { OrderMethod, Product, Selection } from "@/lib/types";
import { ORDER_STATUS, rupiah, SERVICE_FEE } from "@/lib/constants";
import { useCategories } from "@/lib/use-categories";
import { computeTotals } from "@/lib/pricing";
import { createOrder, getMenu, getConfig } from "@/lib/api";
import { useLive } from "@/lib/use-live";
import { FoodTile, QtyStepper, Icons, useModifiers } from "@/components";
import { NewOrderModSheet } from "./NewOrderModSheet";

export interface NewOrderViewProps {
  cashierName: string;
  onGoToOrders: () => void;
}

type CartLine = { id: string; sel: Selection; qty: number };
type Cart = Record<string, CartLine>;

const lineKey = (id: string, sel: Selection) => id + "|" + JSON.stringify(sel || {});
const isOrderable = (p: Product) => p.available !== false && p.stock > 0;

type PayLabel = "Tunai" | "Kartu" | "QRIS";
const METHODS: PayLabel[] = ["Tunai", "Kartu", "QRIS"];
const METHOD_MAP: Record<PayLabel, OrderMethod> = { Tunai: "tunai", Kartu: "kartu", QRIS: "qris" };
const PAY_DETAIL: Record<PayLabel, string> = {
  Tunai: "Tunai",
  Kartu: "Kartu / Debit",
  QRIS: "QRIS terverifikasi",
};

export function NewOrderView({ cashierName, onGoToOrders }: NewOrderViewProps): JSX.Element {
  const availCats = useCategories();
  const [menu, setMenu] = useState<Product[]>([]);
  const [cart, setCart] = useState<Cart>({});
  const [cat, setCat] = useState<string>("");
  const [q, setQ] = useState("");
  const [takeaway, setTakeaway] = useState(false);
  const [tableNo, setTableNo] = useState(1);
  const [method, setMethod] = useState<PayLabel>("Tunai");
  const [modItem, setModItem] = useState<Product | null>(null);
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [serviceFee, setServiceFee] = useState(SERVICE_FEE);
  const { modGroupsFor, modSummary, unitPrice } = useModifiers();

  useEffect(() => { if (!cat && availCats.length) setCat(availCats[0]); }, [availCats]);

  const load = () => { getMenu().then(setMenu).catch(() => {}); };
  const loadConfig = () => { getConfig().then((c) => setServiceFee(c.serviceFee)).catch(() => {}); };
  useEffect(() => { load(); loadConfig(); }, []);
  useLive(["menu"], load);
  useLive(["settings"], loadConfig);

  const list = useMemo(() => {
    if (q) {
      const needle = q.toLowerCase();
      return menu.filter((m) => isOrderable(m) && m.name.toLowerCase().includes(needle));
    }
    return menu.filter((m) => m.cat === cat && isOrderable(m));
  }, [menu, q, cat]);

  const lines = useMemo(
    () =>
      Object.entries(cart)
        .map(([key, l]) => {
          const it = menu.find((m) => m.id === l.id);
          if (!it) return null;
          return {
            key,
            it,
            sel: l.sel,
            qty: l.qty,
            opts: modSummary(it, l.sel),
            unit: unitPrice(it, l.sel),
          };
        })
        .filter((x): x is NonNullable<typeof x> => x !== null),
    [cart, menu],
  );

  const totals = computeTotals(lines.map((l) => ({ price: l.unit, qty: l.qty })), 0, serviceFee);

  const cartQtyFor = (id: string) =>
    lines.filter((l) => l.it.id === id).reduce((a, l) => a + l.qty, 0);

  const addLine = (id: string, sel: Selection, n: number) =>
    setCart((c) => {
      const k = lineKey(id, sel);
      const v = (c[k]?.qty ?? 0) + n;
      const nc = { ...c };
      if (v <= 0) delete nc[k];
      else nc[k] = { id, sel, qty: v };
      return nc;
    });

  const setQty = (key: string, qty: number) =>
    setCart((c) => {
      const cur = c[key];
      if (!cur) return c;
      const nc = { ...c };
      if (qty <= 0) delete nc[key];
      else nc[key] = { ...cur, qty };
      return nc;
    });

  const tap = (it: Product) => {
    if (modGroupsFor(it).length > 0) setModItem(it);
    else addLine(it.id, {}, 1);
  };

  const create = async () => {
    if (!lines.length || submitting) return;
    setSubmitting(true);
    try {
      await createOrder({
        table: takeaway ? 0 : tableNo,
        method: METHOD_MAP[method],
        lines: lines.map((l) => ({ id: l.it.id, sel: l.sel, qty: l.qty })),
        paid: true,
        status: ORDER_STATUS.COOKING,
        payDetail: PAY_DETAIL[method],
      });
      setDone(true);
      setTimeout(() => {
        setCart({});
        setDone(false);
        onGoToOrders();
      }, 1300);
    } catch {
      setSubmitting(false);
    }
  };

  return (
    <>
      <NewOrderStyles />
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
          <div className="brand" style={{ fontSize: 23, fontWeight: 700 }}>Buat Pesanan</div>
          <div style={{ fontSize: 13, color: "#8b7f6c", marginTop: 2 }}>
            Untuk pelanggan yang memesan langsung di kasir
          </div>
        </div>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            background: "var(--cream)",
            color: "var(--coffee)",
            fontSize: 12.5,
            fontWeight: 700,
            padding: "6px 12px",
            borderRadius: 999,
          }}
        >
          <Icons.register size={15} />
          <span title={cashierName}>Mode Kasir</span>
        </span>
      </header>

      <div className="no-split" style={{ flex: 1, display: "flex", minHeight: 0 }}>
        {/* menu picker */}
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", minHeight: 0 }}>
          <div style={{ padding: "16px 24px 6px", display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 9,
                background: "#fff",
                border: "1.5px solid var(--line)",
                borderRadius: 13,
                padding: "9px 14px",
                flex: 1,
                minWidth: 180,
              }}
            >
              <Icons.search size={16} color="#b6a98e" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Cari menu cepat…"
                style={{ border: "none", outline: "none", background: "none", flex: 1, fontSize: 14, color: "var(--ink)" }}
              />
            </div>
          </div>

          {!q && (
            <div style={{ display: "flex", gap: 8, overflowX: "auto", padding: "8px 24px 6px" }}>
              {availCats.map((c) => {
                const on = cat === c;
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCat(c)}
                    className="btn"
                    style={{
                      padding: "8px 15px",
                      fontSize: 13.5,
                      borderRadius: 13,
                      whiteSpace: "nowrap",
                      background: on ? "var(--green-800)" : "#fff",
                      color: on ? "var(--cream)" : "var(--green-800)",
                      border: "1.5px solid " + (on ? "var(--green-800)" : "var(--line)"),
                    }}
                  >
                    {c}
                  </button>
                );
              })}
            </div>
          )}

          <div style={{ flex: 1, overflowY: "auto", padding: "12px 24px 24px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))", gap: 14 }}>
              {list.map((it) => {
                const inCart = cartQtyFor(it.id);
                const hasMod = modGroupsFor(it).length > 0;
                return (
                  <div
                    key={it.id}
                    onClick={() => tap(it)}
                    className="card"
                    style={{
                      padding: 0,
                      overflow: "hidden",
                      cursor: "pointer",
                      position: "relative",
                      border: inCart > 0 ? "2px solid var(--green-700)" : "1px solid var(--cream-200)",
                    }}
                  >
                    <FoodTile item={it} h={150} glyphSize={75} rounded={0} />
                    {inCart > 0 && (
                      <div
                        className="num"
                        style={{
                          position: "absolute",
                          top: 8,
                          right: 8,
                          minWidth: 26,
                          height: 26,
                          borderRadius: 13,
                          background: "var(--green-700)",
                          color: "#fff",
                          display: "grid",
                          placeItems: "center",
                          fontWeight: 800,
                          fontSize: 14,
                          padding: "0 6px",
                        }}
                      >
                        {inCart}
                      </div>
                    )}
                    <div style={{ padding: "10px 12px 12px" }}>
                      <div style={{ fontWeight: 700, fontSize: 13.5, lineHeight: 1.2, minHeight: 34 }}>{it.name}</div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 3 }}>
                        <span className="num" style={{ color: "var(--coffee)", fontSize: 15 }}>{rupiah(it.price)}</span>
                        {hasMod && (
                          <span style={{ fontSize: 10.5, color: "#a99c86", fontWeight: 700 }}>+ opsi</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              {list.length === 0 && (
                <div style={{ color: "#a99c86", padding: 30 }}>Menu tidak ditemukan.</div>
              )}
            </div>
          </div>
        </div>

        {/* ticket */}
        <div
          className="no-ticket"
          style={{
            width: 386,
            flex: "0 0 auto",
            borderLeft: "1px solid var(--line)",
            background: "var(--paper-2)",
            display: "flex",
            flexDirection: "column",
            minHeight: 0,
          }}
        >
          <div style={{ padding: "18px 20px 14px", borderBottom: "1px solid var(--line)", background: "#fff" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 13 }}>
              <span className="brand" style={{ fontSize: 18, fontWeight: 700 }}>Pesanan Baru</span>
              {lines.length > 0 && (
                <button
                  type="button"
                  onClick={() => setCart({})}
                  style={{ background: "none", border: "none", color: "var(--red)", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}
                >
                  Kosongkan
                </button>
              )}
            </div>
            <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
              <button
                type="button"
                onClick={() => setTakeaway(false)}
                className="btn"
                style={{
                  flex: 1,
                  padding: 9,
                  fontSize: 13,
                  borderRadius: 13,
                  background: !takeaway ? "var(--green-800)" : "var(--cream)",
                  color: !takeaway ? "var(--cream)" : "var(--green-800)",
                }}
              >
                Makan di Tempat
              </button>
              <button
                type="button"
                onClick={() => setTakeaway(true)}
                className="btn"
                style={{
                  flex: 1,
                  padding: 9,
                  fontSize: 13,
                  borderRadius: 13,
                  background: takeaway ? "var(--green-800)" : "var(--cream)",
                  color: takeaway ? "var(--cream)" : "var(--green-800)",
                }}
              >
                Bawa Pulang
              </button>
            </div>
            {!takeaway && (
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: "#6f6353" }}>Nomor Meja</span>
                <select
                  value={tableNo}
                  onChange={(e) => setTableNo(Number(e.target.value))}
                  className="no-fld"
                  style={{ flex: 1, padding: "9px 12px" }}
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
                    <option key={n} value={n}>Meja {String(n).padStart(2, "0")}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "8px 20px", background: "#fff" }}>
            {lines.length === 0 ? (
              <div style={{ textAlign: "center", color: "#a99c86", padding: "46px 10px", fontSize: 13.5 }}>
                Ketuk menu di kiri untuk menambah ke pesanan.
              </div>
            ) : (
              lines.map((l) => (
                <div
                  key={l.key}
                  style={{ display: "flex", alignItems: "flex-start", gap: 11, padding: "11px 0", borderBottom: "1px solid var(--line)" }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 13.5, lineHeight: 1.2 }}>{l.it.name}</div>
                    {l.opts.length > 0 && (
                      <div style={{ fontSize: 11.5, color: "#8b7f6c", marginTop: 2 }}>{l.opts.join(" · ")}</div>
                    )}
                    <div className="num" style={{ color: "var(--coffee)", fontSize: 13.5, marginTop: 3 }}>{rupiah(l.unit * l.qty)}</div>
                  </div>
                  <QtyStepper qty={l.qty} min={0} size="sm" onChange={(v) => setQty(l.key, v)} />
                </div>
              ))
            )}
          </div>

          <div style={{ padding: "14px 20px 18px", borderTop: "1px solid var(--line)", background: "var(--paper-2)" }}>
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#8b7f6c", marginBottom: 8 }}>METODE BAYAR</div>
              <div style={{ display: "flex", gap: 7 }}>
                {METHODS.map((m) => {
                  const on = method === m;
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMethod(m)}
                      className="btn"
                      style={{
                        flex: 1,
                        padding: 9,
                        fontSize: 13,
                        borderRadius: 13,
                        background: on ? "var(--gold)" : "#fff",
                        color: on ? "var(--coffee-900)" : "var(--green-800)",
                        border: "1.5px solid " + (on ? "var(--gold-600)" : "var(--line)"),
                      }}
                    >
                      {m}
                    </button>
                  );
                })}
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#6f6353", padding: "2px 0" }}>
              <span>Subtotal</span>
              <span>{rupiah(totals.subtotal)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#6f6353", padding: "2px 0" }}>
              <span>Biaya layanan</span>
              <span>{rupiah(totals.service)}</span>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginTop: 8,
                paddingTop: 8,
                borderTop: "1px dashed var(--line)",
              }}
            >
              <span style={{ fontWeight: 700, fontSize: 15 }}>Total</span>
              <span className="num" style={{ fontSize: 23, color: "var(--coffee)" }}>{rupiah(totals.total)}</span>
            </div>
            <button
              type="button"
              onClick={create}
              disabled={!lines.length || submitting}
              className="btn btn-gold"
              style={{
                width: "100%",
                marginTop: 14,
                padding: 15,
                fontSize: 15,
                borderRadius: 13,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 9,
                cursor: lines.length ? "pointer" : "default",
                opacity: lines.length ? 1 : 0.5,
              }}
            >
              <Icons.check size={20} />
              Buat &amp; Bayar · {rupiah(totals.total)}
            </button>
          </div>
        </div>
      </div>

      {done && (
        <div className="no-modalbd">
          <div className="no-modalcard" style={{ background: "#fff", padding: "34px 40px", textAlign: "center" }}>
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: 50,
                background: "var(--green-ok-bg)",
                color: "var(--green-ok)",
                display: "grid",
                placeItems: "center",
                margin: "0 auto 16px",
              }}
            >
              <Icons.check size={30} />
            </div>
            <div className="brand" style={{ fontSize: 21, fontWeight: 700 }}>Pesanan Dibuat!</div>
            <div style={{ color: "#8b7f6c", fontSize: 14, marginTop: 6 }}>
              Diteruskan ke dapur · {takeaway ? "Bawa Pulang" : "Meja " + String(tableNo).padStart(2, "0")}
            </div>
          </div>
        </div>
      )}

      {modItem && (
        <NewOrderModSheet
          item={modItem}
          onClose={() => setModItem(null)}
          onConfirm={(sel, n) => {
            addLine(modItem.id, sel, n);
            setModItem(null);
          }}
        />
      )}
    </>
  );
}

function NewOrderStyles(): JSX.Element {
  return (
    <style>{`
      .no-fld{width:100%;border:1.5px solid var(--line);border-radius:12px;font-size:14px;outline:none;background:#fff;font-family:inherit;color:var(--ink)}
      .no-fld:focus{border-color:var(--green-700)}
      .no-modalbd{position:fixed;inset:0;background:rgba(28,20,12,.5);display:grid;place-items:center;z-index:80;animation:no-fade .18s}
      .no-modalcard{background:var(--paper);border-radius:20px;animation:no-mpop .2s}
      @keyframes no-fade{from{opacity:0}}
      @keyframes no-mpop{from{transform:scale(.95);opacity:0}}
      @media(max-width:980px){
        .no-split{flex-direction:column;overflow-y:auto}
        .no-split>div:first-child{min-height:60vh;flex:0 0 auto}
        .no-ticket{width:100%;border-left:none;border-top:1px solid var(--line)}
      }
    `}</style>
  );
}
