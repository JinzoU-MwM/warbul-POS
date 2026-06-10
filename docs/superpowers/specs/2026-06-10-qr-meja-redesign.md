# QR Meja Redesign — Hero Number

**Date:** 2026-06-10  
**Status:** Approved  
**Scope:** `src/app/owner/TablesView.tsx` only — the `Face` component (Tenda Meja) and `Sticker` component (Lembar Stiker)

## Goal

Make the table number dramatically larger and more visible at night. The number is now the first thing a customer sees when they sit down.

## Design Decisions

- **Layout pattern:** Hero number at top (Option A, approved by client)
- **"Scan & Pesan" headline:** Removed. Replaced with a smaller instruction "↓ Scan untuk pesan" below the number
- **Applies to:** Both Tenda Meja (`Face`) and Lembar Stiker (`Sticker`)

## Face Component (Tenda Meja)

Order of elements, top to bottom:

1. **Logo row** — unchanged (Warbul logo + "Warbul" text in gold)
2. **Hero number** — the `padStart(2,"0")` table number at `font-size: 90px`, `font-weight: 900`, gold, `line-height: 1`, `letter-spacing: -3px`
3. **"NOMOR MEJA" label** — `font-size: 9px`, `font-weight: 700`, `opacity: 0.6`, `letter-spacing: 0.15em`, small gap below number
4. **Scan instruction** — `"↓ Scan untuk pesan"`, `font-size: 12px`, `opacity: 0.75` (replaces the old `qrm-scanh` + `qrm-scansub` pair)
5. **QR card** — unchanged
6. **Steps row** — unchanged
7. **Payment pills** — unchanged
8. **URL row** — unchanged

**Removed from Face:** `qrm-scanh` div ("Scan & Pesan") and `qrm-scansub` div ("Pindai QR di bawah...") and `qrm-badge` div ("KAMU DI / Meja XX") — the hero number replaces all three.

**New CSS classes needed:**
- `.qrm-hero-n` — the big number (`font-size: 90px; font-weight: 900; color: var(--gold); line-height: 1; letter-spacing: -3px; position: relative`)
- `.qrm-hero-lbl` — "NOMOR MEJA" label below it (`font-size: 9px; font-weight: 700; opacity: 0.6; letter-spacing: 0.15em; margin-top: -2px; position: relative`)
- `.qrm-scan-hint` — small scan instruction (`font-size: 12px; opacity: 0.75; margin-top: 10px; position: relative`)

Print CSS: `qrm-hero-n` needs `-webkit-print-color-adjust: exact; print-color-adjust: exact` (gold must survive printing).

## Sticker Component (Lembar Stiker)

Order of elements, top to bottom:

1. **Logo row** — unchanged
2. **Hero number** — `font-size: 52px`, `font-weight: 900`, gold, `line-height: 1`, `letter-spacing: -2px`
3. **"NOMOR MEJA" label** — `font-size: 7px`, `font-weight: 700`, `opacity: 0.55`, `letter-spacing: 0.12em`
4. **QR card** — unchanged (`qrm-qs`)
5. **Scan text** — `"Scan untuk pesan"` replacing the old `qrm-sc` text (content change only, same class is fine)

**Removed from Sticker:** `qrm-tb` div ("Meja XX" badge in gold) — replaced by the hero number above.

**Sticker sizing:** The sticker card may need a few extra px of vertical padding to breathe with the larger number. Increase `qrm-sticker` padding from `18px` to `20px 18px`.

## What Does NOT Change

- Toolbar controls (mode switcher, table number stepper, base URL input, print button)
- QR card style and size (`qrm-qrcard`, `qrm-qs`)
- Step indicators
- Payment pills
- URL row
- Print page setup (`@page`, `break-inside`, color-adjust on existing elements)
- Background bean decorations
