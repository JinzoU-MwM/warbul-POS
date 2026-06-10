export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getRecipe, setRecipe, type RecipeOwner } from "@/lib/store";
import { getServerSession } from "@/lib/session";
import type { RecipeItem } from "@/lib/types";

function ownerType(v: string | null): RecipeOwner | null {
  return v === "product" || v === "option" ? v : null;
}

// GET ?ownerType=product|option&ownerId=... → { recipe: RecipeRow[] }
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const t = ownerType(req.nextUrl.searchParams.get("ownerType"));
    const ownerId = req.nextUrl.searchParams.get("ownerId");
    if (!t || !ownerId) return NextResponse.json({ error: "ownerType & ownerId required" }, { status: 400 });
    return NextResponse.json({ recipe: await getRecipe(t, ownerId) });
  } catch (err) {
    return NextResponse.json({ error: String((err as Error)?.message ?? err) }, { status: 400 });
  }
}

// PUT { ownerType, ownerId, items: [{ingredientId, qty}] } → replace recipe
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const b = (await req.json()) as { ownerType?: string; ownerId?: string; items?: RecipeItem[] };
    const t = ownerType(b.ownerType ?? null);
    if (!t || !b.ownerId) return NextResponse.json({ error: "ownerType & ownerId required" }, { status: 400 });
    const items = (b.items ?? []).filter((i) => i.ingredientId && Number(i.qty) > 0);
    await setRecipe(t, b.ownerId, items);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String((err as Error)?.message ?? err) }, { status: 400 });
  }
}
