export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { renameCategory, deleteCategory } from "@/lib/store";
import { getServerSession } from "@/lib/session";

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await ctx.params;
    const { name } = (await req.json()) as { name?: string };
    if (typeof name !== "string") throw new Error("name wajib diisi");
    await renameCategory(id, name);
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
    await deleteCategory(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String((err as Error)?.message ?? err) }, { status: 409 });
  }
}
