import "server-only";
// Pakasir QRIS payment gateway client. Docs: https://pakasir.com/p/docs
// Credentials come from env: SLUG (project) + API_KEY.
import type { Order, PakasirInfo } from "./types";
import { getOrder, updateOrder } from "./store";
import { ORDER_STATUS } from "./constants";

const BASE = "https://app.pakasir.com";

export function pakasirConfig(): { project: string; apiKey: string } | null {
  const project = process.env.SLUG;
  const apiKey = process.env.API_KEY;
  return project && apiKey ? { project, apiKey } : null;
}

export function pakasirEnabled(): boolean {
  return pakasirConfig() !== null;
}

interface PakasirPayment {
  payment_number?: string;
  total_payment?: number;
  fee?: number;
  expired_at?: string;
}

/** Create a QRIS charge. Returns the QRIS string + amounts, or null if Pakasir
 *  isn't configured. Throws on a gateway error. `amount` is our order total. */
export async function createQris(orderId: string, amount: number): Promise<PakasirInfo | null> {
  const cfg = pakasirConfig();
  if (!cfg) return null;
  const res = await fetch(`${BASE}/api/transactioncreate/qris`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ project: cfg.project, order_id: orderId, amount, api_key: cfg.apiKey }),
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Pakasir create gagal (${res.status}): ${await res.text().catch(() => "")}`);
  }
  const data = (await res.json()) as { payment?: PakasirPayment } & PakasirPayment;
  const p = data.payment ?? data;
  if (!p?.payment_number) throw new Error("Pakasir: payment_number kosong");
  return {
    paymentNumber: p.payment_number,
    totalPayment: typeof p.total_payment === "number" ? p.total_payment : amount,
    fee: typeof p.fee === "number" ? p.fee : 0,
    expiredAt: p.expired_at ?? "",
  };
}

export interface PakasirStatus {
  status: string; // "completed" | "pending" | ...
  paymentMethod?: string;
}

/** Check a transaction's status. `amount` MUST equal the amount we charged. */
export async function checkStatus(orderId: string, amount: number): Promise<PakasirStatus | null> {
  const cfg = pakasirConfig();
  if (!cfg) return null;
  const url =
    `${BASE}/api/transactiondetail?project=${encodeURIComponent(cfg.project)}` +
    `&amount=${amount}&order_id=${encodeURIComponent(orderId)}&api_key=${encodeURIComponent(cfg.apiKey)}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return null;
  const data = (await res.json()) as { transaction?: { status?: string; payment_method?: string } } & {
    status?: string;
    payment_method?: string;
  };
  const t = data.transaction ?? data;
  return { status: t?.status ?? "pending", paymentMethod: t?.payment_method };
}

/** Verify with Pakasir whether an order is paid; if so, mark it paid → Diproses.
 *  Used by the customer status poll and the webhook. Re-checks the gateway
 *  directly so it can't be spoofed. */
export async function confirmIfPaid(orderId: string): Promise<{ order: Order | null; paid: boolean }> {
  const order = await getOrder(orderId);
  if (!order) return { order: null, paid: false };
  if (order.paid) return { order, paid: true };
  const st = await checkStatus(orderId, order.total);
  if (st && st.status === "completed") {
    const updated = await updateOrder(orderId, {
      paid: true,
      status: ORDER_STATUS.COOKING,
      payDetail: "QRIS (Pakasir)",
      note: "Pembayaran QRIS terverifikasi otomatis",
    });
    return { order: updated, paid: true };
  }
  return { order, paid: false };
}
