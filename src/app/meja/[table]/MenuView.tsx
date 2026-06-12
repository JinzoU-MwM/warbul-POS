"use client";
import { useState } from "react";
import type { JSX } from "react";
import type { Product } from "@/lib/types";
import { FoodTile, Icons } from "@/components";
import { rupiah } from "@/lib/constants";
import { useCategories, mergeProductCategories, productInCategory } from "@/lib/use-categories";
import { isOrderable, pad2 } from "./shared";

interface MenuViewProps {
  table: number;
  menu: Product[];
  cartCount: number;
  subtotal: number;
  loading?: boolean;
  error?: boolean;
  onRetry?: () => void;
  onOpen: (p: Product) => void;
  onCart: () => void;
}

function StockBadge({ item }: { item: Product }): JSX.Element | null {
  if (!isOrderable(item)) return null;
  if (typeof item.stock === "number" && item.stock <= 5) {
    return (
      <span className="tag" style={{ background: "#F8EAD6", color: "var(--orange-600)", left: "auto", right: 8 }}>
        Sisa {item.stock}
      </span>
    );
  }
  return null;
}

export default function MenuView({ table, menu, cartCount, subtotal, loading, error, onRetry, onOpen, onCart }: MenuViewProps): JSX.Element {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>("Semua");
  const fetchedCats = useCategories();
  const cats = ["Semua", ...mergeProductCategories(fetchedCats, menu)];

  let list = menu.filter((m) => cat === "Semua" || productInCategory(m, cat));
  if (q) list = list.filter((m) => m.name.toLowerCase().includes(q.toLowerCase()));

  // loading / error / empty feedback (instead of a silent blank grid)
  const showLoading = loading && menu.length === 0;
  const showError = error && menu.length === 0;
  const showEmpty = !loading && !error && list.length === 0;

  return (
    <>
      <div style={{ background: "var(--green-800)", flex: "0 0 auto" }}>
        <div style={{ padding: "16px 20px 18px", color: "var(--cream)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontSize: 12, opacity: 0.75 }}>Selamat datang di</div>
              <div className="brand" style={{ fontSize: 30, fontWeight: 800, lineHeight: 1.05, color: "var(--gold)" }}>
                Warbul
              </div>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 7,
                background: "rgba(255,255,255,.12)",
                padding: "8px 13px",
                borderRadius: 13,
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 9,
                  background: "var(--gold)",
                  boxShadow: "0 0 0 3px rgba(240,190,72,.25)",
                }}
              />
              <span style={{ fontSize: 13, fontWeight: 700 }}>Meja {pad2(table)}</span>
            </div>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 9,
              background: "rgba(255,255,255,.95)",
              borderRadius: 14,
              padding: "11px 15px",
              marginTop: 16,
              color: "#9b8e76",
            }}
          >
            <span style={{ color: "#b6a98e" }}>
              <Icons.search size={16} />
            </span>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Cari menu favoritmu…"
              style={{
                border: "none",
                outline: "none",
                background: "none",
                flex: 1,
                fontSize: 14,
                fontFamily: "inherit",
                color: "var(--ink)",
              }}
            />
          </div>
        </div>
      </div>

      <div className="meja-body" style={{ background: "var(--cream)" }}>
        <div className="chiprow" style={{ display: "flex", gap: 9, overflowX: "auto", padding: "16px 20px 4px" }}>
          {cats.map((c) => {
            const on = cat === c;
            return (
              <div
                key={c}
                onClick={() => setCat(c)}
                style={{
                  flex: "0 0 auto",
                  fontWeight: 700,
                  fontSize: 13,
                  borderRadius: 999,
                  padding: "8px 15px",
                  whiteSpace: "nowrap",
                  cursor: "pointer",
                  transition: ".15s",
                  background: on ? "var(--green-700)" : "#fff",
                  color: on ? "var(--cream)" : "var(--green-700)",
                  border: "1.5px solid " + (on ? "var(--green-700)" : "var(--line)"),
                }}
              >
                {c}
              </div>
            );
          })}
        </div>

        {showLoading && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, padding: "14px 20px 120px" }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                style={{
                  background: "#fff",
                  borderRadius: 20,
                  border: "1px solid var(--cream-200)",
                  overflow: "hidden",
                  boxShadow: "var(--shadow-sm)",
                }}
              >
                <div className="meja-skel" style={{ height: 96 }} />
                <div style={{ padding: "10px 12px 12px" }}>
                  <div className="meja-skel" style={{ height: 12, borderRadius: 6, width: "85%" }} />
                  <div className="meja-skel" style={{ height: 12, borderRadius: 6, width: "55%", marginTop: 8 }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {showError && (
          <div style={{ padding: "48px 28px", textAlign: "center" }}>
            <div className="brand" style={{ fontSize: 17, fontWeight: 700, color: "var(--green-800)" }}>
              Gagal memuat menu
            </div>
            <div style={{ fontSize: 13, color: "#8b7f6c", marginTop: 6, lineHeight: 1.5 }}>
              Periksa koneksi internet kamu, lalu coba lagi.
            </div>
            <button
              type="button"
              onClick={onRetry}
              className="btn btn-green"
              style={{ marginTop: 16, padding: "11px 22px", borderRadius: 13, fontSize: 13.5 }}
            >
              Coba Lagi
            </button>
          </div>
        )}

        {showEmpty && (
          <div style={{ padding: "48px 28px", textAlign: "center", color: "#8b7f6c", fontSize: 14 }}>
            {q ? `Tidak ada menu cocok dengan "${q}".` : "Belum ada menu tersedia."}
          </div>
        )}

        <div style={{ display: showLoading || showError || showEmpty ? "none" : "grid", gridTemplateColumns: "1fr 1fr", gap: 14, padding: "14px 20px 120px" }}>
          {list.map((it) => {
            const ok = isOrderable(it);
            return (
              <div
                key={it.id}
                onClick={() => ok && onOpen(it)}
                style={{
                  background: "#fff",
                  borderRadius: 20,
                  overflow: "hidden",
                  border: "1px solid var(--cream-200)",
                  boxShadow: "var(--shadow-sm)",
                  cursor: ok ? "pointer" : "default",
                  opacity: ok ? 1 : 0.72,
                }}
              >
                <div style={{ position: "relative" }}>
                  <FoodTile item={it} h={96} glyphSize={46} />
                  {it.tag && (
                    <span className="tag" style={{ background: "var(--gold)", color: "var(--coffee-900)" }}>
                      {it.tag}
                    </span>
                  )}
                  <StockBadge item={it} />
                </div>
                <div style={{ padding: "10px 12px 12px" }}>
                  <div style={{ fontWeight: 700, fontSize: 13.5, lineHeight: 1.25, minHeight: 34 }}>{it.name}</div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6 }}>
                    <span className="num" style={{ color: "var(--coffee)", fontSize: 16 }}>
                      {rupiah(it.price)}
                    </span>
                    {ok ? (
                      <button
                        type="button"
                        className="add-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpen(it);
                        }}
                        style={{ width: 30, height: 30, borderRadius: 10, background: "var(--green-700)", color: "#fff", fontSize: 18 }}
                      >
                        +
                      </button>
                    ) : (
                      <span style={{ fontSize: 11, fontWeight: 700, color: "#b6a98e" }}>Habis</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {cartCount > 0 && (
        <div className="meja-fab">
          <button
            type="button"
            onClick={onCart}
            className="btn"
            style={{
              width: "100%",
              background: "var(--green-800)",
              color: "var(--cream)",
              borderRadius: 18,
              padding: "14px 18px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              boxShadow: "var(--shadow-md)",
            }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: 11 }}>
              <span style={{ position: "relative", color: "var(--gold)" }}>
                <Icons.cart size={20} />
                <span
                  style={{
                    position: "absolute",
                    top: -7,
                    right: -8,
                    background: "var(--gold)",
                    color: "var(--coffee-900)",
                    fontSize: 10,
                    fontWeight: 800,
                    minWidth: 16,
                    height: 16,
                    borderRadius: 9,
                    display: "grid",
                    placeItems: "center",
                    padding: "0 4px",
                  }}
                >
                  {cartCount}
                </span>
              </span>
              <span style={{ fontWeight: 700, fontSize: 13.5 }}>Lihat Keranjang</span>
            </span>
            <span className="num" style={{ fontSize: 17, color: "var(--gold)" }}>
              {rupiah(subtotal)}
            </span>
          </button>
        </div>
      )}
    </>
  );
}
