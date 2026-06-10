export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getIngredients, createIngredient } from "@/lib/store";
import { getServerSession } from "@/lib/session";

export async function GET() {
  try {
    const session = await getServerSession();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ ingredients: await getIngredients() });
  } catch (err) {
    return NextResponse.json({ error: String((err as Error)?.message ?? err) }, { status: 400 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const b = (await req.json()) as { name?: string; unit?: string; stock?: number; lowThreshold?: number };
    if (!b.name?.trim()) throw new Error("Nama bahan wajib diisi");
    const id = await createIngredient({
      name: b.name.trim(), unit: (b.unit || "pcs").trim(),
      stock: Number(b.stock) || 0, lowThreshold: Number(b.lowThreshold) || 0,
    });
    return NextResponse.json({ id }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: String((err as Error)?.message ?? err) }, { status: 400 });
  }
}
