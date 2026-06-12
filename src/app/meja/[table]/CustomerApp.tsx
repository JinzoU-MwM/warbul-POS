"use client";
import { useEffect, useRef, useState } from "react";
import type { JSX } from "react";
import type { OrderMethod, Product, Selection } from "@/lib/types";
import { createOrder, getMenu, getConfig } from "@/lib/api";
import { useLive } from "@/lib/use-live";
import { computeTotals } from "@/lib/pricing";
import { SERVICE_FEE } from "@/lib/constants";
import { useModifiers, type PromoValue } from "@/components";
import MenuView from "./MenuView";
import DetailSheet from "./DetailSheet";
import CartView from "./CartView";
import CheckoutView from "./CheckoutView";
import StatusView from "./StatusView";
import { MejaStyles, lineKey, type CartLine, type ResolvedLine, type View } from "./shared";

const STORAGE_KEY = "warbul_cust";

interface Persisted {
  cart?: Record<string, CartLine>;
  phone?: string;
  orderId?: string | null;
  view?: View;
}

export default function CustomerApp({ table }: { table: number }): JSX.Element {
  const [menu, setMenu] = useState<Product[]>([]);
  const [view, setView] = useState<View>("menu");
  const [cart, setCart] = useState<Record<string, CartLine>>({});
  const [orderId, setOrderId] = useState<string | null>(null);
  const [phone, setPhone] = useState("");
  const [detail, setDetail] = useState<Product | null>(null);
  const [method, setMethod] = useState<OrderMethod>("qris");
  const [promo, setPromo] = useState<PromoValue | null>(null);
  const [placing, setPlacing] = useState(false);
  const [menuLoading, setMenuLoading] = useState(true);
  const [menuError, setMenuError] = useState(false);
  const [serviceFee, setServiceFee] = useState(SERVICE_FEE);
  const hydrated = useRef(false);
  const { modSummary, unitPrice } = useModifiers();

  // Load persisted state once on mount.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const p = JSON.parse(raw) as Persisted;
        if (p.cart) setCart(p.cart);
        if (p.phone) setPhone(p.phone);
        if (p.orderId) setOrderId(p.orderId);
        if (p.view) setView(p.view);
      }
    } catch {}
    hydrated.current = true;
  }, []);

  // Persist on change (after hydration so we don't clobber storage with defaults).
  useEffect(() => {
    if (!hydrated.current) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ cart, phone, orderId, view }));
    } catch {}
  }, [cart, phone, orderId, view]);

  // Load menu + live updates. Surface failures instead of swallowing them.
  const loadMenu = () => {
    setMenuError(false);
    return getMenu()
      .then((m) => {
        setMenu(m);
        setMenuLoading(false);
      })
      .catch(() => {
        setMenuError(true);
        setMenuLoading(false);
      });
  };
  useEffect(() => {
    loadMenu();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useLive(["menu"], loadMenu);

  // Live service fee from store settings (owner can change it in Pengaturan).
  const loadConfig = () => getConfig().then((c) => setServiceFee(c.serviceFee)).catch(() => {});
  useEffect(() => {
    loadConfig();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useLive(["settings"], loadConfig);

  // Resolve cart lines against the live menu.
  const lines: ResolvedLine[] = Object.keys(cart)
    .map((key): ResolvedLine | null => {
      const l = cart[key];
      const product = menu.find((m) => m.id === l.id);
      if (!product) return null;
      return {
        key,
        product,
        sel: l.sel,
        qty: l.qty,
        opts: modSummary(product, l.sel),
        unit: unitPrice(product, l.sel),
      };
    })
    .filter((l): l is ResolvedLine => l !== null);

  const cartCount = lines.reduce((a, l) => a + l.qty, 0);
  const subtotal = lines.reduce((s, l) => s + l.unit * l.qty, 0);
  const totals = computeTotals(
    lines.map((l) => ({ price: l.unit, qty: l.qty })),
    promo?.amount ?? 0,
    serviceFee,
  );

  const addLine = (id: string, sel: Selection, n: number) => {
    setCart((c) => {
      const k = lineKey(id, sel);
      const cur = c[k];
      const q = (cur ? cur.qty : 0) + n;
      const next = { ...c };
      if (q <= 0) delete next[k];
      else next[k] = { id, sel, qty: q };
      return next;
    });
  };

  const setQty = (key: string, qty: number) => {
    setCart((c) => {
      const cur = c[key];
      if (!cur) return c;
      const next = { ...c };
      if (qty <= 0) delete next[key];
      else next[key] = { ...cur, qty };
      return next;
    });
  };

  const placeOrder = async () => {
    if (placing || !lines.length) return;
    setPlacing(true);
    try {
      const order = await createOrder({
        table,
        method,
        lines: Object.values(cart).map((l) => ({ id: l.id, sel: l.sel, qty: l.qty })),
        promoCode: promo?.code ?? null,
        phone: phone || null,
      });
      setOrderId(order.id);
      setCart({});
      setPromo(null);
      setView("status");
    } catch {
      // leave the checkout view so the customer can retry
    } finally {
      setPlacing(false);
    }
  };

  const resetToMenu = () => {
    setCart({});
    setOrderId(null);
    setPromo(null);
    setView("menu");
  };

  return (
    <div
      style={{
        background: "#cdbb9c",
        minHeight: "100dvh",
        display: "flex",
        justifyContent: "center",
        alignItems: "stretch",
      }}
    >
      <MejaStyles />
      <div
        className="meja-shell"
        style={{
          width: "100%",
          maxWidth: 430,
          height: "100dvh",
          background: "var(--cream)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {view === "menu" && (
          <MenuView
            table={table}
            menu={menu}
            cartCount={cartCount}
            subtotal={subtotal}
            loading={menuLoading}
            error={menuError}
            onRetry={loadMenu}
            onOpen={setDetail}
            onCart={() => setView("cart")}
          />
        )}
        {view === "cart" && (
          <CartView
            lines={lines}
            subtotal={subtotal}
            serviceFee={serviceFee}
            onQty={setQty}
            onMenu={() => setView("menu")}
            onCheckout={() => setView("checkout")}
          />
        )}
        {view === "checkout" && (
          <CheckoutView
            table={table}
            lines={lines}
            subtotal={subtotal}
            totals={totals}
            method={method}
            setMethod={setMethod}
            promo={promo}
            setPromo={setPromo}
            phone={phone}
            setPhone={setPhone}
            onBack={() => setView("cart")}
            onPlace={placeOrder}
            placing={placing}
          />
        )}
        {view === "status" && orderId && <StatusView orderId={orderId} table={table} onMenu={resetToMenu} />}
        {view === "status" && !orderId && (
          <MenuView
            table={table}
            menu={menu}
            cartCount={cartCount}
            subtotal={subtotal}
            loading={menuLoading}
            error={menuError}
            onRetry={loadMenu}
            onOpen={setDetail}
            onCart={() => setView("cart")}
          />
        )}

        {detail && (
          <DetailSheet
            product={detail}
            onClose={() => setDetail(null)}
            onAdd={(sel, n) => {
              addLine(detail.id, sel, n);
              setDetail(null);
            }}
          />
        )}
      </div>
    </div>
  );
}
