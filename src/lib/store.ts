// Server-side data access — the source of truth for menu, orders, members and
// settings. The server analog of design-reference/warbul.js. Route handlers
// (Phase 1) build HTTP/validation/auth on top of these functions.
import "server-only";
import { and, desc, eq, ne } from "drizzle-orm";
import { db } from "@/db";
import { products, orders, orderItems, members, settings, modifierGroups, modifierOptions, ingredients, recipes } from "@/db/schema";
import { computeTotals } from "./pricing";
import { applyPromo } from "./promos";
import { unitPrice, modSummary, modGroupsFor, DEFAULT_MODIFIER_GROUPS } from "./modifiers";
import { ORDER_STATUS } from "./constants";
import { emitChange } from "./events";
import { DEFAULT_SETTINGS } from "./store-defaults";
import { UNLIMITED_STOCK } from "./types";
import type {
  Order, OrderItem, OrderMethod, OrderStatus, Product, Member,
  Selection, StoreSettings, ModGroupFull, ModType, ModOption, Category,
  Ingredient, RecipeItem, RecipeRow,
} from "./types";

export type RecipeOwner = "product" | "option";

/* ─────────────────────────── modifiers (add-ons) ─────────────────────────── */

export async function getModifierGroups(): Promise<ModGroupFull[]> {
  const groups = await db.select().from(modifierGroups).orderBy(modifierGroups.sort);
  if (!groups.length) return DEFAULT_MODIFIER_GROUPS;
  const opts = await db.select().from(modifierOptions).orderBy(modifierOptions.sort);
  return groups.map((g) => ({
    id: g.id,
    name: g.name,
    type: g.type as ModType,
    categories: (g.categories as Category[]) ?? [],
    options: opts
      .filter((o) => o.groupId === g.id)
      .map((o): ModOption => ({ id: o.id, label: o.label, price: o.price, def: o.isDefault || undefined })),
  }));
}

function modId(prefix: string) {
  return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
}

export async function createModifierGroup(input: {
  name: string; type: ModType; categories: Category[];
}): Promise<string> {
  const id = modId("g");
  const count = (await db.select().from(modifierGroups)).length;
  await db.insert(modifierGroups).values({ id, name: input.name, type: input.type, categories: input.categories, sort: count });
  emitChange("modifiers");
  return id;
}

export async function updateModifierGroup(
  id: string,
  patch: Partial<{ name: string; type: ModType; categories: Category[]; sort: number }>,
): Promise<void> {
  if (Object.keys(patch).length) await db.update(modifierGroups).set(patch).where(eq(modifierGroups.id, id));
  emitChange("modifiers");
}

export async function deleteModifierGroup(id: string): Promise<void> {
  await db.delete(modifierOptions).where(eq(modifierOptions.groupId, id));
  await db.delete(modifierGroups).where(eq(modifierGroups.id, id));
  emitChange("modifiers");
}

export async function createModifierOption(input: {
  groupId: string; label: string; price: number; isDefault?: boolean;
}): Promise<string> {
  const id = modId("o");
  const count = (await db.select().from(modifierOptions).where(eq(modifierOptions.groupId, input.groupId))).length;
  await db.insert(modifierOptions).values({
    id, groupId: input.groupId, label: input.label, price: input.price, isDefault: input.isDefault ?? false, sort: count,
  });
  emitChange("modifiers");
  return id;
}

export async function updateModifierOption(
  id: string,
  patch: Partial<{ label: string; price: number; isDefault: boolean; sort: number }>,
): Promise<void> {
  if (Object.keys(patch).length) await db.update(modifierOptions).set(patch).where(eq(modifierOptions.id, id));
  emitChange("modifiers");
}

export async function deleteModifierOption(id: string): Promise<void> {
  await db.delete(modifierOptions).where(eq(modifierOptions.id, id));
  emitChange("modifiers");
}

/* ─────────────────────────── ingredients (raw materials) ─────────────────────────── */

export async function getIngredients(): Promise<Ingredient[]> {
  const rows = await db.select().from(ingredients).orderBy(ingredients.sort);
  return rows.map((r) => ({ id: r.id, name: r.name, unit: r.unit, stock: r.stock, lowThreshold: r.lowThreshold }));
}

export async function createIngredient(input: { name: string; unit: string; stock: number; lowThreshold?: number }): Promise<string> {
  const id = modId("i");
  const count = (await db.select().from(ingredients)).length;
  await db.insert(ingredients).values({
    id, name: input.name, unit: input.unit, stock: Math.max(0, Math.floor(input.stock || 0)),
    lowThreshold: Math.max(0, Math.floor(input.lowThreshold || 0)), sort: count,
  });
  emitChange("menu");
  return id;
}

export async function updateIngredient(
  id: string,
  patch: Partial<{ name: string; unit: string; stock: number; lowThreshold: number }>,
): Promise<void> {
  const data: Record<string, unknown> = {};
  if (typeof patch.name === "string") data.name = patch.name;
  if (typeof patch.unit === "string") data.unit = patch.unit;
  if (typeof patch.stock === "number") data.stock = Math.max(0, Math.floor(patch.stock));
  if (typeof patch.lowThreshold === "number") data.lowThreshold = Math.max(0, Math.floor(patch.lowThreshold));
  if (Object.keys(data).length) await db.update(ingredients).set(data).where(eq(ingredients.id, id));
  emitChange("menu"); // derived product availability may change
}

export async function deleteIngredient(id: string): Promise<void> {
  await db.delete(recipes).where(eq(recipes.ingredientId, id));
  await db.delete(ingredients).where(eq(ingredients.id, id));
  emitChange("menu");
}

/* ─────────────────────────── recipes (bill of materials) ─────────────────────────── */

export async function getRecipe(ownerType: RecipeOwner, ownerId: string): Promise<RecipeRow[]> {
  const ings = await getIngredients();
  const map = new Map(ings.map((i) => [i.id, i]));
  const rows = await db.select().from(recipes).where(and(eq(recipes.ownerType, ownerType), eq(recipes.ownerId, ownerId)));
  return rows.map((r) => ({
    ingredientId: r.ingredientId, qty: r.qty,
    ingredientName: map.get(r.ingredientId)?.name ?? "?", unit: map.get(r.ingredientId)?.unit ?? "",
  }));
}

export async function setRecipe(ownerType: RecipeOwner, ownerId: string, items: RecipeItem[]): Promise<void> {
  await db.delete(recipes).where(and(eq(recipes.ownerType, ownerType), eq(recipes.ownerId, ownerId)));
  for (const it of items.filter((i) => i.qty > 0 && i.ingredientId)) {
    await db.insert(recipes).values({
      id: modId("r"), ownerType, ownerId, ingredientId: it.ingredientId, qty: Math.max(0, Math.floor(it.qty)),
    });
  }
  emitChange("menu");
}

/* ─────────────────────────── menu (availability derived from ingredients) ─────────────────────────── */

async function deriveMenu(rows: (typeof products.$inferSelect)[]): Promise<Product[]> {
  const ings = await getIngredients();
  const stockMap = new Map(ings.map((i) => [i.id, i.stock]));
  const prodRecipes = await db.select().from(recipes).where(eq(recipes.ownerType, "product"));
  const byProduct = new Map<string, { ingredientId: string; qty: number }[]>();
  for (const r of prodRecipes) {
    const arr = byProduct.get(r.ownerId) ?? [];
    arr.push({ ingredientId: r.ingredientId, qty: r.qty });
    byProduct.set(r.ownerId, arr);
  }
  return rows.map((r) => {
    const recipe = byProduct.get(r.id) ?? [];
    let makeable = UNLIMITED_STOCK;
    if (recipe.length) {
      makeable = Math.min(
        ...recipe.map((ri) => {
          const s = stockMap.get(ri.ingredientId) ?? 0;
          return ri.qty > 0 ? Math.floor(s / ri.qty) : UNLIMITED_STOCK;
        }),
      );
      if (!Number.isFinite(makeable)) makeable = 0;
    }
    const manual = r.available;
    return {
      id: r.id, name: r.name, price: r.price, cat: r.cat as Product["cat"], g: r.g as Product["g"],
      grad: r.grad, tag: r.tag, desc: r.desc,
      manualAvailable: manual,
      available: manual && makeable > 0,
      stock: makeable,
      hasRecipe: recipe.length > 0,
    };
  });
}

export async function getMenu(): Promise<Product[]> {
  const rows = await db.select().from(products).orderBy(products.sort);
  return deriveMenu(rows);
}

export async function getProduct(id: string): Promise<Product | null> {
  const [r] = await db.select().from(products).where(eq(products.id, id));
  return r ? (await deriveMenu([r]))[0] : null;
}

export function isOrderable(p: Pick<Product, "available" | "stock">): boolean {
  return p.available !== false && (p.stock === undefined || p.stock > 0);
}

export async function updateProduct(id: string, patch: Partial<Product>) {
  const data: Record<string, unknown> = {};
  // Only real columns; "available" maps to the manual toggle. (stock is derived)
  if (typeof patch.name === "string") data.name = patch.name;
  if (typeof patch.price === "number") data.price = patch.price;
  if (typeof patch.cat === "string") data.cat = patch.cat;
  if (typeof patch.g === "string") data.g = patch.g;
  if (Array.isArray(patch.grad)) data.grad = patch.grad;
  if ("tag" in patch) data.tag = patch.tag ?? null;
  if (typeof patch.desc === "string") data.desc = patch.desc;
  if (typeof patch.available === "boolean") data.available = patch.available;
  if (typeof patch.manualAvailable === "boolean") data.available = patch.manualAvailable;
  if (Object.keys(data).length) await db.update(products).set(data).where(eq(products.id, id));
  emitChange("menu");
  return getProduct(id);
}

export async function createProduct(p: Omit<Product, "id"> & { id?: string }) {
  const id = p.id || genProductId(p.cat);
  const rows = await db.select().from(products);
  const sort = rows.length;
  await db.insert(products).values({
    id, name: p.name, price: p.price, cat: p.cat, g: p.g, grad: p.grad,
    tag: p.tag ?? null, available: p.manualAvailable ?? p.available ?? true, desc: p.desc ?? "", sort,
  });
  emitChange("menu");
  return getProduct(id);
}

export async function deleteProduct(id: string) {
  await db.delete(recipes).where(and(eq(recipes.ownerType, "product"), eq(recipes.ownerId, id)));
  await db.delete(products).where(eq(products.id, id));
  emitChange("menu");
}

function genProductId(cat: string): string {
  const prefix = cat === "Kopi" ? "k" : cat === "Non-Kopi" ? "n" : cat === "Makanan" ? "m" : "s";
  return prefix + Date.now().toString(36);
}

/* ─────────────────────────── orders ─────────────────────────── */

function toOrder(o: typeof orders.$inferSelect, items: OrderItem[]): Order {
  return {
    id: o.id, table: o.table, method: o.method as OrderMethod, paid: o.paid,
    status: o.status as OrderStatus, payDetail: o.payDetail, note: o.note ?? undefined,
    items, subtotal: o.subtotal, service: o.service, discount: o.discount,
    total: o.total, promo: o.promo ?? null, phone: o.phone, createdAt: o.createdAt,
    pakasir: o.pakasir ?? null,
  };
}

async function itemsFor(orderId: string): Promise<OrderItem[]> {
  const rows = await db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
  return rows.map((r) => ({ id: r.productId, name: r.name, price: r.price, qty: r.qty, opts: r.opts }));
}

export type OrderFilter = "all" | "active" | "Menunggu Pembayaran" | "Diproses" | "Selesai";

export async function getOrders(filter: OrderFilter = "all"): Promise<Order[]> {
  let rows;
  if (filter === "active") {
    rows = await db.select().from(orders).where(and(ne(orders.status, ORDER_STATUS.DONE), ne(orders.status, ORDER_STATUS.CANCELLED))).orderBy(desc(orders.createdAt));
  } else if (filter === "all") {
    rows = await db.select().from(orders).orderBy(desc(orders.createdAt));
  } else {
    rows = await db.select().from(orders).where(eq(orders.status, filter)).orderBy(desc(orders.createdAt));
  }
  const out: Order[] = [];
  for (const o of rows) out.push(toOrder(o, await itemsFor(o.id)));
  return out;
}

export async function getOrder(id: string): Promise<Order | null> {
  const [o] = await db.select().from(orders).where(eq(orders.id, id));
  if (!o) return null;
  return toOrder(o, await itemsFor(id));
}

async function nextOrderId(): Promise<string> {
  const rows = await db.select({ id: orders.id }).from(orders);
  let max = 100;
  for (const r of rows) {
    const n = parseInt(String(r.id).replace(/^WB-/, ""), 10);
    if (!isNaN(n) && n > max) max = n;
  }
  return "WB-" + (max + 1);
}

export interface OrderLineInput {
  id: string;
  sel?: Selection;
  qty: number;
}

export interface CreateOrderInput {
  table: number;
  method: OrderMethod;
  lines: OrderLineInput[];
  promoCode?: string | null;
  phone?: string | null;
  // Cashier walk-in overrides (customer orders leave these defaulted):
  paid?: boolean;
  status?: OrderStatus;
  payDetail?: string | null;
  note?: string;
}

/** Resolves prices server-side, validates promo + stock, persists, decrements
 *  stock, records loyalty. Returns the saved order. Throws on validation error. */
export async function addOrder(input: CreateOrderInput): Promise<Order> {
  if (!input.lines?.length) throw new Error("Pesanan kosong");

  const groups = await getModifierGroups();

  // Recipes for ingredient deduction (base product + chosen modifier options).
  const prodRecipes = await db.select().from(recipes).where(eq(recipes.ownerType, "product"));
  const optRecipes = await db.select().from(recipes).where(eq(recipes.ownerType, "option"));
  const byOwner = (rows: typeof prodRecipes) => {
    const m = new Map<string, { ingredientId: string; qty: number }[]>();
    for (const r of rows) {
      const a = m.get(r.ownerId) ?? [];
      a.push({ ingredientId: r.ingredientId, qty: r.qty });
      m.set(r.ownerId, a);
    }
    return m;
  };
  const prodMap = byOwner(prodRecipes);
  const optMap = byOwner(optRecipes);
  const ingNeed = new Map<string, number>();
  const addNeed = (rows: { ingredientId: string; qty: number }[] | undefined, mult: number) => {
    if (!rows) return;
    for (const r of rows) ingNeed.set(r.ingredientId, (ingNeed.get(r.ingredientId) ?? 0) + r.qty * mult);
  };

  const resolved: OrderItem[] = [];
  for (const line of input.lines) {
    const p = await getProduct(line.id);
    if (!p) throw new Error(`Menu tidak ditemukan: ${line.id}`);
    if (!isOrderable(p)) throw new Error(`${p.name} sedang habis`);
    const qty = Math.max(1, Math.floor(line.qty || 1));
    // ingredient requirements: base product recipe + each chosen option's recipe
    addNeed(prodMap.get(p.id), qty);
    modGroupsFor(p, groups).forEach((g) => {
      const v = line.sel?.[g.id];
      const ids = typeof v === "string" ? [v] : Array.isArray(v) ? v : [];
      ids.forEach((oid) => addNeed(optMap.get(oid), qty));
    });
    resolved.push({
      id: p.id, name: p.name, price: unitPrice(p, line.sel, groups), qty,
      opts: modSummary(p, line.sel, groups),
    });
  }

  // Validate ingredient stock for the whole order up front.
  if (ingNeed.size) {
    const imap = new Map((await getIngredients()).map((i) => [i.id, i]));
    for (const [ingId, need] of ingNeed) {
      const ing = imap.get(ingId);
      if (ing && ing.stock < need) {
        throw new Error(`Bahan ${ing.name} tidak cukup (butuh ${need} ${ing.unit}, sisa ${ing.stock})`);
      }
    }
  }

  // Promo + totals computed from server-resolved prices (never trust client).
  let promoAmount = 0;
  let promo: Order["promo"] = null;
  if (input.promoCode) {
    const subtotalForPromo = resolved.reduce((s, i) => s + i.price * i.qty, 0);
    const r = applyPromo(input.promoCode, subtotalForPromo);
    if (r.ok) { promoAmount = r.amount; promo = { code: r.code!, amount: r.amount }; }
  }
  const settings = await getSettings();
  const totals = computeTotals(resolved, promoAmount, settings.serviceFee);

  const id = await nextOrderId();
  const createdAt = Date.now();
  const status = input.status ?? ORDER_STATUS.WAIT_PAY;
  const paid = input.paid ?? false;
  const note =
    input.note ??
    (input.method === "qris" ? "Menunggu verifikasi kasir" : "Menunggu pembayaran di kasir");

  await db.insert(orders).values({
    id, table: input.table ?? 0, method: input.method, paid, status,
    payDetail: input.payDetail ?? null, note,
    subtotal: totals.subtotal, service: totals.service, discount: totals.discount,
    total: totals.total, promo, phone: input.phone ?? null, createdAt,
  });
  for (const it of resolved) {
    await db.insert(orderItems).values({
      id: `${id}-${it.id}-${Math.random().toString(36).slice(2, 7)}`,
      orderId: id, productId: it.id, name: it.name, price: it.price, qty: it.qty, opts: it.opts,
    });
  }

  // Deduct ingredients (this is what makes products go "Habis").
  if (ingNeed.size) {
    for (const [ingId, need] of ingNeed) {
      const [ing] = await db.select().from(ingredients).where(eq(ingredients.id, ingId));
      if (ing) await db.update(ingredients).set({ stock: Math.max(0, ing.stock - need) }).where(eq(ingredients.id, ingId));
    }
    emitChange("menu");
  }
  if (input.phone) await recordLoyalty(input.phone, totals.total);

  emitChange("orders");
  return (await getOrder(id))!;
}

export async function updateOrder(id: string, patch: Partial<Order>): Promise<Order | null> {
  const data: Record<string, unknown> = {};
  for (const k of ["table", "method", "paid", "status", "payDetail", "note", "promo", "phone", "pakasir"] as const) {
    if (k in patch) data[k] = (patch as Record<string, unknown>)[k];
  }
  if (Object.keys(data).length) await db.update(orders).set(data).where(eq(orders.id, id));
  emitChange("orders");
  return getOrder(id);
}

/* ─────────────────────────── loyalty ─────────────────────────── */

export async function getMember(phone: string): Promise<Member | null> {
  const [m] = await db.select().from(members).where(eq(members.phone, phone));
  return m ?? null;
}

export async function recordLoyalty(phone: string, total: number): Promise<Member> {
  const existing = await getMember(phone);
  const points = (existing?.points ?? 0) + Math.floor(total / 1000);
  const stamps = ((existing?.stamps ?? 0) + 1) % 10; // 10-stamp card
  const freeEarned = (existing?.freeEarned ?? 0) + (stamps === 0 ? 1 : 0);
  const visits = (existing?.visits ?? 0) + 1;
  const m: Member = { phone, points, stamps, visits, freeEarned };
  if (existing) await db.update(members).set(m).where(eq(members.phone, phone));
  else await db.insert(members).values(m);
  emitChange("members");
  return m;
}

/* ─────────────────────────── settings ─────────────────────────── */

export { DEFAULT_SETTINGS };

export async function getSettings(): Promise<StoreSettings> {
  const [row] = await db.select().from(settings).where(eq(settings.id, "store"));
  return { ...DEFAULT_SETTINGS, ...((row?.data as Partial<StoreSettings>) ?? {}) };
}

export async function saveSettings(patch: Partial<StoreSettings>): Promise<StoreSettings> {
  const current = await getSettings();
  const next = { ...current, ...patch };
  const [row] = await db.select().from(settings).where(eq(settings.id, "store"));
  if (row) await db.update(settings).set({ data: next }).where(eq(settings.id, "store"));
  else await db.insert(settings).values({ id: "store", data: next });
  emitChange("settings");
  return next;
}

// re-export for route handlers
export { and, eq };
