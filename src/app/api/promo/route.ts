export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { applyPromo } from "@/lib/promos";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { code?: unknown; subtotal?: unknown };
    const code = String(body.code ?? "");
    const subtotal = Number(body.subtotal ?? 0);
    const result = applyPromo(code, subtotal);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: String((err as { message?: unknown })?.message ?? err) },
      { status: 400 }
    );
  }
}
