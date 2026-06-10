// Single source of truth for order totals. Ported from design-reference/warbul.js.
// IMPORTANT: the server recomputes totals here on order creation — never trust
// client-sent subtotal/total. The client imports the same function for instant UI.
import type { Totals } from "./types";
import { SERVICE_FEE } from "./constants";

export function computeTotals(
  items: { price: number; qty: number }[],
  promoAmount = 0,
  serviceFee = SERVICE_FEE,
): Totals {
  const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
  const service = items.length ? serviceFee : 0;
  const discount = Math.min(promoAmount || 0, subtotal);
  const total = Math.max(0, subtotal - discount + service);
  return { subtotal, service, discount, total };
}
