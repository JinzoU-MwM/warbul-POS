"use client";
// Promo code entry. Validates against the API; reports the applied promo up.
import { useState } from "react";
import type { JSX } from "react";
import { validatePromo } from "@/lib/api";

export interface PromoValue {
  code: string;
  amount: number;
  message: string;
}

export interface PromoBoxProps {
  subtotal: number;
  value: PromoValue | null;
  onChange: (value: PromoValue | null) => void;
}

export function PromoBox({ subtotal, value, onChange }: PromoBoxProps): JSX.Element {
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const apply = async () => {
    setBusy(true);
    try {
      const r = await validatePromo(code, subtotal);
      if (r.ok) {
        onChange({ code: r.code ?? code.trim().toUpperCase(), amount: r.amount, message: r.message });
        setMsg(null);
        setCode("");
      } else {
        setMsg(r.message);
      }
    } catch {
      setMsg("Gagal memvalidasi kode promo");
    } finally {
      setBusy(false);
    }
  };

  if (value) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 11,
          background: "var(--green-ok-bg)",
          border: "1px dashed var(--green-ok)",
          borderRadius: 13,
          padding: "12px 14px",
        }}
      >
        <span
          style={{
            width: 30,
            height: 30,
            borderRadius: 8,
            background: "var(--green-ok)",
            color: "#fff",
            display: "grid",
            placeItems: "center",
            fontWeight: 800,
            fontSize: 13,
            flex: "0 0 auto",
          }}
        >
          %
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 13.5, color: "var(--green-ok)" }}>{value.code} dipakai</div>
          <div style={{ fontSize: 11.5, color: "#6f8a72" }}>{value.message}</div>
        </div>
        <button
          type="button"
          onClick={() => onChange(null)}
          style={{ background: "none", border: "none", color: "var(--red)", fontWeight: 700, fontSize: 12.5, cursor: "pointer" }}
        >
          Hapus
        </button>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: "flex", gap: 9 }}>
        <input
          value={code}
          onChange={(e) => {
            setCode(e.target.value.toUpperCase());
            setMsg(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") apply();
          }}
          placeholder="Kode promo (cth. NGOPI5)"
          style={{
            flex: 1,
            minWidth: 0,
            border: "1.5px solid var(--line)",
            borderRadius: 12,
            padding: "12px 14px",
            fontSize: 13.5,
            outline: "none",
            fontFamily: "inherit",
            letterSpacing: ".03em",
            textTransform: "uppercase",
            background: "#fff",
          }}
        />
        <button
          type="button"
          onClick={apply}
          disabled={busy}
          className="btn btn-green"
          style={{ borderRadius: 12, padding: "0 18px", fontSize: 13.5, opacity: busy ? 0.6 : 1 }}
        >
          Pakai
        </button>
      </div>
      {msg && <div style={{ color: "var(--red)", fontSize: 12, fontWeight: 600, marginTop: 6 }}>{msg}</div>}
      <div style={{ fontSize: 11.5, color: "#a99c86", marginTop: 7 }}>
        Coba: <b>NGOPI5</b> · <b>WARBUL10</b> · <b>HEMAT20</b>
      </div>
    </div>
  );
}
