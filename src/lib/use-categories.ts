import { useEffect, useState } from "react";
import { getCategories } from "./api";

export function useCategories(): string[] {
  const [cats, setCats] = useState<string[]>([]);
  useEffect(() => {
    getCategories().then((data) => setCats(data.map((c) => c.name))).catch(() => {});
  }, []);
  return cats;
}

/** Bucket name for products whose category is blank. */
export const UNCATEGORIZED = "Lainnya";

/**
 * Effective category list for grouping menus and rendering tabs: the configured
 * categories first (in their saved order), then any category that appears on a
 * product but isn't configured. Products with a blank category fall under
 * "Lainnya". This guarantees products are never silently hidden when their `cat`
 * isn't in the configured list (e.g. after a rename, import, or seed mismatch) —
 * the header could still count them while the grouped body dropped them.
 */
export function mergeProductCategories(configured: string[], products: { cat: string }[]): string[] {
  const out = [...configured];
  const known = new Set(configured);
  let hasBlank = false;
  for (const p of products) {
    const c = (p.cat ?? "").trim();
    if (!c) { hasBlank = true; continue; }
    if (!known.has(c)) { known.add(c); out.push(c); }
  }
  if (hasBlank && !known.has(UNCATEGORIZED)) out.push(UNCATEGORIZED);
  return out;
}

/** Whether a product belongs in the given effective category bucket. */
export function productInCategory(p: { cat: string }, cat: string): boolean {
  const c = (p.cat ?? "").trim();
  if (cat === UNCATEGORIZED) return c === "" || c === UNCATEGORIZED;
  return c === cat;
}
