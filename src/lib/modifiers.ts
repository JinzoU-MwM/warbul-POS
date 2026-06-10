// Modifier / add-on groups + per-item pricing. Groups are now DB-backed and
// managed from the dashboard; the array below is the seed + fallback default.
// Every helper takes the groups list, so the same pure functions work on the
// server (DB groups) and client (fetched groups).
import type { Category, ModGroup, ModGroupFull, Product, Selection } from "./types";

export const DEFAULT_MODIFIER_GROUPS: ModGroupFull[] = [
  {
    id: "size", name: "Ukuran", type: "single", categories: ["Kopi", "Non-Kopi"],
    options: [
      { id: "r", label: "Regular", price: 0, def: true },
      { id: "l", label: "Large", price: 5000 },
    ],
  },
  {
    id: "sugar", name: "Tingkat Gula", type: "single", categories: ["Kopi", "Non-Kopi"],
    options: [
      { id: "normal", label: "Normal", price: 0, def: true },
      { id: "less", label: "Sedikit Gula", price: 0 },
      { id: "no", label: "Tanpa Gula", price: 0 },
    ],
  },
  {
    id: "ice", name: "Es", type: "single", categories: ["Kopi", "Non-Kopi"],
    options: [
      { id: "normal", label: "Normal", price: 0, def: true },
      { id: "less", label: "Sedikit Es", price: 0 },
      { id: "no", label: "Tanpa Es", price: 0 },
      { id: "hot", label: "Panas", price: 0 },
    ],
  },
  {
    id: "addon", name: "Tambahan", type: "multi", categories: ["Kopi", "Non-Kopi"],
    options: [
      { id: "shot", label: "Extra Espresso Shot", price: 6000 },
      { id: "oat", label: "Ganti Oat Milk", price: 7000 },
      { id: "boba", label: "Tambah Boba", price: 5000 },
    ],
  },
  {
    id: "spice", name: "Level Pedas", type: "single", categories: ["Makanan"],
    options: [
      { id: "0", label: "Tidak Pedas", price: 0, def: true },
      { id: "1", label: "Pedas Sedang", price: 0 },
      { id: "2", label: "Pedas", price: 0 },
      { id: "3", label: "Extra Pedas", price: 2000 },
    ],
  },
  {
    id: "extra", name: "Ekstra", type: "multi", categories: ["Makanan"],
    options: [
      { id: "egg", label: "Tambah Telur", price: 5000 },
      { id: "rice", label: "Tambah Nasi", price: 6000 },
    ],
  },
  {
    id: "sauce", name: "Saus", type: "single", categories: ["Snack"],
    options: [
      { id: "original", label: "Original", price: 0, def: true },
      { id: "bbq", label: "Saus BBQ", price: 0 },
      { id: "cheese", label: "Saus Keju", price: 3000 },
    ],
  },
];

/** Modifier groups that apply to an item's category, in order. */
export function modGroupsFor(
  item: Pick<Product, "cat">,
  groups: ModGroupFull[] = DEFAULT_MODIFIER_GROUPS,
): ModGroup[] {
  return groups.filter((g) => g.categories.includes(item.cat));
}

export function defaultSelection(
  item: Pick<Product, "cat">,
  groups: ModGroupFull[] = DEFAULT_MODIFIER_GROUPS,
): Selection {
  const sel: Selection = {};
  modGroupsFor(item, groups).forEach((g) => {
    if (g.type === "single") {
      const d = g.options.find((o) => o.def) || g.options[0];
      if (d) sel[g.id] = d.id;
    } else {
      sel[g.id] = [];
    }
  });
  return sel;
}

export function unitPrice(
  item: Pick<Product, "cat" | "price">,
  sel?: Selection,
  groups: ModGroupFull[] = DEFAULT_MODIFIER_GROUPS,
): number {
  let p = item.price;
  modGroupsFor(item, groups).forEach((g) => {
    const v = sel ? sel[g.id] : undefined;
    if (g.type === "single") {
      const o = g.options.find((x) => x.id === v);
      if (o) p += o.price;
    } else if (Array.isArray(v)) {
      v.forEach((id) => {
        const o = g.options.find((x) => x.id === id);
        if (o) p += o.price;
      });
    }
  });
  return p;
}

/** Human-readable labels for the non-default chosen options (for cart / receipt). */
export function modSummary(
  item: Pick<Product, "cat">,
  sel?: Selection,
  groups: ModGroupFull[] = DEFAULT_MODIFIER_GROUPS,
): string[] {
  const out: string[] = [];
  modGroupsFor(item, groups).forEach((g) => {
    const v = sel ? sel[g.id] : undefined;
    if (g.type === "single") {
      const o = g.options.find((x) => x.id === v);
      if (o && !o.def) out.push(o.label);
    } else if (Array.isArray(v)) {
      v.forEach((id) => {
        const o = g.options.find((x) => x.id === id);
        if (o) out.push("+ " + o.label);
      });
    }
  });
  return out;
}

export type { Category };
