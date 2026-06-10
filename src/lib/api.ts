// Typed client for the Warbul JSON API. Safe to call from client components.
// Centralizes the request/response contract so every surface stays consistent.
import type {
  Product, Order, OrderMethod, Member, PromoResult, StoreSettings, Selection,
  ModGroupFull, ModType, Category, Ingredient, RecipeItem, RecipeRow,
} from "./types";
import type { AnalyticsSummary, SalesReport, SummaryRange, ReportRange } from "./analytics";

async function j<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      if (body?.error) msg = body.error;
    } catch {}
    throw new Error(msg);
  }
  return res.json() as Promise<T>;
}

/* ── menu ── */
export async function getMenu(): Promise<Product[]> {
  return (await j<{ menu: Product[] }>(await fetch("/api/menu", { cache: "no-store" }))).menu;
}
export async function createProduct(p: Partial<Product>): Promise<Product> {
  return (await j<{ product: Product }>(await fetch("/api/menu", {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(p),
  }))).product;
}
export async function updateProduct(id: string, patch: Partial<Product>): Promise<Product> {
  return (await j<{ product: Product }>(await fetch(`/api/menu/${id}`, {
    method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(patch),
  }))).product;
}
export async function deleteProduct(id: string): Promise<void> {
  await j(await fetch(`/api/menu/${id}`, { method: "DELETE" }));
}

/* ── orders ── */
export interface CreateOrderBody {
  table: number;
  method: OrderMethod;
  lines: { id: string; sel?: Selection; qty: number }[];
  promoCode?: string | null;
  phone?: string | null;
  // cashier-only (ignored for anonymous callers, enforced server-side):
  paid?: boolean;
  status?: Order["status"];
  payDetail?: string | null;
  note?: string;
}
export async function createOrder(body: CreateOrderBody): Promise<Order> {
  return (await j<{ order: Order }>(await fetch("/api/orders", {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body),
  }))).order;
}
export async function getOrder(id: string): Promise<Order | null> {
  const res = await fetch(`/api/orders/${id}`, { cache: "no-store" });
  if (res.status === 404) return null;
  return (await j<{ order: Order | null }>(res)).order;
}
export async function listOrders(filter = "all"): Promise<Order[]> {
  return (await j<{ orders: Order[] }>(await fetch(`/api/orders?filter=${encodeURIComponent(filter)}`, { cache: "no-store" }))).orders;
}
export async function patchOrder(id: string, patch: Partial<Order>): Promise<Order> {
  return (await j<{ order: Order }>(await fetch(`/api/orders/${id}`, {
    method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(patch),
  }))).order;
}

/* ── promo / members ── */
export async function validatePromo(code: string, subtotal: number): Promise<PromoResult> {
  return j<PromoResult>(await fetch("/api/promo", {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ code, subtotal }),
  }));
}
export async function getMember(phone: string): Promise<Member | null> {
  return (await j<{ member: Member | null }>(await fetch(`/api/members/${encodeURIComponent(phone)}`, { cache: "no-store" }))).member;
}

/* ── pakasir QRIS payment ── */
export async function pollPakasir(orderId: string): Promise<{ order: Order | null; paid: boolean }> {
  const res = await fetch(`/api/pakasir/status?order=${encodeURIComponent(orderId)}`, { cache: "no-store" });
  if (res.status === 404) return { order: null, paid: false };
  return j<{ order: Order | null; paid: boolean }>(res);
}

/* ── modifiers / add-ons ── */
export async function getModifiers(): Promise<ModGroupFull[]> {
  return (await j<{ groups: ModGroupFull[] }>(await fetch("/api/modifiers", { cache: "no-store" }))).groups;
}
export async function createModifierGroup(body: { name: string; type: ModType; categories: Category[] }): Promise<string> {
  return (await j<{ id: string }>(await fetch("/api/modifiers", {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body),
  }))).id;
}
export async function updateModifierGroup(id: string, patch: Partial<{ name: string; type: ModType; categories: Category[]; sort: number }>): Promise<void> {
  await j(await fetch(`/api/modifiers/${id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(patch) }));
}
export async function deleteModifierGroup(id: string): Promise<void> {
  await j(await fetch(`/api/modifiers/${id}`, { method: "DELETE" }));
}
export async function createModifierOption(groupId: string, body: { label: string; price: number; isDefault?: boolean }): Promise<string> {
  return (await j<{ id: string }>(await fetch(`/api/modifiers/${groupId}/options`, {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body),
  }))).id;
}
export async function updateModifierOption(id: string, patch: Partial<{ label: string; price: number; isDefault: boolean; sort: number }>): Promise<void> {
  await j(await fetch(`/api/modifier-options/${id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(patch) }));
}
export async function deleteModifierOption(id: string): Promise<void> {
  await j(await fetch(`/api/modifier-options/${id}`, { method: "DELETE" }));
}

/* ── ingredients (raw materials) + recipes ── */
export async function getIngredients(): Promise<Ingredient[]> {
  return (await j<{ ingredients: Ingredient[] }>(await fetch("/api/ingredients", { cache: "no-store" }))).ingredients;
}
export async function createIngredient(body: { name: string; unit: string; stock: number; lowThreshold: number }): Promise<string> {
  return (await j<{ id: string }>(await fetch("/api/ingredients", {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body),
  }))).id;
}
export async function updateIngredient(id: string, patch: Partial<{ name: string; unit: string; stock: number; lowThreshold: number }>): Promise<void> {
  await j(await fetch(`/api/ingredients/${id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(patch) }));
}
export async function deleteIngredient(id: string): Promise<void> {
  await j(await fetch(`/api/ingredients/${id}`, { method: "DELETE" }));
}
export async function getRecipe(ownerType: "product" | "option", ownerId: string): Promise<RecipeRow[]> {
  return (await j<{ recipe: RecipeRow[] }>(await fetch(`/api/recipes?ownerType=${ownerType}&ownerId=${encodeURIComponent(ownerId)}`, { cache: "no-store" }))).recipe;
}
export async function setRecipe(ownerType: "product" | "option", ownerId: string, items: RecipeItem[]): Promise<void> {
  await j(await fetch("/api/recipes", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ ownerType, ownerId, items }) }));
}

/* ── public config (customer-safe) ── */
export interface PublicConfig {
  storeName: string;
  serviceFee: number;
  payQris: boolean;
  payKasir: boolean;
}
export async function getConfig(): Promise<PublicConfig> {
  return j<PublicConfig>(await fetch("/api/config", { cache: "no-store" }));
}

/* ── settings / analytics ── */
export async function getSettings(): Promise<StoreSettings> {
  return (await j<{ settings: StoreSettings }>(await fetch("/api/settings", { cache: "no-store" }))).settings;
}
export async function patchSettings(patch: Partial<StoreSettings>): Promise<StoreSettings> {
  return (await j<{ settings: StoreSettings }>(await fetch("/api/settings", {
    method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(patch),
  }))).settings;
}
export async function getAnalyticsSummary(range: SummaryRange = "today"): Promise<AnalyticsSummary> {
  return j<AnalyticsSummary>(await fetch(`/api/analytics/summary?range=${range}`, { cache: "no-store" }));
}
export async function getSalesReport(range: ReportRange = "week"): Promise<SalesReport> {
  return j<SalesReport>(await fetch(`/api/analytics/report?range=${range}`, { cache: "no-store" }));
}
export function reportCsvUrl(range: ReportRange = "week"): string {
  return `/api/analytics/report?range=${range}&format=csv`;
}
