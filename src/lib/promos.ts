// Legacy promo helpers — superseded by the DB-backed promotions system.
// Kept for reference only; no longer imported by any active code path.
import { rupiah } from "./constants";

interface Promo { code: string; type: "flat" | "pct"; value: number; min?: number; max?: number; desc: string; }
interface PromoResult { ok: boolean; amount: number; message: string; code?: string; promo?: Promo; }

export const PROMOS: Promo[] = [
  { code: "NGOPI5", type: "flat", value: 5000, min: 20000, desc: "Potongan Rp5.000" },
  { code: "WARBUL10", type: "pct", value: 10, max: 10000, min: 0, desc: "Diskon 10%" },
  { code: "HEMAT20", type: "pct", value: 20, max: 15000, min: 30000, desc: "Diskon 20% (maks Rp15.000)" },
];

export function applyPromo(code: string, subtotal: number): PromoResult {
  const p = PROMOS.find((x) => x.code === String(code || "").trim().toUpperCase());
  if (!p) return { ok: false, amount: 0, message: "Kode promo tidak ditemukan" };
  if (subtotal < (p.min || 0)) {
    return { ok: false, amount: 0, message: "Min. belanja " + rupiah(p.min) + " untuk kode ini" };
  }
  const amt =
    p.type === "flat"
      ? p.value
      : Math.min(Math.round((subtotal * p.value) / 100), p.max ?? Infinity);
  return { ok: true, amount: amt, code: p.code, message: p.desc, promo: p };
}
