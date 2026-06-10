"use client";
import { useCallback, useEffect, useState } from "react";
import { getAnalyticsSummary, reportCsvUrl } from "@/lib/api";
import { useLive } from "@/lib/use-live";
import { rupiah } from "@/lib/constants";
import { Icons, StatusPill } from "@/components";
import type { AnalyticsSummary, SummaryRange } from "@/lib/analytics";
import { AreaChart, Donut, TopMenuBars, CategoryBars } from "./charts";
import type { JSX } from "react";

// `cube` / `avg` are owner-only KPI glyphs not in the shared Icons set.
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

const RANGES: { k: SummaryRange; l: string }[] = [
  { k: "today", l: "Hari Ini" },
  { k: "7d", l: "7 Hari" },
  { k: "30d", l: "30 Hari" },
];

const RANGE_NOTE: Record<SummaryRange, string> = {
  today: "Pendapatan per jam",
  "7d": "Pendapatan 7 hari terakhir",
  "30d": "Pendapatan per minggu",
};

export function OverviewView({ userName }: { userName: string }) {
  const [range, setRange] = useState<SummaryRange>("today");
  const [data, setData] = useState<AnalyticsSummary | null>(null);

  const refetch = useCallback(() => {
    getAnalyticsSummary(range).then(setData).catch(() => {});
  }, [range]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  useLive(["orders", "menu"], refetch);

  const firstName = userName.split(/\s+/)[0];
  const today = new Date().toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <>
      <header
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
          <div className="brand" style={{ fontSize: 23, fontWeight: 700 }}>Halo, {firstName} 👋</div>
          <div style={{ fontSize: 13, color: "#8b7f6c", marginTop: 2 }}>Ringkasan bisnis · {today}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div className="owner-rangebar">
            {RANGES.map((r) => (
              <button
                key={r.k}
                className={"owner-rangebtn" + (range === r.k ? " on" : "")}
                onClick={() => setRange(r.k)}
              >
                {r.l}
              </button>
            ))}
          </div>
          <button className="owner-iconbtn">
            <Icons.bell size={19} />
            <span
              style={{ position: "absolute", top: 9, right: 9, width: 8, height: 8, borderRadius: 9, background: "var(--orange)" }}
            />
          </button>
          <a href={reportCsvUrl("week")} download className="owner-exportbtn">
            <Icons.cart size={16} /> Ekspor
          </a>
        </div>
      </header>

      <div style={{ flex: 1, overflowY: "auto", padding: "22px 28px 40px" }}>
        {data && (
          <>
            <KpiCards data={data} />
            {data.lowStock.length > 0 && <LowStockAlert data={data} />}

            <div
              className="owner-grid2"
              style={{ display: "grid", gridTemplateColumns: "1.7fr 1fr", gap: 18, marginTop: 18 }}
            >
              <div className="owner-card" style={{ padding: "20px 22px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 16 }}>Tren Pendapatan</div>
                    <div style={{ fontSize: 12.5, color: "#8b7f6c", marginTop: 2 }}>{RANGE_NOTE[range]}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div className="num" style={{ fontSize: 22, color: "var(--coffee)" }}>{rupiah(data.revenue)}</div>
                    <div style={{ fontSize: 12, color: "var(--green-ok)", fontWeight: 700 }}>
                      {data.deltas.revenue >= 0 ? "▲" : "▼"} {Math.abs(data.deltas.revenue)}% total
                    </div>
                  </div>
                </div>
                <AreaChart points={data.trend} />
              </div>

              <div className="owner-card" style={{ padding: "20px 22px", display: "flex", flexDirection: "column" }}>
                <div style={{ fontWeight: 700, fontSize: 16 }}>Metode Pembayaran</div>
                <div style={{ fontSize: 12.5, color: "#8b7f6c", marginTop: 2 }}>Distribusi transaksi</div>
                <Donut qris={data.paymentMix.qris} kasir={data.paymentMix.kasir} />
              </div>
            </div>

            <div
              className="owner-grid2"
              style={{ display: "grid", gridTemplateColumns: "1.25fr 1fr", gap: 18, marginTop: 18 }}
            >
              <div className="owner-card" style={{ padding: "20px 22px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 16 }}>Menu Terlaris</div>
                    <div style={{ fontSize: 12.5, color: "#8b7f6c", marginTop: 2 }}>Berdasarkan porsi terjual</div>
                  </div>
                  <span className="owner-pill" style={{ background: "var(--cream)", color: "var(--coffee)" }}>
                    {RANGES.find((r) => r.k === range)?.l}
                  </span>
                </div>
                <TopMenuBars items={data.topMenu} />
              </div>

              <div className="owner-card" style={{ padding: "20px 22px" }}>
                <div style={{ fontWeight: 700, fontSize: 16 }}>Penjualan per Kategori</div>
                <div style={{ fontSize: 12.5, color: "#8b7f6c", marginTop: 2 }}>Porsi dari total</div>
                <CategoryBars items={data.categoryBreakdown} />
              </div>
            </div>

            <RecentTable data={data} />
          </>
        )}
      </div>
    </>
  );
}

function KpiCards({ data }: { data: AnalyticsSummary }) {
  type IconFn = (p: { size?: number; color?: string }) => JSX.Element;
  const cards: {
    l: string;
    v: string;
    delta: number;
    Icon: IconFn;
    c: string;
    bg: string;
    sub: string;
  }[] = [
    { l: "Pendapatan", v: rupiah(data.revenue), delta: data.deltas.revenue, Icon: Icons.wallet, c: "var(--green-700)", bg: "#E4EEE4", sub: "vs periode sebelumnya" },
    { l: "Total Pesanan", v: data.orders.toLocaleString("id-ID"), delta: data.deltas.orders, Icon: Icons.bag, c: "var(--coffee)", bg: "#F1E6D6", sub: "vs periode sebelumnya" },
    { l: "Rata-rata / Pesanan", v: rupiah(data.avg), delta: data.deltas.avg, Icon: AvgIcon, c: "var(--blue)", bg: "#E0EAF0", sub: "vs periode sebelumnya" },
    { l: "Menu Terjual", v: data.itemsSold.toLocaleString("id-ID"), delta: data.deltas.itemsSold, Icon: CubeIcon, c: "var(--orange-600)", bg: "#F8EAD6", sub: "vs periode sebelumnya" },
  ];
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 18 }}>
      {cards.map((c) => {
        const Icon = c.Icon;
        const up = c.delta >= 0;
        return (
          <div key={c.l} className="owner-card owner-kpi">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div style={{ width: 44, height: 44, borderRadius: 13, background: c.bg, color: c.c, display: "grid", placeItems: "center" }}>
                <Icon size={22} color={c.c} />
              </div>
              <span className={"owner-delta " + (up ? "up" : "down")}>
                {up ? "▲" : "▼"} {Math.abs(c.delta)}%
              </span>
            </div>
            <div style={{ fontSize: 13, color: "#8b7f6c", marginTop: 16, fontWeight: 600 }}>{c.l}</div>
            <div className="num" style={{ fontSize: 27, marginTop: 3, color: "var(--ink)" }}>{c.v}</div>
            <div style={{ fontSize: 11.5, color: "#a99c86", marginTop: 3 }}>{c.sub}</div>
          </div>
        );
      })}
    </div>
  );
}

function LowStockAlert({ data }: { data: AnalyticsSummary }) {
  const low = data.lowStock;
  return (
    <div
      className="owner-card"
      style={{
        marginTop: 18,
        padding: "15px 20px",
        border: "1px solid #ECCF9E",
        background: "#FBF1DF",
        display: "flex",
        alignItems: "center",
        gap: 15,
        flexWrap: "wrap",
      }}
    >
      <div style={{ width: 40, height: 40, borderRadius: 11, background: "var(--orange)", color: "#fff", display: "grid", placeItems: "center", fontWeight: 800, fontSize: 20, flex: "0 0 auto" }}>
        !
      </div>
      <div style={{ flex: 1, minWidth: 220 }}>
        <div style={{ fontWeight: 700, fontSize: 14.5 }}>
          Stok Menipis — {low.length} menu perlu segera di-restock
        </div>
        <div style={{ fontSize: 12.5, color: "#8b7f6c", marginTop: 2 }}>
          {low.map((m) => `${m.name} (${m.stock}${m.stock === 0 ? ", habis" : ""})`).join(" · ")}
        </div>
      </div>
      <a href="/pos" className="owner-exportbtn" style={{ flex: "0 0 auto" }}>
        Kelola Stok →
      </a>
    </div>
  );
}

function RecentTable({ data }: { data: AnalyticsSummary }) {
  return (
    <div className="owner-card" style={{ padding: "20px 22px", marginTop: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 16 }}>Transaksi Terbaru</div>
          <div style={{ fontSize: 12.5, color: "#8b7f6c", marginTop: 2 }}>Langsung dari kasir</div>
        </div>
        <span className="owner-pill" style={{ background: "var(--green-ok-bg)", color: "var(--green-ok)" }}>
          <span style={{ width: 7, height: 7, borderRadius: 9, background: "var(--green-ok)" }} />
          LIVE
        </span>
      </div>
      <div style={{ overflowX: "auto" }}>
        <table className="owner-table" style={{ minWidth: 540 }}>
          <thead>
            <tr>
              <th>PESANAN</th>
              <th>MEJA</th>
              <th>ITEM</th>
              <th>METODE</th>
              <th>STATUS</th>
              <th style={{ textAlign: "right" }}>TOTAL</th>
            </tr>
          </thead>
          <tbody>
            {data.recent.map((o) => (
              <tr key={o.id} className="owner-rtr">
                <td style={{ fontWeight: 700 }}>{o.id}</td>
                <td>
                  <span className="num" style={{ color: "var(--green-700)" }}>
                    {o.table === 0 ? "TA" : String(o.table).padStart(2, "0")}
                  </span>
                </td>
                <td style={{ color: "#6f6353" }}>{o.items.reduce((a, b) => a + b.qty, 0)} item</td>
                <td>{o.method === "qris" ? "QRIS" : "Kasir"}</td>
                <td><StatusPill status={o.status} /></td>
                <td style={{ textAlign: "right" }}>
                  <span className="num" style={{ color: "var(--coffee)" }}>{rupiah(o.total)}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
