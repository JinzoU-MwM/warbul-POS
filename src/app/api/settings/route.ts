export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getSettings, saveSettings } from "@/lib/store";
import { getServerSession } from "@/lib/session";
import type { StoreSettings } from "@/lib/types";

export async function GET() {
  try {
    const session = await getServerSession();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const settings = await getSettings();
    return NextResponse.json({ settings });
  } catch (err) {
    return NextResponse.json(
      { error: String((err as { message?: unknown })?.message ?? err) },
      { status: 400 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const patch = (await req.json()) as Partial<StoreSettings>;
    const settings = await saveSettings(patch);
    return NextResponse.json({ settings });
  } catch (err) {
    return NextResponse.json(
      { error: String((err as { message?: unknown })?.message ?? err) },
      { status: 400 }
    );
  }
}
