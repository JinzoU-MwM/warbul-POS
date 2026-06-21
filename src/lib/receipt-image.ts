"use client";
// Dependency-free receipt → PNG download for the customer side. Draws a clean
// thermal-style receipt onto a canvas and downloads it (no print dialog, no
// external fonts/images that could taint the canvas).
import type { Order, StoreSettings } from "@/lib/types";
import { rupiah } from "@/lib/constants";

const W = 380; // content width (CSS px)
const PAD = 20;
const SCALE = 2; // retina crispness
const LH = 20; // base line height

function wrap(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const probe = cur ? cur + " " + w : w;
    if (ctx.measureText(probe).width > maxW && cur) {
      lines.push(cur);
      cur = w;
    } else {
      cur = probe;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

export function downloadReceiptImage(order: Order, settings?: Partial<StoreSettings> | null): void {
  const storeName = settings?.storeName ?? "Warbul Coffee";
  const address = settings?.address ?? "";
  const tableLabel = order.table === 0 ? "Bawa Pulang" : "Meja " + String(order.table).padStart(2, "0");
  const stamp = new Date(order.createdAt).toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  const method = order.method === "qris" ? "QRIS" : order.payDetail || "Kasir";

  // Measure pass to compute height.
  const measure = document.createElement("canvas").getContext("2d")!;
  const innerW = W - PAD * 2;
  measure.font = "13px sans-serif";
  let lineCount = 0;
  lineCount += 3; // store name, address, gap
  lineCount += 2; // id/table, stamp
  for (const it of order.items) {
    lineCount += wrap(measure, `${it.qty}x ${it.name}`, innerW - 70).length;
    if (it.opts?.length) lineCount += 1;
    if (it.note) lineCount += wrap(measure, "* " + it.note, innerW).length;
  }
  lineCount += 6; // divider + subtotal/disc/service/total/method
  if (order.promo?.length) lineCount += order.promo.length;
  lineCount += 3; // footer
  const height = PAD * 2 + 60 + lineCount * LH;

  const canvas = document.createElement("canvas");
  canvas.width = W * SCALE;
  canvas.height = Math.ceil(height) * SCALE;
  const ctx = canvas.getContext("2d")!;
  ctx.scale(SCALE, SCALE);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, height);
  ctx.fillStyle = "#23201b";
  ctx.textBaseline = "top";

  let y = PAD;
  const left = PAD;
  const right = W - PAD;
  const center = (s: string, font: string) => {
    ctx.font = font;
    ctx.textAlign = "center";
    ctx.fillText(s, W / 2, y);
    y += LH;
  };
  const rowLR = (l: string, r: string, font = "13px sans-serif") => {
    ctx.font = font;
    ctx.textAlign = "left";
    ctx.fillText(l, left, y);
    ctx.textAlign = "right";
    ctx.fillText(r, right, y);
    y += LH;
  };
  const lineL = (s: string, font = "12px sans-serif", color = "#6f6353") => {
    ctx.font = font;
    ctx.fillStyle = color;
    ctx.textAlign = "left";
    ctx.fillText(s, left, y);
    ctx.fillStyle = "#23201b";
    y += LH;
  };
  const rule = () => {
    ctx.strokeStyle = "#c9bfa6";
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(left, y + 4);
    ctx.lineTo(right, y + 4);
    ctx.stroke();
    ctx.setLineDash([]);
    y += LH;
  };

  center(storeName, "bold 18px sans-serif");
  if (address) {
    ctx.fillStyle = "#8b7f6c";
    center(address, "11px sans-serif");
    ctx.fillStyle = "#23201b";
  }
  rule();
  rowLR(order.id, tableLabel);
  lineL(stamp);
  rule();
  for (const it of order.items) {
    const nameLines = wrap(ctx, `${it.qty}x ${it.name}`, W - PAD * 2 - 70);
    nameLines.forEach((nl, i) => {
      ctx.font = "13px sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(nl, left, y);
      if (i === 0) {
        ctx.textAlign = "right";
        ctx.fillText(rupiah(it.price * it.qty), right, y);
      }
      y += LH;
    });
    if (it.opts?.length) lineL("  " + it.opts.join(", "), "11px sans-serif");
    if (it.note) wrap(ctx, "* " + it.note, W - PAD * 2).forEach((nl) => lineL("  " + nl, "italic 11px sans-serif", "#5b5145"));
  }
  rule();
  rowLR("Subtotal", rupiah(order.subtotal != null ? order.subtotal : order.total));
  if (order.promo?.length) for (const d of order.promo) rowLR(`Diskon (${d.name})`, "-" + rupiah(d.amount));
  else if (order.discount > 0) rowLR("Diskon", "-" + rupiah(order.discount));
  rowLR("Biaya layanan", rupiah(order.service));
  rowLR("TOTAL", rupiah(order.total), "bold 15px sans-serif");
  rowLR("Metode", method);
  rule();
  ctx.fillStyle = "#8b7f6c";
  center("Terima kasih sudah ngopi di Warbul", "11px sans-serif");
  center("Simpan struk ini sebagai bukti pembayaran", "11px sans-serif");

  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Struk-${order.id}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }, "image/png");
}
