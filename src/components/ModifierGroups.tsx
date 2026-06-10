"use client";
// Renders modifier groups as selectable option pills.
import type { JSX } from "react";
import type { Product, Selection } from "@/lib/types";
import { useModifiers } from "./ModifiersContext";
import { rupiah } from "@/lib/constants";

export interface ModifierGroupsProps {
  item: Pick<Product, "cat">;
  sel: Selection;
  onChange: (sel: Selection) => void;
}

export function ModifierGroups({ item, sel, onChange }: ModifierGroupsProps): JSX.Element {
  const { modGroupsFor } = useModifiers();
  const groups = modGroupsFor(item);

  const setSingle = (gid: string, oid: string) => {
    onChange({ ...sel, [gid]: oid });
  };
  const toggleMulti = (gid: string, oid: string) => {
    const cur = Array.isArray(sel[gid]) ? (sel[gid] as string[]) : [];
    const next = cur.includes(oid) ? cur.filter((x) => x !== oid) : [...cur, oid];
    onChange({ ...sel, [gid]: next });
  };

  return (
    <>
      {groups.map((g) => (
        <div key={g.id} style={{ marginTop: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 9 }}>
            <span style={{ fontWeight: 700, fontSize: 14 }}>{g.name}</span>
            <span style={{ fontSize: 11, color: "#a99c86", fontWeight: 600 }}>
              {g.type === "single" ? "Pilih 1" : "Opsional"}
            </span>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {g.options.map((o) => {
              const on =
                g.type === "single"
                  ? sel[g.id] === o.id
                  : (Array.isArray(sel[g.id]) ? (sel[g.id] as string[]) : []).includes(o.id);
              return (
                <div
                  key={o.id}
                  onClick={() => (g.type === "single" ? setSingle(g.id, o.id) : toggleMulti(g.id, o.id))}
                  style={{
                    cursor: "pointer",
                    transition: ".12s",
                    borderRadius: 11,
                    padding: "9px 13px",
                    fontSize: 13,
                    border: "1.5px solid " + (on ? "var(--green-700)" : "var(--line)"),
                    background: on ? "var(--green-ok-bg)" : "#fff",
                    color: on ? "var(--green-800)" : "var(--ink)",
                    fontWeight: on ? 700 : 600,
                  }}
                >
                  {o.label}
                  {o.price > 0 && (
                    <span style={{ color: "var(--coffee)", fontWeight: 700 }}> +{rupiah(o.price)}</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </>
  );
}
