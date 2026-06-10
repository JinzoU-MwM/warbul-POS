export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { confirmIfPaid } from "@/lib/pakasir";

// Customer-driven poll: checks Pakasir for an order's payment and, if completed,
// marks it paid → Diproses. Works in dev (no public webhook needed).
export async function GET(req: NextRequest) {
  const orderId = req.nextUrl.searchParams.get("order");
  if (!orderId) return NextResponse.json({ error: "missing ?order" }, { status: 400 });
  try {
    const { order, paid } = await confirmIfPaid(orderId);
    if (!order) return NextResponse.json({ order: null, paid: false }, { status: 404 });
    return NextResponse.json({ order, paid });
  } catch (err) {
    return NextResponse.json({ error: String((err as Error)?.message ?? err) }, { status: 400 });
  }
}
