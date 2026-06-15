export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getProduct, updateProduct, deleteProduct } from "@/lib/store";
import { getServerSession } from "@/lib/session";
import type { Product } from "@/lib/types";

const PATCHABLE = [
  "name",
  "price",
  "cat",
  "g",
  "grad",
  "tag",
  "available",
  "stock",
  "desc",
  "image",
] as const;

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await ctx.params;
    const existing = await getProduct(id);
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = (await req.json()) as Partial<Product>;
    const patch: Partial<Product> = {};
    for (const k of PATCHABLE) {
      if (k in body) (patch as Record<string, unknown>)[k] = (body as Record<string, unknown>)[k];
    }

    const product = await updateProduct(id, patch);
    return NextResponse.json({ product });
  } catch (err) {
    return NextResponse.json(
      { error: String((err as { message?: unknown })?.message ?? err) },
      { status: 400 }
    );
  }
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await ctx.params;
    const existing = await getProduct(id);
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await deleteProduct(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: String((err as { message?: unknown })?.message ?? err) },
      { status: 400 }
    );
  }
}
