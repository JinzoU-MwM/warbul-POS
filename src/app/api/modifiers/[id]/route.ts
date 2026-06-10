export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { updateModifierGroup, deleteModifierGroup } from "@/lib/store";
import { getServerSession } from "@/lib/session";
import { CATS } from "@/lib/constants";
import type { Category, ModType } from "@/lib/types";

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await ctx.params;
    const body = (await req.json()) as { name?: string; type?: string; categories?: string[]; sort?: number };
    const patch: { name?: string; type?: ModType; categories?: Category[]; sort?: number } = {};
    if (typeof body.name === "string") patch.name = body.name.trim();
    if (body.type === "single" || body.type === "multi") patch.type = body.type;
    if (Array.isArray(body.categories)) patch.categories = body.categories.filter((c): c is Category => CATS.includes(c as Category));
    if (typeof body.sort === "number") patch.sort = body.sort;
    await updateModifierGroup(id, patch);
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
    await deleteModifierGroup(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String((err as Error)?.message ?? err) }, { status: 400 });
  }
}
