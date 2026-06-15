// Server-side data access — the source of truth for menu, orders, members and
// settings. The server analog of design-reference/warbul.js. Route handlers
// (Phase 1) build HTTP/validation/auth on top of these functions.
import "server-only";
import { and, desc, eq, ne, gte, inArray, sql, count, max } from "drizzle-orm";
import { db } from "@/db";
import { products, orders, orderItems, members, settings, modifierGroups, modifierOptions, ingredients, recipes, categories, promotions, redemptions } from "@/db/schema";
import { computeTotals } from "./pricing";
import { unitPrice, modSummary, modGroupsFor, DEFAULT_MODIFIER_GROUPS } from "./modifiers";
import { ORDER_STATUS } from "./constants";
import { emitChange } from "./events";
import { DEFAULT_SETTINGS } from "./store-defaults";
import { UNLIMITED_STOCK } from "./types";
import type {
  Order, OrderItem, OrderMethod, OrderStatus, Product, Member,
  Selection, StoreSettings, ModGroupFull, ModType, ModOption, Category,
  Ingredient, RecipeItem, RecipeRow, Promotion, PromotionTrigger, AppliedDiscount,
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
  const [{ n }] = await db.select({ n: count() }).from(modifierGroups);
  await db.insert(modifierGroups).values({ id, name: input.name, type: input.type, categories: input.categories, sort: n });
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
  const [{ n }] = await db.select({ n: count() }).from(modifierOptions).where(eq(modifierOptions.groupId, input.groupId));
  await db.insert(modifierOptions).values({
    id, groupId: input.groupId, label: input.label, price: input.price, isDefault: input.isDefault ?? false, sort: n,
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
  const [{ n }] = await db.select({ n: count() }).from(ingredients);
  await db.insert(ingredients).values({
    id, name: input.name, unit: input.unit, stock: Math.max(0, Math.floor(input.stock || 0)),
    lowThreshold: Math.max(0, Math.floor(input.lowThreshold || 0)), sort: n,
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

// Shared inputs for availability derivation. Loaded once per request (ingredient
// stock + product recipes) so deriveMenu() can stay a pure, scan-free function —
// callers that derive many products (getMenu, addOrder) pay the two reads once
// instead of per product.
interface MenuCtx {
  ingById: Map<string, Ingredient>;
  byProduct: Map<string, { ingredientId: string; qty: number }[]>;
}

async function loadMenuCtx(): Promise<MenuCtx> {
  const ings = await getIngredients();
  const prodRecipes = await db.select().from(recipes).where(eq(recipes.ownerType, "product"));
  const byProduct = new Map<string, { ingredientId: string; qty: number }[]>();
  for (const r of prodRecipes) {
    const arr = byProduct.get(r.ownerId) ?? [];
    arr.push({ ingredientId: r.ingredientId, qty: r.qty });
    byProduct.set(r.ownerId, arr);
  }
  return { ingById: new Map(ings.map((i) => [i.id, i])), byProduct };
}

function deriveMenu(rows: (typeof products.$inferSelect)[], ctx: MenuCtx): Product[] {
  return rows.map((r) => {
    const recipe = ctx.byProduct.get(r.id) ?? [];
    let makeable = UNLIMITED_STOCK;
    if (recipe.length) {
      makeable = Math.min(
        ...recipe.map((ri) => {
          const s = ctx.ingById.get(ri.ingredientId)?.stock ?? 0;
          return ri.qty > 0 ? Math.floor(s / ri.qty) : UNLIMITED_STOCK;
        }),
      );
      if (!Number.isFinite(makeable)) makeable = 0;
    }
    const manual = r.available;
    return {
      id: r.id, name: r.name, price: r.price, cat: r.cat as Product["cat"], g: r.g as Product["g"],
      grad: r.grad, tag: r.tag, desc: r.desc, image: r.image ?? null,
      manualAvailable: manual,
      available: manual && makeable > 0,
      stock: makeable,
      hasRecipe: recipe.length > 0,
    };
  });
}

export async function getMenu(): Promise<Product[]> {
  const rows = await db.select().from(products).orderBy(products.sort);
  return deriveMenu(rows, await loadMenuCtx());
}

export async function getProduct(id: string): Promise<Product | null> {
  const [r] = await db.select().from(products).where(eq(products.id, id));
  return r ? deriveMenu([r], await loadMenuCtx())[0] : null;
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
  if ("image" in patch) data.image = patch.image ?? null;
  if (typeof patch.available === "boolean") data.available = patch.available;
  if (typeof patch.manualAvailable === "boolean") data.available = patch.manualAvailable;
  if (Object.keys(data).length) await db.update(products).set(data).where(eq(products.id, id));
  emitChange("menu");
  return getProduct(id);
}

export async function createProduct(p: Omit<Product, "id"> & { id?: string }) {
  const id = p.id || genProductId(p.cat);
  const [{ n: sort }] = await db.select({ n: count() }).from(products);
  await db.insert(products).values({
    id, name: p.name, price: p.price, cat: p.cat, g: p.g, grad: p.grad,
    tag: p.tag ?? null, available: p.manualAvailable ?? p.available ?? true, desc: p.desc ?? "",
    image: p.image ?? null, sort,
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
  const prefix = cat.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 3) || "cat";
  return prefix + Date.now().toString(36);
}

/* ─────────────────────────── categories ─────────────────────────── */

export interface CategoryRow { id: string; name: string; position: number; }

const SEED_CATS: CategoryRow[] = [
  { id: "cat_01", name: "Kopi", position: 1 },
  { id: "cat_02", name: "Non-Kopi", position: 2 },
  { id: "cat_03", name: "Makanan", position: 3 },
  { id: "cat_04", name: "Snack", position: 4 },
];

export async function getCategories(): Promise<CategoryRow[]> {
  const rows = await db.select().from(categories).orderBy(categories.position);
  if (!rows.length) return SEED_CATS;
  return rows.map((r) => ({ id: r.id, name: r.name, position: r.position }));
}

export async function createCategory(name: string): Promise<CategoryRow> {
  const trimmed = name.trim();
  if (!trimmed || trimmed.length > 40) throw new Error("Nama kategori tidak valid (maks 40 karakter)");
  const [{ n }] = await db.select({ n: count() }).from(categories)
    .where(sql`lower(${categories.name}) = lower(${trimmed})`);
  if (n > 0) throw new Error("Kategori sudah ada");
  const [{ m }] = await db.select({ m: max(categories.position) }).from(categories);
  const maxPos = m ?? 0;
  const id = "cat_" + Date.now().toString(36);
  await db.insert(categories).values({ id, name: trimmed, position: maxPos + 1 });
  return { id, name: trimmed, position: maxPos + 1 };
}

export async function renameCategory(id: string, newName: string): Promise<void> {
  const trimmed = newName.trim();
  if (!trimmed || trimmed.length > 40) throw new Error("Nama kategori tidak valid (maks 40 karakter)");
  const [cat] = await db.select().from(categories).where(eq(categories.id, id));
  if (!cat) throw new Error("Kategori tidak ditemukan");
  const [{ n }] = await db.select({ n: count() }).from(categories)
    .where(and(sql`lower(${categories.name}) = lower(${trimmed})`, ne(categories.id, id)));
  if (n > 0) throw new Error("Nama kategori sudah digunakan");
  const oldName = cat.name;
  await db.update(products).set({ cat: trimmed }).where(eq(products.cat, oldName));
  await db.update(categories).set({ name: trimmed }).where(eq(categories.id, id));
  emitChange("menu");
}

export async function deleteCategory(id: string): Promise<void> {
  const [cat] = await db.select().from(categories).where(eq(categories.id, id));
  if (!cat) throw new Error("Kategori tidak ditemukan");
  const [{ n }] = await db.select({ n: count() }).from(products).where(eq(products.cat, cat.name));
  if (n > 0) throw new Error(`Ada ${n} produk dalam kategori ini. Pindahkan atau hapus produk terlebih dahulu.`);
  await db.delete(categories).where(eq(categories.id, id));
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

function toItem(r: typeof orderItems.$inferSelect): OrderItem {
  return { id: r.productId, name: r.name, price: r.price, qty: r.qty, opts: r.opts };
}

async function itemsFor(orderId: string): Promise<OrderItem[]> {
  const rows = await db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
  return rows.map(toItem);
}

// Items for many orders in a single query, grouped by orderId — avoids the N+1
// of calling itemsFor() per order when building a list.
async function itemsByOrder(orderIds: string[]): Promise<Map<string, OrderItem[]>> {
  const byOrder = new Map<string, OrderItem[]>();
  if (!orderIds.length) return byOrder;
  const rows = await db.select().from(orderItems).where(inArray(orderItems.orderId, orderIds));
  for (const r of rows) {
    const arr = byOrder.get(r.orderId) ?? [];
    arr.push(toItem(r));
    byOrder.set(r.orderId, arr);
  }
  return byOrder;
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
  return ordersWithItems(rows);
}

// Build full Orders (with items) for the given order rows, batching the item
// reads into one query. Shared by the windowed/recent getters below.
async function ordersWithItems(rows: (typeof orders.$inferSelect)[]): Promise<Order[]> {
  const items = await itemsByOrder(rows.map((o) => o.id));
  return rows.map((o) => toOrder(o, items.get(o.id) ?? []));
}

/** Orders created at/after `start` (epoch ms), newest first. Lets analytics
 *  load just the window it needs instead of the entire order history. */
export async function getOrdersSince(start: number): Promise<Order[]> {
  const rows = await db
    .select()
    .from(orders)
    .where(gte(orders.createdAt, start))
    .orderBy(desc(orders.createdAt));
  return ordersWithItems(rows);
}

/** The `limit` most recent orders, newest first (for "recent activity" lists). */
export async function getRecentOrders(limit: number): Promise<Order[]> {
  const rows = await db.select().from(orders).orderBy(desc(orders.createdAt)).limit(limit);
  return ordersWithItems(rows);
}

export async function getOrder(id: string): Promise<Order | null> {
  const [o] = await db.select().from(orders).where(eq(orders.id, id));
  if (!o) return null;
  return toOrder(o, await itemsFor(id));
}

// Either the root db or an open transaction — lets write helpers run inside a
// caller's transaction so an order's mutations commit (or roll back) together.
type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
type Executor = typeof db | Tx;

function isBusy(e: unknown): boolean {
  const code = (e as { code?: string })?.code ?? "";
  const msg = (e as { message?: string })?.message ?? "";
  return code === "SQLITE_BUSY" || /SQLITE_BUSY|database is locked/i.test(msg);
}

// Serialize write transactions in-process. The libSQL client multiplexes one
// connection, which cannot run two interactive transactions at once — concurrent
// checkouts would otherwise collide with SQLITE_BUSY. Chaining them guarantees
// one order write commits before the next begins, so id allocation and stock
// deduction are race-free on a single server.
let writeChain: Promise<unknown> = Promise.resolve();

async function txWithRetry<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < 6; attempt++) {
    try {
      return await db.transaction(fn);
    } catch (e) {
      // SQLITE_BUSY can still occur across separate instances (serverless) where
      // the in-process chain doesn't apply; back off and retry.
      if (!isBusy(e)) throw e;
      lastErr = e;
      await new Promise((r) => setTimeout(r, 15 * 2 ** attempt + Math.random() * 15));
    }
  }
  throw lastErr;
}

function runWrite<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
  const result = writeChain.then(() => txWithRetry(fn));
  // Keep the chain alive regardless of this write's outcome.
  writeChain = result.then(() => {}, () => {});
  return result;
}

// Next sequential receipt id ("WB-101", "WB-102", …). The max is computed in SQL
// (no full-table scan into JS); called inside addOrder's BEGIN IMMEDIATE
// transaction, the read+insert are serialized so concurrent checkouts can't
// allocate the same id.
async function nextOrderId(exec: Executor = db): Promise<string> {
  const [row] = await exec
    .select({ max: sql<number>`COALESCE(MAX(CAST(SUBSTR(${orders.id}, 4) AS INTEGER)), 100)` })
    .from(orders);
  return "WB-" + ((row?.max ?? 100) + 1);
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

  // Ingredient stock + base-product recipes, loaded once and reused below for
  // availability, stock validation and deduction (instead of re-scanning per line).
  const ctx = await loadMenuCtx();
  // Modifier-option recipes (a separate recipe ownerType) for add-on ingredients.
  const optRecipes = await db.select().from(recipes).where(eq(recipes.ownerType, "option"));
  const optMap = new Map<string, { ingredientId: string; qty: number }[]>();
  for (const r of optRecipes) {
    const a = optMap.get(r.ownerId) ?? [];
    a.push({ ingredientId: r.ingredientId, qty: r.qty });
    optMap.set(r.ownerId, a);
  }

  // Resolve every ordered product in a single query, derive availability once.
  const lineIds = [...new Set(input.lines.map((l) => l.id))];
  const prodRows = await db.select().from(products).where(inArray(products.id, lineIds));
  const productById = new Map(deriveMenu(prodRows, ctx).map((p) => [p.id, p]));

  const ingNeed = new Map<string, number>();
  const addNeed = (rows: { ingredientId: string; qty: number }[] | undefined, mult: number) => {
    if (!rows) return;
    for (const r of rows) ingNeed.set(r.ingredientId, (ingNeed.get(r.ingredientId) ?? 0) + r.qty * mult);
  };

  const resolved: OrderItem[] = [];
  for (const line of input.lines) {
    const p = productById.get(line.id);
    if (!p) throw new Error(`Menu tidak ditemukan: ${line.id}`);
    if (!isOrderable(p)) throw new Error(`${p.name} sedang habis`);
    const qty = Math.max(1, Math.floor(line.qty || 1));
    // ingredient requirements: base product recipe + each chosen option's recipe
    addNeed(ctx.byProduct.get(p.id), qty);
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
    for (const [ingId, need] of ingNeed) {
      const ing = ctx.ingById.get(ingId);
      if (ing && ing.stock < need) {
        throw new Error(`Bahan ${ing.name} tidak cukup (butuh ${need} ${ing.unit}, sisa ${ing.stock})`);
      }
    }
  }

  // Discounts + totals computed from server-resolved prices (never trust client).
  const subtotalForDiscount = resolved.reduce((s, i) => s + i.price * i.qty, 0);
  const categories_ = [...new Set(resolved.map((it) => productById.get(it.id)?.cat ?? "").filter(Boolean))];
  const totalQty = resolved.reduce((s, i) => s + i.qty, 0);
  const discountResult = await applyDiscounts({
    subtotal: subtotalForDiscount,
    qty: totalQty,
    categories: categories_,
    voucherCode: input.promoCode ?? undefined,
  });
  const promo: Order["promo"] = discountResult.applied.length ? discountResult.applied : null;
  const storeSettings = await getSettings();
  const totals = computeTotals(resolved, discountResult.totalDiscount, storeSettings.serviceFee);

  const createdAt = Date.now();
  const status = input.status ?? ORDER_STATUS.WAIT_PAY;
  const paid = input.paid ?? false;
  const note =
    input.note ??
    (input.method === "qris" ? "Menunggu verifikasi kasir" : "Menunggu pembayaran di kasir");

  // Persist atomically: id allocation, order, line items, ingredient deduction,
  // loyalty and redemptions all commit together or roll back together — a failure
  // mid-way can no longer leave a half-written order or double-spent stock.
  const id = await runWrite(async (tx) => {
    const newId = await nextOrderId(tx);
    await tx.insert(orders).values({
      id: newId, table: input.table ?? 0, method: input.method, paid, status,
      payDetail: input.payDetail ?? null, note,
      subtotal: totals.subtotal, service: totals.service, discount: totals.discount,
      total: totals.total, promo, phone: input.phone ?? null, createdAt,
    });
    if (resolved.length) {
      await tx.insert(orderItems).values(
        resolved.map((it) => ({
          id: `${newId}-${it.id}-${Math.random().toString(36).slice(2, 7)}`,
          orderId: newId, productId: it.id, name: it.name, price: it.price, qty: it.qty, opts: it.opts,
        })),
      );
    }
    // Deduct ingredients (this is what makes products go "Habis"). Uses the stock
    // snapshot already loaded in ctx, so no extra read per ingredient.
    for (const [ingId, need] of ingNeed) {
      const ing = ctx.ingById.get(ingId);
      if (ing) await tx.update(ingredients).set({ stock: Math.max(0, ing.stock - need) }).where(eq(ingredients.id, ingId));
    }
    if (input.phone) await recordLoyalty(input.phone, totals.total, tx);
    await recordRedemptions(discountResult.applied, newId, tx);
    return newId;
  });

  // Notify listeners only after the commit succeeded.
  if (ingNeed.size) emitChange("menu");
  if (input.phone) emitChange("members");
  emitChange("orders");
  return (await getOrder(id))!;
}

/** Return to inventory the ingredients an order reserved at creation. Only base
 *  product recipes are restored — extra ingredients from chosen options aren't
 *  tracked on saved line items (opts holds labels, not option ids). */
async function restoreStock(items: OrderItem[]): Promise<void> {
  const prodRecipes = await db.select().from(recipes).where(eq(recipes.ownerType, "product"));
  if (!prodRecipes.length) return;
  const byProduct = new Map<string, { ingredientId: string; qty: number }[]>();
  for (const r of prodRecipes) {
    const a = byProduct.get(r.ownerId) ?? [];
    a.push({ ingredientId: r.ingredientId, qty: r.qty });
    byProduct.set(r.ownerId, a);
  }
  const giveBack = new Map<string, number>();
  for (const it of items) {
    for (const r of byProduct.get(it.id) ?? []) {
      giveBack.set(r.ingredientId, (giveBack.get(r.ingredientId) ?? 0) + r.qty * it.qty);
    }
  }
  if (!giveBack.size) return;
  for (const [ingId, amt] of giveBack) {
    const [ing] = await db.select().from(ingredients).where(eq(ingredients.id, ingId));
    if (ing) await db.update(ingredients).set({ stock: ing.stock + amt }).where(eq(ingredients.id, ingId));
  }
  emitChange("menu");
}

export async function updateOrder(id: string, patch: Partial<Order>): Promise<Order | null> {
  // Detect a transition INTO cancelled so reserved stock is returned exactly once.
  let restockItems: OrderItem[] | null = null;
  if (patch.status === ORDER_STATUS.CANCELLED) {
    const before = await getOrder(id);
    if (before && before.status !== ORDER_STATUS.CANCELLED) restockItems = before.items;
  }

  const data: Record<string, unknown> = {};
  for (const k of ["table", "method", "paid", "status", "payDetail", "note", "promo", "phone", "pakasir"] as const) {
    if (k in patch) data[k] = (patch as Record<string, unknown>)[k];
  }
  if (Object.keys(data).length) await db.update(orders).set(data).where(eq(orders.id, id));

  if (restockItems) await restoreStock(restockItems);

  emitChange("orders");
  return getOrder(id);
}

/* ─────────────────────────── loyalty ─────────────────────────── */

export async function getMember(phone: string): Promise<Member | null> {
  const [m] = await db.select().from(members).where(eq(members.phone, phone));
  return m ?? null;
}

// Caller is responsible for emitChange("members") after the work commits — when
// run inside addOrder's transaction the notification must wait for the commit.
export async function recordLoyalty(phone: string, total: number, exec: Executor = db): Promise<Member> {
  const [existing] = await exec.select().from(members).where(eq(members.phone, phone));
  const points = (existing?.points ?? 0) + Math.floor(total / 1000);
  const stamps = ((existing?.stamps ?? 0) + 1) % 10; // 10-stamp card
  const freeEarned = (existing?.freeEarned ?? 0) + (stamps === 0 ? 1 : 0);
  const visits = (existing?.visits ?? 0) + 1;
  const m: Member = { phone, points, stamps, visits, freeEarned };
  if (existing) await exec.update(members).set(m).where(eq(members.phone, phone));
  else await exec.insert(members).values(m);
  if (exec === db) emitChange("members");
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

/* ─────────────────────────── promotions ─────────────────────────── */

function rowToPromotion(r: typeof promotions.$inferSelect): Promotion {
  return {
    id: r.id,
    kind: r.kind as Promotion["kind"],
    name: r.name,
    valueType: r.valueType as Promotion["valueType"],
    value: r.value,
    maxValue: r.maxValue ?? null,
    minSpend: r.minSpend,
    scope: r.scope,
    stackable: Boolean(r.stackable),
    enabled: Boolean(r.enabled),
    code: r.code ?? null,
    maxUses: r.maxUses ?? null,
    usedCount: r.usedCount,
    expiresAt: r.expiresAt ?? null,
    trigger: r.trigger ? (JSON.parse(r.trigger) as PromotionTrigger) : null,
  };
}

export async function getPromotions(): Promise<Promotion[]> {
  const rows = await db.select().from(promotions);
  return rows.map(rowToPromotion);
}

export async function createPromotion(input: Omit<Promotion, "id" | "usedCount">): Promise<Promotion> {
  const id = "promo_" + Date.now().toString(36);
  await db.insert(promotions).values({
    id,
    kind: input.kind,
    name: input.name,
    valueType: input.valueType,
    value: input.value,
    maxValue: input.maxValue ?? null,
    minSpend: input.minSpend,
    scope: input.scope,
    stackable: input.stackable ? 1 : 0,
    enabled: input.enabled ? 1 : 0,
    code: input.code ?? null,
    maxUses: input.maxUses ?? null,
    usedCount: 0,
    expiresAt: input.expiresAt ?? null,
    trigger: input.trigger ? JSON.stringify(input.trigger) : null,
  });
  const [row] = await db.select().from(promotions).where(eq(promotions.id, id));
  return rowToPromotion(row);
}

export async function updatePromotion(id: string, patch: Partial<Omit<Promotion, "id" | "usedCount">>): Promise<Promotion> {
  const update: Record<string, unknown> = {};
  if (patch.name !== undefined) update.name = patch.name;
  if (patch.valueType !== undefined) update.valueType = patch.valueType;
  if (patch.value !== undefined) update.value = patch.value;
  if (patch.maxValue !== undefined) update.maxValue = patch.maxValue;
  if (patch.minSpend !== undefined) update.minSpend = patch.minSpend;
  if (patch.scope !== undefined) update.scope = patch.scope;
  if (patch.stackable !== undefined) update.stackable = patch.stackable ? 1 : 0;
  if (patch.enabled !== undefined) update.enabled = patch.enabled ? 1 : 0;
  if (patch.code !== undefined) update.code = patch.code;
  if (patch.maxUses !== undefined) update.maxUses = patch.maxUses;
  if (patch.expiresAt !== undefined) update.expiresAt = patch.expiresAt;
  if (patch.trigger !== undefined) update.trigger = patch.trigger ? JSON.stringify(patch.trigger) : null;
  if (Object.keys(update).length) await db.update(promotions).set(update).where(eq(promotions.id, id));
  const [row] = await db.select().from(promotions).where(eq(promotions.id, id));
  return rowToPromotion(row);
}

export async function deletePromotion(id: string): Promise<void> {
  await db.delete(redemptions).where(eq(redemptions.promotionId, id));
  await db.delete(promotions).where(eq(promotions.id, id));
}

function calcAmount(promo: Promotion, subtotal: number): number {
  if (promo.valueType === "flat") return Math.min(promo.value, subtotal);
  const pct = Math.floor((subtotal * promo.value) / 100);
  return promo.maxValue != null ? Math.min(pct, promo.maxValue) : pct;
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

export async function applyDiscounts(params: {
  subtotal: number;
  qty: number;
  categories: string[];
  voucherCode?: string;
}): Promise<{ applied: AppliedDiscount[]; totalDiscount: number }> {
  const { subtotal, qty, categories, voucherCode } = params;
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  const all = await getPromotions();
  const candidates: Array<Promotion & { _amount: number }> = [];

  // Auto-discounts
  for (const p of all) {
    if (p.kind !== "auto" || !p.enabled) continue;
    if (p.minSpend > subtotal) continue;
    if (p.scope !== "all" && !categories.includes(p.scope)) continue;
    const t = p.trigger;
    if (t) {
      if (t.type === "time") {
        const from = timeToMinutes(t.from ?? "00:00");
        const to = timeToMinutes(t.to ?? "23:59");
        if (nowMinutes < from || nowMinutes > to) continue;
      } else if (t.type === "minSpend") {
        if (subtotal < (t.amount ?? 0)) continue;
      } else if (t.type === "qty") {
        if (qty < (t.count ?? 1)) continue;
      }
    }
    candidates.push({ ...p, _amount: calcAmount(p, subtotal) });
  }

  // Voucher
  if (voucherCode) {
    const code = voucherCode.trim().toUpperCase();
    const voucher = all.find((p) => p.kind === "voucher" && p.code === code);
    if (!voucher) throw new Error("Kode voucher tidak ditemukan");
    if (!voucher.enabled) throw new Error("Voucher tidak aktif");
    if (voucher.expiresAt && voucher.expiresAt < Date.now()) throw new Error("Voucher sudah kadaluarsa");
    if (voucher.maxUses != null && voucher.usedCount >= voucher.maxUses) throw new Error("Voucher sudah habis digunakan");
    if (voucher.minSpend > subtotal) throw new Error(`Min. belanja ${voucher.minSpend} untuk voucher ini`);
    if (voucher.scope !== "all" && !categories.includes(voucher.scope)) throw new Error("Voucher tidak berlaku untuk item yang dipesan");
    candidates.push({ ...voucher, _amount: calcAmount(voucher, subtotal) });
  }

  // Stacking resolution
  const stackable = candidates.filter((c) => c.stackable);
  const nonStackable = candidates.filter((c) => !c.stackable);
  const bestNonStack = nonStackable.sort((a, b) => b._amount - a._amount)[0];

  const toApply = [...stackable, ...(bestNonStack ? [bestNonStack] : [])];
  let remaining = subtotal;
  const applied: AppliedDiscount[] = [];
  for (const p of toApply) {
    const amt = Math.min(p._amount, remaining);
    if (amt <= 0) continue;
    applied.push({ id: p.id, name: p.name, ...(p.code ? { code: p.code } : {}), amount: amt });
    remaining -= amt;
  }

  return { applied, totalDiscount: applied.reduce((s, a) => s + a.amount, 0) };
}

export async function getAutoDiscounts(params: {
  subtotal: number;
  qty: number;
  categories: string[];
}): Promise<AppliedDiscount[]> {
  const result = await applyDiscounts(params);
  return result.applied;
}

async function recordRedemptions(applied: AppliedDiscount[], orderId: string, exec: Executor = db): Promise<void> {
  if (!applied.length) return;
  const now = Date.now();
  for (const a of applied) {
    await exec.insert(redemptions).values({
      id: `rdm_${now}_${a.id}`,
      promotionId: a.id,
      orderId,
      amount: a.amount,
      redeemedAt: now,
    });
    // Increment usedCount for vouchers only
    const [promo] = await exec.select().from(promotions).where(eq(promotions.id, a.id));
    if (promo?.kind === "voucher") {
      await exec.update(promotions).set({ usedCount: promo.usedCount + 1 }).where(eq(promotions.id, a.id));
    }
  }
}
