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
import { Capacitor } from "@capacitor/core";

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

// Launch an intent: URL without navigating the current page away. Using
// window.location.href on an intent: URL makes Chrome perform a top-level
// navigation, so on returning from RawBT the React page is left in a broken
// state (stuck zoom, modal gone). A throwaway hidden iframe fires the intent
// while the page stays intact.
function launchIntent(url: string): void {
  const frame = document.createElement("iframe");
  frame.style.display = "none";
  document.body.appendChild(frame);
  try {
    if (frame.contentWindow) frame.contentWindow.location.href = url;
    else frame.src = url;
  } catch {
    // Some Chrome builds block intent: inside an iframe — fall back to a
    // same-tab open, which still launches the app.
    window.location.href = url;
  }
  setTimeout(() => frame.remove(), 2000);
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
  launchIntent(rawbtIntentUrl(bytes));
  return true;
}

// ---- Native (Capacitor Android app) direct Bluetooth printing ----
// In the packaged app we talk to the thermal printer directly over Bluetooth
// Classic (SPP) via cordova-plugin-bluetooth-serial — no RawBT. On the web,
// isNativeApp() is false and the RawBT path above is used instead.

export type BtDevice = { name?: string; address: string; id?: string };

/** True when running inside the Capacitor Android/iOS app. */
export function isNativeApp(): boolean {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

/** Thrown when no printer has been chosen yet (caller should show a picker). */
export class NoPrinterError extends Error {
  constructor() {
    super("Belum ada printer dipilih");
    this.name = "NoPrinterError";
  }
}

// Minimal typing for the cordova-plugin-bluetooth-serial global.
interface BluetoothSerial {
  list(success: (devices: BtDevice[]) => void, failure: (e: unknown) => void): void;
  connect(address: string, success: () => void, failure: (e: unknown) => void): void;
  connectInsecure(address: string, success: () => void, failure: (e: unknown) => void): void;
  write(data: ArrayBuffer | Uint8Array | string, success: () => void, failure: (e: unknown) => void): void;
  disconnect(success: () => void, failure: (e: unknown) => void): void;
}
function bt(): BluetoothSerial {
  const w = window as unknown as { bluetoothSerial?: BluetoothSerial };
  if (!w.bluetoothSerial) throw new Error("Plugin Bluetooth tidak tersedia (buka via aplikasi).");
  return w.bluetoothSerial;
}

// cordova-plugin-android-permissions: request the Android 12+ runtime Bluetooth
// permissions before any getBondedDevices()/connect() (which throw without
// BLUETOOTH_CONNECT). No-op on older Android / when the plugin is absent.
interface AndroidPermissions {
  requestPermissions(
    perms: string[],
    success: (status: { hasPermission: boolean }) => void,
    error: (e: unknown) => void,
  ): void;
}
function androidPermissions(): AndroidPermissions | null {
  const w = window as unknown as { cordova?: { plugins?: { permissions?: AndroidPermissions } } };
  return w.cordova?.plugins?.permissions ?? null;
}
async function ensureBtPermissions(): Promise<void> {
  const p = androidPermissions();
  if (!p) return;
  await new Promise<void>((resolve) => {
    p.requestPermissions(
      ["android.permission.BLUETOOTH_CONNECT", "android.permission.BLUETOOTH_SCAN"],
      () => resolve(),
      () => resolve(),
    );
  });
}
function promisify<T>(fn: (s: (r: T) => void, f: (e: unknown) => void) => void): Promise<T> {
  return new Promise<T>((resolve, reject) => fn(resolve, (e) => reject(asError(e))));
}
function asError(e: unknown): Error {
  return e instanceof Error ? e : new Error(typeof e === "string" ? e : "Bluetooth error");
}

const ADDR_KEY = "warbul_bt_addr";
export function getPrinterAddr(): string {
  return typeof window !== "undefined" ? window.localStorage.getItem(ADDR_KEY) || "" : "";
}
export function setPrinterAddr(addr: string): void {
  if (typeof window !== "undefined") window.localStorage.setItem(ADDR_KEY, addr);
}

/** List Bluetooth devices paired with the phone (native app only). */
export async function listPairedPrinters(): Promise<BtDevice[]> {
  await ensureBtPermissions();
  return promisify<BtDevice[]>((s, f) => bt().list(s, f));
}

/**
 * Print directly to the saved Bluetooth printer (native app). Throws
 * NoPrinterError when no device is chosen yet.
 */
export async function printReceiptNative(
  order: Order,
  settings?: StoreSettings | null,
  cashierName?: string,
): Promise<void> {
  const addr = getPrinterAddr();
  if (!addr) throw new NoPrinterError();
  await ensureBtPermissions();
  const b = bt();
  const bytes = buildReceiptEscPos(order, settings, cashierName);
  // Prefer a secure SPP connection; fall back to insecure (many cheap printers).
  try {
    await promisify<void>((s, f) => b.connect(addr, s, f));
  } catch {
    await promisify<void>((s, f) => b.connectInsecure(addr, s, f));
  }
  try {
    await promisify<void>((s, f) => b.write(bytes, s, f));
    await new Promise((r) => setTimeout(r, 500)); // let the buffer flush
  } finally {
    await promisify<void>((s, f) => b.disconnect(s, f)).catch(() => {});
  }
}
