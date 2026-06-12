# Dynamic Categories — Design Spec
_Date: 2026-06-12_

## Overview

Replace the four hardcoded product categories (Kopi, Non-Kopi, Makanan, Snack) with a fully owner-managed system. Owners can add, rename, and delete categories from the Pengaturan (Settings) page. Deletion is blocked while the category still has products. The Settings page is also restructured to absorb Add-on & Varian and QR Meja (currently separate sidebar views) into a single scrollable page.

---

## 1. Data Model

### New table: `categories`

```
id       TEXT  PRIMARY KEY   e.g. "cat_01", "cat_02"
name     TEXT  UNIQUE NOT NULL
position INTEGER NOT NULL    append-only ordering; new rows get max(position)+1
```

**`products.cat`** continues to store the category **name** as plain text (not an ID). This avoids joining everywhere. The trade-off: renaming a category must cascade-update all matching products atomically in one transaction (`UPDATE products SET cat = $new WHERE cat = $old`). This is acceptable — category renames are rare, the table is small.

**Seed migration:** Insert the four existing categories so all current products remain valid:

```sql
INSERT INTO categories VALUES
  ('cat_01', 'Kopi',     1),
  ('cat_02', 'Non-Kopi', 2),
  ('cat_03', 'Makanan',  3),
  ('cat_04', 'Snack',    4);
```

---

## 2. API

### `GET /api/categories`
- Public (no auth required — customer menu tab bar also calls this).
- Returns: `Category[]` ordered by `position ASC`.

### `POST /api/categories`
- Owner session required.
- Body: `{ name: string }`
- Validation: name non-empty, ≤ 40 chars, unique (case-insensitive check).
- Creates with `position = max(position) + 1`.
- Returns: created `Category`.

### `PATCH /api/categories/[id]`
- Owner session required.
- Body: `{ name: string }`
- Renames category AND cascades: `UPDATE products SET cat = $new WHERE cat = $old` in one transaction.
- Returns: updated `Category`.

### `DELETE /api/categories/[id]`
- Owner session required.
- Guard: `SELECT COUNT(*) FROM products WHERE cat = $name`. If > 0, return 409 with message "Ada N produk dalam kategori ini. Pindahkan atau hapus produk terlebih dahulu."
- Returns: `{ ok: true }`.

---

## 3. Settings Page Restructure

### Sections (scrollable, anchor pills at top)

```
[ Profil Toko ] [ Pembayaran ] [ Notifikasi ] [ Kategori ] [ Add-on & Varian ] [ QR Meja ]
```

Each pill is an anchor link (`href="#profil-toko"` etc.). The active pill highlights as the user scrolls past section headings (IntersectionObserver).

### Sections in order:
1. **Profil Toko** — unchanged (existing)
2. **Pembayaran** — unchanged (existing)
3. **Notifikasi** — unchanged (existing)
4. **Kategori** — new `CategorySection` component
5. **Add-on & Varian** — `ModifierAdminView` content inlined (component reused, not re-routed)
6. **QR Meja** — `TablesView` content inlined

### Sidebar change
Remove `addons` and `tables` from the `NAV` array in `OwnerApp.tsx`. Their render blocks (`view === "addons"`, `view === "tables"`) are removed. All access goes through Pengaturan.

---

## 4. Category UI (chip / tag style)

Inside the Kategori section of Pengaturan.

**Display:**
- Categories rendered as flex-wrap pill chips.
- Each chip shows: `name · count · ✕`
- `✕` is **red** (clickable) when the category has 0 products; **grey** (disabled, tooltip) when it has products.
- Tooltip on grey ✕: "Ada N produk — pindahkan dulu sebelum menghapus."

**Add:**
- "+ Tambah" button in section header.
- Clicking shows inline input below the chips: `[____________] [Simpan] [Batal]`
- On submit: POST `/api/categories`, refetch, input collapses.

**Rename:**
- Clicking the chip name puts it into edit mode: `[Non-Kopi___] [✓] [✕]`
- On confirm: PATCH `/api/categories/[id]`, refetch.
- On cancel: reverts to display.

**Delete:**
- Red ✕ → chip turns into an inline confirm: `[Hapus?] [Batal]` (no modal).
- On confirm: DELETE `/api/categories/[id]`.

**Data fetching:** `CategorySection` fetches `GET /api/categories` on mount, refetches after each mutation. Local `useState` only — no global store.

---

## 5. Shared `useCategories()` Hook

A lightweight hook used by the customer menu tab bar (`MenuView.tsx`) and the POS category filter (`NewOrderView.tsx`):

```ts
function useCategories(): string[] {
  const [cats, setCats] = useState<string[]>([]);
  useEffect(() => {
    fetch("/api/categories").then(r => r.json()).then(data => setCats(data.map((c: Category) => c.name)));
  }, []);
  return cats;
}
```

Placed in `src/lib/use-categories.ts`. No polling needed — categories change rarely and only via owner action.

---

## 6. Existing Code Changes

| File | Change |
|------|--------|
| `src/db/schema.ts` | Add `categories` table definition |
| `src/lib/types.ts` | `Category = string` (replaces union type) |
| `src/lib/constants.ts` | Remove `CATS` export |
| `src/lib/store.ts` | Add `getCategories`, `createCategory`, `renameCategory`, `deleteCategory`; update `genProductId` |
| `src/app/api/categories/route.ts` | New — GET + POST handlers |
| `src/app/api/categories/[id]/route.ts` | New — PATCH + DELETE handlers |
| `src/app/owner/SettingsView.tsx` | Add anchor pills, `CategorySection`, inline Addons + QR content |
| `src/app/owner/OwnerApp.tsx` | Remove `addons` and `tables` from NAV |
| `src/app/owner/MenuAdminView.tsx` | Category dropdown: `CATS` → fetched list |
| `src/app/meja/[table]/MenuView.tsx` | Category tabs: `CATS` → `useCategories()` |
| `src/app/pos/NewOrderView.tsx` | Category tabs: `CATS` → `useCategories()` |
| `src/app/api/menu/route.ts` | Validate `cat` against DB categories on create/edit |
| `src/lib/use-categories.ts` | New — `useCategories()` hook |

---

## 7. `genProductId` Update

Current: hard-coded prefix chars (`k` Kopi, `n` Non-Kopi, `m` Makanan, `s` Snack).

New: first 3 lowercased alphanumeric chars of the category name.

```ts
function categoryPrefix(cat: string): string {
  return cat.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 3) || "cat";
}
```

Examples: "Kopi" → `kop`, "Non-Kopi" → `non`, "Makanan" → `mak`, "Snack" → `sna`, "Minuman Dingin" → `min`.

Existing product IDs are **not changed** — this only affects newly created products.

---

## 8. Validation Rules

- Category name: non-empty, max 40 characters, unique (case-insensitive).
- `products.cat` on create/edit: must exist in `categories.name` (validated at API layer via `getCategories()` lookup).
- Delete: blocked if any product references the category (HTTP 409).
- Rename: always allowed (cascade update is atomic).
