export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/session";
import { computeReport, reportToCsv, type ReportRange } from "@/lib/analytics";

const RANGES: ReportRange[] = ["week", "lastweek", "month"];

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const raw = req.nextUrl.searchParams.get("range") ?? "week";
    const range: ReportRange = (RANGES as string[]).includes(raw) ? (raw as ReportRange) : "week";

    const report = await computeReport(range);

    if (req.nextUrl.searchParams.get("format") === "csv") {
      const csv = reportToCsv(report);
      return new NextResponse(csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": 'attachment; filename="laporan.csv"',
        },
      });
    }

    return NextResponse.json(report);
  } catch (err) {
    return NextResponse.json({ error: String((err as Error)?.message ?? err) }, { status: 400 });
  }
}
