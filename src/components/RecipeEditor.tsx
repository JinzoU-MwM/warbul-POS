"use client";
// Modal that edits a recipe (bill of materials) for a product or a modifier
// option. Loads all ingredients + the current recipe rows, lets the user pick
// ingredient + qty per line, then replaces the whole recipe via setRecipe.
// An empty recipe means "unlimited / no ingredients consumed".
import { useEffect, useState, type JSX } from "react";
import type { Ingredient, RecipeItem } from "@/lib/types";
import { getIngredients, getRecipe, setRecipe } from "@/lib/api";
import { Icons } from "./icons";

export interface RecipeEditorProps {
  ownerType: "product" | "option";
  ownerId: string;
  title: string;
  onClose: () => void;
}

export function RecipeEditor({ ownerType, ownerId, title, onClose }: RecipeEditorProps): JSX.Element {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [rows, setRows] = useState<RecipeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let alive = true;
    Promise.all([getIngredients(), getRecipe(ownerType, ownerId)])
      .then(([ings, recipe]) => {
        if (!alive) return;
        setIngredients(ings);
        setRows(recipe.map((r) => ({ ingredientId: r.ingredientId, qty: r.qty })));
        setLoading(false);
      })
      .catch(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [ownerType, ownerId]);

  const addRow = () => setRows((rs) => [...rs, { ingredientId: "", qty: 1 }]);
  const removeRow = (i: number) => setRows((rs) => rs.filter((_, idx) => idx !== i));
  const setRow = (i: number, patch: Partial<RecipeItem>) =>
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));

  const save = async () => {
    if (saving) return;
    setSaving(true);
    const items = rows.filter((r) => r.ingredientId && r.qty > 0);
    try {
      await setRecipe(ownerType, ownerId, items);
      onClose();
    } catch {
      setSaving(false);
    }
  };

  return (
    <div className="rcp-bd" onClick={onClose}>
      <RecipeStyles />
      <div
        className="rcp-card"
        onClick={(e) => e.stopPropagation()}
        style={{ width: 460, maxWidth: "92vw", maxHeight: "88vh", overflowY: "auto", padding: 22 }}
      >
        <div className="brand" style={{ fontSize: 20, fontWeight: 700 }}>Resep: {title}</div>
        <div style={{ fontSize: 12.5, color: "#8b7f6c", marginTop: 2, marginBottom: 16 }}>
          Bahan yang dipakai per 1 porsi.
        </div>

        {loading ? (
          <div style={{ padding: "24px 0", textAlign: "center", color: "#8b7f6c", fontSize: 13.5 }}>Memuat…</div>
        ) : (
          <>
            <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
              {rows.length === 0 && (
                <div
                  style={{
                    padding: "16px 14px",
                    borderRadius: 12,
                    background: "var(--paper-2)",
                    border: "1px dashed var(--cream-400)",
                    color: "#8b7f6c",
                    fontSize: 13,
                    textAlign: "center",
                  }}
                >
                  Belum ada bahan. Tambahkan bahan, atau kosongkan untuk stok tak terbatas.
                </div>
              )}
              {rows.map((r, i) => {
                const ing = ingredients.find((x) => x.id === r.ingredientId);
                return (
                  <div key={i} className="rcp-row">
                    <select
                      className="fld rcp-sel"
                      value={r.ingredientId}
                      onChange={(e) => setRow(i, { ingredientId: e.target.value })}
                    >
                      <option value="">— pilih bahan —</option>
                      {ingredients.map((x) => (
                        <option key={x.id} value={x.id}>
                          {x.name} ({x.unit})
                        </option>
                      ))}
                    </select>
                    <input
                      className="fld num rcp-qty"
                      type="number"
                      min={0}
                      step="any"
                      value={r.qty}
                      onChange={(e) => setRow(i, { qty: Number(e.target.value) })}
                      aria-label="Jumlah"
                    />
                    <span className="rcp-unit">{ing?.unit ?? ""}</span>
                    <button
                      type="button"
                      className="rcp-rm"
                      onClick={() => removeRow(i)}
                      aria-label="Hapus bahan"
                      title="Hapus bahan"
                    >
                      <Icons.trash size={15} color="var(--red)" />
                    </button>
                  </div>
                );
              })}
            </div>

            <button type="button" className="rcp-add" onClick={addRow}>
              <Icons.plus size={14} color="var(--green-800)" /> Tambah Bahan
            </button>

            <div style={{ fontSize: 12, color: "#a99c86", marginTop: 12 }}>
              Kosongkan untuk jadikan stok tak terbatas.
            </div>

            <div style={{ display: "flex", gap: 11, marginTop: 18 }}>
              <button
                type="button"
                onClick={onClose}
                className="btn"
                style={{ flex: 1, padding: 13, borderRadius: 13, background: "#fff", color: "var(--ink)", border: "1.5px solid var(--line)" }}
              >
                Batal
              </button>
              <button
                type="button"
                onClick={save}
                disabled={saving}
                className="btn btn-gold"
                style={{ flex: 1.6, padding: 13, borderRadius: 13, opacity: saving ? 0.6 : 1, cursor: saving ? "default" : "pointer" }}
              >
                Simpan Resep
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function RecipeStyles(): JSX.Element {
  return (
    <style>{`
      .rcp-bd{position:fixed;inset:0;background:rgba(28,20,12,.5);display:grid;place-items:center;z-index:310;padding:14px;animation:rcp-fade .18s}
      .rcp-card{background:#fff;border-radius:18px;box-shadow:0 30px 60px -24px rgba(0,0,0,.5);animation:rcp-pop .2s}
      .rcp-row{display:flex;align-items:center;gap:8px}
      .rcp-sel{flex:1;min-width:0}
      .rcp-qty{width:78px;flex:0 0 auto;text-align:right}
      .rcp-unit{flex:0 0 auto;font-size:12px;font-weight:700;color:#a99c86;width:34px}
      .rcp-rm{flex:0 0 auto;width:34px;height:34px;border-radius:10px;border:1px solid var(--red-bg);background:var(--red-bg);display:grid;place-items:center;cursor:pointer}
      .rcp-add{margin-top:12px;border:1.5px dashed var(--cream-400);background:transparent;color:var(--green-800);cursor:pointer;font-family:inherit;font-weight:700;font-size:13px;border-radius:11px;padding:9px 14px;display:inline-flex;align-items:center;gap:6px}
      .rcp-add:hover{background:var(--paper-2)}
      @keyframes rcp-fade{from{opacity:0}}
      @keyframes rcp-pop{from{opacity:0;transform:translateY(8px) scale(.98)}}
    `}</style>
  );
}
