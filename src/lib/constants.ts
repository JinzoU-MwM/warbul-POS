import type { Category } from "./types";

export { ORDER_STATUS } from "./types";

export const SERVICE_FEE = 2000;

export const CATS: Category[] = ["Kopi", "Non-Kopi", "Makanan", "Snack"];

/** Indonesian rupiah formatter — "Rp18.000". */
export function rupiah(n: number | null | undefined): string {
  return "Rp" + Number(n || 0).toLocaleString("id-ID");
}

/** Short rupiah for charts — "Rp2,5jt" / "Rp355rb" / "Rp900". */
export function rupiahShort(n: number): string {
  if (n >= 1e6) return "Rp" + (n / 1e6).toFixed(n % 1e6 ? 1 : 0).replace(".", ",") + "jt";
  if (n >= 1e3) return "Rp" + Math.round(n / 1e3) + "rb";
  return "Rp" + n;
}
