# Order Cancellation

**Date:** 2026-06-10  
**Status:** Approved  
**Scope:** `types.ts`, `api/orders/[id]/route.ts`, `StatusView.tsx`, `OrderDetail.tsx`, `StatusPill.tsx`, `OrdersView.tsx`

## Goal

Allow customers, cashiers, and owners to cancel an order. Cancellation is only permitted while the order is in `Menunggu Pembayaran` state. Once paid, the button is disabled and refunds are handled manually by the cashier.

## New Status

Add to `ORDER_STATUS` in `src/lib/types.ts`:
```ts
CANCELLED: "Dibatalkan"
```

## API Guard (`PATCH /api/orders/[id]`)

When the incoming patch contains `status: "Dibatalkan"`, the route handler must:
1. Fetch the current order from the DB.
2. If current status is anything other than `"Menunggu Pembayaran"`, return HTTP **409** with `{ error: "Pesanan sudah dibayar, tidak bisa dibatalkan" }`.
3. Otherwise apply the patch normally.

No other patch fields need the guard — this is cancellation-specific.

## Customer Side — `StatusView.tsx`

Show a cancel section below the order status card **only when** `order.status === ORDER_STATUS.WAIT_PAY && !order.paid`.

**Two-step inline confirm (no modal):**
1. Initial state: ghost red button "Batalkan Pesanan" with a small helper text "Salah pesan atau ingin mengubah?"
2. After click: button area transforms to confirm row — "Yakin ingin membatalkan?" with "Tidak" (dismiss, returns to step 1) and "Ya, Batalkan" (red, proceeds).
3. On confirm: call `patchOrder(orderId, { status: ORDER_STATUS.CANCELLED })`, then call `onMenu()` to return the customer to the menu.

A loading state (`busy`) disables both confirm buttons while the API call is in flight.

## Cashier / Owner Side — `OrderDetail.tsx`

Add a **"Batalkan"** button in the order detail header area, right of the order ID/status line.

- Visible and red (outlined) when `order.status === ORDER_STATUS.WAIT_PAY`
- Disabled + lock icon + `cursor: not-allowed` when order is paid or in any other non-cancellable state
- No separate confirm step — a single click calls `onPatch(order.id, { status: ORDER_STATUS.CANCELLED })` directly (cashier is a trained user, not a customer)

Both the cashier POS and the owner "Pesanan" tab render `OrderDetail` via the same `OrdersView`, so this one change covers all three staff roles.

## StatusPill

Add a case for `"Dibatalkan"` in `src/components/StatusPill.tsx`:
- Background: `#F3F4F6` (light grey)
- Text color: `#6B7280` (grey)
- Icon or prefix: `✕` or none

## OrdersView Filter

The "Aktif" filter currently excludes `ORDER_STATUS.DONE`. Extend the exclusion to also exclude `ORDER_STATUS.CANCELLED`:

```ts
filter === "active"
  ? orders.filter(o => o.status !== ORDER_STATUS.DONE && o.status !== ORDER_STATUS.CANCELLED)
  : orders.filter(o => o.status === filter)
```

Cancelled orders do not need their own filter tab — they fall off the active list and are visible in the analytics/report views.

## Files Touched

| File | Change |
|---|---|
| `src/lib/types.ts` | Add `CANCELLED: "Dibatalkan"` to `ORDER_STATUS` |
| `src/app/api/orders/[id]/route.ts` | Add 409 guard for cancel-on-paid |
| `src/app/meja/[table]/StatusView.tsx` | Two-step inline cancel for customers |
| `src/app/pos/OrderDetail.tsx` | Cancel button in header, disabled when paid |
| `src/components/StatusPill.tsx` | New "Dibatalkan" case |
| `src/app/pos/OrdersView.tsx` | Exclude cancelled from "Aktif" filter |

## What Does NOT Change

- Order creation flow
- Payment flow (QRIS / kasir)
- Analytics / reporting (cancelled orders remain in DB, visible in reports)
- Member points/stamps (not awarded for cancelled orders — they're only awarded on payment confirmation, which can't happen after cancellation)
