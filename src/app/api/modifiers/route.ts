export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getModifierGroups, createModifierGroup } from "@/lib/store";
import { getServerSession } from "@/lib/session";
import { CATS } from "@/lib/constants";
import type { Category, ModType } from "@/lib/types";

// GET (public): list modifier groups — read by the customer menu + cashier ticket.
export async function GET() {
  try {
    return NextResponse.json({ groups: await getModifierGroups() });
  } catch (err) {
    return NextResponse.json({ error: String((err as Error)?.message ?? err) }, { status: 400 });
  }
}

// POST (authed): create a modifier group.
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body = (await req.json()) as { name?: string; type?: string; categories?: string[] };
    if (!body.name?.trim()) throw new Error("Nama grup wajib diisi");
    const type: ModType = body.type === "multi" ? "multi" : "single";
    const categories = (body.categories ?? []).filter((c): c is Category => CATS.includes(c as Category));
    const id = await createModifierGroup({ name: body.name.trim(), type, categories });
    return NextResponse.json({ id }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: String((err as Error)?.message ?? err) }, { status: 400 });
  }
}
