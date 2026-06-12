"use client";
import { useEffect, useRef, useState, type JSX, type ReactNode } from "react";
import { getSettings, patchSettings } from "@/lib/api";
import { Switch } from "@/components";
import type { StoreSettings } from "@/lib/types";
import { CategorySection } from "./CategorySection";
import { ModifierAdminView } from "./ModifierAdminView";
import { TablesView } from "./TablesView";

const ANCHORS = [
  { id: "profil-toko", label: "Profil Toko" },
  { id: "pembayaran", label: "Pembayaran" },
  { id: "notifikasi", label: "Notifikasi" },
  { id: "kategori", label: "Kategori" },
  { id: "addons", label: "Add-on & Varian" },
  { id: "qr-meja", label: "QR Meja" },
];

function Field({ label, children }: { label: string; children: ReactNode }): JSX.Element {
  return (
    <div>
      <label style={{ fontSize: 12.5, fontWeight: 700, color: "#6f6353" }}>{label}</label>
      <div style={{ marginTop: 6 }}>{children}</div>
    </div>
  );
}

function Section({ id, title, desc, children }: { id?: string; title: string; desc?: string; children: ReactNode }): JSX.Element {
  return (
    <div id={id} className="owner-card" style={{ padding: "22px 24px", marginBottom: 18, scrollMarginTop: 12 }}>
      <div style={{ fontWeight: 700, fontSize: 16 }}>{title}</div>
      {desc && <div style={{ fontSize: 12.5, color: "#8b7f6c", marginTop: 2, marginBottom: 18 }}>{desc}</div>}
      {children}
    </div>
  );
}

export function SettingsView(): JSX.Element {
  const [form, setForm] = useState<StoreSettings | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeAnchor, setActiveAnchor] = useState("profil-toko");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getSettings().then(setForm).catch(() => {});
  }, []);

  // Track which section is in view
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActiveAnchor(entry.target.id);
        }
      },
      { root: container, threshold: 0.3 },
    );
    ANCHORS.forEach(({ id }) => {
      const el = container.querySelector(`#${id}`);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [form]);

  function scrollTo(id: string) {
    const el = scrollRef.current?.querySelector(`#${id}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }

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
    } catch {
      /* ignore */
    } finally {
      setSaving(false);
    }
  }

  function ToggleRow({ k, label, desc }: { k: keyof StoreSettings; label: string; desc: string }) {
    if (!form) return null;
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "13px 0",
          borderTop: "1px solid var(--line,#E6DBC4)",
        }}
      >
        <div>
          <div style={{ fontWeight: 600, fontSize: 14 }}>{label}</div>
          <div style={{ fontSize: 12, color: "#8b7f6c", marginTop: 2 }}>{desc}</div>
        </div>
        <Switch on={Boolean(form[k])} onClick={() => set(k, !form[k] as StoreSettings[typeof k])} />
      </div>
    );
  }

  return (
    <>
      <header
        className="owner-hdr"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "20px 28px",
          borderBottom: "1px solid var(--line,#E6DBC4)",
          background: "var(--paper-2)",
          flex: "0 0 auto",
        }}
      >
        <div>
          <div className="brand" style={{ fontSize: 23, fontWeight: 700 }}>Pengaturan</div>
          <div style={{ fontSize: 13, color: "#8b7f6c", marginTop: 2 }}>Profil toko, pembayaran, kategori & QR meja</div>
        </div>
        <button
          onClick={save}
          disabled={saving || !form}
          className="owner-exportbtn"
          style={{ opacity: saving ? 0.7 : 1 }}
        >
          {saved ? "✓ Tersimpan" : "Simpan Perubahan"}
        </button>
      </header>

      {/* Anchor pills */}
      <div
        className="owner-hdr"
        style={{
          display: "flex",
          gap: 6,
          padding: "10px 28px",
          borderBottom: "1px solid var(--line,#E6DBC4)",
          background: "var(--paper-2)",
          overflowX: "auto",
          flex: "0 0 auto",
        }}
      >
        {ANCHORS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => scrollTo(id)}
            style={{
              padding: "5px 13px",
              borderRadius: 999,
              fontSize: 12.5,
              fontWeight: activeAnchor === id ? 700 : 600,
              border: "1.5px solid " + (activeAnchor === id ? "var(--green-700)" : "var(--line,#E6DBC4)"),
              background: activeAnchor === id ? "var(--green-700)" : "#fff",
              color: activeAnchor === id ? "#fff" : "#6f6353",
              cursor: "pointer",
              whiteSpace: "nowrap",
              fontFamily: "inherit",
              transition: ".15s",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      <div ref={scrollRef} className="owner-body" style={{ flex: 1, overflowY: "auto", padding: "22px 28px 40px" }}>
        <div style={{ maxWidth: 760 }}>

          {/* Profil Toko */}
          {form ? (
            <>
              <Section id="profil-toko" title="Profil Toko" desc="Informasi cabang yang tampil di struk & menu">
                <div className="settings-form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <Field label="Nama Toko">
                    <input className="fld" value={form.storeName} onChange={(e) => set("storeName", e.target.value)} />
                  </Field>
                  <Field label="Cabang">
                    <input className="fld" value={form.branch} onChange={(e) => set("branch", e.target.value)} />
                  </Field>
                  <div style={{ gridColumn: "1 / -1" }}>
                    <Field label="Alamat">
                      <input className="fld" value={form.address} onChange={(e) => set("address", e.target.value)} />
                    </Field>
                  </div>
                  <Field label="Telepon">
                    <input className="fld" value={form.phone} onChange={(e) => set("phone", e.target.value)} />
                  </Field>
                  <Field label="Jam Operasional">
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <input className="fld" type="time" value={form.hoursOpen} onChange={(e) => set("hoursOpen", e.target.value)} />
                      <span style={{ color: "#8b7f6c" }}>–</span>
                      <input className="fld" type="time" value={form.hoursClose} onChange={(e) => set("hoursClose", e.target.value)} />
                    </div>
                  </Field>
                </div>
              </Section>

              <Section id="pembayaran" title="Pembayaran" desc="Metode yang bisa dipilih pelanggan & biaya tambahan">
                <ToggleRow k="payQris" label="QRIS" desc="Pembayaran mandiri via scan QRIS pemilik" />
                <ToggleRow k="payKasir" label="Bayar di Kasir" desc="Bayar tunai atau kartu langsung di kasir" />
                <div className="settings-form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 18 }}>
                  <Field label="Nama Merchant QRIS">
                    <input className="fld" value={form.qrisMerchant} onChange={(e) => set("qrisMerchant", e.target.value)} />
                  </Field>
                  <Field label="Biaya Layanan (Rp)">
                    <input
                      className="fld"
                      type="number"
                      value={form.serviceFee}
                      onChange={(e) => set("serviceFee", Number(e.target.value))}
                    />
                  </Field>
                </div>
              </Section>

              <Section id="notifikasi" title="Notifikasi" desc="Pemberitahuan yang muncul di panel notifikasi dasbor pemilik">
                <ToggleRow k="notifyNewOrder" label="Pesanan Baru" desc="Tampilkan pesanan masuk di panel notifikasi" />
                <ToggleRow k="notifyOutOfStock" label="Stok Menipis" desc="Tampilkan peringatan bahan baku di bawah batas minimum" />
              </Section>
            </>
          ) : (
            <div id="profil-toko" style={{ color: "#8b7f6c", padding: "24px 0" }}>Memuat pengaturan…</div>
          )}

          {/* Kategori */}
          <Section id="kategori" title="Kategori Menu" desc="Kelola kategori produk — tambah, ubah nama, atau hapus">
            <CategorySection />
          </Section>

          {/* Add-on & Varian — embedded */}
          <div id="addons" style={{ marginBottom: 18, scrollMarginTop: 12 }}>
            <ModifierAdminView />
          </div>

          {/* QR Meja — embedded */}
          <div id="qr-meja" style={{ scrollMarginTop: 12 }}>
            <TablesView />
          </div>

        </div>
      </div>
    </>
  );
}
