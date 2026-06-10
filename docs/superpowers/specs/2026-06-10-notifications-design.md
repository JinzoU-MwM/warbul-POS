# In-App Notification Panel

**Date:** 2026-06-10  
**Status:** Approved  
**Scope:** `OverviewView.tsx`, `SettingsView.tsx`, `types.ts`, `store-defaults.ts`

## Goal

Replace the non-functional bell button + orange dot in the owner dashboard header with a working dropdown notification panel. No new DB table — reads from existing data.

## What Changes

### Bell Button → Dropdown Panel

Clicking the bell in `OverviewView` opens/closes an absolute-positioned dropdown panel anchored below the button. The panel has two sections controlled by the existing settings toggles:

- **Pesanan Baru** (shown when `notifyNewOrder` is `true`) — the 10 most recent orders from today, fetched via the existing `listOrders` API call. Each row shows order ID, table, total, and relative time.
- **Stok Menipis** (shown when `notifyOutOfStock` is `true`) — ingredients below their `lowThreshold`, taken from `data.lowStock` already present in `OverviewView`'s analytics data.

If both toggles are off, the panel shows an empty state: "Semua notifikasi dinonaktifkan."

### Unread Dot Logic (localStorage)

- On mount: read `warbul_notif_seen` (a timestamp, ms) from localStorage.
- Dot is visible when: any order was created after `lastSeen` (and `notifyNewOrder` is on) OR `lowStock.length > 0` (and `notifyOutOfStock` is on).
- On panel open: write `Date.now()` to `warbul_notif_seen` → dot disappears.
- "Tandai semua dibaca" link in panel header does the same.

### Unread Highlighting

Orders created after `lastSeen` get a gold left-border + light yellow background. Orders before `lastSeen` render muted (grey dot, normal background).

### Close Behaviour

Panel closes when: user clicks the bell again, or clicks outside the panel (document `mousedown` listener cleaned up on unmount).

### `notifyDailyReport` Removed

- Remove `notifyDailyReport` from the `Notifikasi` section in `SettingsView.tsx`
- Remove `notifyDailyReport` field from `StoreSettings` interface in `types.ts`
- Remove `notifyDailyReport` default from `store-defaults.ts`
- The settings row `<ToggleRow k="notifyDailyReport" ...>` is deleted; the other two rows remain

## Files Touched

| File | Change |
|---|---|
| `src/app/owner/OverviewView.tsx` | Add `NotifPanel` component + open/close state on bell button |
| `src/app/owner/SettingsView.tsx` | Remove `notifyDailyReport` toggle row |
| `src/lib/types.ts` | Remove `notifyDailyReport` from `StoreSettings` |
| `src/lib/store-defaults.ts` | Remove `notifyDailyReport` default |

## What Does NOT Change

- The bell button's position and styling in the header
- SSE/polling — the panel re-reads data whenever `OverviewView` refreshes (it shares the same `data` prop)
- The other two notification toggles and their storage keys
- Any other owner views
