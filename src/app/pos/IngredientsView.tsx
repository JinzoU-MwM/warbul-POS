"use client";
// Raw-material / ingredient manager ("Bahan Baku"). Menu availability and the
// "max servings makeable" count are derived from these stocks on the backend,
// so editing stock here can flip menu items to "Habis" automatically.
import { useEffect, useState, type JSX } from "react";
import type { Ingredient } from "@/lib/types";
import { getIngredients, createIngredient, updateIngredient, deleteIngredient } from "@/lib/api";
import { useLive } from "@/lib/use-live";
import { Icons } from "@/components";

/** A blank draft (no id) opens the editor in "create" mode. */
type IngDraft = { id?: string; name: string; unit: string; stock: number; lowThreshold: number };

export function IngredientsView(): JSX.Element {
  const [items, setItems] = useState<Ingredient[]>([]);
  const [edit, setEdit] = useState<IngDraft | null>(null);
  const [del, setDel] = useState<Ingredient | null>(null);

  const reload = () => { getIngredients().then(setItems).catch(() => {}); };
  useEffect(() => { reload(); }, []);
  useLive(["menu"], reload);

  const low = items.filter((i) => i.stock <= i.lowThreshold);

  /** Optimistically patch stock, then persist; reload on failure. */
  const commitStock = (it: Ingredient, next: number) => {
    const v = Math.max(0, Math.round(next));
    if (v === it.stock) return;
    setItems((arr) => arr.map((x) => (x.id === it.id ? { ...x, stock: v } : x)));
    updateIngredient(it.id, { stock: v }).catch(reload);
  };

  const remove = async () => {
    if (!del) return;
    const id = del.id;
    setItems((arr) => arr.filter((x) => x.id !== id));
    setDel(null);
    try { await deleteIngredient(id); } catch { reload(); }
  };

  const onSaved = (saved: Ingredient | null) => {
    if (saved) {
      setItems((arr) => (arr.some((x) => x.id === saved.id) ? arr.map((x) => (x.id === saved.id ? saved : x)) : [...arr, saved]));
    } else {
      reload();
    }
    setEdit(null);
  };

  return (
    <>
      <IngStyles />
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "20px 28px",
          borderBottom: "1px solid var(--line)",
          background: "var(--paper-2)",
          flex: "0 0 auto",
          gap: 14,
          flexWrap: "wrap",
        }}
      >
        <div>
          <div className="brand" style={{ fontSize: 23, fontWeight: 700 }}>Bahan Baku</div>
          <div style={{ fontSize: 13, color: "#8b7f6c", marginTop: 2 }}>
            Kelola stok bahan mentah. Menu otomatis &apos;Habis&apos; bila bahannya tidak cukup.
          </div>
        </div>
        <button
          type="button"
          onClick={() => setEdit({ name: "", unit: "g", stock: 0, lowThreshold: 0 })}
          className="btn btn-green"
          style={{ padding: "12px 18px", borderRadius: 13, display: "flex", alignItems: "center", gap: 8 }}
        >
          <Icons.plus size={18} />
          Tambah Bahan
        </button>
      </header>

      <div style={{ flex: 1, overflowY: "auto", padding: "22px 28px 40px" }}>
        <div style={{ maxWidth: 820 }}>
          {low.length > 0 && (
            <div
              style={{
                background: "#FBF1DF",
                border: "1px solid #ECCF9E",
                borderRadius: 14,
                padding: "14px 16px",
                marginBottom: 18,
              }}
            >
              <div style={{ fontWeight: 800, fontSize: 13.5, color: "var(--orange-600)" }}>
                {low.length} bahan menipis / habis
              </div>
              <div style={{ fontSize: 12.5, color: "#8b7f6c", marginTop: 4 }}>
                {low.map((i) => `${i.name} (${i.stock} ${i.unit})`).join(" · ")}
              </div>
            </div>
          )}

          {items.length === 0 && (
            <div className="owner-card" style={{ padding: "34px 24px", textAlign: "center", color: "#8b7f6c" }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: "var(--ink)" }}>Belum ada bahan baku</div>
              <div style={{ fontSize: 13, marginTop: 4 }}>Tambahkan bahan mentah seperti kopi, susu, atau gula.</div>
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {items.map((it) => (
              <IngredientRow
                key={it.id}
                it={it}
                onCommit={(v) => commitStock(it, v)}
                onEdit={() => setEdit({ id: it.id, name: it.name, unit: it.unit, stock: it.stock, lowThreshold: it.lowThreshold })}
                onDelete={() => setDel(it)}
              />
            ))}
          </div>
        </div>
      </div>

      {edit && <IngredientEditor draft={edit} onClose={() => setEdit(null)} onSaved={onSaved} />}

      {del && (
        <div className="ing-bd" onClick={() => setDel(null)}>
          <div className="ing-card" onClick={(e) => e.stopPropagation()} style={{ width: 380, maxWidth: "92vw", padding: 22 }}>
            <div className="brand" style={{ fontSize: 19, fontWeight: 700 }}>Hapus bahan ini?</div>
            <div style={{ fontSize: 13.5, color: "#6f6353", marginTop: 8, lineHeight: 1.5 }}>
              <b>{del.name}</b> akan dihapus. Bahan ini juga akan dilepas dari semua resep yang memakainya — menu terkait bisa berubah ketersediaannya.
            </div>
            <div style={{ display: "flex", gap: 11, marginTop: 20 }}>
              <button
                type="button"
                onClick={() => setDel(null)}
                className="btn"
                style={{ flex: 1, padding: 12, borderRadius: 12, background: "#fff", color: "var(--ink)", border: "1.5px solid var(--line)" }}
              >
                Batal
              </button>
              <button
                type="button"
                onClick={remove}
                className="btn"
                style={{ flex: 1.3, padding: 12, borderRadius: 12, background: "var(--red)", color: "#fff" }}
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ───────────── ingredient row ───────────── */
function IngredientRow({
  it,
  onCommit,
  onEdit,
  onDelete,
}: {
  it: Ingredient;
  onCommit: (v: number) => void;
  onEdit: () => void;
  onDelete: () => void;
}): JSX.Element {
  const [draft, setDraft] = useState<string>(String(it.stock));

  // Keep the local input in sync when the upstream value changes (live updates).
  useEffect(() => { setDraft(String(it.stock)); }, [it.stock]);

  const pill =
    it.stock <= it.lowThreshold
      ? { bg: "var(--red-bg)", fg: "var(--red)" }
      : it.stock <= it.lowThreshold * 2
        ? { bg: "#FBF1DF", fg: "var(--orange-600)" }
        : { bg: "var(--green-ok-bg)", fg: "var(--green-ok)" };

  const commit = () => {
    const n = Number(draft);
    if (draft.trim() === "" || !Number.isFinite(n)) { setDraft(String(it.stock)); return; }
    onCommit(n);
  };

  return (
    <div className="owner-card" style={{ padding: "12px 16px", display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
      <div style={{ flex: 1, minWidth: 140 }}>
        <div style={{ fontWeight: 700, fontSize: 14.5 }}>{it.name}</div>
        <div style={{ fontSize: 12, color: "#a99c86", marginTop: 1 }}>
          Satuan: {it.unit} · batas menipis {it.lowThreshold} {it.unit}
        </div>
      </div>

      <span className="ing-pill" style={{ background: pill.bg, color: pill.fg }}>
        <span className="num">{it.stock}</span> {it.unit}
      </span>

      <div className="ing-step">
        <button type="button" className="ing-stepbtn" onClick={() => onCommit(it.stock - 1)} aria-label="Kurangi">
          <Icons.minus size={15} />
        </button>
        <input
          className="num ing-stepinput"
          type="number"
          min={0}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
          aria-label={`Stok ${it.name}`}
        />
        <button type="button" className="ing-stepbtn" onClick={() => onCommit(it.stock + 1)} aria-label="Tambah">
          <Icons.plus size={15} />
        </button>
      </div>

      <div className="ing-restock">
        <button type="button" className="ing-restockbtn" onClick={() => onCommit(it.stock + 100)}>+100</button>
        <button type="button" className="ing-restockbtn" onClick={() => onCommit(it.stock + 500)}>+500</button>
      </div>

      <div style={{ display: "flex", gap: 7, flex: "0 0 auto" }}>
        <button type="button" className="ing-iconbtn" onClick={onEdit} title="Edit bahan" aria-label="Edit bahan">
          <Icons.edit size={15} color="var(--green-800)" />
        </button>
        <button type="button" className="ing-iconbtn ing-danger" onClick={onDelete} title="Hapus bahan" aria-label="Hapus bahan">
          <Icons.trash size={15} color="var(--red)" />
        </button>
      </div>
    </div>
  );
}

/* ───────────── ingredient editor ───────────── */
function IngredientEditor({
  draft,
  onClose,
  onSaved,
}: {
  draft: IngDraft;
  onClose: () => void;
  onSaved: (saved: Ingredient | null) => void;
}): JSX.Element {
  const [name, setName] = useState(draft.name);
  const [unit, setUnit] = useState(draft.unit);
  const [stock, setStock] = useState<string>(String(draft.stock));
  const [lowThreshold, setLowThreshold] = useState<string>(String(draft.lowThreshold));
  const [saving, setSaving] = useState(false);

  const ok = name.trim().length > 0 && unit.trim().length > 0;
  const labelStyle: React.CSSProperties = { fontSize: 13, fontWeight: 700, color: "#6f6353" };

  const save = async () => {
    if (!ok || saving) return;
    setSaving(true);
    const values = {
      name: name.trim(),
      unit: unit.trim(),
      stock: Number(stock) || 0,
      lowThreshold: Number(lowThreshold) || 0,
    };
    try {
      if (draft.id) {
        await updateIngredient(draft.id, values);
        onSaved({ id: draft.id, ...values });
      } else {
        const id = await createIngredient(values);
        onSaved({ id, ...values });
      }
    } catch {
      setSaving(false);
    }
  };

  return (
    <div className="ing-bd" onClick={onClose}>
      <div
        className="ing-card"
        onClick={(e) => e.stopPropagation()}
        style={{ width: 420, maxWidth: "92vw", maxHeight: "90vh", overflowY: "auto", padding: 22 }}
      >
        <div className="brand" style={{ fontSize: 20, fontWeight: 700, marginBottom: 18 }}>
          {draft.id ? "Edit Bahan" : "Tambah Bahan Baru"}
        </div>

        <label style={labelStyle}>Nama Bahan</label>
        <input
          className="fld"
          style={{ margin: "7px 0 15px" }}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="cth. Biji Kopi"
          autoFocus
        />

        <label style={labelStyle}>Satuan</label>
        <input
          className="fld"
          style={{ margin: "7px 0 15px" }}
          value={unit}
          onChange={(e) => setUnit(e.target.value)}
          placeholder="cth. g / ml / pcs"
        />

        <div style={{ display: "flex", gap: 13 }}>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Stok Awal</label>
            <input
              className="fld num"
              style={{ margin: "7px 0 15px" }}
              type="number"
              min={0}
              value={stock}
              onChange={(e) => setStock(e.target.value)}
              placeholder="0"
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Batas Menipis</label>
            <input
              className="fld num"
              style={{ margin: "7px 0 15px" }}
              type="number"
              min={0}
              value={lowThreshold}
              onChange={(e) => setLowThreshold(e.target.value)}
              placeholder="0"
            />
          </div>
        </div>

        <div style={{ display: "flex", gap: 11, marginTop: 6 }}>
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
            disabled={!ok || saving}
            className="btn btn-green"
            style={{ flex: 1.6, padding: 13, borderRadius: 13, opacity: ok && !saving ? 1 : 0.5, cursor: ok ? "pointer" : "default" }}
          >
            Simpan
          </button>
        </div>
      </div>
    </div>
  );
}

/* ───────────── scoped styles ───────────── */
function IngStyles(): JSX.Element {
  return (
    <style>{`
      .ing-pill{flex:0 0 auto;display:inline-flex;align-items:center;gap:4px;font-size:12.5px;font-weight:700;padding:5px 11px;border-radius:999px;white-space:nowrap}
      .ing-step{flex:0 0 auto;display:inline-flex;align-items:center;border:1.5px solid var(--line);border-radius:11px;overflow:hidden;background:#fff}
      .ing-stepbtn{width:32px;height:34px;display:grid;place-items:center;border:none;background:#fff;color:var(--green-800);cursor:pointer}
      .ing-stepbtn:hover{background:var(--paper-2)}
      .ing-stepinput{width:56px;height:34px;border:none;border-left:1px solid var(--line);border-right:1px solid var(--line);text-align:center;font-size:14px;outline:none;background:#fff;color:var(--ink);-moz-appearance:textfield}
      .ing-stepinput::-webkit-outer-spin-button,.ing-stepinput::-webkit-inner-spin-button{-webkit-appearance:none;margin:0}
      .ing-restock{flex:0 0 auto;display:inline-flex;gap:6px}
      .ing-restockbtn{cursor:pointer;font-family:inherit;font-weight:700;font-size:12.5px;padding:7px 11px;border-radius:10px;border:1.5px solid var(--cream-300);background:var(--cream);color:var(--coffee)}
      .ing-restockbtn:hover{background:var(--cream-200)}
      .ing-iconbtn{width:32px;height:32px;border-radius:10px;border:1px solid var(--line);background:#fff;display:grid;place-items:center;cursor:pointer}
      .ing-iconbtn:hover{background:var(--paper-2)}
      .ing-iconbtn.ing-danger{border-color:var(--red-bg);background:var(--red-bg)}
      .ing-bd{position:fixed;inset:0;background:rgba(28,20,12,.5);display:grid;place-items:center;z-index:80;animation:ing-fade .18s}
      .ing-card{background:#fff;border-radius:18px;box-shadow:0 30px 60px -24px rgba(0,0,0,.5);animation:ing-pop .2s}
      @keyframes ing-fade{from{opacity:0}}
      @keyframes ing-pop{from{opacity:0;transform:translateY(8px) scale(.98)}}
      @media (max-width:780px){.ing-restock{display:none}}
    `}</style>
  );
}
