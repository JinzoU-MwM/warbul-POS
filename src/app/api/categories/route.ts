export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getCategories, createCategory } from "@/lib/store";
import { getServerSession } from "@/lib/session";

export async function GET() {
  try {
    return NextResponse.json(await getCategories());
  } catch (err) {
    return NextResponse.json({ error: String((err as Error)?.message ?? err) }, { status: 400 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { name } = (await req.json()) as { name?: string };
    if (typeof name !== "string") throw new Error("name wajib diisi");
    const cat = await createCategory(name);
    return NextResponse.json(cat, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: String((err as Error)?.message ?? err) }, { status: 400 });
  }
}
