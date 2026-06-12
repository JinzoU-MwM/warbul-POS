"use client";
import { useEffect, useState, type JSX } from "react";
import { getPromotions, createPromotion, updatePromotion, deletePromotion } from "@/lib/api";
import { useCategories } from "@/lib/use-categories";
import { Switch, Icons } from "@/components";
import { rupiah } from "@/lib/constants";
import type { Promotion, PromotionTrigger } from "@/lib/types";

type Tab = "voucher" | "auto";

const labelStyle: React.CSSProperties = { fontSize: 12.5, fontWeight: 700, color: "#6f6353" };

function triggerDesc(p: Promotion): string {
  const t = p.trigger;
  if (!t) return "";
  if (t.type === "time") return `Jam ${t.from}–${t.to}`;
  if (t.type === "minSpend") return `Min. belanja ${rupiah(t.amount ?? 0)}`;
  if (t.type === "qty") return `≥ ${t.count} item`;
  return "";
}

function valueDesc(p: Promotion): string {
  if (p.valueType === "flat") return rupiah(p.value);
  let s = `${p.value}%`;
  if (p.maxValue) s += ` (maks ${rupiah(p.maxValue)})`;
  return s;
}

function scopeLabel(scope: string): string {
  return scope === "all" ? "Semua" : scope;
}

interface ModalState {
  open: boolean;
  tab: Tab;
  editing: Promotion | null;
}

const EMPTY_VOUCHER: Omit<Promotion, "id" | "usedCount"> = {
  kind: "voucher", name: "", valueType: "flat", value: 0,
  maxValue: null, minSpend: 0, scope: "all", stackable: false,
  enabled: true, code: "", maxUses: null, expiresAt: null, trigger: null,
};
const EMPTY_AUTO: Omit<Promotion, "id" | "usedCount"> = {
  kind: "auto", name: "", valueType: "flat", value: 0,
  maxValue: null, minSpend: 0, scope: "all", stackable: false,
  enabled: true, code: null, maxUses: null, expiresAt: null,
  trigger: { type: "time", from: "14:00", to: "16:00" },
};

export function DiscountView({ onBack }: { onBack?: () => void }): JSX.Element {
  const [tab, setTab] = useState<Tab>("voucher");
  const [promos, setPromos] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<ModalState>({ open: false, tab: "voucher", editing: null });
  const availCats = useCategories();

  async function load() {
    try { setPromos(await getPromotions()); }
    catch {}
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  async function toggleEnabled(p: Promotion) {
    try {
      const updated = await updatePromotion(p.id, { enabled: !p.enabled });
      setPromos((prev) => prev.map((x) => x.id === updated.id ? updated : x));
    } catch {}
  }

  async function handleDelete(id: string) {
    try {
      await deletePromotion(id);
      setPromos((prev) => prev.filter((x) => x.id !== id));
    } catch {}
  }

  const shown = promos.filter((p) => p.kind === tab);

  return (
    <>
      <header className="owner-hdr" style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "20px 28px", borderBottom: "1px solid var(--line,#E6DBC4)",
        background: "var(--paper-2)", flex: "0 0 auto", gap: 14,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          {onBack && (
            <button onClick={onBack} style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", fontWeight: 700, fontSize: 13, color: "var(--green-700)", padding: 0 }}>
              <Icons.back size={16} /> Pengaturan
            </button>
          )}
          <div>
            <div className="brand" style={{ fontSize: 23, fontWeight: 700 }}>Diskon & Voucher</div>
            <div style={{ fontSize: 13, color: "#8b7f6c", marginTop: 2 }}>Kelola kode voucher dan diskon otomatis</div>
          </div>
        </div>
        <button
          onClick={() => setModal({ open: true, tab, editing: null })}
          className="owner-exportbtn"
        >
          + Tambah
        </button>
      </header>

      {/* Tabs */}
      <div style={{ display: "flex", borderBottom: "1px solid var(--line,#E6DBC4)", background: "var(--paper-2)", flex: "0 0 auto" }}>
        {(["voucher", "auto"] as Tab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: "11px 24px", fontWeight: tab === t ? 700 : 600,
            fontSize: 13.5, border: "none", background: "none", cursor: "pointer",
            fontFamily: "inherit", color: tab === t ? "var(--green-800)" : "#8b7f6c",
            borderBottom: tab === t ? "2.5px solid var(--green-700)" : "2.5px solid transparent",
            transition: ".15s",
          }}>
            {t === "voucher" ? "Kode Voucher" : "Diskon Otomatis"}
          </button>
        ))}
      </div>

      <div className="owner-body" style={{ flex: 1, overflowY: "auto", padding: "22px 28px 40px" }}>
        {loading ? (
          <div style={{ color: "#8b7f6c", padding: "24px 0" }}>Memuat…</div>
        ) : shown.length === 0 ? (
          <div style={{ color: "#8b7f6c", padding: "24px 0", fontSize: 14 }}>
            Belum ada {tab === "voucher" ? "kode voucher" : "diskon otomatis"}. Klik "+ Tambah" untuk membuat yang pertama.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 700 }}>
            {shown.map((p) => (
              <div key={p.id} className="owner-card" style={{ padding: "14px 18px", display: "flex", alignItems: "center", gap: 14 }}>
                {p.kind === "voucher" && (
                  <div style={{ background: "#fef3c7", borderRadius: 8, padding: "6px 11px", fontWeight: 800, fontSize: 13, color: "#92400e", letterSpacing: ".05em", flexShrink: 0 }}>
                    {p.code}
                  </div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{p.name}</div>
                  <div style={{ fontSize: 12, color: "#8b7f6c", marginTop: 3, display: "flex", flexWrap: "wrap", gap: "2px 10px" }}>
                    <span>Diskon {valueDesc(p)}</span>
                    <span>· {scopeLabel(p.scope)}</span>
                    {p.minSpend > 0 && <span>· Min. {rupiah(p.minSpend)}</span>}
                    {p.kind === "auto" && p.trigger && <span>· {triggerDesc(p)}</span>}
                    {p.kind === "voucher" && (
                      <>
                        {p.expiresAt && <span>· Exp: {new Date(p.expiresAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}</span>}
                        <span>· {p.usedCount}/{p.maxUses != null ? p.maxUses : "∞"} digunakan</span>
                      </>
                    )}
                    {p.stackable && <span>· bisa digabung</span>}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                  <button
                    onClick={() => setModal({ open: true, tab, editing: p })}
                    style={{ fontSize: 12.5, fontWeight: 600, color: "var(--green-700)", border: "none", background: "none", cursor: "pointer", fontFamily: "inherit" }}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(p.id)}
                    style={{ fontSize: 12.5, fontWeight: 600, color: "#ef4444", border: "none", background: "none", cursor: "pointer", fontFamily: "inherit" }}
                  >
                    Hapus
                  </button>
                  <Switch on={p.enabled} onClick={() => toggleEnabled(p)} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {modal.open && (
        <PromotionModal
          kind={modal.tab}
          editing={modal.editing}
          availCats={availCats}
          onClose={() => setModal({ open: false, tab, editing: null })}
          onSaved={(p) => {
            setPromos((prev) => {
              const idx = prev.findIndex((x) => x.id === p.id);
              if (idx >= 0) { const next = [...prev]; next[idx] = p; return next; }
              return [...prev, p];
            });
            setModal({ open: false, tab, editing: null });
          }}
        />
      )}
    </>
  );
}

interface ModalProps {
  kind: Tab;
  editing: Promotion | null;
  availCats: string[];
  onClose: () => void;
  onSaved: (p: Promotion) => void;
}

function ModalField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <div style={{ marginTop: 5 }}>{children}</div>
    </div>
  );
}

function PromotionModal({ kind, editing, availCats, onClose, onSaved }: ModalProps): JSX.Element {
  const base = editing ?? (kind === "voucher" ? EMPTY_VOUCHER : EMPTY_AUTO);
  const [name, setName] = useState(base.name);
  const [valueType, setValueType] = useState<"flat" | "pct">(base.valueType);
  const [value, setValue] = useState(String(base.value));
  const [maxValue, setMaxValue] = useState(base.maxValue != null ? String(base.maxValue) : "");
  const [minSpend, setMinSpend] = useState(String(base.minSpend));
  const [scope, setScope] = useState(base.scope);
  const [stackable, setStackable] = useState(base.stackable);
  const [enabled, setEnabled] = useState(base.enabled);
  const [code, setCode] = useState(base.code ?? "");
  const [maxUses, setMaxUses] = useState(base.maxUses != null ? String(base.maxUses) : "");
  const [expiresAt, setExpiresAt] = useState(
    base.expiresAt ? new Date(base.expiresAt).toISOString().split("T")[0] : ""
  );
  const [triggerType, setTriggerType] = useState<PromotionTrigger["type"]>(base.trigger?.type ?? "time");
  const [triggerFrom, setTriggerFrom] = useState(base.trigger?.from ?? "14:00");
  const [triggerTo, setTriggerTo] = useState(base.trigger?.to ?? "16:00");
  const [triggerAmount, setTriggerAmount] = useState(String(base.trigger?.amount ?? 0));
  const [triggerCount, setTriggerCount] = useState(String(base.trigger?.count ?? 1));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fld: React.CSSProperties = {
    width: "100%", border: "1.5px solid var(--line,#E6DBC4)", borderRadius: 10,
    padding: "9px 12px", fontSize: 13.5, outline: "none", background: "#fff",
    fontFamily: "inherit", boxSizing: "border-box",
  };

  async function save() {
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      let trigger: PromotionTrigger | null = null;
      if (kind === "auto") {
        if (triggerType === "time") trigger = { type: "time", from: triggerFrom, to: triggerTo };
        else if (triggerType === "minSpend") trigger = { type: "minSpend", amount: Number(triggerAmount) };
        else trigger = { type: "qty", count: Number(triggerCount) };
      }
      const payload: Omit<Promotion, "id" | "usedCount"> = {
        kind, name: name.trim(), valueType, value: Number(value),
        maxValue: maxValue ? Number(maxValue) : null,
        minSpend: Number(minSpend) || 0,
        scope, stackable, enabled,
        code: kind === "voucher" ? code.trim().toUpperCase() : null,
        maxUses: maxUses ? Number(maxUses) : null,
        expiresAt: expiresAt ? new Date(expiresAt).getTime() : null,
        trigger,
      };
      const saved = editing
        ? await updatePromotion(editing.id, payload)
        : await createPromotion(payload);
      onSaved(saved);
    } catch (e) {
      setError((e as Error).message);
      setSaving(false);
    }
  }

  return (
    <div className="ma-modalbd" onClick={onClose}>
      <div className="ma-modalcard" onClick={(e) => e.stopPropagation()}
        style={{ width: 460, maxWidth: "95vw", maxHeight: "92vh", overflowY: "auto", padding: 26 }}>
        <div className="brand" style={{ fontSize: 20, fontWeight: 700, marginBottom: 18 }}>
          {editing ? "Edit" : "Tambah"} {kind === "voucher" ? "Kode Voucher" : "Diskon Otomatis"}
        </div>

        {error && <div style={{ color: "#dc2626", fontSize: 12.5, marginBottom: 12 }}>{error}</div>}

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <ModalField label="Nama">
            <input style={fld} value={name} onChange={(e) => setName(e.target.value)} placeholder={kind === "voucher" ? "cth. Promo Lebaran" : "cth. Happy Hour Sore"} autoFocus />
          </ModalField>

          {kind === "voucher" && (
            <ModalField label="Kode Voucher">
              <input style={fld} value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="cth. HEMAT20" />
            </ModalField>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <ModalField label="Tipe Diskon">
              <select style={fld} value={valueType} onChange={(e) => setValueType(e.target.value as "flat" | "pct")}>
                <option value="flat">Flat (Rp)</option>
                <option value="pct">Persentase (%)</option>
              </select>
            </ModalField>
            <ModalField label={valueType === "flat" ? "Nilai (Rp)" : "Nilai (%)"}>
              <input style={fld} type="number" min={0} value={value} onChange={(e) => setValue(e.target.value)} />
            </ModalField>
          </div>

          {valueType === "pct" && (
            <ModalField label="Maks. Diskon (Rp, kosong = tak terbatas)">
              <input style={fld} type="number" min={0} value={maxValue} onChange={(e) => setMaxValue(e.target.value)} placeholder="cth. 15000" />
            </ModalField>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <ModalField label="Min. Belanja (Rp)">
              <input style={fld} type="number" min={0} value={minSpend} onChange={(e) => setMinSpend(e.target.value)} placeholder="0" />
            </ModalField>
            <ModalField label="Berlaku Untuk">
              <select style={fld} value={scope} onChange={(e) => setScope(e.target.value)}>
                <option value="all">Semua Kategori</option>
                {availCats.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </ModalField>
          </div>

          {kind === "voucher" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <ModalField label="Maks. Penggunaan (kosong = ∞)">
                <input style={fld} type="number" min={1} value={maxUses} onChange={(e) => setMaxUses(e.target.value)} placeholder="cth. 100" />
              </ModalField>
              <ModalField label="Kadaluarsa (opsional)">
                <input style={fld} type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
              </ModalField>
            </div>
          )}

          {kind === "auto" && (
            <ModalField label="Trigger">
              <select style={{ ...fld, marginBottom: 8 }} value={triggerType} onChange={(e) => setTriggerType(e.target.value as PromotionTrigger["type"])}>
                <option value="time">Jam (Happy Hour)</option>
                <option value="minSpend">Min. Belanja</option>
                <option value="qty">Jumlah Item</option>
              </select>
              {triggerType === "time" && (
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <input style={{ ...fld, flex: 1 }} type="time" value={triggerFrom} onChange={(e) => setTriggerFrom(e.target.value)} />
                  <span style={{ color: "#8b7f6c" }}>–</span>
                  <input style={{ ...fld, flex: 1 }} type="time" value={triggerTo} onChange={(e) => setTriggerTo(e.target.value)} />
                </div>
              )}
              {triggerType === "minSpend" && (
                <input style={fld} type="number" min={0} value={triggerAmount} onChange={(e) => setTriggerAmount(e.target.value)} placeholder="cth. 50000" />
              )}
              {triggerType === "qty" && (
                <input style={fld} type="number" min={1} value={triggerCount} onChange={(e) => setTriggerCount(e.target.value)} placeholder="cth. 3" />
              )}
            </ModalField>
          )}

          <div style={{ display: "flex", gap: 18, paddingTop: 4 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Switch on={stackable} onClick={() => setStackable((v) => !v)} />
              <span style={{ fontSize: 13.5, fontWeight: 600 }}>Bisa digabung</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Switch on={enabled} onClick={() => setEnabled((v) => !v)} />
              <span style={{ fontSize: 13.5, fontWeight: 600 }}>Aktif</span>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 11, marginTop: 22 }}>
          <button type="button" onClick={onClose} className="btn"
            style={{ flex: 1, padding: 13, borderRadius: 13, background: "#fff", color: "var(--ink)", border: "1.5px solid var(--line)" }}>
            Batal
          </button>
          <button type="button" onClick={save} disabled={saving} className="btn btn-green"
            style={{ flex: 1.6, padding: 13, borderRadius: 13, opacity: saving ? 0.6 : 1 }}>
            Simpan
          </button>
        </div>
      </div>
    </div>
  );
}
