export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/session";
import { computeReport, reportToCsv, type ReportRange } from "@/lib/analytics";

const PRESETS = new Set(["week", "lastweek", "month", "lastmonth"]);

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Accept a preset tab or a specific calendar month "YYYY-MM" (the month picker).
    const raw = req.nextUrl.searchParams.get("range") ?? "week";
    const range: ReportRange = PRESETS.has(raw) || /^\d{4}-\d{2}$/.test(raw) ? raw : "week";

    const report = await computeReport(range);

    if (req.nextUrl.searchParams.get("format") === "csv") {
      const csv = reportToCsv(report);
      // Filename carries the period so downloads don't overwrite each other,
      // e.g. "laporan-juli-2026.csv", "laporan-minggu-ini.csv".
      const slug = report.label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
      const filename = `laporan-${slug || "penjualan"}.csv`;
      return new NextResponse(csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    }

    return NextResponse.json(report);
  } catch (err) {
    return NextResponse.json({ error: String((err as Error)?.message ?? err) }, { status: 400 });
  }
}
