export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getSettings } from "@/lib/store";

// Public, customer-safe slice of store settings (no secrets). Lets the customer
// menu show the live service fee + which payment methods are enabled.
export async function GET() {
  try {
    const s = await getSettings();
    return NextResponse.json({
      storeName: s.storeName,
      serviceFee: s.serviceFee,
      payQris: s.payQris,
      payKasir: s.payKasir,
    });
  } catch (err) {
    return NextResponse.json({ error: String((err as Error)?.message ?? err) }, { status: 400 });
  }
}
