// Owner analytics computation helpers + response types. Computed from real data
// (getOrdersSince() / getMenu()). All divisions are guarded so empty/zero data never
// produces NaN or Infinity.
import "server-only";
import { getOrdersSince, getRecentOrders, getMenu } from "./store";
import {
  startOfStoreDay as startOfToday,
  storeIsoDate as isoDate,
  storeDayOfWeek as tzDay,
  startOfStoreMonth,
  startOfStoreMonthOf,
  storeYearMonth,
} from "./tz";
import { ORDER_STATUS } from "./constants";
import type { Order, Product } from "./types";

/* ─────────────────────────── types ─────────────────────────── */

export type SummaryRange = "today" | "7d" | "30d";
export type ReportPreset = "week" | "lastweek" | "month" | "lastmonth";
// A preset tab OR a specific calendar month "YYYY-MM" (from the month picker).
// `(string & {})` keeps preset autocomplete while allowing the picker's month keys.
export type ReportRange = ReportPreset | (string & {});

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
  label: string; // human period label, e.g. "Juli 2026" or "Minggu Ini"
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
// Day windows + labels are computed in the store timezone (see ./tz) so reports
// align to the store's calendar day, not the server's (UTC on Vercel).

function pctDelta(current: number, prev: number): number {
  if (prev === 0) return 0;
  return Math.round(((current - prev) / prev) * 100);
}

function isQris(o: Order): boolean {
  return o.method === "qris";
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

// What counts toward income/sales: a paid order that wasn't voided. A cancel
// reverses stock (see store.updateOrder) but leaves `paid` set, so without the
// status check a paid-then-cancelled order would still inflate revenue.
function isIncome(o: Order): boolean {
  return o.paid && o.status !== ORDER_STATUS.CANCELLED;
}

interface WindowStats {
  revenue: number;
  orders: number;
  avg: number;
  itemsSold: number;
  paidOrders: number;
}

function statsFor(all: Order[], w: WindowDef): WindowStats {
  // All metrics share the income basis (paid, not cancelled) so revenue, order
  // count, items sold and the average stay consistent with each other.
  const income = all.filter((o) => inWindow(o, w) && isIncome(o));
  const revenue = income.reduce((s, o) => s + o.total, 0);
  const itemsSold = income.reduce((s, o) => s + o.items.reduce((q, i) => q + i.qty, 0), 0);
  const orders = income.length;
  const avg = orders > 0 ? Math.round(revenue / orders) : 0;
  return { revenue, orders, avg, itemsSold, paidOrders: orders };
}

function buildTrend(orders: Order[], range: SummaryRange, w: WindowDef, now = Date.now()): TrendPoint[] {
  const paid = orders.filter((o) => isIncome(o) && inWindow(o, w));
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
      points.push({ label: DAY_NAMES[tzDay(dayStart)], value });
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
  const { current, prev } = summaryWindow(range, now);
  // Load only the window we report on (prev.start is the earliest point any
  // stat/trend reaches back to) instead of the entire order history. `recent`
  // is fetched separately so it stays correct even if the window is empty.
  const [all, menu, recent] = await Promise.all([
    getOrdersSince(prev.start),
    getMenu(),
    getRecentOrders(8),
  ]);
  const menuById = new Map<string, Product>(menu.map((p) => [p.id, p]));

  const cur = statsFor(all, current);
  const pre = statsFor(all, prev);

  // Sales aggregates use the income basis (paid, not cancelled) so "Menu Terjual"
  // and best-sellers reflect what was actually sold, consistent with revenue.
  const incomeCurrent = all.filter((o) => inWindow(o, current) && isIncome(o));

  // top menu (by qty across the window, income orders only)
  interface Agg { id: string; name: string; cat: string; qty: number; revenue: number; grad: [string, string]; g: string; }
  const aggMap = new Map<string, Agg>();
  for (const o of incomeCurrent) {
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
    paymentMix: paymentMixOf(incomeCurrent),
    topMenu,
    categoryBreakdown,
    trend: buildTrend(all, range, current, now),
    lowStock,
    recent,
  };
}

/* ─────────────────────────── report ─────────────────────────── */

const MONTH_NAMES_ID = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

function monthLabel(monthStart: number): string {
  const { year, month1 } = storeYearMonth(monthStart);
  return `${MONTH_NAMES_ID[month1 - 1]} ${year}`;
}

// Resolve a report range to an absolute [start, end) window (store-timezone aware)
// plus a human label. MONTH ranges use CALENDAR boundaries so this month and last
// month never mix; "YYYY-MM" targets a specific calendar month (the picker).
function reportWindow(range: ReportRange, now = Date.now()): { start: number; end: number; label: string } {
  const todayStart = startOfToday(now);
  const tomorrow = todayStart + DAY_MS;

  if (range === "lastweek") {
    return { start: todayStart - 13 * DAY_MS, end: todayStart - 6 * DAY_MS, label: "Minggu Lalu" };
  }
  if (range === "month") {
    const start = startOfStoreMonth(now);
    return { start, end: tomorrow, label: monthLabel(start) }; // this calendar month, up to today
  }
  if (range === "lastmonth") {
    const curStart = startOfStoreMonth(now);
    const start = startOfStoreMonth(curStart - 1); // any instant inside the previous month
    return { start, end: curStart, label: monthLabel(start) };
  }
  const m = /^(\d{4})-(\d{1,2})$/.exec(range);
  if (m) {
    const year = Number(m[1]);
    const month1 = Number(m[2]);
    if (month1 >= 1 && month1 <= 12) {
      const start = startOfStoreMonthOf(year, month1);
      const nextStart = startOfStoreMonthOf(month1 === 12 ? year + 1 : year, month1 === 12 ? 1 : month1 + 1);
      // cap the current/future month at "today" so we don't render empty future days
      return { start, end: Math.min(nextStart, tomorrow), label: monthLabel(start) };
    }
  }
  return { start: todayStart - 6 * DAY_MS, end: tomorrow, label: "Minggu Ini" }; // week (default)
}

export async function computeReport(range: ReportRange, now = Date.now()): Promise<SalesReport> {
  const { start, end, label } = reportWindow(range, now);
  const all = await getOrdersSince(start);

  const daily: ReportDailyRow[] = [];
  let totalNet = 0;
  let totalOrders = 0;
  let totalDiscount = 0;
  const payment = emptyMix();

  for (let dayStart = start; dayStart < end; dayStart += DAY_MS) {
    const dayEnd = dayStart + DAY_MS;
    // Income basis (paid, not cancelled) — counts and money all on the same set.
    const incomeInDay = all.filter(
      (o) => o.createdAt >= dayStart && o.createdAt < dayEnd && isIncome(o),
    );

    const gross = incomeInDay.reduce((s, o) => s + o.subtotal + o.service, 0);
    const discount = incomeInDay.reduce((s, o) => s + o.discount, 0);
    const net = incomeInDay.reduce((s, o) => s + o.total, 0);

    for (const o of incomeInDay) {
      const bucket = isQris(o) ? payment.qris : payment.kasir;
      bucket.count += 1;
      bucket.revenue += o.total;
    }

    totalNet += net;
    totalOrders += incomeInDay.length;
    totalDiscount += discount;

    daily.push({
      date: isoDate(dayStart),
      label: DAY_NAMES[tzDay(dayStart)],
      orders: incomeInDay.length,
      gross,
      discount,
      net,
    });
  }

  const paidCount = payment.qris.count + payment.kasir.count;
  const avg = paidCount > 0 ? Math.round(totalNet / paidCount) : 0;

  return {
    range,
    label,
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
