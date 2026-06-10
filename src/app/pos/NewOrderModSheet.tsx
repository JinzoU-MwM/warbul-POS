"use client";
// Modifier popover for the cashier order-entry screen. Centered modal with
// the shared <ModifierGroups>, a qty stepper, and a gold "Tambah" button.
import { useState } from "react";
import type { JSX } from "react";
import type { Product, Selection } from "@/lib/types";
import { rupiah } from "@/lib/constants";
import { ModifierGroups, QtyStepper, useModifiers } from "@/components";

export interface NewOrderModSheetProps {
  item: Product;
  onClose: () => void;
  onConfirm: (sel: Selection, qty: number) => void;
}

export function NewOrderModSheet({ item, onClose, onConfirm }: NewOrderModSheetProps): JSX.Element {
  const { defaultSelection, unitPrice } = useModifiers();
  const [sel, setSel] = useState<Selection>(() => defaultSelection(item));
  const [qty, setQty] = useState(1);
  const unit = unitPrice(item, sel);

  return (
    <div className="no-modalbd" onClick={onClose}>
      <div
        className="no-modalcard"
        onClick={(e) => e.stopPropagation()}
        style={{ width: 420, maxWidth: "92vw", maxHeight: "88vh", display: "flex", flexDirection: "column" }}
      >
        <div style={{ padding: "20px 22px 6px" }}>
          <div className="brand" style={{ fontSize: 19, fontWeight: 700 }}>{item.name}</div>
          <div className="num" style={{ color: "var(--coffee)", fontSize: 15 }}>{rupiah(item.price)}</div>
        </div>
        <div style={{ padding: "0 22px 6px", overflowY: "auto", flex: 1 }}>
          <ModifierGroups item={item} sel={sel} onChange={setSel} />
        </div>
        <div
          style={{
            padding: "12px 22px 18px",
            borderTop: "1px solid var(--line)",
            display: "flex",
            gap: 12,
            alignItems: "center",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              background: "#fff",
              borderRadius: 12,
              padding: "6px 10px",
              border: "1px solid var(--line)",
            }}
          >
            <QtyStepper qty={qty} onChange={setQty} size="sm" />
          </div>
          <button
            type="button"
            onClick={() => onConfirm(sel, qty)}
            className="btn btn-gold"
            style={{ flex: 1, padding: 13, borderRadius: 13, fontSize: 14.5 }}
          >
            Tambah · {rupiah(unit * qty)}
          </button>
        </div>
      </div>
    </div>
  );
}
