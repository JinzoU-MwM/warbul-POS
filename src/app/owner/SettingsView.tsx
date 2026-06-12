"use client";
import { useEffect, useState, type CSSProperties, type JSX, type ReactNode } from "react";
import { getSettings, patchSettings } from "@/lib/api";
import { Switch, Icons } from "@/components";
import type { StoreSettings } from "@/lib/types";
import { CategorySection } from "./CategorySection";
import { ModifierAdminView } from "./ModifierAdminView";
import { TablesView } from "./TablesView";
import { DiscountView } from "./DiscountView";

type SubView =
  | "profil" | "pembayaran" | "notifikasi"
  | "kategori" | "addons" | "diskon" | "qr";

interface CardDef { id: SubView; icon: JSX.Element; title: string; desc: string }

const SECTIONS: { label: string; cards: CardDef[] }[] = [
  {
    label: "Toko",
    cards: [
      { id: "profil",     icon: <Icons.store size={19} />,  title: "Profil Toko",        desc: "Nama, cabang, alamat, jam operasional" },
      { id: "pembayaran", icon: <Icons.wallet size={19} />, title: "Pembayaran & Biaya", desc: "Metode, biaya layanan, QRIS merchant" },
      { id: "notifikasi", icon: <Icons.bell size={19} />,   title: "Notifikasi",         desc: "Pesanan baru, stok menipis" },
    ],
  },
  {
    label: "Menu & Produk",
    cards: [
      { id: "kategori", icon: <Icons.category size={19} />, title: "Kategori Menu",    desc: "Tambah, ubah, hapus kategori" },
      { id: "addons",   icon: <Icons.addon size={19} />,    title: "Add-on & Varian",  desc: "Grup modifier, opsi, harga tambahan" },
      { id: "diskon",   icon: <Icons.tag size={19} />,      title: "Diskon & Voucher", desc: "Kode voucher, diskon otomatis" },
    ],
  },
  {
    label: "Perangkat",
    cards: [
      { id: "qr", icon: <Icons.qr size={19} />, title: "QR Meja", desc: "Generate & unduh QR per meja" },
    ],
  },
];

const crumbBtn: CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 4,
  background: "none", border: "none", cursor: "pointer", fontFamily: "inherit",
  fontWeight: 700, fontSize: 13, color: "var(--green-700)", padding: 0,
};

function Field({ label, children }: { label: string; children: ReactNode }): JSX.Element {
  return (
    <div>
      <label style={{ fontSize: 12.5, fontWeight: 700, color: "#6f6353" }}>{label}</label>
      <div style={{ marginTop: 6 }}>{children}</div>
    </div>
  );
}

/* Slim breadcrumb back-bar — for sub-pages whose body brings its own header
   (Add-on, QR). Keeps the "← Pengaturan" affordance without a competing title. */
function Crumb({ onBack }: { onBack: () => void }): JSX.Element {
  return (
    <div className="owner-hdr" style={{
      flex: "0 0 auto", padding: "12px 28px",
      borderBottom: "1px solid var(--line)", background: "var(--paper-2)",
    }}>
      <button onClick={onBack} style={crumbBtn}>
        <Icons.back size={16} /> Pengaturan
      </button>
    </div>
  );
}

/* Full sub-page header: breadcrumb on top, then title + optional action row. */
function SubHeader({ title, desc, onBack, action }: { title: string; desc?: string; onBack: () => void; action?: ReactNode }): JSX.Element {
  return (
    <header className="owner-hdr" style={{
      flex: "0 0 auto", padding: "13px 28px 17px",
      borderBottom: "1px solid var(--line)", background: "var(--paper-2)",
    }}>
      <button onClick={onBack} style={crumbBtn}>
        <Icons.back size={16} /> Pengaturan
      </button>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 14, marginTop: 9, flexWrap: "wrap" }}>
        <div>
          <div className="brand" style={{ fontSize: 21, fontWeight: 700, lineHeight: 1.15 }}>{title}</div>
          {desc && <div style={{ fontSize: 12.5, color: "#8b7f6c", marginTop: 3 }}>{desc}</div>}
        </div>
        {action}
      </div>
    </header>
  );
}

/* Grouped-list row on the landing — icon chip · title/desc · chevron. */
function SettingsRow({ card, first, onClick }: { card: CardDef; first: boolean; onClick: () => void }): JSX.Element {
  return (
    <button
      onClick={onClick}
      style={{
        width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14,
        padding: "13px 15px", background: "transparent", border: "none",
        borderTop: first ? "none" : "1px solid var(--line)",
        cursor: "pointer", fontFamily: "inherit", textAlign: "left", transition: "background .12s",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--paper)")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      <span style={{ display: "flex", alignItems: "center", gap: 13, minWidth: 0 }}>
        <span style={{
          width: 38, height: 38, borderRadius: 11, flexShrink: 0,
          background: "var(--green-ok-bg)", color: "var(--green-700)",
          display: "grid", placeItems: "center",
        }}>
          {card.icon}
        </span>
        <span style={{ minWidth: 0 }}>
          <span style={{ display: "block", fontWeight: 700, fontSize: 14.5 }}>{card.title}</span>
          <span style={{ display: "block", fontSize: 12, color: "#8b7f6c", marginTop: 2 }}>{card.desc}</span>
        </span>
      </span>
      <span style={{ flexShrink: 0, display: "flex", color: "#c0b49a" }}>
        <Icons.chevron size={18} />
      </span>
    </button>
  );
}

/* ─── Profile / Payment / Notif sub-pages share settings form state ─── */
function SettingsFormPages({ sub, onBack }: { sub: SubView; onBack: () => void }): JSX.Element | null {
  const [form, setForm] = useState<StoreSettings | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => { getSettings().then(setForm).catch(() => {}); }, []);

  function set<K extends keyof StoreSettings>(k: K, v: StoreSettings[K]) {
    setForm((s) => (s ? { ...s, [k]: v } : s));
  }

  async function save() {
    if (!form) return;
    setSaving(true);
    try {
      const next = await patchSettings(form);
      setForm(next);
      setSaved(true);
      setTimeout(() => setSaved(false), 1800);
    } catch {}
    finally { setSaving(false); }
  }

  function ToggleRow({ k, label, desc }: { k: keyof StoreSettings; label: string; desc: string }) {
    if (!form) return null;
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "13px 0", borderTop: "1px solid var(--line)" }}>
        <div>
          <div style={{ fontWeight: 600, fontSize: 14 }}>{label}</div>
          <div style={{ fontSize: 12, color: "#8b7f6c", marginTop: 2 }}>{desc}</div>
        </div>
        <Switch on={Boolean(form[k])} onClick={() => set(k, !form[k] as StoreSettings[typeof k])} />
      </div>
    );
  }

  const saveBtn = (
    <button onClick={save} disabled={saving || !form} className="owner-exportbtn" style={{ opacity: saving ? 0.7 : 1 }}>
      {saved ? <><Icons.check size={16} /> Tersimpan</> : "Simpan Perubahan"}
    </button>
  );

  if (sub === "profil") return (
    <>
      <SubHeader title="Profil Toko" desc="Informasi cabang di struk & menu" onBack={onBack} action={saveBtn} />
      <div className="owner-body" style={{ flex: 1, overflowY: "auto", padding: "22px 28px 40px" }}>
        <div className="owner-card" style={{ padding: "22px 24px", maxWidth: 760 }}>
          {form ? (
            <div className="settings-form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <Field label="Nama Toko"><input className="fld" value={form.storeName} onChange={(e) => set("storeName", e.target.value)} /></Field>
              <Field label="Cabang"><input className="fld" value={form.branch} onChange={(e) => set("branch", e.target.value)} /></Field>
              <div style={{ gridColumn: "1 / -1" }}>
                <Field label="Alamat"><input className="fld" value={form.address} onChange={(e) => set("address", e.target.value)} /></Field>
              </div>
              <Field label="Telepon"><input className="fld" value={form.phone} onChange={(e) => set("phone", e.target.value)} /></Field>
              <Field label="Jam Operasional">
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <input className="fld" type="time" value={form.hoursOpen} onChange={(e) => set("hoursOpen", e.target.value)} />
                  <span style={{ color: "#8b7f6c" }}>–</span>
                  <input className="fld" type="time" value={form.hoursClose} onChange={(e) => set("hoursClose", e.target.value)} />
                </div>
              </Field>
            </div>
          ) : <div style={{ color: "#8b7f6c" }}>Memuat…</div>}
        </div>
      </div>
    </>
  );

  if (sub === "pembayaran") return (
    <>
      <SubHeader title="Pembayaran & Biaya" desc="Metode yang bisa dipilih pelanggan & biaya tambahan" onBack={onBack} action={saveBtn} />
      <div className="owner-body" style={{ flex: 1, overflowY: "auto", padding: "22px 28px 40px" }}>
        <div className="owner-card" style={{ padding: "22px 24px", maxWidth: 760 }}>
          {form ? (
            <>
              <ToggleRow k="payQris" label="QRIS" desc="Pembayaran mandiri via scan QRIS pemilik" />
              <ToggleRow k="payKasir" label="Bayar di Kasir" desc="Bayar tunai atau kartu langsung di kasir" />
              <div className="settings-form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 18 }}>
                <Field label="Nama Merchant QRIS"><input className="fld" value={form.qrisMerchant} onChange={(e) => set("qrisMerchant", e.target.value)} /></Field>
                <Field label="Biaya Layanan (Rp)"><input className="fld" type="number" value={form.serviceFee} onChange={(e) => set("serviceFee", Number(e.target.value))} /></Field>
              </div>
            </>
          ) : <div style={{ color: "#8b7f6c" }}>Memuat…</div>}
        </div>
      </div>
    </>
  );

  if (sub === "notifikasi") return (
    <>
      <SubHeader title="Notifikasi" desc="Pemberitahuan di panel notifikasi dasbor pemilik" onBack={onBack} action={saveBtn} />
      <div className="owner-body" style={{ flex: 1, overflowY: "auto", padding: "22px 28px 40px" }}>
        <div className="owner-card" style={{ padding: "22px 24px", maxWidth: 760 }}>
          {form ? (
            <>
              <ToggleRow k="notifyNewOrder" label="Pesanan Baru" desc="Tampilkan pesanan masuk di panel notifikasi" />
              <ToggleRow k="notifyOutOfStock" label="Stok Menipis" desc="Tampilkan peringatan bahan baku di bawah batas minimum" />
            </>
          ) : <div style={{ color: "#8b7f6c" }}>Memuat…</div>}
        </div>
      </div>
    </>
  );

  return null;
}

/* ─── Landing: grouped settings list ─── */
export function SettingsView(): JSX.Element {
  const [sub, setSub] = useState<SubView | null>(null);

  if (sub === "profil" || sub === "pembayaran" || sub === "notifikasi") {
    return <SettingsFormPages sub={sub} onBack={() => setSub(null)} />;
  }

  if (sub === "kategori") return (
    <>
      <SubHeader title="Kategori Menu" desc="Kelola kategori produk — tambah, ubah nama, atau hapus" onBack={() => setSub(null)} />
      <div className="owner-body" style={{ flex: 1, overflowY: "auto", padding: "22px 28px 40px" }}>
        <div className="owner-card" style={{ padding: "22px 24px", maxWidth: 760 }}><CategorySection /></div>
      </div>
    </>
  );

  if (sub === "addons") return (
    <>
      <Crumb onBack={() => setSub(null)} />
      <ModifierAdminView />
    </>
  );

  if (sub === "diskon") return <DiscountView onBack={() => setSub(null)} />;

  if (sub === "qr") return (
    <>
      <Crumb onBack={() => setSub(null)} />
      <TablesView />
    </>
  );

  // Landing
  return (
    <>
      <header className="owner-hdr" style={{
        padding: "20px 28px", borderBottom: "1px solid var(--line)",
        background: "var(--paper-2)", flex: "0 0 auto",
      }}>
        <div className="brand" style={{ fontSize: 23, fontWeight: 700 }}>Pengaturan</div>
        <div style={{ fontSize: 13, color: "#8b7f6c", marginTop: 2 }}>Kelola toko, menu, dan perangkat</div>
      </header>
      <div className="owner-body" style={{ flex: 1, overflowY: "auto", padding: "22px 28px 40px" }}>
        <div style={{ maxWidth: 620, display: "flex", flexDirection: "column", gap: 22 }}>
          {SECTIONS.map((section) => (
            <div key={section.label}>
              <div style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: ".07em", color: "#9a8d77", margin: "0 4px 8px" }}>
                {section.label.toUpperCase()}
              </div>
              <div className="owner-card" style={{ overflow: "hidden", padding: 0 }}>
                {section.cards.map((c, i) => (
                  <SettingsRow key={c.id} card={c} first={i === 0} onClick={() => setSub(c.id)} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
