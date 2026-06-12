export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/session";
import { getPromotions, createPromotion } from "@/lib/store";
import type { Promotion } from "@/lib/types";

export async function GET() {
  try {
    const session = await getServerSession();
    if (session?.user?.role !== "owner") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const list = await getPromotions();
    return NextResponse.json({ promotions: list });
  } catch (err) {
    return NextResponse.json({ error: String((err as Error)?.message ?? err) }, { status: 400 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (session?.user?.role !== "owner") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body = (await req.json()) as Omit<Promotion, "id" | "usedCount">;
    if (!body.name?.trim()) throw new Error("Nama wajib diisi");
    if (!["voucher", "auto"].includes(body.kind)) throw new Error("kind tidak valid");
    if (!["flat", "pct"].includes(body.valueType)) throw new Error("valueType tidak valid");
    if (typeof body.value !== "number" || body.value < 0) throw new Error("value tidak valid");
    if (body.kind === "voucher" && !body.code?.trim()) throw new Error("Kode voucher wajib diisi");
    const promo = await createPromotion(body);
    return NextResponse.json({ promotion: promo }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: String((err as Error)?.message ?? err) }, { status: 400 });
  }
}
