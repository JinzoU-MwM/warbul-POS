export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getOrders, addOrder, updateOrder, type OrderFilter, type CreateOrderInput } from "@/lib/store";
import { getServerSession } from "@/lib/session";
import { createQris } from "@/lib/pakasir";
import type { Order, OrderMethod, OrderStatus } from "@/lib/types";

// For an unpaid QRIS order, open a Pakasir QRIS charge and attach it to the
// order so the customer can scan a real QRIS. Failure is non-fatal (the cashier
// can still verify manually).
async function withQrisCharge(order: Order): Promise<Order> {
  if (order.method !== "qris" || order.paid) return order;
  try {
    const charge = await createQris(order.id, order.total);
    if (charge) return (await updateOrder(order.id, { pakasir: charge })) ?? order;
  } catch (err) {
    console.error("Pakasir charge failed for", order.id, err);
  }
  return order;
}

const FILTERS: OrderFilter[] = ["all", "active", "Menunggu Pembayaran", "Diproses", "Selesai"];

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const raw = req.nextUrl.searchParams.get("filter") ?? "all";
    const filter: OrderFilter = (FILTERS as string[]).includes(raw) ? (raw as OrderFilter) : "all";
    const orders = await getOrders(filter);
    return NextResponse.json({ orders });
  } catch (err) {
    return NextResponse.json({ error: String((err as Error)?.message ?? err) }, { status: 400 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();
    const body = (await req.json()) as Partial<CreateOrderInput> & Record<string, unknown>;

    const lines = Array.isArray(body.lines) ? body.lines : [];

    if (session?.user) {
      // Cashier walk-in: allow paid/status/payDetail and full method set through.
      const input: CreateOrderInput = {
        table: Number(body.table ?? 0),
        method: (body.method as OrderMethod) ?? "tunai",
        lines,
        promoCode: (body.promoCode as string | null | undefined) ?? null,
        phone: (body.phone as string | null | undefined) ?? null,
        paid: body.paid as boolean | undefined,
        status: body.status as OrderStatus | undefined,
        payDetail: (body.payDetail as string | null | undefined) ?? undefined,
        note: body.note as string | undefined,
      };
      const order = await withQrisCharge(await addOrder(input));
      return NextResponse.json({ order }, { status: 201 });
    }

    // Anonymous customer: ignore any client-sent paid/status/payDetail so the
    // store applies safe defaults (paid:false, "Menunggu Pembayaran").
    const method = body.method === "qris" || body.method === "kasir" ? (body.method as OrderMethod) : "kasir";
    const input: CreateOrderInput = {
      table: Number(body.table ?? 0),
      method,
      lines,
      promoCode: (body.promoCode as string | null | undefined) ?? null,
      phone: (body.phone as string | null | undefined) ?? null,
      paid: undefined,
      status: undefined,
      payDetail: undefined,
    };
    const order = await withQrisCharge(await addOrder(input));
    return NextResponse.json({ order }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: String((err as Error)?.message ?? err) }, { status: 400 });
  }
}
