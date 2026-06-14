"use client";
// "QR Meja" — generate scannable table QR codes in two print formats:
//   • Tenda Meja  — a foldable two-faced table tent for one table
//   • Lembar Stiker — a grid of stickers for N tables
// Matches the "Warbul QR Meja.html" design. The QR itself is a REAL scannable
// code (via /api/qr) pointing at <base>/meja/<n>.
import { useEffect, useMemo, useState, type JSX } from "react";
import Image from "next/image";
import { Bean, Icons } from "@/components";

const LS_KEY = "warbul_qr_cfg";
type Mode = "tent" | "sheet";

export function TablesView() {
  const [mode, setMode] = useState<Mode>("tent");
  const [tableNo, setTableNo] = useState(7);
  const [count, setCount] = useState(12);
  const [base, setBase] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cfg: { mode?: Mode; tableNo?: number; count?: number; base?: string } = {};
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) cfg = JSON.parse(raw);
    } catch {}
    if (cfg.mode) setMode(cfg.mode);
    if (cfg.tableNo) setTableNo(cfg.tableNo);
    if (cfg.count) setCount(cfg.count);
    setBase(cfg.base || window.location.origin);
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(LS_KEY, JSON.stringify({ mode, tableNo, count, base }));
    } catch {}
  }, [mode, tableNo, count, base, ready]);

  const cleanBase = base.replace(/\/+$/, "");
  const isLocal = /localhost|127\.0\.0\.1/.test(cleanBase);
  const display = cleanBase.replace(/^https?:\/\//, "");
  const tables = useMemo(
    () => Array.from({ length: Math.max(1, Math.min(40, count || 1)) }, (_, i) => i + 1),
    [count],
  );

  const urlFor = (n: number) => `${cleanBase}/meja/${n}`;
  const qrSrc = (n: number) => `/api/qr?data=${encodeURIComponent(urlFor(n))}`;

  return (
    <>
      <QrStyles />

      {/* toolbar */}
      <div className="qrm-toolbar">
        <div className="qrm-grp">
          <span className="brand" style={{ color: "var(--gold)", fontWeight: 800, fontSize: 18 }}>QR Meja</span>
        </div>

        <div className="qrm-seg">
          <button className={mode === "tent" ? "on" : ""} onClick={() => setMode("tent")}>Tenda Meja</button>
          <button className={mode === "sheet" ? "on" : ""} onClick={() => setMode("sheet")}>Lembar Stiker</button>
        </div>

        {mode === "tent" ? (
          <div className="qrm-grp">
            <label className="qrm-lbl">NOMOR MEJA</label>
            <div className="qrm-field">
              <button onClick={() => setTableNo((v) => Math.max(1, v - 1))}>−</button>
              <input value={String(tableNo).padStart(2, "0")} readOnly />
              <button onClick={() => setTableNo((v) => Math.min(99, v + 1))}>+</button>
            </div>
          </div>
        ) : (
          <div className="qrm-grp">
            <label className="qrm-lbl">JUMLAH MEJA</label>
            <div className="qrm-field">
              <button onClick={() => setCount((v) => Math.max(1, v - 1))}>−</button>
              <input value={count} readOnly />
              <button onClick={() => setCount((v) => Math.min(40, v + 1))}>+</button>
            </div>
          </div>
        )}

        <div className="qrm-grp" style={{ flex: 1, minWidth: 180 }}>
          <label className="qrm-lbl">ALAMAT WEB</label>
          <input
            className="qrm-baseinput"
            value={base}
            onChange={(e) => setBase(e.target.value)}
            placeholder="https://warbul.id"
          />
        </div>

        <button className="qrm-print" onClick={() => window.print()}>
          <Icons.printer size={16} /> Cetak / Simpan PDF
        </button>
      </div>

      {/* scrolling stage */}
      <div style={{ flex: 1, overflowY: "auto", background: "#cdbb9c" }}>
        {isLocal && (
          <div className="qrm-warn">
            <Icons.alert size={15} /> Alamat web memakai <code>localhost</code> — QR ini hanya bisa dibuka di komputer ini, <b>tidak bisa discan dari HP</b>.
            Ganti dengan alamat jaringan komputer (mis. <code>http://192.168.x.x:3000</code>) atau domain asli, dan pastikan port-nya benar.
          </div>
        )}

        <div id="qrstage" className="qrm-stage">
          {mode === "tent" ? (
            <div className="qrm-tent">
              <div className="qrm-panel qrm-flip">
                <Face table={tableNo} qr={qrSrc(tableNo)} display={display} />
              </div>
              <div className="qrm-fold"><span>LIPAT DI SINI</span></div>
              <div className="qrm-panel">
                <Face table={tableNo} qr={qrSrc(tableNo)} display={display} />
              </div>
            </div>
          ) : (
            <div className="qrm-sheet">
              {tables.map((n) => (
                <Sticker key={n} table={n} qr={qrSrc(n)} />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

/* ───────────── table-tent face ───────────── */
function Face({ table, qr, display }: { table: number; qr: string; display: string }): JSX.Element {
  const t = String(table).padStart(2, "0");
  return (
    <div className="qrm-face">
      <div className="qrm-bgbean" style={{ right: -18, top: -14 }}>
        <Bean color="var(--gold)" size={150} />
      </div>
      <div className="qrm-bgbean" style={{ left: -22, bottom: -20, transform: "rotate(40deg)" }}>
        <Bean color="var(--gold)" size={120} />
      </div>

      <div className="qrm-logorow">
        <Image src="/warbul-logo.png" alt="Warbul" width={40} height={40} style={{ borderRadius: "50%", display: "block" }} />
        <span className="brand" style={{ fontWeight: 800, fontSize: 24, color: "var(--gold)" }}>Warbul</span>
      </div>

      <div className="qrm-hero-n brand">{t}</div>
      <div className="qrm-hero-lbl">NOMOR MEJA</div>
      <div className="qrm-scan-hint">↓ Scan untuk pesan</div>

      <div className="qrm-qrcard">
        <span className="qrm-qrtag">MENU DIGITAL</span>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={qr} alt={`QR Meja ${t}`} width={150} height={150} style={{ display: "block" }} />
      </div>

      <div className="qrm-steps">
        {[
          ["1", "Scan QR di meja"],
          ["2", "Pilih menu favoritmu"],
          ["3", "Bayar & tunggu"],
        ].map(([n, label]) => (
          <div key={n} className="qrm-stepc">
            <div className="qrm-stepn brand">{n}</div>
            <div className="qrm-stept">{label}</div>
          </div>
        ))}
      </div>

      <div className="qrm-pays">
        <span className="qrm-pay">QRIS</span>
        <span className="qrm-pay">Bayar di Kasir</span>
      </div>

      <div className="qrm-urlrow">{display || "warbul.id"}/meja/{t}</div>
    </div>
  );
}

/* ───────────── sticker ───────────── */
function Sticker({ table, qr }: { table: number; qr: string }): JSX.Element {
  const t = String(table).padStart(2, "0");
  return (
    <div className="qrm-sticker">
      <div className="qrm-bgbean" style={{ right: -12, top: -10 }}>
        <Bean color="var(--gold)" size={90} />
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 7, position: "relative" }}>
        <Image src="/warbul-logo.png" alt="Warbul" width={26} height={26} style={{ borderRadius: "50%", display: "block" }} />
        <span className="brand" style={{ fontWeight: 800, color: "var(--gold)", fontSize: 17 }}>Warbul</span>
      </div>
      <div className="qrm-hero-n brand" style={{ fontSize: 52, letterSpacing: -2 }}>{t}</div>
      <div className="qrm-hero-lbl" style={{ fontSize: 7, letterSpacing: "0.12em", marginBottom: 6 }}>NOMOR MEJA</div>
      <div className="qrm-qs">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={qr} alt={`QR Meja ${t}`} width={116} height={116} style={{ display: "block" }} />
      </div>
      <div className="qrm-sc">Scan untuk pesan</div>
    </div>
  );
}

function QrStyles() {
  return (
    <style>{`
      .qrm-toolbar{flex:0 0 auto;background:var(--green-900);color:var(--cream);display:flex;align-items:center;gap:16px;flex-wrap:wrap;padding:14px 22px;box-shadow:0 6px 20px -10px rgba(0,0,0,.4)}
      .qrm-grp{display:flex;align-items:center;gap:9px}
      .qrm-lbl{font-size:12.5px;font-weight:700;color:rgba(244,237,217,.7)}
      .qrm-seg{display:flex;gap:3px;background:rgba(255,255,255,.08);padding:4px;border-radius:11px}
      .qrm-seg button{border:none;cursor:pointer;font-family:inherit;font-weight:700;font-size:13px;padding:8px 14px;border-radius:8px;background:transparent;color:var(--cream)}
      .qrm-seg button.on{background:var(--gold);color:var(--coffee-900)}
      .qrm-field{display:flex;align-items:center;gap:6px;background:rgba(255,255,255,.1);border-radius:11px;padding:6px 8px}
      .qrm-field button{width:30px;height:30px;border-radius:8px;border:none;cursor:pointer;background:rgba(255,255,255,.14);color:var(--cream);font-size:18px;font-weight:700;font-family:inherit}
      .qrm-field input{width:46px;text-align:center;background:none;border:none;color:var(--gold);font-family:var(--font-baloo),sans-serif;font-weight:800;font-size:18px;outline:none}
      .qrm-baseinput{flex:1;min-width:140px;background:rgba(255,255,255,.1);border:none;border-radius:11px;padding:9px 12px;color:var(--cream);font-family:inherit;font-size:13px;outline:none}
      .qrm-baseinput::placeholder{color:rgba(244,237,217,.45)}
      .qrm-print{border:none;cursor:pointer;font-family:inherit;font-weight:700;border-radius:11px;font-size:13.5px;padding:10px 18px;background:var(--gold);color:var(--coffee-900);display:flex;align-items:center;gap:8px}

      .qrm-warn{margin:16px auto 0;max-width:560px;padding:12px 16px;border-radius:14px;background:#FBF1DF;border:1px solid #ECCF9E;color:var(--orange-600);font-size:13px;font-weight:600;line-height:1.5}
      .qrm-stage{display:flex;justify-content:center;padding:30px 20px 60px}

      /* table tent */
      .qrm-tent{width:340px;background:var(--cream);border-radius:18px;overflow:hidden;box-shadow:0 30px 60px -24px rgba(0,0,0,.45)}
      .qrm-panel{padding:30px 30px 26px;position:relative;overflow:hidden}
      .qrm-flip{transform:rotate(180deg)}
      .qrm-fold{height:0;border-top:2px dashed var(--cream-400);position:relative;margin:0 16px}
      .qrm-fold span{position:absolute;left:50%;top:-9px;transform:translateX(-50%);background:var(--cream);font-size:9px;letter-spacing:.2em;color:#a99c86;font-weight:700;padding:0 10px}

      .qrm-face{background:var(--green-800);color:var(--cream);border-radius:18px;padding:26px 24px 22px;text-align:center;position:relative;overflow:hidden}
      .qrm-bgbean{position:absolute;opacity:.08;line-height:0}
      .qrm-logorow{display:flex;align-items:center;justify-content:center;gap:10px;position:relative}
      .qrm-hero-n{font-size:90px;font-weight:900;color:var(--gold);line-height:1;letter-spacing:-3px;margin-top:10px;position:relative}
      .qrm-hero-lbl{font-size:9px;font-weight:700;opacity:.6;letter-spacing:.15em;margin-top:-2px;position:relative}
      .qrm-scan-hint{font-size:12px;opacity:.75;margin-top:10px;position:relative}
      .qrm-qrcard{background:#fff;border-radius:16px;padding:16px;margin:16px auto 0;width:max-content;position:relative;box-shadow:0 10px 24px -12px rgba(0,0,0,.5)}
      .qrm-qrtag{position:absolute;top:-11px;left:50%;transform:translateX(-50%);background:var(--gold);color:var(--coffee-900);font-size:10px;font-weight:800;padding:3px 11px;border-radius:999px;letter-spacing:.04em;white-space:nowrap}
      .qrm-steps{display:flex;justify-content:center;gap:8px;margin-top:16px;position:relative}
      .qrm-stepc{flex:1;max-width:88px}
      .qrm-stepn{width:26px;height:26px;border-radius:50%;background:rgba(255,255,255,.14);color:var(--gold);font-weight:800;font-size:13px;display:flex;align-items:center;justify-content:center;margin:0 auto 6px}
      .qrm-stept{font-size:10.5px;line-height:1.25;opacity:.85}
      .qrm-pays{display:flex;justify-content:center;gap:8px;margin-top:16px;position:relative}
      .qrm-pay{font-size:10px;font-weight:700;background:rgba(255,255,255,.12);padding:5px 11px;border-radius:999px}
      .qrm-urlrow{font-size:11px;opacity:.7;margin-top:14px;position:relative;letter-spacing:.02em;word-break:break-all}

      /* sticker sheet */
      .qrm-sheet{display:grid;grid-template-columns:repeat(2,1fr);gap:18px;max-width:560px}
      .qrm-sticker{background:var(--green-800);color:var(--cream);border-radius:18px;padding:20px 18px;text-align:center;position:relative;overflow:hidden}
      .qrm-qs{background:#fff;border-radius:12px;padding:11px;width:max-content;margin:11px auto 0}
      .qrm-tb{display:inline-block;background:var(--gold);color:var(--coffee-900);font-weight:800;font-size:15px;padding:5px 14px;border-radius:10px;margin-top:11px}
      .qrm-sc{font-size:11px;opacity:.8;margin-top:9px}

      @media print{
        @page{size:A4;margin:14mm}
        #qrstage, #qrstage *{visibility:visible}
        #qrstage{position:absolute;left:0;top:0;width:100%;padding:0;background:#fff}
        .qrm-toolbar,.qrm-warn{display:none!important}
        .qrm-tent{box-shadow:none;width:118mm;margin:0 auto}
        .qrm-sheet{max-width:none;gap:10mm}
        .qrm-sticker{break-inside:avoid}
        .qrm-face,.qrm-sticker,.qrm-hero-n,.qrm-qrcard,.qrm-stepn,.qrm-pay{-webkit-print-color-adjust:exact;print-color-adjust:exact}
      }
    `}</style>
  );
}
