# Design — Customer per-item notes + customer receipt download

**Date:** 2026-06-21
**Project:** Warbul POS (warkop-warbul) — Next.js 16 / React 19 / Drizzle (Turso) / Capacitor
**Status:** Approved (brainstorming) → implementation planning

## Overview

Two changes to the **customer** ordering flow (the `/meja/[table]` surface), requested
by the client:

1. **Per-item notes** — when a customer picks a menu item, they can write a short note
   for that item (e.g. "es sedikit", "tanpa gula", "pedas"). The note is saved per
   order item, shown in the cart, visible to the cashier, and printed on the receipt.
2. **Receipt: download instead of print** — the customer's receipt modal currently
   shows a "Cetak Struk" (Bluetooth/RawBT print) button that is meaningless on a
   customer's own phone. Replace it with a **"Download Struk"** action (PNG image).
   The cashier keeps the print flow unchanged.

Scope decisions (confirmed): **per-item only** (no separate per-order note — the
`orders.note` field is already repurposed by the cashier as a status message);
**customer side only** (cashier walk-in note entry is out of scope for now).

---

## Feature A — Per-item notes

### A1. Data model

- **Schema** (`src/db/schema.ts`): add a nullable column to `order_items`:
  ```ts
  note: text("note"),
  ```
- **Types** (`src/lib/types.ts`):
  - `OrderItem`: add `note?: string`.
  - (server) `OrderLineInput` (in `store.ts`): add `note?: string`.
- The column is **nullable, no default** → backward compatible. Existing rows and
  note-less items store `NULL`.

### A2. Server (`src/lib/store.ts`)

- `addOrder`: for each line, sanitize the note — `trim()`, collapse internal
  whitespace runs, cap at **140 chars**; empty → `null`. Helper `cleanNote(s?)`.
  Persist it in the `orderItems` insert (`note: cleanNote(line.note)`), and carry it
  on the resolved `OrderItem`.
- `itemsFor`: include `note: r.note ?? undefined` in the mapped `OrderItem`.
- The `/api/orders` POST route already forwards `body.lines` verbatim, so the per-line
  `note` reaches `addOrder` once the type allows it — **no route change needed**, but
  the server still re-sanitizes (never trust client).

### A3. Client cart model

- **`shared.tsx`**:
  - `CartLine`: add `note?: string`.
  - `ResolvedLine`: add `note?: string`.
  - `lineKey`: extend to include the note so two of the same item+modifiers with
    **different** notes stay separate lines:
    ```ts
    export const lineKey = (id, sel, note = "") => id + "|" + JSON.stringify(sel) + "|" + note;
    ```
- **`CustomerApp.tsx`**:
  - `addLine(id, sel, n, note?)` — key by `lineKey(id, sel, note)`; store `note` on the
    line. Merge only when product+sel+note all match.
  - `lines` (ResolvedLine) carries `note: l.note`.
  - `placeOrder`: map cart values to `{ id, sel, qty, note }`.
  - A `setNote(key, note)` updater that **re-keys** the cart entry (delete old key,
    insert under the new `lineKey`, preserving qty) — used by CartView inline edit.

### A4. Customer UI

- **`DetailSheet.tsx`** (the item sheet — primary input): add a `<textarea>` labelled
  **"Catatan (opsional)"**, placeholder `"mis. es sedikit, tanpa gula, pedas…"`,
  `maxLength={140}`, below `ModifierGroups` and above the footer. Local `note` state;
  `onAdd(sel, qty, note)`.
- **`CartView.tsx`**: under each line's options, show the note if present and allow
  inline editing (a small "Catatan" input) that calls `setNote(key, value)`.
- **`StatusView.tsx`** (after ordering): show each item's note under its options so the
  customer can confirm what they wrote (read-only).

### A5. Staff visibility

- **`OrderDetail.tsx`** (cashier): under each item's `opts` line, render the note
  prominently (e.g. a pill/▸ line `📝 {it.note}`), so the barista sees it.
- **Receipt**:
  - `src/lib/escpos.ts` `buildReceiptEscPos`: after the `opts` line, print the note
    indented (`p.line("  * " + it.note)`).
  - `src/components/Receipt.tsx` (on-screen receipt): render the note under each item.

---

## Feature B — Customer receipt download (not print)

### B1. `ReceiptModal` gets a mode

- **`src/components/Receipt.tsx`**: add prop `download?: boolean` (default `false`).
  - `false` (cashier, unchanged): paper-width selector, Bluetooth printer picker, and
    the **"Cetak Struk"** button as today.
  - `true` (customer): **hide** the paper-width selector, printer picker, and print
    button. Show a single **"Download Struk"** button → `downloadReceiptImage(order, settings)`.

### B2. `src/lib/receipt-image.ts` (new, no new dependency)

- Render the receipt to an offscreen `<canvas>` and download a PNG named
  `Struk-{order.id}.png`. Drawn content mirrors the on-screen receipt: store name +
  address, divider, order id + table, timestamp, each item (`qty× name`, right-aligned
  price, options line, **note line**), divider, subtotal / discounts / service / TOTAL,
  method, footer ("Terima kasih…"). Width ~ 380px, dynamic height; white background,
  dark text; basic word-wrap for long item names.
- Chosen over `html2canvas`/`window.print()` for reliability across mobile browsers
  (no external font/image tainting, no print dialog). Logo is optional (skip if it
  would taint the canvas; draw a simple title instead).
- Export via `canvas.toBlob` → object URL → a temporary `<a download>` click → revoke.

### B3. `StatusView.tsx`

- The "Struk" trigger button: change its icon/label to indicate **download** (e.g.
  `Icons.download`-style or keep label "Struk"), and open `<ReceiptModal … download />`.
- Cashier path (`OrderDetail.tsx`) is untouched.

---

## Migration & deploy

Prod DB is **Turso** (libSQL); credentials live in **Vercel env**, not in the repo.
Deploy = push to GitHub `main` → Vercel auto-deploys `warkop-warbul.web.id`. There is
**no automated migration** in the build.

**Order of operations (zero-downtime):**
1. **Migrate first** — run `npm run db:push` against the Turso prod DB to add the
   nullable `order_items.note` column. The currently-deployed code ignores the new
   column, so this is safe to run before the code change ships.
   - Requires `DATABASE_URL` + `DATABASE_AUTH_TOKEN` (Turso) in the environment running
     `db:push`. **This step needs the prod credentials** — the user provides them (a
     local `.env`) or runs `db:push` themselves.
2. **Ship code** — commit the changes onto `main` and push → Vercel builds & deploys.
   New code now reads/writes `note`.

> If code shipped before the column exists, `addOrder` inserts would fail and break
> order creation. Hence migrate-first is a hard requirement.

The customer surface is web (QR → browser), so **no APK rebuild** is needed for the
customer features. The cashier on-screen note + on-screen receipt also work on web.
Updating the **native Bluetooth print** to include the note would need an APK rebuild
(low priority — the cashier already sees the note on screen and on the web receipt).

## Verification

The project has no test runner (only `typecheck`). Verify with:
- `npm run typecheck` and `npm run build` (must pass clean).
- Manual flow on `npm run dev`:
  1. `/meja/7` → open an item → write a note → Tambah. Add the same item with a
     different note → two separate cart lines. Edit a note in the cart.
  2. Checkout & place order → `/pos` (cashier) shows the note under the item; print
     preview / web receipt shows the note.
  3. On the customer StatusView, the receipt modal shows **Download Struk** only (no
     print / paper-width), and downloads a `Struk-WB-xxx.png` containing the items +
     notes. Cashier OrderDetail still shows **Cetak Struk**.
- Optional unit check for `cleanNote` (trim/cap) if a lightweight harness is added.

## Out of scope / risks

- **Out of scope:** per-order customer note; cashier walk-in note entry; PDF receipt
  (PNG only — switchable later); translating the note onto the kitchen ticket beyond
  the existing order views.
- **Risk — migrate-first dependency:** needs Turso creds; mitigated by running
  `db:push` before deploy and the column being nullable.
- **Risk — canvas receipt fidelity:** the PNG is a clean re-draw, not a pixel copy of
  the styled HTML; acceptable for a downloadable struk.
