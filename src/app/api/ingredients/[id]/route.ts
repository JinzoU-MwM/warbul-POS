export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { updateIngredient, deleteIngredient } from "@/lib/store";
import { getServerSession } from "@/lib/session";

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await ctx.params;
    const b = (await req.json()) as { name?: string; unit?: string; stock?: number; lowThreshold?: number };
    const patch: { name?: string; unit?: string; stock?: number; lowThreshold?: number } = {};
    if (typeof b.name === "string") patch.name = b.name.trim();
    if (typeof b.unit === "string") patch.unit = b.unit.trim();
    if (typeof b.stock === "number") patch.stock = b.stock;
    if (typeof b.lowThreshold === "number") patch.lowThreshold = b.lowThreshold;
    await updateIngredient(id, patch);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String((err as Error)?.message ?? err) }, { status: 400 });
  }
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await ctx.params;
    await deleteIngredient(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String((err as Error)?.message ?? err) }, { status: 400 });
  }
}
