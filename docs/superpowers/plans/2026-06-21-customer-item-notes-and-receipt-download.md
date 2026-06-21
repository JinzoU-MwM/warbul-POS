# Customer Per-Item Notes + Receipt Download — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let customers attach a short note to each menu item they order (visible to the cashier + on the receipt), and replace the customer's receipt "Cetak Struk" (print) button with a "Download Struk" (PNG) action. Cashier print flow unchanged.

**Architecture:** Add a nullable `note` column to `order_items`; thread an optional per-item note from the customer item sheet → cart (note becomes part of the line key so distinct notes don't merge) → order API → DB → cashier view + receipt. Add a dependency-free canvas PNG receipt generator and a `download` mode on the shared `ReceiptModal`.

**Tech Stack:** Next.js 16 (App Router) · React 19 · Drizzle ORM + libSQL/Turso · TypeScript · Capacitor (cashier APK only).

## Global Constraints

- **Next.js 16 / React 19** — APIs differ from older versions; consult `node_modules/next/dist/docs/` before non-trivial framework changes (per `AGENTS.md`).
- **Per-item note only.** No per-order customer note (the `orders.note` field is reserved as a cashier status message). (spec scope)
- **Customer side only.** Do not add note entry to the cashier walk-in `NewOrderView`. (spec scope)
- **Note sanitation:** trim, collapse internal whitespace, cap **140 chars**, empty → `null`. Server always re-sanitizes (never trust client). (spec A2)
- **`order_items.note` is nullable, no default** — backward compatible. (spec A1)
- **Migrate-first:** the Turso `note` column must exist before the new code ships. (spec Migration)
- **No new npm dependencies** (receipt download uses the Canvas API). (spec B2)
- **Verification gate:** `npm run typecheck` after each task; `npm run build` + manual flow before deploy. No test runner exists. (spec Verification)
- Package manager: **npm**. Dev DB: local `file:warbul.db`.

---

## Local setup (run once before Task 1)

```bash
cd D:/Codding/Project/warbul-POS    # local working copy (git baseline tagged "baseline")
npm install
# Local env for dev DB + seed (NOT the prod Turso creds):
printf 'DATABASE_URL=file:warbul.db\nSEED_OWNER_PASSWORD=owner123\nSEED_KASIR_PASSWORD=kasir123\n' > .env
npm run db:push      # creates warbul.db with the CURRENT schema
npm run db:seed      # seeds menu/modifiers/users
npm run dev          # http://localhost:3000  → customer at /meja/7 , cashier at /pos
```
`.env` is gitignored (`.env.example` is the template). Re-run `npm run db:push` after Task 2 to add the new column to the **local** DB.

---

## Phase 1 — Data layer

### Task 1: `cleanNote` utility (pure, unit-tested)

**Files:**
- Create: `src/lib/notes.ts`
- Create: `scripts/test-clean-note.ts` (standalone tsx test — no framework needed)

**Interfaces:**
- Produces: `cleanNote(s?: string | null): string | null` — trims, collapses whitespace, caps 140 chars; returns `null` for empty/whitespace-only.

- [ ] **Step 1: Write the failing test** `scripts/test-clean-note.ts`

```ts
import assert from "node:assert";
import { cleanNote } from "../src/lib/notes";

assert.strictEqual(cleanNote(undefined), null);
assert.strictEqual(cleanNote(""), null);
assert.strictEqual(cleanNote("   "), null);
assert.strictEqual(cleanNote("  es   sedikit  "), "es sedikit");
assert.strictEqual(cleanNote("a".repeat(200))!.length, 140);
assert.strictEqual(cleanNote("tanpa gula"), "tanpa gula");
console.log("cleanNote OK");
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npx tsx scripts/test-clean-note.ts`
Expected: FAIL — `Cannot find module '../src/lib/notes'`.

- [ ] **Step 3: Implement** `src/lib/notes.ts`

```ts
// Sanitize a customer-entered per-item note. Pure (no server deps) so it is
// safe to import on client + server and to unit-test standalone.
export const MAX_NOTE_LEN = 140;

export function cleanNote(s?: string | null): string | null {
  if (!s) return null;
  const t = s.replace(/\s+/g, " ").trim().slice(0, MAX_NOTE_LEN);
  return t.length ? t : null;
}
```

- [ ] **Step 4: Run it to confirm it passes**

Run: `npx tsx scripts/test-clean-note.ts`
Expected: prints `cleanNote OK`, exit 0.

- [ ] **Step 5: Commit**

```bash
git add src/lib/notes.ts scripts/test-clean-note.ts
git commit -m "feat: cleanNote util for per-item notes (tested)"
```

---

### Task 2: Data contracts — schema, types, API body

**Files:**
- Modify: `src/db/schema.ts` (orderItems table)
- Modify: `src/lib/types.ts` (`OrderItem`)
- Modify: `src/lib/api.ts` (`CreateOrderBody.lines`)

**Interfaces:**
- Produces: `OrderItem.note?: string`; `order_items.note` column; `CreateOrderBody.lines[].note?: string`.

- [ ] **Step 1: Schema** — in `src/db/schema.ts`, add `note` to `orderItems` (after `opts`):

```ts
export const orderItems = sqliteTable("order_items", {
  id: text("id").primaryKey(),
  orderId: text("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  productId: text("product_id").notNull(),
  name: text("name").notNull(),
  price: integer("price").notNull(), // unit price incl. modifiers
  qty: integer("qty").notNull(),
  opts: text("opts", { mode: "json" }).notNull().$type<string[]>(),
  note: text("note"), // per-item customer note (nullable)
});
```

- [ ] **Step 2: Types** — in `src/lib/types.ts`, add `note` to `OrderItem`:

```ts
export interface OrderItem {
  id: string; // product id
  name: string;
  price: number; // unit price (incl. modifiers) at time of order
  qty: number;
  opts: string[]; // human-readable modifier labels
  note?: string; // per-item customer note
}
```

- [ ] **Step 3: API body** — in `src/lib/api.ts`, extend the `lines` element type of `CreateOrderBody`:

```ts
  lines: { id: string; sel?: Selection; qty: number; note?: string }[];
```

- [ ] **Step 4: Apply schema to local DB**

Run: `npm run db:push`
Expected: drizzle adds the `note` column to `order_items` (prompts "yes" if asked).

- [ ] **Step 5: Typecheck**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/db/schema.ts src/lib/types.ts src/lib/api.ts
git commit -m "feat: order_items.note column + OrderItem/CreateOrderBody types"
```

---

### Task 3: Persist + read the note in the store

**Files:**
- Modify: `src/lib/store.ts` (`OrderLineInput`, `addOrder`, `itemsFor`)

**Interfaces:**
- Consumes: `cleanNote` (Task 1), `OrderItem.note` (Task 2).
- Produces: orders created with per-item notes; `getOrder`/`getOrders` return `note` on items.

- [ ] **Step 1: Import `cleanNote`** — add near the top imports of `src/lib/store.ts`:

```ts
import { cleanNote } from "./notes";
```

- [ ] **Step 2: Extend `OrderLineInput`** (around line 339):

```ts
export interface OrderLineInput {
  id: string;
  sel?: Selection;
  qty: number;
  note?: string;
}
```

- [ ] **Step 3: Carry the note onto the resolved item** — in `addOrder`, the `resolved.push({...})` call becomes:

```ts
    resolved.push({
      id: p.id, name: p.name, price: unitPrice(p, line.sel, groups), qty,
      opts: modSummary(p, line.sel, groups),
      note: cleanNote(line.note) ?? undefined,
    });
```

- [ ] **Step 4: Persist the note** — in `addOrder`, the `orderItems` insert becomes:

```ts
  for (const it of resolved) {
    await db.insert(orderItems).values({
      id: `${id}-${it.id}-${Math.random().toString(36).slice(2, 7)}`,
      orderId: id, productId: it.id, name: it.name, price: it.price, qty: it.qty,
      opts: it.opts, note: it.note ?? null,
    });
  }
```

- [ ] **Step 5: Return the note when reading** — update `itemsFor`:

```ts
async function itemsFor(orderId: string): Promise<OrderItem[]> {
  const rows = await db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
  return rows.map((r) => ({ id: r.productId, name: r.name, price: r.price, qty: r.qty, opts: r.opts, note: r.note ?? undefined }));
}
```

- [ ] **Step 6: Typecheck**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add src/lib/store.ts
git commit -m "feat: persist + read per-item note in addOrder/itemsFor"
```

---

## Phase 2 — Customer cart + input

### Task 4: Cart line carries the note (types + key)

**Files:**
- Modify: `src/app/meja/[table]/shared.tsx` (`CartLine`, `ResolvedLine`, `lineKey`)

**Interfaces:**
- Produces: `CartLine.note?`, `ResolvedLine.note?`, `lineKey(id, sel, note?)`.

- [ ] **Step 1: Extend the cart types + key** in `src/app/meja/[table]/shared.tsx`:

```ts
/** A cart line. Keyed in the cart record by `lineKey`. */
export interface CartLine {
  id: string;
  sel: Selection;
  qty: number;
  note?: string;
}

/** A resolved cart line with its product + computed display values. */
export interface ResolvedLine {
  key: string;
  product: Product;
  sel: Selection;
  qty: number;
  opts: string[];
  unit: number;
  note?: string;
}

export type View = "menu" | "cart" | "checkout" | "status";

// Include the note so the same item+modifiers with different notes stay distinct lines.
export const lineKey = (id: string, sel: Selection, note = ""): string =>
  id + "|" + JSON.stringify(sel) + "|" + note;
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: no errors (existing 2-arg `lineKey` calls still valid via the default param).

- [ ] **Step 3: Commit**

```bash
git add "src/app/meja/[table]/shared.tsx"
git commit -m "feat: cart line note + note-aware lineKey"
```

---

### Task 5: Note input in the item sheet + thread through CustomerApp

**Files:**
- Modify: `src/app/meja/[table]/DetailSheet.tsx`
- Modify: `src/app/meja/[table]/CustomerApp.tsx`

**Interfaces:**
- Consumes: `CartLine.note`, `lineKey(id, sel, note)` (Task 4); `CreateOrderBody.lines[].note` (Task 2).
- Produces: `DetailSheet.onAdd(sel, qty, note)`; `CustomerApp.addLine(id, sel, n, note?)` and `setNote(key, note)`.

- [ ] **Step 1: DetailSheet — accept a note and add a textarea.** Change the props + state at the top of `src/app/meja/[table]/DetailSheet.tsx`:

```ts
interface DetailSheetProps {
  product: Product;
  onClose: () => void;
  onAdd: (sel: Selection, qty: number, note: string) => void;
}

export default function DetailSheet({ product, onClose, onAdd }: DetailSheetProps): JSX.Element {
  const { defaultSelection, unitPrice } = useModifiers();
  const [sel, setSel] = useState<Selection>(() => defaultSelection(product));
  const [qty, setQty] = useState(1);
  const [note, setNote] = useState("");
  const unit = unitPrice(product, sel);
```

- [ ] **Step 2: DetailSheet — render the textarea** just after `<ModifierGroups … />` (replace the `<div style={{ height: 8 }} />` line that follows it):

```tsx
          <ModifierGroups item={product} sel={sel} onChange={setSel} />

          <label style={{ display: "block", marginTop: 14, fontSize: 13, fontWeight: 700, color: "var(--ink)" }}>
            Catatan (opsional)
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={140}
            rows={2}
            placeholder="mis. es sedikit, tanpa gula, pedas…"
            style={{
              width: "100%", marginTop: 6, padding: "10px 12px", borderRadius: 12,
              border: "1.5px solid var(--line)", background: "#fff", fontFamily: "inherit",
              fontSize: 13.5, resize: "none", color: "var(--ink)",
            }}
          />
          <div style={{ height: 8 }} />
```

- [ ] **Step 3: DetailSheet — pass the note on add.** Change the Tambah button `onClick`:

```tsx
            onClick={() => onAdd(sel, qty, note)}
```

- [ ] **Step 4: CustomerApp — note-aware `addLine` + `setNote`.** In `src/app/meja/[table]/CustomerApp.tsx` replace `addLine` and add `setNote` (the existing `setQty` stays):

```ts
  const addLine = (id: string, sel: Selection, n: number, note?: string) => {
    setCart((c) => {
      const k = lineKey(id, sel, note || "");
      const cur = c[k];
      const q = (cur ? cur.qty : 0) + n;
      const next = { ...c };
      if (q <= 0) delete next[k];
      else next[k] = { id, sel, qty: q, note: note || undefined };
      return next;
    });
  };

  // Edit a line's note in the cart: re-key the entry, preserving qty.
  const setNote = (key: string, note: string) => {
    setCart((c) => {
      const cur = c[key];
      if (!cur) return c;
      const cleaned = note.trim() ? note : undefined;
      const newKey = lineKey(cur.id, cur.sel, cleaned || "");
      const next = { ...c };
      delete next[key];
      next[newKey] = { ...cur, note: cleaned };
      return next;
    });
  };
```

- [ ] **Step 5: CustomerApp — carry note on resolved lines.** In the `lines` builder, add `note` to the returned object:

```ts
      return {
        key,
        product,
        sel: l.sel,
        qty: l.qty,
        opts: modSummary(product, l.sel),
        unit: unitPrice(product, l.sel),
        note: l.note,
      };
```

- [ ] **Step 6: CustomerApp — send note when placing the order.** In `placeOrder`, change the `lines` map:

```ts
        lines: Object.values(cart).map((l) => ({ id: l.id, sel: l.sel, qty: l.qty, note: l.note })),
```

- [ ] **Step 7: CustomerApp — pass note through DetailSheet.** Update the `<DetailSheet … onAdd>` near the bottom:

```tsx
        {detail && (
          <DetailSheet
            product={detail}
            onClose={() => setDetail(null)}
            onAdd={(sel, n, note) => {
              addLine(detail.id, sel, n, note);
              setDetail(null);
            }}
          />
        )}
```

- [ ] **Step 8: Wire `setNote` to CartView** — update the `<CartView … />` usage to pass `onNote`:

```tsx
        {view === "cart" && (
          <CartView
            lines={lines}
            subtotal={subtotal}
            serviceFee={serviceFee}
            onQty={setQty}
            onNote={setNote}
            onMenu={() => setView("menu")}
            onCheckout={() => setView("checkout")}
          />
        )}
```

- [ ] **Step 9: Typecheck** (expects a CartView prop error until Task 6 — acceptable here; if you want green now, do Task 6 before re-running)

Run: `npm run typecheck`
Expected: only `onNote` unknown on `CartView` (resolved in Task 6). All DetailSheet/CustomerApp errors gone.

- [ ] **Step 10: Commit**

```bash
git add "src/app/meja/[table]/DetailSheet.tsx" "src/app/meja/[table]/CustomerApp.tsx"
git commit -m "feat: per-item note input in item sheet + cart threading"
```

---

### Task 6: Show + edit the note in the cart

**Files:**
- Modify: `src/app/meja/[table]/CartView.tsx`

**Interfaces:**
- Consumes: `ResolvedLine.note` (Task 4), `CustomerApp.setNote` via `onNote` (Task 5).

- [ ] **Step 1: Add the `onNote` prop** to `CartViewProps`:

```ts
interface CartViewProps {
  lines: ResolvedLine[];
  subtotal: number;
  serviceFee: number;
  onQty: (key: string, qty: number) => void;
  onNote: (key: string, note: string) => void;
  onMenu: () => void;
  onCheckout: () => void;
}

export default function CartView({ lines, subtotal, serviceFee, onQty, onNote, onMenu, onCheckout }: CartViewProps): JSX.Element {
```

- [ ] **Step 2: Render a note field per line.** Inside the line's middle column, after the price `<div className="num" …>{rupiah(l.unit)}</div>`, add:

```tsx
                <input
                  value={l.note ?? ""}
                  onChange={(e) => onNote(l.key, e.target.value)}
                  maxLength={140}
                  placeholder="+ Catatan (mis. es sedikit)"
                  style={{
                    width: "100%", marginTop: 6, padding: "6px 9px", borderRadius: 9,
                    border: "1px solid var(--line)", background: "var(--cream)", fontFamily: "inherit",
                    fontSize: 12, color: "var(--ink)",
                  }}
                />
```

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: no errors (CustomerApp already passes `onNote`).

- [ ] **Step 4: Manual check**

Run dev (`npm run dev`). On `/meja/7`: add an item with note "pedas"; add same item with note "tidak pedas" → two lines. Edit a note inline. Add same item, same note → qty merges.

- [ ] **Step 5: Commit**

```bash
git add "src/app/meja/[table]/CartView.tsx"
git commit -m "feat: show + edit per-item note in cart"
```

---

## Phase 3 — Show the note (customer status, cashier, receipt)

### Task 7: Show item note on customer StatusView

**Files:**
- Modify: `src/app/meja/[table]/StatusView.tsx`

- [ ] **Step 1:** In the order-detail items map (the block rendering `{it.qty}× {it.name}` + `<OptsLine opts={it.opts} />`), add the note after `<OptsLine>`:

```tsx
                  {it.name}
                  <OptsLine opts={it.opts} />
                  {it.note && (
                    <div style={{ fontSize: 11.5, color: "var(--green-700)", marginTop: 2, fontWeight: 600 }}>
                      📝 {it.note}
                    </div>
                  )}
```

- [ ] **Step 2: Typecheck** → `npm run typecheck` → no errors.

- [ ] **Step 3: Commit**

```bash
git add "src/app/meja/[table]/StatusView.tsx"
git commit -m "feat: show per-item note on customer order status"
```

---

### Task 8: Show item note on the cashier OrderDetail

**Files:**
- Modify: `src/app/pos/OrderDetail.tsx`

- [ ] **Step 1:** In the items map, after the opts `<div>` (the one rendering `{it.opts.join(" · ")}`), add:

```tsx
              {it.opts && it.opts.length > 0 && (
                <div style={{ fontSize: 12, color: "#8b7f6c", marginTop: 2 }}>{it.opts.join(" · ")}</div>
              )}
              {it.note && (
                <div style={{ fontSize: 12.5, color: "var(--green-700)", marginTop: 3, fontWeight: 700 }}>
                  📝 {it.note}
                </div>
              )}
```

- [ ] **Step 2: Typecheck** → `npm run typecheck` → no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/pos/OrderDetail.tsx
git commit -m "feat: show per-item note on cashier order detail"
```

---

### Task 9: Print/show item note on the receipt content

**Files:**
- Modify: `src/lib/escpos.ts` (`buildReceiptEscPos`)
- Modify: `src/components/Receipt.tsx` (`Receipt`)

- [ ] **Step 1: ESC/POS** — in `buildReceiptEscPos`, the item loop becomes:

```ts
  for (const it of order.items) {
    p.kv(`${it.qty}x ${it.name}`, rupiah(it.price * it.qty));
    if (it.opts && it.opts.length) p.line("  " + it.opts.join(", "));
    if (it.note) p.line("  * " + it.note);
  }
```

- [ ] **Step 2: On-screen receipt** — in `src/components/Receipt.tsx`, inside the items map, after the opts line:

```tsx
          {it.opts && it.opts.length > 0 && (
            <div style={{ fontSize: 11, color: "#8b7f6c", paddingLeft: 16 }}>{it.opts.join(", ")}</div>
          )}
          {it.note && (
            <div style={{ fontSize: 11, color: "#5b5145", paddingLeft: 16, fontStyle: "italic" }}>* {it.note}</div>
          )}
```

- [ ] **Step 3: Typecheck** → `npm run typecheck` → no errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/escpos.ts src/components/Receipt.tsx
git commit -m "feat: per-item note on printed + on-screen receipt"
```

---

## Phase 4 — Customer receipt download

### Task 10: Canvas PNG receipt generator

**Files:**
- Create: `src/lib/receipt-image.ts`

**Interfaces:**
- Consumes: `Order`, `StoreSettings`, `rupiah`.
- Produces: `downloadReceiptImage(order: Order, settings?: StoreSettings | null): void` — renders a receipt PNG and triggers a download named `Struk-{order.id}.png`.

- [ ] **Step 1: Implement** `src/lib/receipt-image.ts`

```ts
"use client";
// Dependency-free receipt → PNG download for the customer side. Draws a clean
// thermal-style receipt onto a canvas and downloads it (no print dialog, no
// external fonts/images that could taint the canvas).
import type { Order, StoreSettings } from "@/lib/types";
import { rupiah } from "@/lib/constants";

const W = 380;            // content width (CSS px)
const PAD = 20;
const SCALE = 2;          // retina crispness
const LH = 20;            // base line height

function wrap(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const probe = cur ? cur + " " + w : w;
    if (ctx.measureText(probe).width > maxW && cur) {
      lines.push(cur);
      cur = w;
    } else {
      cur = probe;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

export function downloadReceiptImage(order: Order, settings?: StoreSettings | null): void {
  const storeName = settings?.storeName ?? "Warbul Coffee";
  const address = settings?.address ?? "";
  const tableLabel = order.table === 0 ? "Bawa Pulang" : "Meja " + String(order.table).padStart(2, "0");
  const stamp = new Date(order.createdAt).toLocaleString("id-ID", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
  const method = order.method === "qris" ? "QRIS" : order.payDetail || "Kasir";

  // Measure pass to compute height.
  const measure = document.createElement("canvas").getContext("2d")!;
  const innerW = W - PAD * 2;
  measure.font = "13px sans-serif";
  let lineCount = 0;
  lineCount += 3;                              // store name, address, gap
  lineCount += 2;                              // id/table, stamp
  for (const it of order.items) {
    lineCount += wrap(measure, `${it.qty}x ${it.name}`, innerW - 70).length;
    if (it.opts?.length) lineCount += 1;
    if (it.note) lineCount += wrap(measure, "* " + it.note, innerW).length;
  }
  lineCount += 6;                             // divider + subtotal/disc/service/total/method
  if (order.promo?.length) lineCount += order.promo.length;
  lineCount += 3;                             // footer
  const height = PAD * 2 + 60 + lineCount * LH;

  const canvas = document.createElement("canvas");
  canvas.width = W * SCALE;
  canvas.height = Math.ceil(height) * SCALE;
  const ctx = canvas.getContext("2d")!;
  ctx.scale(SCALE, SCALE);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, height);
  ctx.fillStyle = "#23201b";
  ctx.textBaseline = "top";

  let y = PAD;
  const left = PAD;
  const right = W - PAD;
  const center = (s: string, font: string) => { ctx.font = font; ctx.textAlign = "center"; ctx.fillText(s, W / 2, y); y += LH; };
  const rowLR = (l: string, r: string, font = "13px sans-serif") => {
    ctx.font = font; ctx.textAlign = "left"; ctx.fillText(l, left, y);
    ctx.textAlign = "right"; ctx.fillText(r, right, y); y += LH;
  };
  const lineL = (s: string, font = "12px sans-serif", color = "#6f6353") => {
    ctx.font = font; ctx.fillStyle = color; ctx.textAlign = "left"; ctx.fillText(s, left, y); ctx.fillStyle = "#23201b"; y += LH;
  };
  const rule = () => { ctx.strokeStyle = "#c9bfa6"; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(left, y + 4); ctx.lineTo(right, y + 4); ctx.stroke(); ctx.setLineDash([]); y += LH; };

  center(storeName, "bold 18px sans-serif");
  if (address) { ctx.fillStyle = "#8b7f6c"; center(address, "11px sans-serif"); ctx.fillStyle = "#23201b"; }
  rule();
  rowLR(order.id, tableLabel);
  lineL(stamp);
  rule();
  for (const it of order.items) {
    const nameLines = wrap(ctx, `${it.qty}x ${it.name}`, W - PAD * 2 - 70);
    nameLines.forEach((nl, i) => {
      ctx.font = "13px sans-serif"; ctx.textAlign = "left"; ctx.fillText(nl, left, y);
      if (i === 0) { ctx.textAlign = "right"; ctx.fillText(rupiah(it.price * it.qty), right, y); }
      y += LH;
    });
    if (it.opts?.length) lineL("  " + it.opts.join(", "), "11px sans-serif");
    if (it.note) wrap(ctx, "* " + it.note, W - PAD * 2).forEach((nl) => lineL("  " + nl, "italic 11px sans-serif", "#5b5145"));
  }
  rule();
  rowLR("Subtotal", rupiah(order.subtotal != null ? order.subtotal : order.total));
  if (order.promo?.length) for (const d of order.promo) rowLR(`Diskon (${d.name})`, "-" + rupiah(d.amount));
  else if (order.discount > 0) rowLR("Diskon", "-" + rupiah(order.discount));
  rowLR("Biaya layanan", rupiah(order.service));
  rowLR("TOTAL", rupiah(order.total), "bold 15px sans-serif");
  rowLR("Metode", method);
  rule();
  ctx.fillStyle = "#8b7f6c";
  center("Terima kasih sudah ngopi di Warbul", "11px sans-serif");
  center("Simpan struk ini sebagai bukti pembayaran", "11px sans-serif");

  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Struk-${order.id}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }, "image/png");
}
```

- [ ] **Step 2: Typecheck** → `npm run typecheck` → no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/receipt-image.ts
git commit -m "feat: dependency-free canvas PNG receipt download"
```

---

### Task 11: `download` mode on ReceiptModal + wire StatusView

**Files:**
- Modify: `src/components/Receipt.tsx` (`ReceiptModalProps`, `ReceiptModal`)
- Modify: `src/app/meja/[table]/StatusView.tsx` (pass `download`)

**Interfaces:**
- Consumes: `downloadReceiptImage` (Task 10).
- Produces: `ReceiptModal` accepts `download?: boolean` (default false = cashier print, unchanged).

- [ ] **Step 1: Import the downloader** in `src/components/Receipt.tsx`:

```ts
import { downloadReceiptImage } from "@/lib/receipt-image";
```

- [ ] **Step 2: Extend the modal props:**

```ts
export interface ReceiptModalProps extends ReceiptProps {
  onClose: () => void;
  download?: boolean; // customer mode: show "Download Struk" instead of print controls
}

export function ReceiptModal({ order, settings, cashierName, onClose, download = false }: ReceiptModalProps): JSX.Element {
```

- [ ] **Step 3: Hide the paper-width selector in download mode.** Wrap the `rcpt-paper` block:

```tsx
        {!download && (
          <div
            className="rcpt-paper"
            style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12 }}
          >
            <span style={{ fontSize: 12, color: "#8b7f6c", whiteSpace: "nowrap" }}>Lebar kertas</span>
            <div style={{ display: "flex", gap: 6, flex: 1 }}>
              <button type="button" onClick={() => changePaper(58)} style={paperBtn(58)}>58mm</button>
              <button type="button" onClick={() => changePaper(80)} style={paperBtn(80)}>80mm</button>
            </div>
          </div>
        )}
```

- [ ] **Step 4: Swap the primary action button.** Replace the Cetak Struk `<button onClick={handlePrint} …>` with a conditional:

```tsx
          {download ? (
            <button
              type="button"
              onClick={() => downloadReceiptImage(order, settings)}
              className="btn btn-green"
              style={{ flex: 1.4, borderRadius: 13, padding: "13px", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
            >
              <Icons.download /> Download Struk
            </button>
          ) : (
            <button
              type="button"
              onClick={handlePrint}
              disabled={busy}
              className="btn btn-green"
              style={{ flex: 1.4, borderRadius: 13, padding: "13px", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, opacity: busy ? 0.7 : 1 }}
            >
              <Icons.printer /> {busy ? "Mencetak…" : "Cetak Struk"}
            </button>
          )}
```

> If `Icons.download` does not exist, check `src/components/icons.tsx`; use an existing icon (e.g. `Icons.print`) or add a simple download glyph. Verify before committing.

- [ ] **Step 5: StatusView — open the modal in download mode.** In `src/app/meja/[table]/StatusView.tsx`, change the modal render:

```tsx
      {receipt && <ReceiptModal order={order} onClose={() => setReceipt(false)} download />}
```

And update the trigger button label/icon (the one currently `<Icons.print size={17} /> Struk`) to read as a download:

```tsx
              <Icons.download size={17} /> Download Struk
```

(again, fall back to an existing icon if `Icons.download` is absent.)

- [ ] **Step 6: Typecheck** → `npm run typecheck` → no errors.

- [ ] **Step 7: Manual check.** Dev: customer StatusView → open struk → only "Download Struk" (no paper width / no print) → downloads `Struk-WB-xxx.png` with items + notes. Cashier `/pos` OrderDetail → still shows "Cetak Struk" + paper width.

- [ ] **Step 8: Commit**

```bash
git add src/components/Receipt.tsx "src/app/meja/[table]/StatusView.tsx"
git commit -m "feat: customer receipt download mode; cashier print unchanged"
```

---

## Phase 5 — Verify + deploy

### Task 12: Full verification + production rollout

**Files:** none (build + deploy)

- [ ] **Step 1: Full typecheck + build**

Run: `npm run typecheck && npm run build`
Expected: both succeed with no errors.

- [ ] **Step 2: Full manual regression** (dev): place a customer order with notes on multiple items (incl. two same-item-different-note lines) → cashier sees notes → receipt (screen) shows notes → customer downloads struk PNG containing notes. Confirm an order with **no** notes still works end to end.

- [ ] **Step 3: Port the diff to the server clone.** From the local repo, produce the patch and apply on `jni-server:/data/docker/warbul-POS` (clean `main`):

```bash
# local
git diff baseline..HEAD -- . ':(exclude).env' > /tmp/warbul-notes.patch
scp /tmp/warbul-notes.patch jni-server:/tmp/warbul-notes.patch
# server
ssh jni-server "cd /data/docker/warbul-POS && git checkout main && git pull --ff-only && git apply --reject /tmp/warbul-notes.patch && git status"
```
(Resolve any `.rej` if upstream moved; the baseline was the server HEAD so it should apply cleanly.)

- [ ] **Step 4: MIGRATE FIRST — add the Turso column.** This needs prod creds (`DATABASE_URL` + `DATABASE_AUTH_TOKEN`). With them set in the server clone's `.env` (or the user runs it):

```bash
ssh jni-server "cd /data/docker/warbul-POS && npm run db:push"
```
Expected: adds nullable `note` column to `order_items` on Turso. Safe while old code runs (column ignored).
> **Blocked on prod credentials** — obtain from the user / Vercel project env before running.

- [ ] **Step 5: Ship the code.** Commit + push to `main` → Vercel auto-deploys `warkop-warbul.web.id`:

```bash
ssh jni-server "cd /data/docker/warbul-POS && git add -A && git commit -m 'feat: customer per-item notes + receipt download' && git push origin main"
```

- [ ] **Step 6: Production smoke test.** On `warkop-warbul.web.id/meja/<n>`: place an order with an item note → confirm it persists, shows on the cashier surface, and the customer can download the struk. Confirm existing orders (no note) render fine.

- [ ] **Step 7: (Optional) APK** — only if the cashier needs the note on **native Bluetooth** prints: rebuild the Capacitor APK from `main`. Skip otherwise (note already visible on screen + web receipt).

---

## Self-Review (completed during authoring)

**Spec coverage:** A1 schema/types → Task 2; A2 server sanitize/persist → Tasks 1,3; A3 cart model (CartLine/ResolvedLine/lineKey) → Task 4; A4 customer UI (DetailSheet/CartView/StatusView) → Tasks 5,6,7; A5 staff (OrderDetail/escpos/Receipt) → Tasks 8,9; B1 ReceiptModal mode → Task 11; B2 receipt-image.ts → Task 10; B3 StatusView wiring → Task 11; Migration/deploy → Task 12 (migrate-first explicit); Verification → Tasks throughout + Task 12. ✔ all covered.

**Placeholder scan:** no TBD/TODO; every code step has full code. The two `Icons.download` fallbacks are explicit "verify/replace" instructions, not vague placeholders. ✔

**Type consistency:** `cleanNote(s?): string|null` (Task 1) used in Task 3; `OrderItem.note?` (Task 2) read in 7/8/9/10; `lineKey(id, sel, note?)` (Task 4) used in Task 5; `CartView.onNote(key, note)` (Task 6) provided by `CustomerApp.setNote` (Task 5); `DetailSheet.onAdd(sel, qty, note)` (Task 5) matches CustomerApp caller; `downloadReceiptImage(order, settings?)` (Task 10) called in Task 11. ✔ consistent.
