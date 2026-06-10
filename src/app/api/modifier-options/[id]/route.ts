export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { updateModifierOption, deleteModifierOption } from "@/lib/store";
import { getServerSession } from "@/lib/session";

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await ctx.params;
    const body = (await req.json()) as { label?: string; price?: number; isDefault?: boolean; sort?: number };
    const patch: { label?: string; price?: number; isDefault?: boolean; sort?: number } = {};
    if (typeof body.label === "string") patch.label = body.label.trim();
    if (typeof body.price === "number" && body.price >= 0) patch.price = Math.round(body.price);
    if (typeof body.isDefault === "boolean") patch.isDefault = body.isDefault;
    if (typeof body.sort === "number") patch.sort = body.sort;
    await updateModifierOption(id, patch);
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
    await deleteModifierOption(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String((err as Error)?.message ?? err) }, { status: 400 });
  }
}
