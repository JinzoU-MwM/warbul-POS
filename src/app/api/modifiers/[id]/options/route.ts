export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { createModifierOption } from "@/lib/store";
import { getServerSession } from "@/lib/session";

// POST (authed): add an option to a modifier group.
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await ctx.params;
    const body = (await req.json()) as { label?: string; price?: number; isDefault?: boolean };
    if (!body.label?.trim()) throw new Error("Nama opsi wajib diisi");
    const price = typeof body.price === "number" && body.price >= 0 ? Math.round(body.price) : 0;
    const optId = await createModifierOption({ groupId: id, label: body.label.trim(), price, isDefault: !!body.isDefault });
    return NextResponse.json({ id: optId }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: String((err as Error)?.message ?? err) }, { status: 400 });
  }
}
