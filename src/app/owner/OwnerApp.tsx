"use client";
import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Icons } from "@/components";
import { OverviewView } from "./OverviewView";
import { ReportView } from "./ReportView";
import { SettingsView } from "./SettingsView";
import { OrdersView } from "../pos/OrdersView";
import { MenuAdminView } from "../pos/MenuAdminView";
import { IngredientsView } from "../pos/IngredientsView";

export type OwnerView = "overview" | "report" | "orders" | "menu" | "stock" | "settings";

export interface OwnerUser {
  name: string;
  role: string;
}

interface NavItem {
  id: OwnerView;
  label: string;
  short: string;
  icon: keyof typeof Icons;
}

const NAV: NavItem[] = [
  { id: "overview", label: "Ringkasan", short: "Ringkasan", icon: "home" },
  { id: "report", label: "Laporan Penjualan", short: "Laporan", icon: "chart" },
  { id: "orders", label: "Pesanan", short: "Pesanan", icon: "orders" },
  { id: "menu", label: "Manajemen Menu", short: "Menu", icon: "menu" },
  { id: "stock", label: "Bahan Baku", short: "Stok", icon: "bag" },
  { id: "settings", label: "Pengaturan", short: "Setelan", icon: "gear" },
];

export function OwnerApp({ user }: { user: OwnerUser }) {
  const router = useRouter();
  const [view, setView] = useState<OwnerView>("overview");

  const initials = user.name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  async function logout() {
    await authClient.signOut();
    router.push("/pos/login");
    router.refresh();
  }

  return (
    <div
      style={{
        display: "flex",
        minHeight: "100dvh",
        background: "var(--paper)",
        color: "var(--ink)",
        fontFamily: "var(--font-jakarta), sans-serif",
      }}
    >
      <OwnerStyles />
      <aside className="owner-sidebar">
        <div className="owner-brand">
          <Image src="/warbul-logo.png" alt="Warbul" width={42} height={42} style={{ borderRadius: "50%" }} />
          <div className="owner-brand-text">
            <div className="brand t-gold" style={{ fontSize: 21, fontWeight: 800, lineHeight: 1 }}>Warbul</div>
            <div style={{ fontSize: 10.5, color: "rgba(244,237,217,.6)", fontWeight: 600, letterSpacing: ".04em" }}>
              DASBOR PEMILIK
            </div>
          </div>
        </div>

        <div className="owner-branchbox owner-brand-text">
          <div style={{ fontSize: 11, color: "rgba(244,237,217,.55)", fontWeight: 600 }}>CABANG</div>
          <div style={{ color: "var(--cream)", fontWeight: 700, fontSize: 13.5, marginTop: 2 }}>
            Dipatiukur, Bandung
          </div>
        </div>

        <nav style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {NAV.map((n) => {
            const Icon = Icons[n.icon];
            const on = view === n.id;
            return (
              <button
                key={n.id}
                onClick={() => setView(n.id)}
                className={"owner-navitem" + (on ? " on" : "")}
              >
                <Icon size={20} />
                <span className="owner-navlabel">{n.label}</span>
              </button>
            );
          })}
        </nav>

        <div style={{ marginTop: "auto", borderTop: "1px solid rgba(255,255,255,.1)", paddingTop: 14 }}>
          <div className="owner-brand-text" style={{ display: "flex", alignItems: "center", gap: 11, padding: "4px 6px 12px" }}>
            <div
              className="brand"
              style={{
                width: 38,
                height: 38,
                borderRadius: 12,
                background: "var(--gold)",
                color: "var(--coffee-900)",
                display: "grid",
                placeItems: "center",
                fontWeight: 800,
                fontSize: 15,
              }}
            >
              {initials}
            </div>
            <div style={{ lineHeight: 1.2 }}>
              <div style={{ color: "var(--cream)", fontWeight: 700, fontSize: 13.5 }}>{user.name}</div>
              <div style={{ color: "rgba(244,237,217,.55)", fontSize: 11.5, textTransform: "capitalize" }}>{user.role}</div>
            </div>
          </div>
          <button onClick={logout} className="owner-navitem" style={{ width: "100%", fontSize: 13.5 }}>
            <Icons.logout size={19} />
            <span className="owner-navlabel">Keluar</span>
          </button>
        </div>
      </aside>

      <main className="owner-main-m" style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", height: "100dvh", overflow: "hidden" }}>
        {view === "overview" && <OverviewView userName={user.name} />}
        {view === "report" && <ReportView />}
        {view === "orders" && <OrdersView cashierName={user.name} />}
        {view === "menu" && <MenuAdminView />}
        {view === "stock" && <IngredientsView />}
        {view === "settings" && <SettingsView />}
      </main>

      {/* Mobile bottom nav — visible only on ≤768px via CSS */}
      <nav className="owner-bottomnav">
        {NAV.map((n) => {
          const Icon = Icons[n.icon];
          const on = view === n.id;
          return (
            <button key={n.id} className={"owner-bni" + (on ? " on" : "")} onClick={() => setView(n.id)}>
              <Icon size={22} />
              <span>{n.short}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}

function OwnerStyles() {
  return (
    <style>{`
      .owner-sidebar{width:248px;flex:0 0 248px;background:var(--green-900);padding:22px 16px;display:flex;flex-direction:column;height:100dvh;position:sticky;top:0}
      .owner-brand{display:flex;align-items:center;gap:12px;padding:4px 8px 8px}
      .owner-branchbox{margin:14px 6px 18px;padding:11px 13px;background:rgba(255,255,255,.06);border-radius:13px;border:1px solid rgba(255,255,255,.08)}
      .owner-navitem{display:flex;align-items:center;gap:13px;padding:12px 14px;border-radius:13px;font-size:14.5px;font-weight:600;color:var(--cream);background:none;border:none;cursor:pointer;font-family:inherit;transition:.15s;text-align:left;text-decoration:none}
      .owner-navitem:hover{background:rgba(255,255,255,.07)}
      .owner-navitem.on{background:var(--gold);color:var(--coffee-900);font-weight:700}

      .owner-card{background:#fff;border:1px solid var(--cream-200);border-radius:20px}
      .owner-grid2{min-width:0}
      .owner-grid2>*{min-width:0}
      .owner-kpi{padding:20px 22px;position:relative;overflow:hidden}
      .owner-delta{font-size:12px;font-weight:800;padding:3px 8px;border-radius:999px;display:inline-flex;align-items:center;gap:3px}
      .owner-delta.up{color:var(--green-ok);background:var(--green-ok-bg)}
      .owner-delta.down{color:var(--red,#C0492F);background:var(--red-bg,#F6E0DA)}

      .owner-rangebar{display:flex;gap:3px;background:var(--cream-200);padding:4px;border-radius:13px}
      .owner-rangebtn{padding:8px 15px;border:none;cursor:pointer;font-family:inherit;font-weight:700;font-size:13px;border-radius:11px;transition:.15s;background:transparent;color:#6f6353}
      .owner-rangebtn.on{background:#fff;color:var(--green-800);box-shadow:0 2px 6px -2px rgba(58,38,24,.25)}

      .owner-iconbtn{width:42px;height:42px;border-radius:12px;border:1px solid var(--line,#E6DBC4);background:#fff;display:grid;place-items:center;cursor:pointer;color:var(--green-800);position:relative}
      .owner-exportbtn{border:none;cursor:pointer;border-radius:12px;padding:11px 16px;font-weight:700;font-size:13.5px;display:inline-flex;align-items:center;gap:8px;background:var(--green-800);color:var(--cream);text-decoration:none}

      .owner-pill{font-size:11px;font-weight:700;padding:3px 9px;border-radius:999px;display:inline-flex;align-items:center;gap:4px;white-space:nowrap}

      .owner-bar-track{height:9px;border-radius:9px;background:var(--cream-200);overflow:hidden}
      .owner-bar-fill{height:100%;border-radius:9px}
      @keyframes ownerRise{from{transform:scaleY(0)}}
      .owner-hbar{transform-origin:bottom;animation:ownerRise .6s ease}

      .owner-table{width:100%;border-collapse:collapse;font-size:13.5px}
      .owner-table thead th{color:#a99c86;font-size:12px;font-weight:700;text-align:left;padding:12px 8px}
      .owner-table tbody td{padding:13px 8px}
      .owner-rtr{border-top:1px solid var(--line,#E6DBC4)}

      .fld{width:100%;border:1.5px solid var(--line,#E6DBC4);border-radius:11px;padding:11px 13px;font-size:14px;outline:none;background:#fff;font-family:inherit;box-sizing:border-box}
      .fld:focus{border-color:var(--green-700)}

      @media(max-width:1180px){
        .owner-sidebar{width:74px;flex-basis:74px;align-items:center}
        .owner-brand-text,.owner-navlabel,.owner-branchbox{display:none}
        .owner-navitem{justify-content:center;padding:12px}
        .owner-grid2{grid-template-columns:1fr!important}
      }

      /* ── mobile bottom nav (≤768px) ── */
      .owner-bottomnav{display:none}
      @media(max-width:768px){
        .owner-sidebar{display:none!important}
        .owner-bottomnav{
          display:flex;position:fixed;bottom:0;left:0;right:0;
          height:62px;background:var(--green-900);z-index:200;
          align-items:stretch;border-top:1px solid rgba(255,255,255,.12);
          padding-bottom:env(safe-area-inset-bottom,0px);
        }
        .owner-bni{
          flex:1;display:flex;flex-direction:column;align-items:center;
          justify-content:center;gap:3px;border:none;background:none;
          cursor:pointer;font-family:inherit;color:rgba(244,237,217,.55);
          font-size:9.5px;font-weight:600;padding:6px 2px;transition:.15s;
          letter-spacing:.01em;
        }
        .owner-bni.on{color:var(--gold)}
        .owner-bni:active{opacity:.7}
        .owner-main-m{padding-bottom:62px}
        .owner-rangebar{gap:2px}
        .owner-rangebtn{padding:7px 10px;font-size:12px}
        .owner-exportbtn{padding:9px 12px;font-size:12.5px}
        .owner-iconbtn{width:38px;height:38px}
        .settings-form-grid{grid-template-columns:1fr!important}
        .owner-hdr{padding-left:16px!important;padding-right:16px!important}
        .owner-body{padding-left:16px!important;padding-right:16px!important}
      }
    `}</style>
  );
}
