// ESC/POS receipt builder + RawBT (Android) bridge.
//
// Cheap Bluetooth thermal printers speak ESC/POS over Bluetooth *Classic* (SPP),
// which the browser cannot reach (window.print() only sees OS print services and
// Web Bluetooth only supports BLE). We therefore generate raw ESC/POS bytes and
// hand them to the RawBT app via its intent URL — RawBT owns the Bluetooth
// connection and prints the bytes verbatim.
//
// Intent format (from RawBT docs / escpos-php RawbtPrintConnector):
//   intent:base64,<base64 ESC/POS>#Intent;scheme=rawbt;package=ru.a402d.rawbtprinter;end;
import type { Order, StoreSettings } from "@/lib/types";
import { rupiah } from "@/lib/constants";

// ---- Paper width setting (per-device, persisted in localStorage) ----
export type PaperWidth = 58 | 80;
const PAPER_KEY = "warbul_paper_width";
// Characters per line by paper width (Font A): 58mm = 32, 80mm = 48.
const COLS_BY_WIDTH: Record<PaperWidth, number> = { 58: 32, 80: 48 };

export function getPaperWidth(): PaperWidth {
  if (typeof window === "undefined") return 58;
  return window.localStorage.getItem(PAPER_KEY) === "80" ? 80 : 58;
}
export function setPaperWidth(mm: PaperWidth): void {
  if (typeof window !== "undefined") window.localStorage.setItem(PAPER_KEY, String(mm));
}
function paperCols(): number {
  return COLS_BY_WIDTH[getPaperWidth()];
}

const ESC = 0x1b;
const GS = 0x1d;

// Map the few non-ASCII glyphs the receipt uses to printer-safe ASCII.
function sanitize(s: string): string {
  return s
    .replace(/×/g, "x")
    .replace(/−/g, "-")
    .replace(/☕/g, "")
    .replace(/[–—]/g, "-")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[^\x09\x0a\x0d\x20-\xFF]/g, "");
}

class EscPos {
  private buf: number[] = [];
  constructor(private cols: number) {}
  raw(...b: number[]) {
    this.buf.push(...b);
  }
  text(s: string) {
    const t = sanitize(s);
    for (let i = 0; i < t.length; i++) this.buf.push(t.charCodeAt(i) & 0xff);
    return this;
  }
  line(s = "") {
    this.text(s);
    this.raw(0x0a);
    return this;
  }
  init() {
    this.raw(ESC, 0x40);
    return this;
  }
  align(n: 0 | 1 | 2) {
    this.raw(ESC, 0x61, n);
    return this;
  }
  bold(on: boolean) {
    this.raw(ESC, 0x45, on ? 1 : 0);
    return this;
  }
  size(n: number) {
    this.raw(GS, 0x21, n);
    return this;
  }
  feed(n = 1) {
    for (let i = 0; i < n; i++) this.raw(0x0a);
    return this;
  }
  cut() {
    this.feed(3);
    this.raw(GS, 0x56, 0x00);
    return this;
  }
  kv(left: string, right: string) {
    const l = sanitize(left);
    const r = sanitize(right);
    const gap = this.cols - l.length - r.length;
    if (gap < 1) {
      this.line(l);
      this.align(2).line(r).align(0);
    } else {
      this.line(l + " ".repeat(gap) + r);
    }
    return this;
  }
  rule() {
    this.line("-".repeat(this.cols));
    return this;
  }
  bytes(): Uint8Array {
    return Uint8Array.from(this.buf);
  }
}

export function buildReceiptEscPos(
  order: Order,
  settings?: StoreSettings | null,
  cashierName?: string,
  cols: number = paperCols(),
): Uint8Array {
  const p = new EscPos(cols);
  const storeName = settings?.storeName ?? "Warbul Coffee";
  const address = settings?.address ?? "";
  const tableLabel =
    order.table === 0 ? "Bawa Pulang" : "Meja " + String(order.table).padStart(2, "0");
  const stamp = new Date(order.createdAt).toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  const method = order.method === "qris" ? "QRIS" : order.payDetail || "Kasir";

  p.init().align(1).bold(true).size(0x11).line(storeName).size(0).bold(false);
  if (address) p.line(address);
  p.align(0).rule();
  p.kv(String(order.id), tableLabel);
  p.line(stamp + (cashierName ? " - " + cashierName : ""));
  p.rule();

  for (const it of order.items) {
    p.kv(`${it.qty}x ${it.name}`, rupiah(it.price * it.qty));
    if (it.opts && it.opts.length) p.line("  " + it.opts.join(", "));
  }
  p.rule();

  p.kv("Subtotal", rupiah(order.subtotal != null ? order.subtotal : order.total));
  if (order.promo?.length) {
    for (const d of order.promo) p.kv(`Diskon (${d.name})`, "-" + rupiah(d.amount));
  } else if (order.discount > 0) {
    p.kv("Diskon", "-" + rupiah(order.discount));
  }
  p.kv("Biaya layanan", rupiah(order.service));
  p.bold(true).kv("TOTAL", rupiah(order.total)).bold(false);
  p.kv("Metode", method);
  p.rule();

  p.align(1).line("Terima kasih sudah ngopi di Warbul").line("Simpan struk sebagai bukti bayar");
  p.feed(1).cut();
  return p.bytes();
}

/**
 * Build the RawBT intent URL for raw ESC/POS bytes.
 *
 * RawBT prints the data carried by the `rawbt:` scheme. We percent-encode EVERY
 * byte (%XX) so arbitrary ESC/POS control bytes — including 0x23 '#' which would
 * otherwise terminate the intent fragment — survive intact. (The older
 * `intent:base64,…` form is not recognized by current RawBT and merely opens the
 * app without printing.)
 */
export function rawbtIntentUrl(bytes: Uint8Array): string {
  let enc = "";
  for (let i = 0; i < bytes.length; i++) {
    enc += "%" + bytes[i].toString(16).padStart(2, "0").toUpperCase();
  }
  return "intent:" + enc + "#Intent;scheme=rawbt;package=ru.a402d.rawbtprinter;end;";
}

/** True on Android (RawBT is Android-only). */
export function isAndroid(): boolean {
  return typeof navigator !== "undefined" && /android/i.test(navigator.userAgent);
}

/**
 * Print a receipt to a Bluetooth ESC/POS printer via RawBT. Returns true if the
 * RawBT intent was triggered. On non-Android (no RawBT) returns false so the
 * caller can fall back to window.print().
 */
export function printReceiptViaRawBT(
  order: Order,
  settings?: StoreSettings | null,
  cashierName?: string,
): boolean {
  if (!isAndroid()) return false;
  const bytes = buildReceiptEscPos(order, settings, cashierName);
  window.location.href = rawbtIntentUrl(bytes);
  return true;
}
