"use client";
// Menu management ("Manajemen Menu"). Lists items grouped by category with
// availability switches, stock indicators, and edit/delete actions.
import { useEffect, useState } from "react";
import type { JSX } from "react";
import type { Product } from "@/lib/types";
import { rupiah } from "@/lib/constants";
import { useCategories } from "@/lib/use-categories";
import { getMenu, updateProduct, deleteProduct } from "@/lib/api";
import { useLive } from "@/lib/use-live";
import { FoodTile, Switch, Icons, RecipeEditor } from "@/components";
import { MenuAdminEditModal, type MenuDraft } from "./MenuAdminEditModal";

export interface MenuAdminViewProps {
  _?: never;
}

export function MenuAdminView(_props: MenuAdminViewProps = {}): JSX.Element {
  const cats = useCategories();
  const [menu, setMenu] = useState<Product[]>([]);
  const [edit, setEdit] = useState<MenuDraft | null>(null);
  const [del, setDel] = useState<Product | null>(null);
  const [recipeFor, setRecipeFor] = useState<Product | null>(null);

  const load = () => { getMenu().then(setMenu).catch(() => {}); };
  useEffect(() => { load(); }, []);
  useLive(["menu"], load);

  const avail = menu.filter((m) => m.available).length;
  const low = menu.filter((m) => m.stock > 0 && m.stock <= 5).length;
  const out = menu.length - avail;

  const toggle = (it: Product) => {
    setMenu((m) => m.map((x) => (x.id === it.id ? { ...x, available: !x.available } : x)));
    updateProduct(it.id, { available: !it.available }).catch(load);
  };

  const remove = async () => {
    if (!del) return;
    const id = del.id;
    setMenu((m) => m.filter((x) => x.id !== id));
    setDel(null);
    try { await deleteProduct(id); } catch { load(); }
  };

  const onSaved = (p: Product) => {
    setMenu((m) => (m.some((x) => x.id === p.id) ? m.map((x) => (x.id === p.id ? p : x)) : [...m, p]));
    setEdit(null);
  };

  return (
    <>
      <MenuAdminStyles />
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
          <div className="brand" style={{ fontSize: 23, fontWeight: 700 }}>Manajemen Menu</div>
          <div style={{ fontSize: 13, color: "#8b7f6c", marginTop: 2 }}>
            {menu.length} menu · <span style={{ color: "var(--green-ok)", fontWeight: 700 }}>{avail} tersedia</span>
            {low > 0 && <> · <span style={{ color: "var(--orange-600)", fontWeight: 700 }}>{low} stok menipis</span></>}
            {" · "}{out} habis
          </div>
        </div>
        <button
          type="button"
          onClick={() => setEdit({ name: "", price: undefined, cat: cats[0] ?? "", available: true })}
          className="btn btn-green"
          style={{ padding: "12px 18px", borderRadius: 13, display: "flex", alignItems: "center", gap: 8 }}
        >
          <Icons.plus size={18} />
          Tambah Menu
        </button>
      </header>

      <div style={{ flex: 1, overflowY: "auto", padding: "22px 28px 40px" }}>
        {cats.map((c) => {
          const items = menu.filter((m) => m.cat === c);
          if (!items.length) return null;
          return (
            <div key={c} style={{ marginBottom: 30 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                <span className="brand" style={{ fontSize: 17, fontWeight: 700 }}>{c}</span>
                <span style={{ fontSize: 12, color: "#a99c86", fontWeight: 600 }}>{items.length} menu</span>
                <div style={{ flex: 1, height: 1, background: "var(--line)" }} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))", gap: 14 }}>
                {items.map((it) => (
                  <div
                    key={it.id}
                    className="card"
                    style={{ padding: 13, display: "flex", gap: 13, alignItems: "center", opacity: it.available ? 1 : 0.72 }}
                  >
                    <div style={{ width: 62, flex: "0 0 auto" }}>
                      <FoodTile item={it} h={62} glyphSize={31} rounded={14} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 14.5, lineHeight: 1.2 }}>{it.name}</div>
                      <div style={{ display: "flex", alignItems: "baseline", gap: 9, marginTop: 3 }}>
                        <span className="num" style={{ color: "var(--coffee)", fontSize: 15 }}>{rupiah(it.price)}</span>
                        {it.hasRecipe ? (
                          <span
                            style={{
                              fontSize: 12,
                              fontWeight: 700,
                              color: it.stock === 0 ? "var(--red)" : it.stock <= 5 ? "var(--orange-600)" : "#a99c86",
                            }}
                          >
                            · Bisa dibuat: <span className="num">{it.stock}</span>
                          </span>
                        ) : (
                          <span style={{ fontSize: 12, fontWeight: 700, color: "#a99c86" }}>
                            · Stok bahan: tak terbatas
                          </span>
                        )}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
                        <Switch on={it.available} onClick={() => toggle(it)} />
                        <span style={{ fontSize: 12, fontWeight: 700, color: it.available ? "var(--green-ok)" : "#a99c86" }}>
                          {it.available ? "Tersedia" : "Habis"}
                        </span>
                      </div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      <button
                        type="button"
                        onClick={() => setEdit(it)}
                        className="btn"
                        style={{ width: 34, height: 34, display: "grid", placeItems: "center", background: "var(--cream)", color: "var(--green-800)", borderRadius: 10 }}
                        aria-label="Edit"
                      >
                        <Icons.edit size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setRecipeFor(it)}
                        className="btn"
                        style={{ width: 34, height: 34, display: "grid", placeItems: "center", background: "var(--cream)", color: "var(--coffee)", borderRadius: 10 }}
                        title="Resep"
                        aria-label="Resep"
                      >
                        <Icons.bag size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDel(it)}
                        className="btn"
                        style={{ width: 34, height: 34, display: "grid", placeItems: "center", background: "var(--red-bg)", color: "var(--red)", borderRadius: 10 }}
                        aria-label="Hapus"
                      >
                        <Icons.trash size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {edit && <MenuAdminEditModal item={edit} onClose={() => setEdit(null)} onSaved={onSaved} />}

      {recipeFor && (
        <RecipeEditor
          ownerType="product"
          ownerId={recipeFor.id}
          title={recipeFor.name}
          onClose={() => { setRecipeFor(null); load(); }}
        />
      )}

      {del && (
        <div className="ma-modalbd" onClick={() => setDel(null)}>
          <div
            className="ma-modalcard"
            onClick={(e) => e.stopPropagation()}
            style={{ width: 360, maxWidth: "92vw", padding: 26, textAlign: "center" }}
          >
            <div
              style={{
                width: 54,
                height: 54,
                borderRadius: 50,
                background: "var(--red-bg)",
                color: "var(--red)",
                display: "grid",
                placeItems: "center",
                margin: "0 auto 14px",
              }}
            >
              <Icons.trash size={24} />
            </div>
            <div className="brand" style={{ fontSize: 19, fontWeight: 700 }}>Hapus menu ini?</div>
            <p style={{ color: "#8b7f6c", fontSize: 14, margin: "8px 0 22px" }}>
              “{del.name}” akan dihapus dari menu. Tindakan ini tidak bisa dibatalkan.
            </p>
            <div style={{ display: "flex", gap: 11 }}>
              <button
                type="button"
                onClick={() => setDel(null)}
                className="btn"
                style={{ flex: 1, padding: 13, borderRadius: 13, background: "#fff", color: "var(--ink)", border: "1.5px solid var(--line)" }}
              >
                Batal
              </button>
              <button
                type="button"
                onClick={remove}
                className="btn"
                style={{ flex: 1, padding: 13, borderRadius: 13, background: "var(--red)", color: "#fff" }}
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

function MenuAdminStyles(): JSX.Element {
  return (
    <style>{`
      .ma-fld{width:100%;border:1.5px solid var(--line);border-radius:12px;padding:12px 14px;font-size:14.5px;outline:none;background:#fff;font-family:inherit;color:var(--ink)}
      .ma-fld:focus{border-color:var(--green-700)}
      .ma-modalbd{position:fixed;inset:0;background:rgba(28,20,12,.5);display:grid;place-items:center;z-index:80;animation:ma-fade .18s}
      .ma-modalcard{background:var(--paper);border-radius:22px;animation:ma-mpop .2s}
      @keyframes ma-fade{from{opacity:0}}
      @keyframes ma-mpop{from{transform:scale(.95);opacity:0}}
    `}</style>
  );
}
