// Owner analytics computation helpers + response types. Computed from real data
// (getOrders() / getMenu()). All divisions are guarded so empty/zero data never
// produces NaN or Infinity.
import "server-only";
import { getOrders, getMenu } from "./store";
import { ORDER_STATUS } from "./constants";
import type { Order, Product } from "./types";

/* ─────────────────────────── types ─────────────────────────── */

export type SummaryRange = "today" | "7d" | "30d";
export type ReportRange = "week" | "lastweek" | "month";

export interface PaymentBucket {
  count: number;
  revenue: number;
}

export interface PaymentMix {
  qris: PaymentBucket;
  kasir: PaymentBucket;
}

export interface KpiDeltas {
  revenue: number;
  orders: number;
  avg: number;
  itemsSold: number;
}

export interface TopMenuEntry {
  id: string;
  name: string;
  cat: string;
  qty: number;
  revenue: number;
  grad: [string, string];
  g: string;
}

export interface CategoryBreakdownEntry {
  cat: string;
  qty: number;
  pct: number;
}

export interface TrendPoint {
  label: string;
  value: number;
}

export interface LowStockEntry {
  id: string;
  name: string;
  stock: number;
}

export interface AnalyticsSummary {
  range: SummaryRange;
  revenue: number;
  orders: number;
  avg: number;
  itemsSold: number;
  deltas: KpiDeltas;
  paymentMix: PaymentMix;
  topMenu: TopMenuEntry[];
  categoryBreakdown: CategoryBreakdownEntry[];
  trend: TrendPoint[];
  lowStock: LowStockEntry[];
  recent: Order[];
}

export interface ReportDailyRow {
  date: string; // yyyy-mm-dd
  label: string; // e.g. "Senin"
  orders: number;
  gross: number;
  discount: number;
  net: number;
}

export interface SalesReport {
  range: ReportRange;
  summary: {
    net: number;
    orders: number;
    avg: number;
    discount: number;
  };
  daily: ReportDailyRow[];
  payment: PaymentMix;
}

/* ─────────────────────────── helpers ─────────────────────────── */

const DAY_MS = 24 * 60 * 60 * 1000;
const DAY_NAMES = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

function pctDelta(current: number, prev: number): number {
  if (prev === 0) return 0;
  return Math.round(((current - prev) / prev) * 100);
}

function isQris(o: Order): boolean {
  return o.method === "qris";
}

function startOfToday(now = Date.now()): number {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function isoDate(ts: number): string {
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function emptyMix(): PaymentMix {
  return { qris: { count: 0, revenue: 0 }, kasir: { count: 0, revenue: 0 } };
}

function paymentMixOf(paidOrders: Order[]): PaymentMix {
  const mix = emptyMix();
  for (const o of paidOrders) {
    const bucket = isQris(o) ? mix.qris : mix.kasir;
    bucket.count += 1;
    bucket.revenue += o.total;
  }
  return mix;
}

/* ─────────────────────────── summary ─────────────────────────── */

interface WindowDef {
  start: number;
  end: number; // exclusive
}

function summaryWindow(range: SummaryRange, now = Date.now()): { current: WindowDef; prev: WindowDef } {
  if (range === "today") {
    const start = startOfToday(now);
    const end = start + DAY_MS;
    return { current: { start, end }, prev: { start: start - DAY_MS, end: start } };
  }
  const days = range === "7d" ? 7 : 30;
  const end = startOfToday(now) + DAY_MS; // end of today (exclusive)
  const start = end - days * DAY_MS;
  const span = days * DAY_MS;
  return { current: { start, end }, prev: { start: start - span, end: start } };
}

function inWindow(o: Order, w: WindowDef): boolean {
  return o.createdAt >= w.start && o.createdAt < w.end;
}

interface WindowStats {
  revenue: number;
  orders: number;
  avg: number;
  itemsSold: number;
  paidOrders: number;
}

function statsFor(all: Order[], w: WindowDef): WindowStats {
  const inW = all.filter((o) => inWindow(o, w));
  const paid = inW.filter((o) => o.paid);
  const revenue = paid.reduce((s, o) => s + o.total, 0);
  const itemsSold = inW.reduce((s, o) => s + o.items.reduce((q, i) => q + i.qty, 0), 0);
  const paidOrders = paid.length;
  const avg = paidOrders > 0 ? Math.round(revenue / paidOrders) : 0;
  return { revenue, orders: inW.length, avg, itemsSold, paidOrders };
}

function buildTrend(orders: Order[], range: SummaryRange, w: WindowDef, now = Date.now()): TrendPoint[] {
  const paid = orders.filter((o) => o.paid && inWindow(o, w));
  if (range === "today") {
    // hourly 08:00–21:00
    const points: TrendPoint[] = [];
    const base = startOfToday(now);
    for (let h = 8; h <= 21; h++) {
      const from = base + h * 60 * 60 * 1000;
      const to = from + 60 * 60 * 1000;
      const value = paid
        .filter((o) => o.createdAt >= from && o.createdAt < to)
        .reduce((s, o) => s + o.total, 0);
      points.push({ label: `${String(h).padStart(2, "0")}:00`, value });
    }
    return points;
  }
  if (range === "7d") {
    // daily
    const points: TrendPoint[] = [];
    for (let i = 6; i >= 0; i--) {
      const dayStart = startOfToday(now) - i * DAY_MS;
      const dayEnd = dayStart + DAY_MS;
      const value = paid
        .filter((o) => o.createdAt >= dayStart && o.createdAt < dayEnd)
        .reduce((s, o) => s + o.total, 0);
      points.push({ label: DAY_NAMES[new Date(dayStart).getDay()], value });
    }
    return points;
  }
  // 30d → weekly buckets (4 weeks + remainder, here 5 buckets of 7 days)
  const points: TrendPoint[] = [];
  const end = startOfToday(now) + DAY_MS;
  for (let i = 4; i >= 0; i--) {
    const to = end - i * 7 * DAY_MS;
    const from = to - 7 * DAY_MS;
    const value = paid
      .filter((o) => o.createdAt >= from && o.createdAt < to)
      .reduce((s, o) => s + o.total, 0);
    points.push({ label: `Mg ${5 - i}`, value });
  }
  return points;
}

export async function computeSummary(range: SummaryRange, now = Date.now()): Promise<AnalyticsSummary> {
  const [all, menu] = await Promise.all([getOrders("all"), getMenu()]);
  const menuById = new Map<string, Product>(menu.map((p) => [p.id, p]));

  const { current, prev } = summaryWindow(range, now);
  const cur = statsFor(all, current);
  const pre = statsFor(all, prev);

  const inCurrent = all.filter((o) => inWindow(o, current));
  const paidCurrent = inCurrent.filter((o) => o.paid);

  // top menu (by qty across the window, all orders)
  interface Agg { id: string; name: string; cat: string; qty: number; revenue: number; grad: [string, string]; g: string; }
  const aggMap = new Map<string, Agg>();
  for (const o of inCurrent) {
    for (const it of o.items) {
      const p = menuById.get(it.id);
      const cat = p?.cat ?? "Snack";
      let a = aggMap.get(it.id);
      if (!a) {
        a = {
          id: it.id,
          name: it.name,
          cat,
          qty: 0,
          revenue: 0,
          grad: p?.grad ?? ["#888", "#555"],
          g: p?.g ?? "cup",
        };
        aggMap.set(it.id, a);
      }
      a.qty += it.qty;
      a.revenue += it.price * it.qty;
    }
  }
  const topMenu: TopMenuEntry[] = [...aggMap.values()]
    .sort((x, y) => y.qty - x.qty)
    .slice(0, 5)
    .map((a) => ({ id: a.id, name: a.name, cat: a.cat, qty: a.qty, revenue: a.revenue, grad: a.grad, g: a.g }));

  // category breakdown (% of items by category)
  const catQty = new Map<string, number>();
  let totalItems = 0;
  for (const a of aggMap.values()) {
    catQty.set(a.cat, (catQty.get(a.cat) ?? 0) + a.qty);
    totalItems += a.qty;
  }
  const categoryBreakdown: CategoryBreakdownEntry[] = [...catQty.entries()]
    .map(([cat, qty]) => ({ cat, qty, pct: totalItems > 0 ? Math.round((qty / totalItems) * 100) : 0 }))
    .sort((x, y) => y.qty - x.qty);

  const lowStock: LowStockEntry[] = menu
    .filter((p) => typeof p.stock === "number" && p.stock <= 5)
    .map((p) => ({ id: p.id, name: p.name, stock: p.stock }))
    .sort((x, y) => x.stock - y.stock);

  const recent = [...all].sort((a, b) => b.createdAt - a.createdAt).slice(0, 8);

  return {
    range,
    revenue: cur.revenue,
    orders: cur.orders,
    avg: cur.avg,
    itemsSold: cur.itemsSold,
    deltas: {
      revenue: pctDelta(cur.revenue, pre.revenue),
      orders: pctDelta(cur.orders, pre.orders),
      avg: pctDelta(cur.avg, pre.avg),
      itemsSold: pctDelta(cur.itemsSold, pre.itemsSold),
    },
    paymentMix: paymentMixOf(paidCurrent),
    topMenu,
    categoryBreakdown,
    trend: buildTrend(all, range, current, now),
    lowStock,
    recent,
  };
}

/* ─────────────────────────── report ─────────────────────────── */

function reportWindow(range: ReportRange, now = Date.now()): { start: number; days: number } {
  const todayStart = startOfToday(now);
  if (range === "lastweek") return { start: todayStart - 13 * DAY_MS, days: 7 };
  if (range === "month") return { start: todayStart - 29 * DAY_MS, days: 30 };
  return { start: todayStart - 6 * DAY_MS, days: 7 }; // week
}

export async function computeReport(range: ReportRange, now = Date.now()): Promise<SalesReport> {
  const all = await getOrders("all");
  const { start, days } = reportWindow(range, now);

  const daily: ReportDailyRow[] = [];
  let totalNet = 0;
  let totalOrders = 0;
  let totalDiscount = 0;
  const payment = emptyMix();

  for (let i = 0; i < days; i++) {
    const dayStart = start + i * DAY_MS;
    const dayEnd = dayStart + DAY_MS;
    const inDay = all.filter((o) => o.createdAt >= dayStart && o.createdAt < dayEnd);
    const paidInDay = inDay.filter((o) => o.paid);

    const gross = paidInDay.reduce((s, o) => s + o.subtotal + o.service, 0);
    const discount = paidInDay.reduce((s, o) => s + o.discount, 0);
    const net = paidInDay.reduce((s, o) => s + o.total, 0);

    for (const o of paidInDay) {
      const bucket = isQris(o) ? payment.qris : payment.kasir;
      bucket.count += 1;
      bucket.revenue += o.total;
    }

    totalNet += net;
    totalOrders += inDay.length;
    totalDiscount += discount;

    daily.push({
      date: isoDate(dayStart),
      label: DAY_NAMES[new Date(dayStart).getDay()],
      orders: inDay.length,
      gross,
      discount,
      net,
    });
  }

  const paidCount = payment.qris.count + payment.kasir.count;
  const avg = paidCount > 0 ? Math.round(totalNet / paidCount) : 0;

  return {
    range,
    summary: { net: totalNet, orders: totalOrders, avg, discount: totalDiscount },
    daily,
    payment,
  };
}

/** Build the CSV body for a SalesReport. */
export function reportToCsv(report: SalesReport): string {
  const rows: string[] = ["HARI,PESANAN,KOTOR,DISKON,BERSIH"];
  let pesanan = 0;
  let kotor = 0;
  let diskon = 0;
  let bersih = 0;
  for (const d of report.daily) {
    rows.push(`${d.label},${d.orders},${d.gross},${d.discount},${d.net}`);
    pesanan += d.orders;
    kotor += d.gross;
    diskon += d.discount;
    bersih += d.net;
  }
  rows.push(`TOTAL,${pesanan},${kotor},${diskon},${bersih}`);
  return rows.join("\n") + "\n";
}
