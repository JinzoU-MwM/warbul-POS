export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { applyDiscounts } from "@/lib/store";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { code?: unknown; subtotal?: unknown; qty?: unknown; categories?: unknown };
    const code = String(body.code ?? "").trim().toUpperCase();
    const subtotal = Number(body.subtotal ?? 0);
    const qty = Number(body.qty ?? 0);
    const categories = Array.isArray(body.categories)
      ? (body.categories as unknown[]).filter((c): c is string => typeof c === "string")
      : [];
    const result = await applyDiscounts({ subtotal, qty, categories, voucherCode: code });
    const voucher = result.applied.find((a) => a.code === code);
    return NextResponse.json({
      ok: !!voucher,
      amount: voucher?.amount ?? 0,
      name: voucher?.name ?? "",
      code: voucher?.code ?? code,
      message: voucher ? `Diskon ${voucher.name} diterapkan` : "Kode tidak berlaku",
    });
  } catch (err) {
    return NextResponse.json({ ok: false, amount: 0, message: String((err as Error)?.message ?? err) }, { status: 200 });
  }
}
