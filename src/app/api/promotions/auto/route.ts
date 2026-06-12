export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getAutoDiscounts } from "@/lib/store";

export async function GET(req: NextRequest) {
  try {
    const p = req.nextUrl.searchParams;
    const subtotal = Number(p.get("subtotal") ?? 0);
    const qty = Number(p.get("qty") ?? 0);
    const cats = p.get("categories") ?? "";
    const categories = cats ? cats.split(",").map((c) => c.trim()).filter(Boolean) : [];
    const applied = await getAutoDiscounts({ subtotal, qty, categories });
    return NextResponse.json({ applied });
  } catch (err) {
    return NextResponse.json({ error: String((err as Error)?.message ?? err) }, { status: 400 });
  }
}
