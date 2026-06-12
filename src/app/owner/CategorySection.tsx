"use client";
import { useEffect, useState, type JSX } from "react";
import { getCategories, createCategory, renameCategory, deleteCategory } from "@/lib/api";

interface Cat { id: string; name: string; position: number; count: number; }

export function CategorySection(): JSX.Element {
  const [cats, setCats] = useState<Cat[]>([]);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      const [catData, menuRes] = await Promise.all([
        getCategories(),
        fetch("/api/menu", { cache: "no-store" }).then((r) => r.json()).then((d) => d.menu as { cat: string }[]),
      ]);
      const countMap = new Map<string, number>();
      for (const p of menuRes) countMap.set(p.cat, (countMap.get(p.cat) ?? 0) + 1);
      setCats(catData.map((c) => ({ ...c, count: countMap.get(c.name) ?? 0 })));
    } catch {}
  }

  useEffect(() => { load(); }, []);

  async function handleAdd() {
    if (!newName.trim() || busy) return;
    setBusy(true); setError(null);
    try {
      await createCategory(newName.trim());
      setNewName(""); setAdding(false);
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally { setBusy(false); }
  }

  async function handleRename(id: string) {
    if (!editName.trim() || busy) return;
    setBusy(true); setError(null);
    try {
      await renameCategory(id, editName.trim());
      setEditId(null);
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally { setBusy(false); }
  }

  async function handleDelete(id: string) {
    if (busy) return;
    setBusy(true); setError(null);
    try {
      await deleteCategory(id);
      setDeleteId(null);
      await load();
    } catch (e) {
      setError((e as Error).message);
      setDeleteId(null);
    } finally { setBusy(false); }
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div style={{ fontWeight: 700, fontSize: 14 }}>Kategori Menu</div>
        {!adding && (
          <button
            type="button"
            onClick={() => { setAdding(true); setNewName(""); setError(null); }}
            className="btn btn-green"
            style={{ fontSize: 12, padding: "6px 12px", borderRadius: 9 }}
          >
            + Tambah
          </button>
        )}
      </div>

      {error && <div style={{ color: "#dc2626", fontSize: 12.5, marginBottom: 10 }}>{error}</div>}

      <div style={{ display: "flex", flexWrap: "wrap", gap: 9 }}>
        {cats.map((cat) => {
          const isDeletable = cat.count === 0;

          if (editId === cat.id) {
            return (
              <div
                key={cat.id}
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 10px", background: "#f0f9f2", border: "1.5px solid var(--green-700)", borderRadius: 999 }}
              >
                <input
                  autoFocus
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") void handleRename(cat.id); if (e.key === "Escape") setEditId(null); }}
                  style={{ fontSize: 12, fontWeight: 700, border: "none", outline: "none", background: "transparent", width: Math.max(editName.length * 8, 60) }}
                />
                <button type="button" onClick={() => void handleRename(cat.id)} disabled={busy}
                  style={{ fontSize: 12, color: "var(--green-700)", fontWeight: 700, border: "none", background: "none", cursor: "pointer", padding: 0 }}>✓</button>
                <button type="button" onClick={() => setEditId(null)}
                  style={{ fontSize: 12, color: "#9ca3af", border: "none", background: "none", cursor: "pointer", padding: 0 }}>✕</button>
              </div>
            );
          }

          if (deleteId === cat.id) {
            return (
              <div
                key={cat.id}
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 10px", background: "#fef2f2", border: "1.5px solid #fca5a5", borderRadius: 999 }}
              >
                <span style={{ fontSize: 11, fontWeight: 700, color: "#dc2626" }}>Hapus?</span>
                <button type="button" onClick={() => void handleDelete(cat.id)} disabled={busy}
                  style={{ fontSize: 11, color: "#dc2626", fontWeight: 700, border: "none", background: "none", cursor: "pointer", padding: 0 }}>✓</button>
                <button type="button" onClick={() => setDeleteId(null)}
                  style={{ fontSize: 11, color: "#9ca3af", border: "none", background: "none", cursor: "pointer", padding: 0, fontFamily: "inherit" }}>Batal</button>
              </div>
            );
          }

          return (
            <div
              key={cat.id}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", background: "#f0f9f2", border: "1.5px solid var(--green-700)", borderRadius: 999 }}
            >
              <button
                type="button"
                onClick={() => { setEditId(cat.id); setEditName(cat.name); setError(null); }}
                style={{ fontSize: 12, fontWeight: 700, color: "var(--green-800)", border: "none", background: "none", cursor: "pointer", padding: 0, fontFamily: "inherit" }}
              >
                {cat.name}
              </button>
              <span style={{ fontSize: 10, color: "#9ca3af" }}>{cat.count}</span>
              <button
                type="button"
                onClick={isDeletable ? () => { setDeleteId(cat.id); setError(null); } : undefined}
                title={isDeletable ? "Hapus kategori" : `Ada ${cat.count} produk — pindahkan dulu sebelum menghapus`}
                style={{ fontSize: 12, color: isDeletable ? "#ef4444" : "#d1d5db", border: "none", background: "none", cursor: isDeletable ? "pointer" : "not-allowed", padding: 0 }}
              >
                ✕
              </button>
            </div>
          );
        })}
      </div>

      {adding && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12 }}>
          <input
            autoFocus
            className="fld"
            placeholder="Nama kategori baru..."
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") void handleAdd(); if (e.key === "Escape") { setAdding(false); setError(null); } }}
            style={{ flex: 1, maxWidth: 240 }}
          />
          <button type="button" onClick={() => void handleAdd()} disabled={busy || !newName.trim()}
            className="btn btn-green" style={{ padding: "9px 14px", fontSize: 13, borderRadius: 10 }}>
            Simpan
          </button>
          <button type="button" onClick={() => { setAdding(false); setError(null); }}
            style={{ fontSize: 13, color: "#8b7f6c", fontWeight: 600, border: "none", background: "none", cursor: "pointer", fontFamily: "inherit" }}>
            Batal
          </button>
        </div>
      )}
    </div>
  );
}
