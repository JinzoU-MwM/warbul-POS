export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/session";
import { computeSummary, type SummaryRange } from "@/lib/analytics";

const RANGES: SummaryRange[] = ["today", "7d", "30d"];

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const raw = req.nextUrl.searchParams.get("range") ?? "today";
    const range: SummaryRange = (RANGES as string[]).includes(raw) ? (raw as SummaryRange) : "today";

    const summary = await computeSummary(range);
    return NextResponse.json(summary);
  } catch (err) {
    return NextResponse.json({ error: String((err as Error)?.message ?? err) }, { status: 400 });
  }
}
