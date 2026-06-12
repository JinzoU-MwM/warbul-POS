# Discount & Voucher System Design

**Goal:** Add a DB-backed discount and voucher system to Warbul POS — replacing hardcoded promos with owner-managed voucher codes and automatic discount rules, and restructuring the Settings page into per-section sub-pages.

**Architecture:** A unified `promotions` table (discriminated by `kind: "voucher" | "auto"`) powers both types. Server-side `applyDiscounts()` collects, evaluates stacking rules, and records redemptions. The customer checkout previews auto-discounts in real time. The Settings page becomes a card-list landing that drills into individual sub-pages.

**Tech Stack:** Next.js 16 App Router, Drizzle ORM + LibSQL/SQLite, React 19, TypeScript strict

---

## 1. Data Model

### `promotions` table

```ts
export const promotions = sqliteTable("promotions", {
  id:        text("id").primaryKey(),
  kind:      text("kind").notNull(),        // "voucher" | "auto"
  name:      text("name").notNull(),
  valueType: text("value_type").notNull(),  // "flat" | "pct"
  value:     integer("value").notNull(),    // flat: rupiah; pct: 0–100
  maxValue:  integer("max_value"),          // pct only: cap in rupiah (null = no cap)
  minSpend:  integer("min_spend").notNull().default(0),
  scope:     text("scope").notNull().default("all"), // "all" | category name
  stackable: integer("stackable").notNull().default(0), // 0|1
  enabled:   integer("enabled").notNull().default(1),   // 0|1
  // voucher-only
  code:      text("code").unique(),         // null for auto
  maxUses:   integer("max_uses"),           // null = unlimited
  usedCount: integer("used_count").notNull().default(0),
  expiresAt: integer("expires_at"),         // epoch ms, null = no expiry
  // auto-only
  trigger:   text("trigger"),              // JSON string, null for voucher
});
```

**Trigger JSON shapes:**
```json
{ "type": "time",     "from": "14:00", "to": "16:00" }
{ "type": "minSpend", "amount": 50000 }
{ "type": "qty",      "count": 3 }
```

### `redemptions` table

```ts
export const redemptions = sqliteTable("redemptions", {
  id:          text("id").primaryKey(),
  promotionId: text("promotion_id").notNull(),
  orderId:     text("order_id").notNull(),
  amount:      integer("amount").notNull(), // rupiah actually applied
  redeemedAt:  integer("redeemed_at").notNull(),
});
```

### `orders.promo` field shape change

Old: `{ code: string; amount: number } | null`

New: `Array<{ id: string; name: string; code?: string; amount: number }>` (empty array when no discounts)

`orders.discount` stays as the integer sum of all applied discount amounts.

---

## 2. Discount Application Logic

### `applyDiscounts(params)` — server-side, called in `createOrder()`

```ts
interface ApplyParams {
  subtotal: number;
  qty: number;            // total items in order
  categories: string[];   // categories present in the cart
  voucherCode?: string;
  // nowMinutes computed server-side: Math.floor((Date.now() % 86400000) / 60000) + tzOffset
}

interface AppliedDiscount {
  id: string;
  name: string;
  code?: string;
  amount: number;
}

interface ApplyResult {
  applied: AppliedDiscount[];
  totalDiscount: number;
}
```

**Algorithm:**

1. **Collect auto-discount candidates** — query all `kind="auto"`, `enabled=1`. Filter by:
   - `minSpend <= subtotal`
   - `scope === "all"` OR `scope` is in `categories`
   - Trigger condition:
     - `time`: `nowMinutes >= from && nowMinutes <= to`
     - `minSpend`: `subtotal >= trigger.amount`
     - `qty`: total item quantity `>= trigger.count`

2. **Collect voucher candidate** (if `voucherCode` provided) — fetch by `code`. Validate:
   - `enabled = 1`
   - `expiresAt` is null or `> Date.now()`
   - `usedCount < maxUses` (or `maxUses` is null)
   - `minSpend <= subtotal`
   - `scope === "all"` OR `scope` is in `categories`
   - On failure: throw with descriptive Indonesian message

3. **Compute each candidate's amount:**
   - `flat`: `min(value, subtotal)`
   - `pct`: `Math.floor(subtotal * value / 100)`, then `min(result, maxValue ?? Infinity)`

4. **Stacking resolution:**
   - Split into `stackable[]` and `nonStackable[]`
   - Apply all stackable (sum their amounts)
   - From non-stackable: take the one with the highest amount
   - Running `totalDiscount` cannot exceed `subtotal`

5. **Return** `{ applied, totalDiscount }`

### Redemption recording — called after order insert

```ts
async function recordRedemptions(applied: AppliedDiscount[], orderId: string): Promise<void>
```
- Insert one `redemptions` row per applied discount
- Increment `usedCount` on vouchers (`kind="voucher"`) only

---

## 3. API Routes

### Public

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/promo` | Validate voucher code + preview amount. Body: `{ code, subtotal, qty, categories }`. Returns `{ ok, amount, name, message }`. Validates against DB. |
| GET | `/api/promotions/auto` | Preview applicable auto-discounts. Query: `subtotal`, `qty`, `categories` (comma-separated). Returns `AppliedDiscount[]`. |

### Owner (auth required)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/promotions` | List all promotions |
| POST | `/api/promotions` | Create promotion |
| PATCH | `/api/promotions/[id]` | Update promotion |
| DELETE | `/api/promotions/[id]` | Delete promotion |

---

## 4. Settings Page Restructure

`SettingsView` becomes a card-list landing page. State: `subview: string | null` (null = landing).

**Landing page cards (in order):**
1. 🏪 Profil Toko — Nama, cabang, alamat, jam operasional
2. 💳 Pembayaran & Biaya — Metode, biaya layanan, QRIS merchant
3. 🔔 Notifikasi — Pesanan baru, stok menipis
4. 🗂 Kategori Menu — Tambah, ubah, hapus kategori
5. ✨ Add-on & Varian — Grup modifier, opsi, harga
6. 🏷 Diskon & Voucher — Kode voucher, diskon otomatis
7. 📱 QR Meja — Generate & unduh QR per meja

Each card navigates to its sub-page component. Sub-pages have a `← Pengaturan` back button in the header.

**Sub-page components (new or extracted):**
- `SettingsProfileSection` — Profil Toko form + save
- `SettingsPaymentSection` — Pembayaran toggles + fields + save
- `SettingsNotifSection` — Notifikasi toggles + save
- `CategorySection` — existing, already standalone
- `ModifierAdminView` — existing, already standalone
- `DiscountView` — new (see §5)
- `TablesView` — existing, already standalone

Each profile/payment/notif section has its own "Simpan" button — no longer a single global save.

---

## 5. Discount & Voucher Sub-page (`DiscountView`)

**Layout:** Header with `← Pengaturan` + title. Two tabs: **Kode Voucher** | **Diskon Otomatis**.

**Each tab:**
- List of promotion cards:
  - Voucher card: code badge (amber), name, value summary, scope, usage count (`12/50`), expiry, active toggle, edit button
  - Auto card: name, trigger description, value summary, scope, active toggle, edit button
- `+ Tambah` button opens create modal

**Voucher modal fields:**
- Kode (text, auto-uppercased)
- Tipe: Flat Rp / Persentase %
- Nilai (number)
- Maks. Diskon Rp (shown only for pct type)
- Min. Belanja Rp
- Berlaku Untuk: Semua / [category select]
- Maks. Penggunaan (number, empty = unlimited)
- Kadaluarsa (date input, optional)
- Bisa digabung (stackable toggle)
- Aktif (enabled toggle)

**Auto-discount modal fields:**
- Nama
- Tipe: Flat Rp / Persentase %
- Nilai (number)
- Maks. Diskon Rp (pct only)
- Min. Belanja Rp
- Berlaku Untuk: Semua / [category select]
- Trigger: dropdown → Jam (from/to time) | Min. Belanja (amount) | Jumlah Item (count)
- Bisa digabung (stackable toggle)
- Aktif (enabled toggle)

---

## 6. Customer Checkout Changes (`CheckoutView`)

1. On cart change, fetch `GET /api/promotions/auto?subtotal=X&qty=Y&categories=A,B` — store result as `autoDiscounts: AppliedDiscount[]`
2. Display each auto-discount as a green badge above the voucher input:
   ```
   🎉 Happy Hour Sore · otomatis     −Rp5.400
      Berlaku 14:00–16:00
   ```
3. Voucher code input remains below, unchanged UX
4. Price breakdown shows each applied discount as a separate line:
   ```
   Diskon (Happy Hour Sore)    −Rp5.400
   Diskon (NGOPI5)             −Rp5.000
   ```
5. On order submit, pass `voucherCode` only — server re-runs `applyDiscounts()` server-side at order creation time, computing auto-discounts from current cart state and server clock (never trust client-passed discount IDs)

---

## 7. Files Changed

| Action | File |
|--------|------|
| Modify | `src/db/schema.ts` |
| Modify | `src/lib/types.ts` |
| Delete | `src/lib/promos.ts` |
| Modify | `src/lib/store.ts` |
| Modify | `src/lib/pricing.ts` |
| New | `src/app/api/promotions/route.ts` |
| New | `src/app/api/promotions/[id]/route.ts` |
| New | `src/app/api/promotions/auto/route.ts` |
| Modify | `src/app/api/promo/route.ts` |
| Modify | `src/app/api/orders/route.ts` |
| Modify | `src/app/owner/SettingsView.tsx` |
| New | `src/app/owner/DiscountView.tsx` |
| Modify | `src/app/meja/[table]/CheckoutView.tsx` |
