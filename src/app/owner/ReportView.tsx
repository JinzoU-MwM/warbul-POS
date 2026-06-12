"use client";
import { useEffect, useState, type JSX } from "react";
import { getSalesReport, reportCsvUrl } from "@/lib/api";
import { rupiah } from "@/lib/constants";
import { Icons } from "@/components";
import type { SalesReport, ReportRange } from "@/lib/analytics";

const TABS: { k: ReportRange; l: string }[] = [
  { k: "week", l: "Minggu Ini" },
  { k: "lastweek", l: "Minggu Lalu" },
  { k: "month", l: "Bulan Ini" },
];

function CubeIcon({ size = 22, color = "currentColor" }: { size?: number; color?: string }): JSX.Element {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3Z" stroke={color} strokeWidth="2" strokeLinejoin="round" />
      <path d="M4 7.5l8 4.5 8-4.5M12 12v9" stroke={color} strokeWidth="2" />
    </svg>
  );
}
function AvgIcon({ size = 22, color = "currentColor" }: { size?: number; color?: string }): JSX.Element {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke={color} strokeWidth="2" />
      <path d="M8 13c1.5 1.5 6.5 1.5 8 0M12 7v2M12 15v2" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function fmtDate(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

export function ReportView() {
  const [range, setRange] = useState<ReportRange>("week");
  const [report, setReport] = useState<SalesReport | null>(null);

  useEffect(() => {
    getSalesReport(range).then(setReport).catch(() => {});
  }, [range]);

  const tot = report
    ? report.daily.reduce(
        (a, r) => ({
          orders: a.orders + r.orders,
          gross: a.gross + r.gross,
          discount: a.discount + r.discount,
          net: a.net + r.net,
        }),
        { orders: 0, gross: 0, discount: 0, net: 0 },
      )
    : { orders: 0, gross: 0, discount: 0, net: 0 };

  const noteRange = TABS.find((t) => t.k === range)?.l ?? "";

  return (
    <>
      <header
        className="owner-hdr"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "20px 28px",
          borderBottom: "1px solid var(--line,#E6DBC4)",
          background: "var(--paper-2)",
          flexWrap: "wrap",
          gap: 14,
        }}
      >
        <div>
          <div className="brand" style={{ fontSize: 23, fontWeight: 700 }}>Laporan Penjualan</div>
          <div style={{ fontSize: 13, color: "#8b7f6c", marginTop: 2 }}>Rincian performa penjualan & transaksi</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div className="owner-rangebar">
            {TABS.map((t) => (
              <button
                key={t.k}
                className={"owner-rangebtn" + (range === t.k ? " on" : "")}
                onClick={() => setRange(t.k)}
              >
                {t.l}
              </button>
            ))}
          </div>
          <a href={reportCsvUrl(range)} download className="owner-exportbtn">
            <Icons.cart size={16} /> Ekspor CSV
          </a>
        </div>
      </header>

      <div className="owner-body" style={{ flex: 1, overflowY: "auto", padding: "22px 28px 40px" }}>
        {report && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 14 }}>
              {[
                { l: "Pendapatan Bersih", v: rupiah(report.summary.net), Icon: Icons.wallet, c: "var(--green-700)", bg: "#E4EEE4" },
                { l: "Total Pesanan", v: report.summary.orders.toLocaleString("id-ID"), Icon: Icons.bag, c: "var(--coffee)", bg: "#F1E6D6" },
                { l: "Rata-rata / Pesanan", v: rupiah(report.summary.avg), Icon: AvgIcon, c: "var(--blue)", bg: "#E0EAF0" },
                { l: "Total Diskon", v: rupiah(report.summary.discount), Icon: CubeIcon, c: "var(--orange-600)", bg: "#F8EAD6" },
              ].map((c) => (
                <div key={c.l} className="owner-card owner-kpi">
                  <div style={{ width: 42, height: 42, borderRadius: 12, background: c.bg, color: c.c, display: "grid", placeItems: "center" }}>
                    <c.Icon size={22} color={c.c} />
                  </div>
                  <div style={{ fontSize: 13, color: "#8b7f6c", marginTop: 14, fontWeight: 600 }}>{c.l}</div>
                  <div className="num" style={{ fontSize: 25, marginTop: 3 }}>{c.v}</div>
                </div>
              ))}
            </div>

            <div className="owner-card" style={{ marginTop: 18, padding: "20px 22px" }}>
              <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>Rincian Harian</div>
              <div style={{ fontSize: 12.5, color: "#8b7f6c", marginBottom: 8 }}>{noteRange}</div>
              <div style={{ overflowX: "auto" }}>
                <table className="owner-table" style={{ minWidth: 580 }}>
                  <thead>
                    <tr>
                      <th>HARI</th>
                      <th style={{ textAlign: "right" }}>PESANAN</th>
                      <th style={{ textAlign: "right" }}>KOTOR</th>
                      <th style={{ textAlign: "right" }}>DISKON</th>
                      <th style={{ textAlign: "right" }}>BERSIH</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.daily.map((r) => (
                      <tr key={r.date} className="owner-rtr">
                        <td>
                          <div style={{ fontWeight: 700 }}>{r.label}</div>
                          <div style={{ fontSize: 11.5, color: "#a99c86" }}>{fmtDate(r.date)}</div>
                        </td>
                        <td style={{ textAlign: "right", color: "#6f6353" }}>{r.orders}</td>
                        <td style={{ textAlign: "right" }}>{rupiah(r.gross)}</td>
                        <td style={{ textAlign: "right", color: "var(--orange-600)" }}>−{rupiah(r.discount)}</td>
                        <td style={{ textAlign: "right" }}>
                          <span className="num" style={{ color: "var(--coffee)" }}>{rupiah(r.net)}</span>
                        </td>
                      </tr>
                    ))}
                    <tr style={{ borderTop: "2px solid var(--green-800)" }}>
                      <td style={{ padding: "13px 8px", fontWeight: 800 }}>Total</td>
                      <td style={{ padding: "13px 8px", textAlign: "right", fontWeight: 800 }}>{tot.orders}</td>
                      <td style={{ padding: "13px 8px", textAlign: "right", fontWeight: 800 }}>{rupiah(tot.gross)}</td>
                      <td style={{ padding: "13px 8px", textAlign: "right", fontWeight: 800, color: "var(--orange-600)" }}>−{rupiah(tot.discount)}</td>
                      <td style={{ padding: "13px 8px", textAlign: "right" }}>
                        <span className="num" style={{ fontSize: 16, color: "var(--coffee)" }}>{rupiah(tot.net)}</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <PaymentSummary report={report} />
          </>
        )}
      </div>
    </>
  );
}

function PaymentSummary({ report }: { report: SalesReport }) {
  const { qris, kasir } = report.payment;
  const totalRev = qris.revenue + kasir.revenue;
  const qrisPct = totalRev > 0 ? Math.round((qris.revenue / totalRev) * 100) : 0;
  const rows = [
    { l: "QRIS", o: qris.count, v: qris.revenue },
    { l: "Bayar di Kasir", o: kasir.count, v: kasir.revenue },
  ];
  return (
    <div className="owner-card" style={{ marginTop: 18, padding: "20px 22px", maxWidth: 520 }}>
      <div style={{ fontWeight: 700, fontSize: 16 }}>Ringkasan Metode Bayar</div>
      <div style={{ fontSize: 12.5, color: "#8b7f6c", marginTop: 2, marginBottom: 16 }}>Total pendapatan per metode</div>
      {rows.map((p) => (
        <div
          key={p.l}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "13px 0",
            borderTop: "1px solid var(--line,#E6DBC4)",
          }}
        >
          <div>
            <div style={{ fontWeight: 700, fontSize: 14 }}>{p.l}</div>
            <div style={{ fontSize: 12, color: "#8b7f6c", marginTop: 2 }}>{p.o} transaksi</div>
          </div>
          <span className="num" style={{ fontSize: 16, color: "var(--coffee)" }}>{rupiah(p.v)}</span>
        </div>
      ))}
      <div
        style={{
          marginTop: 14,
          padding: "12px 14px",
          background: "var(--green-ok-bg)",
          borderRadius: 12,
          fontSize: 12.5,
          color: "var(--green-ok)",
          fontWeight: 600,
        }}
      >
        QRIS menyumbang {qrisPct}% dari total pendapatan pada periode ini.
      </div>
    </div>
  );
}
