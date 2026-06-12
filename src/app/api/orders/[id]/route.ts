export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getOrder, updateOrder } from "@/lib/store";
import { getServerSession } from "@/lib/session";
import { ORDER_STATUS } from "@/lib/types";
import type { Order } from "@/lib/types";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const order = await getOrder(id);
    if (!order) return NextResponse.json({ order: null }, { status: 404 });
    return NextResponse.json({ order });
  } catch (err) {
    return NextResponse.json({ error: String((err as Error)?.message ?? err) }, { status: 400 });
  }
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession();
    const { id } = await ctx.params;
    const existing = await getOrder(id);
    if (!existing) return NextResponse.json({ order: null }, { status: 404 });

    const rawBody = (await req.json()) as Partial<Order> & { table?: number };

    // Unauthenticated customers may only cancel their own UNPAID orders on their own table.
    const isCustomerCancel = !session?.user && rawBody.status === ORDER_STATUS.CANCELLED;
    if (!session?.user && !isCustomerCancel) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let patch: Partial<Order>;
    if (isCustomerCancel) {
      // Ownership check: the client must echo the order's table number.
      if (rawBody.table === undefined || rawBody.table !== existing.table) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      // Strip to only the safe status field — ignore every other field the client sent.
      patch = { status: ORDER_STATUS.CANCELLED };
    } else {
      patch = rawBody;
    }

    // Block cancellation once paid (guards against webhook race where paid=true but status still WAIT_PAY).
    if (patch.status === ORDER_STATUS.CANCELLED && (existing.status !== ORDER_STATUS.WAIT_PAY || existing.paid)) {
      return NextResponse.json({ error: "Pesanan sudah dibayar, tidak bisa dibatalkan" }, { status: 409 });
    }

    const order = await updateOrder(id, patch);
    return NextResponse.json({ order });
  } catch (err) {
    return NextResponse.json({ error: String((err as Error)?.message ?? err) }, { status: 400 });
  }
}
