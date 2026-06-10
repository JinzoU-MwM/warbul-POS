"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { listOrders } from "@/lib/api";
import { useLive } from "@/lib/use-live";
import { ORDER_STATUS } from "@/lib/constants";
import { Icons } from "@/components";
import { OrdersView } from "./OrdersView";
import { NewOrderView } from "./NewOrderView";
import { MenuAdminView } from "./MenuAdminView";
import { IngredientsView } from "./IngredientsView";

export type PosView = "neworder" | "orders" | "menu" | "stock";

export interface PosUser {
  name: string;
  username: string;
  role: string;
}

const NAV: { id: PosView; label: string; icon: keyof typeof Icons }[] = [
  { id: "neworder", label: "Buat Pesanan", icon: "register" },
  { id: "orders", label: "Pesanan", icon: "orders" },
  { id: "menu", label: "Manajemen Menu", icon: "menu" },
  { id: "stock", label: "Bahan Baku", icon: "bag" },
];

export function PosApp({ user, initialView = "orders" }: { user: PosUser; initialView?: PosView }) {
  const router = useRouter();
  const [view, setView] = useState<PosView>(initialView);
  const [activeCount, setActiveCount] = useState(0);

  const refreshCount = () =>
    listOrders("active").then((o) => setActiveCount(o.filter((x) => x.status !== ORDER_STATUS.DONE).length)).catch(() => {});
  useEffect(() => { refreshCount(); }, []);
  useLive(["orders"], refreshCount);

  const initials = user.name.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();

  async function logout() {
    await authClient.signOut();
    router.push("/pos/login");
    router.refresh();
  }

  return (
    <div style={{ display: "flex", minHeight: "100dvh", background: "var(--paper)", color: "var(--ink)", fontFamily: "var(--font-jakarta), sans-serif" }}>
      <PosSidebarStyles />
      <aside className="pos-sidebar">
        <div className="pos-brand">
          <Image src="/warbul-logo.png" alt="Warbul" width={40} height={40} style={{ borderRadius: "50%" }} />
          <div className="pos-brand-text">
            <div className="brand t-gold" style={{ fontSize: 21, fontWeight: 800, lineHeight: 1 }}>Warbul</div>
            <div style={{ fontSize: 10.5, color: "rgba(244,237,217,.6)", fontWeight: 600, letterSpacing: ".04em" }}>KASIR POS</div>
          </div>
        </div>

        <nav style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 8 }}>
          {NAV.map((n) => {
            const Icon = Icons[n.icon];
            const on = view === n.id;
            return (
              <button key={n.id} onClick={() => setView(n.id)} className={"pos-navitem" + (on ? " on" : "")}>
                <Icon size={20} />
                <span className="pos-navlabel">{n.label}</span>
                {n.id === "orders" && activeCount > 0 && (
                  <span className="pos-badge" style={{ background: on ? "var(--coffee-900)" : "var(--orange)" }}>{activeCount}</span>
                )}
              </button>
            );
          })}
          {user.role === "owner" && (
            <a href="/owner" className="pos-navitem" style={{ textDecoration: "none" }}>
              <Icons.chart size={20} />
              <span className="pos-navlabel">Dasbor Pemilik</span>
            </a>
          )}
        </nav>

        <div style={{ marginTop: "auto", borderTop: "1px solid rgba(255,255,255,.1)", paddingTop: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 11, padding: "4px 6px 12px" }}>
            <div className="brand" style={{ width: 38, height: 38, borderRadius: 12, background: "var(--gold)", color: "var(--coffee-900)", display: "grid", placeItems: "center", fontWeight: 800, fontSize: 15 }}>{initials}</div>
            <div className="pos-brand-text" style={{ lineHeight: 1.2 }}>
              <div style={{ color: "var(--cream)", fontWeight: 700, fontSize: 13.5 }}>{user.name}</div>
              <div style={{ color: "rgba(244,237,217,.55)", fontSize: 11.5, textTransform: "capitalize" }}>{user.role}</div>
            </div>
          </div>
          <button onClick={logout} className="pos-navitem" style={{ width: "100%", fontWeight: 600, fontSize: 13.5 }}>
            <Icons.logout size={20} />
            <span className="pos-navlabel">Keluar</span>
          </button>
        </div>
      </aside>

      <main style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", height: "100dvh", overflow: "hidden" }}>
        {view === "neworder" && <NewOrderView cashierName={user.name} onGoToOrders={() => setView("orders")} />}
        {view === "orders" && <OrdersView cashierName={user.name} />}
        {view === "menu" && <MenuAdminView />}
        {view === "stock" && <IngredientsView />}
      </main>
    </div>
  );
}

function PosSidebarStyles() {
  return (
    <style>{`
      .pos-sidebar{width:236px;flex:0 0 236px;background:var(--green-900);padding:22px 16px;display:flex;flex-direction:column;height:100dvh;position:sticky;top:0}
      .pos-brand{display:flex;align-items:center;gap:11px;padding:4px 6px 22px}
      .pos-navitem{display:flex;align-items:center;gap:13px;padding:12px 14px;border-radius:13px;font-size:14.5px;font-weight:600;color:var(--cream);background:none;border:none;cursor:pointer;font-family:inherit;transition:.15s;position:relative;text-align:left}
      .pos-navitem:hover{background:rgba(255,255,255,.07)}
      .pos-navitem.on{background:var(--gold);color:var(--coffee-900);font-weight:700}
      .pos-badge{margin-left:auto;min-width:20px;height:20px;border-radius:999px;color:#fff;font-size:11px;font-weight:800;display:grid;place-items:center;padding:0 5px}
      @media(max-width:1080px){
        .pos-sidebar{width:74px;flex-basis:74px;align-items:center}
        .pos-brand-text,.pos-navlabel{display:none}
        .pos-navitem{justify-content:center;padding:12px}
      }
    `}</style>
  );
}
