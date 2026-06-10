export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getMember } from "@/lib/store";

export async function GET(req: NextRequest, ctx: { params: Promise<{ phone: string }> }) {
  try {
    const { phone } = await ctx.params;
    const member = await getMember(decodeURIComponent(phone));
    return NextResponse.json({ member });
  } catch (err) {
    return NextResponse.json(
      { error: String((err as { message?: unknown })?.message ?? err) },
      { status: 400 }
    );
  }
}
