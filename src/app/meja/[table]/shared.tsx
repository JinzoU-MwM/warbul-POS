"use client";
// Shared types, helpers and local CSS for the customer (meja) app.
import type { JSX } from "react";
import type { Product, Selection } from "@/lib/types";

/** A cart line. Keyed in the cart record by `lineKey`. */
export interface CartLine {
  id: string;
  sel: Selection;
  qty: number;
}

/** A resolved cart line with its product + computed display values. */
export interface ResolvedLine {
  key: string;
  product: Product;
  sel: Selection;
  qty: number;
  opts: string[];
  unit: number;
}

export type View = "menu" | "cart" | "checkout" | "status";

export const lineKey = (id: string, sel: Selection): string => id + "|" + JSON.stringify(sel);

export const pad2 = (n: number): string => String(n).padStart(2, "0");

/** Whether a product can be ordered (mirrors the prototype's isOrderable). */
export const isOrderable = (p: Product): boolean => p.available !== false && p.stock > 0;

/** Shared header with a back button, used by cart / checkout / status fallback. */
export function CartHeader({ title, onBack }: { title: string; onBack: () => void }): JSX.Element {
  return (
    <div style={{ background: "var(--green-800)", flex: "0 0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "16px 18px 18px", color: "var(--cream)" }}>
        <button
          type="button"
          onClick={onBack}
          style={{
            background: "rgba(255,255,255,.12)",
            border: "none",
            color: "var(--cream)",
            width: 38,
            height: 38,
            borderRadius: 12,
            display: "grid",
            placeItems: "center",
            cursor: "pointer",
          }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path d="M15 19l-7-7 7-7" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <div className="brand" style={{ fontSize: 21, fontWeight: 700 }}>
          {title}
        </div>
      </div>
    </div>
  );
}

/** Muted options line (cart / summaries). */
export function OptsLine({ opts }: { opts: string[] }): JSX.Element | null {
  if (!opts || !opts.length) return null;
  return (
    <div style={{ fontSize: 11.5, color: "#8b7f6c", marginTop: 3, lineHeight: 1.35 }}>{opts.join(" · ")}</div>
  );
}

/** Summary row used in cart / checkout / status detail boxes. */
export function Row({
  k,
  v,
  big,
  accent,
}: {
  k: string;
  v: string;
  big?: boolean;
  accent?: string;
}): JSX.Element {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "3px 0" }}>
      <span style={{ fontSize: big ? 15 : 13.5, fontWeight: big ? 700 : 500, color: big ? "var(--ink)" : accent || "#6f6353" }}>
        {k}
      </span>
      <span className="num" style={{ fontSize: big ? 20 : 14.5, color: big ? "var(--coffee)" : accent || "var(--ink)" }}>
        {v}
      </span>
    </div>
  );
}

/** Local CSS for classes/animations that live in the prototype's inline <style>
    (the project globals.css only ships .brand/.num/.btn). Mounted once by CustomerApp. */
export function MejaStyles(): JSX.Element {
  return (
    <style>{`
      .meja-shell { position: relative; }
      .meja-shell .tag { position: absolute; top: 8px; left: 8px; font-size: 9.5px; font-weight: 800; padding: 3px 8px; border-radius: 999px; letter-spacing: .02em; white-space: nowrap; }
      .meja-shell .chiprow::-webkit-scrollbar { display: none; }
      .meja-shell .chiprow { scrollbar-width: none; }
      .meja-shell .add-btn { display: grid; place-items: center; font-weight: 800; border: none; cursor: pointer; transition: transform .12s; }
      .meja-shell .add-btn:active { transform: scale(.88); }
      .meja-shell .optpill { border: 1.5px solid var(--line); background: #fff; border-radius: 11px; padding: 9px 13px; font-size: 13px; font-weight: 600; cursor: pointer; transition: .12s; color: var(--ink); }
      .meja-body { flex: 1; overflow-y: auto; overflow-x: hidden; position: relative; }
      .meja-body::-webkit-scrollbar { width: 0; height: 0; display: none; }
      /* Pin the sheet to the real viewport (not the phone column, whose height can
         exceed the visible area on mobile) so the footer/"Tambah" is always visible. */
      .meja-sheet-wrap { position: fixed; top: 0; bottom: 0; left: 50%; transform: translateX(-50%); width: 100%; max-width: 430px; z-index: 40; display: flex; flex-direction: column; justify-content: flex-end; }
      .meja-sheet-bd { position: fixed; inset: 0; background: rgba(28,20,12,.5); animation: mejaFade .2s; }
      .meja-sheet { position: relative; background: var(--cream); border-radius: 28px 28px 0 0; animation: mejaUp .28s cubic-bezier(.2,.9,.3,1); max-height: 88vh; max-height: 88dvh; display: flex; flex-direction: column; }
      .meja-fab { position: absolute; left: 16px; right: 16px; bottom: 16px; z-index: 20; }
      .meja-pop { animation: mejaPop .4s; }
      @keyframes mejaFade { from { opacity: 0; } }
      @keyframes mejaUp { from { transform: translateY(100%); } }
      @keyframes mejaPop { from { transform: scale(.9); opacity: 0; } }
      .meja-skel { background: linear-gradient(100deg, #ece3cd 30%, #f6efdd 50%, #ece3cd 70%); background-size: 200% 100%; animation: mejaShimmer 1.2s ease-in-out infinite; }
      @keyframes mejaShimmer { from { background-position: 200% 0; } to { background-position: -200% 0; } }
      .meja-pulse { animation: mejaPulse 1.4s ease-in-out infinite; }
      @keyframes mejaPulse { 0%, 100% { opacity: 1; } 50% { opacity: .3; } }
    `}</style>
  );
}
