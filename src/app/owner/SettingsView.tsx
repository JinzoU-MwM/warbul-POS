"use client";
import { useEffect, useState, type JSX, type ReactNode } from "react";
import { getSettings, patchSettings } from "@/lib/api";
import { Switch } from "@/components";
import type { StoreSettings } from "@/lib/types";

function Field({ label, children }: { label: string; children: ReactNode }): JSX.Element {
  return (
    <div>
      <label style={{ fontSize: 12.5, fontWeight: 700, color: "#6f6353" }}>{label}</label>
      <div style={{ marginTop: 6 }}>{children}</div>
    </div>
  );
}

function Section({ title, desc, children }: { title: string; desc?: string; children: ReactNode }): JSX.Element {
  return (
    <div className="owner-card" style={{ padding: "22px 24px", marginBottom: 18 }}>
      <div style={{ fontWeight: 700, fontSize: 16 }}>{title}</div>
      {desc && <div style={{ fontSize: 12.5, color: "#8b7f6c", marginTop: 2, marginBottom: 18 }}>{desc}</div>}
      {children}
    </div>
  );
}

export function SettingsView() {
  const [form, setForm] = useState<StoreSettings | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getSettings().then(setForm).catch(() => {});
  }, []);

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
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "20px 28px",
          borderBottom: "1px solid var(--line,#E6DBC4)",
          background: "var(--paper-2)",
        }}
      >
        <div>
          <div className="brand" style={{ fontSize: 23, fontWeight: 700 }}>Pengaturan</div>
          <div style={{ fontSize: 13, color: "#8b7f6c", marginTop: 2 }}>Kelola profil toko, pembayaran & notifikasi</div>
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

      <div style={{ flex: 1, overflowY: "auto", padding: "22px 28px 40px" }}>
        {form && (
          <div style={{ maxWidth: 760 }}>
            <Section title="Profil Toko" desc="Informasi cabang yang tampil di struk & menu">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
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

            <Section title="Pembayaran" desc="Metode yang bisa dipilih pelanggan & biaya tambahan">
              <ToggleRow k="payQris" label="QRIS" desc="Pembayaran mandiri via scan QRIS pemilik" />
              <ToggleRow k="payKasir" label="Bayar di Kasir" desc="Bayar tunai atau kartu langsung di kasir" />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 18 }}>
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

            <Section title="Notifikasi" desc="Pemberitahuan yang dikirim ke dasbor pemilik">
              <ToggleRow k="notifyNewOrder" label="Pesanan Baru" desc="Notifikasi setiap ada pesanan masuk" />
              <ToggleRow k="notifyOutOfStock" label="Stok Habis" desc="Ingatkan saat menu ditandai habis" />
              <ToggleRow k="notifyDailyReport" label="Laporan Harian" desc="Kirim ringkasan penjualan tiap tutup toko" />
            </Section>
          </div>
        )}
      </div>
    </>
  );
}
