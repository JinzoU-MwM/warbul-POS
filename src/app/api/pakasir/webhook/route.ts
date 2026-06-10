export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { confirmIfPaid } from "@/lib/pakasir";
import { getOrder } from "@/lib/store";

// Pakasir payment webhook (configure this URL in the Pakasir dashboard):
//   https://<your-domain>/api/pakasir/webhook
// Body: { amount, order_id, project, status, payment_method, completed_at }
// We never trust the webhook blindly — confirmIfPaid re-checks the gateway, and
// we verify the amount matches our order total.
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { amount?: number; order_id?: string; status?: string };
    const orderId = body.order_id;
    if (!orderId) return NextResponse.json({ error: "missing order_id" }, { status: 400 });
    if (body.status !== "completed") return NextResponse.json({ ok: true, ignored: true });

    const order = await getOrder(orderId);
    if (!order) return NextResponse.json({ ok: true, unknown: true });
    if (typeof body.amount === "number" && body.amount !== order.total) {
      return NextResponse.json({ error: "amount mismatch" }, { status: 400 });
    }

    const { paid } = await confirmIfPaid(orderId);
    return NextResponse.json({ ok: true, paid });
  } catch (err) {
    return NextResponse.json({ error: String((err as Error)?.message ?? err) }, { status: 400 });
  }
}
