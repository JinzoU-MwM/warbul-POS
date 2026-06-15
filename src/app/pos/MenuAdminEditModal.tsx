"use client";
// Create / edit a menu item. Validates name non-empty and price >= 0, then
// calls updateProduct (existing id) or createProduct (new).
import { useEffect, useState } from "react";
import type { JSX } from "react";
import type { Glyph, Product } from "@/lib/types";
import { createProduct, updateProduct } from "@/lib/api";
import { driveImageUrl } from "@/lib/images";
import { useCategories } from "@/lib/use-categories";
import { Switch } from "@/components";

/** A blank draft (no id) opens the modal in "create" mode. */
export type MenuDraft = Partial<Product> & { id?: string };

export interface MenuAdminEditModalProps {
  item: MenuDraft;
  onClose: () => void;
  onSaved: (p: Product) => void;
}

const GLYPHS: { id: Glyph; label: string }[] = [
  { id: "cup", label: "Gelas (cup)" },
  { id: "bowl", label: "Mangkuk (bowl)" },
  { id: "fries", label: "Kentang (fries)" },
];

const labelStyle: React.CSSProperties = { fontSize: 13, fontWeight: 700, color: "#6f6353" };

export function MenuAdminEditModal({ item, onClose, onSaved }: MenuAdminEditModalProps): JSX.Element {
  const availCats = useCategories();
  const [name, setName] = useState(item.name ?? "");
  useEffect(() => { if (!cat && availCats.length) setCat(availCats[0]); }, [availCats]);
  const [price, setPrice] = useState<string>(item.price != null ? String(item.price) : "");
  const [cat, setCat] = useState<string>(item.cat ?? "");
  const [g, setG] = useState<Glyph>(item.g ?? "cup");
  const [from, setFrom] = useState(item.grad?.[0] ?? "#6F4A2C");
  const [to, setTo] = useState(item.grad?.[1] ?? "#3C2618");
  const [tag, setTag] = useState(item.tag ?? "");
  const [desc, setDesc] = useState(item.desc ?? "");
  const [image, setImage] = useState(item.image ?? "");
  const [available, setAvailable] = useState(item.available ?? true);
  const [saving, setSaving] = useState(false);

  const previewSrc = driveImageUrl(image);

  const priceNum = Number(price);
  const ok = name.trim().length > 0 && price !== "" && Number.isFinite(priceNum) && priceNum >= 0;

  const save = async () => {
    if (!ok || saving) return;
    setSaving(true);
    const values: Partial<Product> = {
      name: name.trim(),
      price: priceNum,
      cat,
      g,
      grad: [from, to],
      tag: tag.trim() ? tag.trim() : null,
      desc: desc.trim(),
      image: image.trim() ? image.trim() : null,
      available,
    };
    try {
      const saved = item.id ? await updateProduct(item.id, values) : await createProduct(values);
      onSaved(saved);
    } catch {
      setSaving(false);
    }
  };

  return (
    <div className="ma-modalbd" onClick={onClose}>
      <div
        className="ma-modalcard"
        onClick={(e) => e.stopPropagation()}
        style={{ width: 420, maxWidth: "92vw", maxHeight: "90vh", overflowY: "auto", padding: 26 }}
      >
        <div className="brand" style={{ fontSize: 21, fontWeight: 700, marginBottom: 18 }}>
          {item.id ? "Edit Menu" : "Tambah Menu Baru"}
        </div>

        <label style={labelStyle}>Nama Menu</label>
        <input
          className="ma-fld"
          style={{ margin: "7px 0 15px" }}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="cth. Es Kopi Susu Warbul"
          autoFocus
        />

        <label style={labelStyle}>Harga (Rp)</label>
        <input
          className="ma-fld"
          style={{ margin: "7px 0 15px" }}
          type="number"
          min={0}
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder="18000"
        />

        <div style={{ display: "flex", gap: 13 }}>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Kategori</label>
            <select
              className="ma-fld"
              style={{ margin: "7px 0 15px" }}
              value={cat}
              onChange={(e) => setCat(e.target.value)}
            >
              {availCats.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Ikon</label>
            <select
              className="ma-fld"
              style={{ margin: "7px 0 15px" }}
              value={g}
              onChange={(e) => setG(e.target.value as Glyph)}
            >
              {GLYPHS.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}
            </select>
          </div>
        </div>

        <label style={labelStyle}>Warna Tile</label>
        <div style={{ display: "flex", gap: 13, alignItems: "center", margin: "7px 0 15px" }}>
          <div
            style={{
              width: 52,
              height: 40,
              borderRadius: 10,
              flex: "0 0 auto",
              background: `linear-gradient(135deg,${from},${to})`,
              border: "1px solid var(--line)",
            }}
          />
          <label style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: "#6f6353", fontWeight: 600 }}>
            <input type="color" value={from} onChange={(e) => setFrom(e.target.value)} style={{ width: 38, height: 32, border: "none", background: "none", cursor: "pointer" }} />
            Dari
          </label>
          <label style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: "#6f6353", fontWeight: 600 }}>
            <input type="color" value={to} onChange={(e) => setTo(e.target.value)} style={{ width: 38, height: 32, border: "none", background: "none", cursor: "pointer" }} />
            Ke
          </label>
        </div>

        <label style={labelStyle}>Gambar Menu (link Google Drive, opsional)</label>
        <div style={{ display: "flex", gap: 13, alignItems: "flex-start", margin: "7px 0 4px" }}>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 10,
              flex: "0 0 auto",
              overflow: "hidden",
              background: `linear-gradient(135deg,${from},${to})`,
              border: "1px solid var(--line)",
            }}
          >
            {previewSrc && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewSrc}
                alt=""
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            )}
          </div>
          <input
            className="ma-fld"
            style={{ flex: 1 }}
            value={image}
            onChange={(e) => setImage(e.target.value)}
            placeholder="cth. https://drive.google.com/file/d/…/view"
          />
        </div>
        <div style={{ fontSize: 11.5, color: "#8b7f6c", margin: "0 0 15px" }}>
          Tempel link Google Drive gambar. Pastikan akses file diatur ke
          “Siapa saja yang memiliki link”. Kosongkan untuk memakai ikon &amp; warna.
        </div>

        <label style={labelStyle}>Tag (opsional)</label>
        <input
          className="ma-fld"
          style={{ margin: "7px 0 15px" }}
          value={tag ?? ""}
          onChange={(e) => setTag(e.target.value)}
          placeholder="cth. Best Seller"
        />

        <label style={labelStyle}>Deskripsi</label>
        <textarea
          className="ma-fld"
          style={{ margin: "7px 0 18px", resize: "vertical", minHeight: 64 }}
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          placeholder="Deskripsi singkat menu"
        />

        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 22 }}>
          <Switch on={available} onClick={() => setAvailable((v) => !v)} />
          <span style={{ fontSize: 14, fontWeight: 600 }}>
            {available ? "Tersedia untuk dipesan" : "Ditandai habis"}
          </span>
        </div>

        <div style={{ display: "flex", gap: 11 }}>
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
