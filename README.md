# Warbul — Sistem Kasir Kafe

Self-service cafe POS built from the **Warbul Kasir** Claude Design handoff (Direction A, "Cozy Classic"). Customers scan a QR at their table, browse the menu, order and pay (QRIS / cashier); the cashier sees orders **live**; the owner gets real analytics.

Three surfaces, one Next.js app, one database:

| Route | Surface | Auth |
|-------|---------|------|
| `/meja/[table]` | **Customer** mobile web (QR → menu → cart → checkout → live status) | public |
| `/pos` | **Cashier POS** — live orders, payments, walk-in entry, menu admin | login |
| `/owner` | **Owner** dashboard — KPIs, charts, sales report, settings | owner only |

(`/` just redirects to `/pos`. The design bundle's `Warbul.html` was only a mockup harness that embedded the phone + POS side by side — it isn't a real surface.)

## Tech stack

- **Next.js 16** (App Router, TypeScript) + **React 19**
- **Tailwind CSS v4** — brand tokens from the design's `warbul.css` mapped into the theme; fonts Baloo 2 + Plus Jakarta Sans
- **SQLite** via **libsql** (`@libsql/client`) + **Drizzle ORM** — upgrades cleanly to Turso/Postgres
- **Better Auth** (username + password) for cashier/owner
- **SSE** (`/api/stream`) for real-time order/menu updates — no manual refresh

## Getting started

```bash
npm install
npm run db:push     # create the SQLite schema (warbul.db)
npm run db:seed     # seed menu, demo orders, settings, and users
npm run dev         # http://localhost:3000
```

Then open a surface:
- Customer: `/meja/7`
- POS / Owner login: `/pos` → redirects to `/pos/login` (`/` also redirects here)

### Demo credentials

| Username | Password | Role |
|----------|----------|------|
| `owner`  | `owner123` | owner (sees `/owner`) |
| `kasir`  | `kasir123` | kasir |

## Scripts

- `npm run dev` / `build` / `start`
- `npm run typecheck` — `tsc --noEmit`
- `npm run db:push` — apply the Drizzle schema
- `npm run db:seed` — (re)seed the database
- `npm run db:reset` — push + seed

## Inventory (raw materials)

Products are made from **ingredients** (beans, milk, cups, …) via **recipes** (bill of materials). Managed from the dashboard (**Bahan Baku**, **Add-on & Varian**, and per-product **Resep**):

- A product's availability and "max servings makeable" are **derived** from ingredient stock — it auto-goes **Habis** when any ingredient can't cover one serving. (Products with no recipe are unlimited.)
- Placing an order **deducts ingredients** per the product recipe + each chosen add-on's recipe, and is rejected if stock can't cover it.
- Owner & cashier dashboards have a **Bahan Baku** view for restock + low-ingredient alerts; add-ons (e.g. Extra Shot) have their own ingredient usage.

## Architecture notes

- **Money math is server-authoritative.** `computeTotals` / `unitPrice` / `applyPromo` (in `src/lib/`) are the single source of truth; the server recomputes every order total on creation and ignores client-sent `paid`/`status` from anonymous customers (`src/lib/store.ts`, `src/app/api/orders/route.ts`).
- **Real-time** uses an in-process pub/sub (`src/lib/events.ts`) streamed over SSE. This assumes a **single Node instance** (`next start`), which is correct for one cafe.
  - On **serverless** (e.g. Vercel functions), a long-lived SSE connection + in-memory bus won't work across invocations — deploy as a Node server, or have clients fall back to polling `/api/orders`. The client hook is `src/lib/use-live.ts`.
- **Auth**: `src/middleware.ts` optimistically guards `/pos` and `/owner`; pages re-check the session server-side (and `/owner` enforces the `owner` role). _(Next 16 prints a deprecation notice suggesting the `proxy` file convention; `middleware.ts` still works on 16.x.)_
- **Design source** is kept under `design-reference/` (the original HTML/CSS/JS prototypes + screenshots) for reference.

## Deployment

Set in the environment:

```
DATABASE_URL=file:warbul.db          # or a Turso libsql:// URL
DATABASE_AUTH_TOKEN=...              # only for hosted Turso
BETTER_AUTH_SECRET=<random-strong-secret>
BETTER_AUTH_URL=https://your-domain
NEXT_PUBLIC_APP_URL=https://your-domain
SLUG=<pakasir-project-slug>          # Pakasir QRIS gateway
API_KEY=<pakasir-api-key>
```

Run `npm run build && npm run start` on a persistent Node host so SSE works.

## QRIS payments (Pakasir)

Real QRIS is handled by **[Pakasir](https://pakasir.com/p/docs)**. Set `SLUG` (project) + `API_KEY` in the env. When a customer checks out with QRIS:

1. The server opens a QRIS charge (`POST /api/transactioncreate/qris`) and stores the `payment_number` on the order.
2. The customer's status screen renders that as a scannable QRIS and **polls** `/api/pakasir/status` — works even on localhost, no public URL needed.
3. Once Pakasir reports the payment `completed`, the order flips to **Dibayar → Diproses** automatically and shows up live on the POS. The cashier's manual "Verifikasi Pembayaran QRIS" remains as a fallback.

For production, also point Pakasir's **webhook** at `https://<your-domain>/api/pakasir/webhook` (it re-verifies with the gateway before marking paid). If `SLUG`/`API_KEY` are unset, QRIS falls back to a placeholder code + manual cashier verification.
