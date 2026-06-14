"use client";
import { useState } from "react";
import type { JSX } from "react";
import type { Product, Selection } from "@/lib/types";
import { FoodTile, ModifierGroups, QtyStepper, Icons, useModifiers } from "@/components";
import { rupiah } from "@/lib/constants";

interface DetailSheetProps {
  product: Product;
  onClose: () => void;
  onAdd: (sel: Selection, qty: number) => void;
}

export default function DetailSheet({ product, onClose, onAdd }: DetailSheetProps): JSX.Element {
  const { defaultSelection, unitPrice } = useModifiers();
  const [sel, setSel] = useState<Selection>(() => defaultSelection(product));
  const [qty, setQty] = useState(1);
  const unit = unitPrice(product, sel);

  return (
    <div className="meja-sheet-wrap">
      <div className="meja-sheet-bd" onClick={onClose} />
      <div className="meja-sheet">
        <div style={{ position: "relative", flex: "0 0 auto" }}>
          <FoodTile item={product} h={180} glyphSize={86} />
          {product.tag && (
            <span className="tag" style={{ background: "var(--gold)", color: "var(--coffee-900)", top: 16, left: 16, fontSize: 11 }}>
              {product.tag}
            </span>
          )}
          <button
            type="button"
            onClick={onClose}
            style={{
              position: "absolute",
              top: 14,
              right: 14,
              width: 34,
              height: 34,
              borderRadius: 50,
              background: "rgba(28,20,12,.45)",
              color: "#fff",
              border: "none",
              fontSize: 18,
              cursor: "pointer",
              display: "grid",
              placeItems: "center",
            }}
          >
            <Icons.x size={16} />
          </button>
        </div>

        <div style={{ padding: "18px 22px 0", overflowY: "auto", flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div
              style={{
                display: "inline-block",
                fontSize: 11,
                fontWeight: 700,
                color: "var(--green-700)",
                background: "var(--green-ok-bg)",
                padding: "4px 10px",
                borderRadius: 999,
              }}
            >
              {product.cat}
            </div>
            {typeof product.stock === "number" && product.stock <= 5 && (
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--orange-600)" }}>Tinggal {product.stock} porsi</div>
            )}
          </div>
          <div className="brand" style={{ fontSize: 24, fontWeight: 700, marginTop: 10 }}>
            {product.name}
          </div>
          <div className="num" style={{ fontSize: 22, color: "var(--coffee)", marginTop: 2 }}>
            {rupiah(product.price)}
          </div>
          <p style={{ fontSize: 14, lineHeight: 1.55, color: "#6f6353", marginTop: 10 }}>{product.desc}</p>

          <ModifierGroups item={product} sel={sel} onChange={setSel} />
          <div style={{ height: 8 }} />
        </div>

        <div
          style={{
            padding: "14px 22px 24px",
            display: "flex",
            gap: 14,
            alignItems: "center",
            borderTop: "1px solid var(--line)",
            flex: "0 0 auto",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", background: "var(--cream)", borderRadius: 14, padding: "8px 12px" }}>
            <QtyStepper qty={qty} onChange={setQty} />
          </div>
          <button
            type="button"
            onClick={() => onAdd(sel, qty)}
            className="btn btn-gold"
            style={{ flex: 1, borderRadius: 14, padding: "15px", fontSize: 14.5, display: "flex", justifyContent: "center", gap: 8 }}
          >
            Tambah · {rupiah(unit * qty)}
          </button>
        </div>
      </div>
    </div>
  );
}
