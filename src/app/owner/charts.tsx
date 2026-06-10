"use client";
// Owner-only pure-SVG charts. No chart library. All math guards against empty
// arrays and division-by-zero so the SVG never contains NaN.
// Each chart animates in on mount and re-plays when its data signature changes
// (e.g. switching Hari Ini / 7 Hari / 30 Hari) via the useArmed() hook.
import { useEffect, useState, type JSX } from "react";
import { FoodTile } from "@/components";
import { rupiahShort } from "@/lib/constants";
import type {
  TrendPoint,
  PaymentBucket,
  TopMenuEntry,
  CategoryBreakdownEntry,
} from "@/lib/analytics";
import type { Glyph } from "@/lib/types";

/** Flips to true one paint after mount (and whenever `signature` changes), so
 *  CSS transitions animate from their start state to their target. */
function useArmed(signature: string): boolean {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    setArmed(false);
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => setArmed(true));
    });
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
  }, [signature]);
  return armed;
}

const EASE = "cubic-bezier(.34,1.56,.64,1)"; // gentle overshoot
const EASE_OUT = "cubic-bezier(.22,.61,.36,1)";

/* ─────────────────────────── AreaChart ─────────────────────────── */

export function AreaChart({ points }: { points: TrendPoint[] }): JSX.Element {
  const W = 620;
  const H = 210;
  const pad = 8;
  const n = points.length;
  const vals = points.map((p) => p.value);
  const rawMax = vals.length ? Math.max(...vals) : 0;
  const max = rawMax > 0 ? rawMax * 1.12 : 1;
  const peak = rawMax > 0 ? vals.indexOf(rawMax) : -1;

  const X = (i: number) => (n <= 1 ? W / 2 : pad + (i * (W - pad * 2)) / (n - 1));
  const Y = (v: number) => H - 12 - (v / max) * (H - 40);

  const pts = points.map((p, i) => [X(i), Y(p.value)] as [number, number]);
  const line = pts
    .map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1))
    .join(" ");
  const area =
    n > 0
      ? `${line} L${X(n - 1).toFixed(1)} ${H} L${X(0).toFixed(1)} ${H} Z`
      : "";

  // re-animate when the period (labels) or the curve changes
  const armed = useArmed(points.map((p) => p.label).join("|") + "#" + line);

  return (
    <>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        height="210"
        preserveAspectRatio="none"
        style={{ marginTop: 14, overflow: "visible" }}
      >
        <defs>
          <linearGradient id="ownerArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--green-700)" stopOpacity="0.28" />
            <stop offset="100%" stopColor="var(--green-700)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 1, 2, 3].map((i) => (
          <line
            key={i}
            x1="0"
            x2={W}
            y1={12 + (i * (H - 24)) / 3}
            y2={12 + (i * (H - 24)) / 3}
            stroke="var(--cream-200)"
            strokeWidth="1"
          />
        ))}
        {area && (
          <path
            d={area}
            fill="url(#ownerArea)"
            style={{ opacity: armed ? 1 : 0, transition: `opacity .7s ${EASE_OUT} .25s` }}
          />
        )}
        {line && (
          // pathLength=1 normalizes the dash math so the line "draws" itself
          <path
            d={line}
            pathLength={1}
            fill="none"
            stroke="var(--green-700)"
            strokeWidth="3"
            strokeLinejoin="round"
            strokeLinecap="round"
            style={{
              strokeDasharray: 1,
              strokeDashoffset: armed ? 0 : 1,
              transition: `stroke-dashoffset 1.05s ${EASE_OUT}`,
            }}
          />
        )}
        {pts.map((p, i) => (
          <circle
            key={i}
            cx={p[0]}
            cy={p[1]}
            r={i === peak ? 5 : 3.2}
            fill={i === peak ? "var(--gold)" : "#fff"}
            stroke="var(--green-700)"
            strokeWidth="2.5"
            style={{
              opacity: armed ? 1 : 0,
              transition: `opacity .35s ease ${0.5 + (i / Math.max(1, n)) * 0.6}s`,
            }}
          />
        ))}
        {peak >= 0 && (
          <g
            transform={`translate(${pts[peak][0]},${pts[peak][1] - 14})`}
            style={{ opacity: armed ? 1 : 0, transition: "opacity .4s ease 1s" }}
          >
            <rect x="-34" y="-22" width="68" height="20" rx="6" fill="var(--green-900)" />
            <text
              x="0"
              y="-8"
              textAnchor="middle"
              fill="#fff"
              fontSize="11"
              fontWeight="700"
              fontFamily="Baloo 2"
            >
              {rupiahShort(vals[peak])}
            </text>
          </g>
        )}
      </svg>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: 8,
          fontSize: 11.5,
          color: "#a99c86",
          fontWeight: 600,
        }}
      >
        {points.map((p, i) => (
          <span key={i}>{p.label}</span>
        ))}
      </div>
    </>
  );
}

/* ─────────────────────────── Donut ─────────────────────────── */

export function Donut({
  qris,
  kasir,
}: {
  qris: PaymentBucket;
  kasir: PaymentBucket;
}): JSX.Element {
  const r = 58;
  const cx = 80;
  const cy = 80;
  const circ = 2 * Math.PI * r;
  const total = qris.count + kasir.count;
  const qrisPct = total > 0 ? Math.round((qris.count / total) * 100) : 0;
  const kasirPct = total > 0 ? 100 - qrisPct : 0;

  const segs = [
    { l: "QRIS", pct: total > 0 ? (qris.count / total) * 100 : 0, disp: qrisPct, c: "var(--green-700)" },
    { l: "Bayar di Kasir", pct: total > 0 ? (kasir.count / total) * 100 : 0, disp: kasirPct, c: "var(--gold-600)" },
  ];

  const armed = useArmed(`${qris.count}-${kasir.count}`);

  let off = 0;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 18, marginTop: 16 }}>
      <svg width="160" height="160" viewBox="0 0 160 160">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--cream-200)" strokeWidth="20" />
        {total > 0 &&
          segs.map((s, i) => {
            const len = (circ * s.pct) / 100;
            const el = (
              <circle
                key={i}
                cx={cx}
                cy={cy}
                r={r}
                fill="none"
                stroke={s.c}
                strokeWidth="20"
                strokeDashoffset={-off}
                transform={`rotate(-90 ${cx} ${cy})`}
                strokeLinecap="butt"
                style={{
                  // grow each wedge out from its start point
                  strokeDasharray: armed ? `${len} ${circ - len}` : `0 ${circ}`,
                  transition: `stroke-dasharray .9s ${EASE_OUT} ${i * 0.18}s`,
                }}
              />
            );
            off += len;
            return el;
          })}
        <text x={cx} y={cy - 4} textAnchor="middle" fontSize="13" fill="#8b7f6c" fontWeight="600">
          Total
        </text>
        <text
          x={cx}
          y={cy + 16}
          textAnchor="middle"
          fontSize="20"
          fill="var(--coffee)"
          fontWeight="800"
          fontFamily="Baloo 2"
        >
          {total}
        </text>
      </svg>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 14 }}>
        {segs.map((s) => (
          <div key={s.l}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 11, height: 11, borderRadius: 4, background: s.c }} />
              <span style={{ fontSize: 13.5, fontWeight: 600, flex: 1 }}>{s.l}</span>
              <span className="num" style={{ fontSize: 16 }}>{s.disp}%</span>
            </div>
          </div>
        ))}
        <div
          style={{
            marginTop: 4,
            padding: "10px 12px",
            background: "var(--green-ok-bg)",
            borderRadius: 11,
            fontSize: 12,
            color: "var(--green-ok)",
            fontWeight: 600,
          }}
        >
          {qrisPct >= kasirPct
            ? "QRIS jadi metode favorit pelanggan ✦"
            : "Bayar di kasir masih mendominasi ✦"}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────── TopMenuBars ─────────────────────────── */

export function TopMenuBars({ items }: { items: TopMenuEntry[] }): JSX.Element {
  const max = items.length ? Math.max(...items.map((t) => t.qty)) : 0;
  const armed = useArmed(items.map((t) => t.id + ":" + t.qty).join("|"));
  if (!items.length) {
    return (
      <div style={{ fontSize: 13, color: "#a99c86", padding: "24px 0", textAlign: "center" }}>
        Belum ada penjualan pada periode ini.
      </div>
    );
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 15, marginTop: 18 }}>
      {items.map((t, i) => (
        <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 13 }}>
          <span className="num" style={{ fontSize: 15, color: "#a99c86", width: 18 }}>{i + 1}</span>
          <div style={{ width: 42, flex: "0 0 auto" }}>
            <FoodTile
              item={{ g: t.g as Glyph, grad: t.grad, available: true, stock: 1 }}
              h={42}
              glyphSize={22}
              rounded={11}
            />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <span style={{ fontWeight: 700, fontSize: 14 }}>{t.name}</span>
              <span style={{ fontSize: 12.5, color: "#8b7f6c", fontWeight: 600 }}>{t.qty} porsi</span>
            </div>
            <div className="owner-bar-track" style={{ marginTop: 7 }}>
              <div
                className="owner-bar-fill"
                style={{
                  width: (armed && max > 0 ? (t.qty / max) * 100 : 0) + "%",
                  background: i === 0 ? "var(--gold-600)" : "var(--green-600)",
                  transition: `width .8s ${EASE_OUT} ${i * 0.07}s`,
                }}
              />
            </div>
          </div>
          <span className="num" style={{ fontSize: 14, color: "var(--coffee)", width: 74, textAlign: "right" }}>
            {rupiahShort(t.revenue)}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ─────────────────────────── CategoryBars ─────────────────────────── */

const CAT_COLOR: Record<string, string> = {
  Kopi: "var(--coffee)",
  "Non-Kopi": "var(--green-ok)",
  Makanan: "var(--orange)",
  Snack: "var(--gold-600)",
};

export function CategoryBars({ items }: { items: CategoryBreakdownEntry[] }): JSX.Element {
  const maxPct = items.length ? Math.max(...items.map((c) => c.pct)) : 0;
  const armed = useArmed(items.map((c) => c.cat + ":" + c.pct).join("|"));
  if (!items.length) {
    return (
      <div style={{ fontSize: 13, color: "#a99c86", padding: "24px 0", textAlign: "center" }}>
        Belum ada data kategori.
      </div>
    );
  }
  return (
    <>
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          gap: 18,
          height: 150,
          marginTop: 22,
          padding: "0 6px",
        }}
      >
        {items.map((c, i) => (
          <div
            key={c.cat}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              height: "100%",
              justifyContent: "flex-end",
            }}
          >
            <span
              className="num"
              style={{
                fontSize: 15,
                color: "var(--coffee)",
                opacity: armed ? 1 : 0,
                transition: `opacity .4s ease ${0.25 + i * 0.08}s`,
              }}
            >
              {c.pct}%
            </span>
            <div
              style={{
                width: "70%",
                height: (maxPct > 0 ? (c.pct / maxPct) * 100 : 0) + "%",
                background: CAT_COLOR[c.cat] ?? "var(--green-600)",
                borderRadius: "9px 9px 0 0",
                marginTop: 6,
                transformOrigin: "bottom",
                transform: armed ? "scaleY(1)" : "scaleY(0)",
                transition: `transform .65s ${EASE} ${i * 0.08}s`,
              }}
            />
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
        {items.map((c) => (
          <div key={c.cat} style={{ flex: 1, textAlign: "center" }}>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: "#6f6353" }}>{c.cat}</div>
          </div>
        ))}
      </div>
    </>
  );
}
