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
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await ctx.params;
    const existing = await getOrder(id);
    if (!existing) return NextResponse.json({ order: null }, { status: 404 });

    const patch = (await req.json()) as Partial<Order>;

    if (patch.status === ORDER_STATUS.CANCELLED && existing.status !== ORDER_STATUS.WAIT_PAY) {
      return NextResponse.json({ error: "Pesanan sudah dibayar, tidak bisa dibatalkan" }, { status: 409 });
    }

    const order = await updateOrder(id, patch);
    return NextResponse.json({ order });
  } catch (err) {
    return NextResponse.json({ error: String((err as Error)?.message ?? err) }, { status: 400 });
  }
}
