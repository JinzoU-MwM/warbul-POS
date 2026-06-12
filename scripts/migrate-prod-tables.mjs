/**
 * One-off migration: bring a database up to the current schema by creating the
 * tables that earlier feature migrations may not have applied to it —
 * `categories` (dynamic product categories) and `promotions` / `redemptions`
 * (discount & voucher system) — and seeding their defaults.
 *
 * Safe to run repeatedly — uses CREATE TABLE IF NOT EXISTS and only seeds a
 * table when it is empty.
 *
 * Usage (points at whatever DB your env vars name — set these to PRODUCTION to
 * migrate the live Turso database):
 *
 *   # Windows PowerShell
 *   $env:DATABASE_URL="libsql://<your-prod-db>.turso.io"
 *   $env:DATABASE_AUTH_TOKEN="<prod-token>"
 *   node scripts/migrate-prod-tables.mjs
 *
 * Or, if the vars are already in a .env file the app loads:
 *   node -r dotenv/config scripts/migrate-prod-tables.mjs
 */
import { createClient } from "@libsql/client";

const url = process.env.DATABASE_URL || process.env.TURSO_DATABASE_URL;
const authToken = process.env.DATABASE_AUTH_TOKEN || process.env.TURSO_AUTH_TOKEN;

if (!url) {
  console.error("✗ No DATABASE_URL / TURSO_DATABASE_URL set. Aborting.");
  process.exit(1);
}

const db = createClient({ url, authToken });

// Mirrors SEED_CATS in src/lib/store.ts — the default category set.
const SEED_CATS = [
  { id: "cat_01", name: "Kopi", position: 1 },
  { id: "cat_02", name: "Non-Kopi", position: 2 },
  { id: "cat_03", name: "Makanan", position: 3 },
  { id: "cat_04", name: "Snack", position: 4 },
];

const SEED_VOUCHERS = [
  { id: "promo_ngopi5",   name: "Potongan Rp5.000",          valueType: "flat", value: 5000, minSpend: 20000, code: "NGOPI5" },
  { id: "promo_warbul10", name: "Diskon 10%",                 valueType: "pct",  value: 10,   minSpend: 0,     code: "WARBUL10" },
  { id: "promo_hemat20",  name: "Diskon 20% (maks Rp15.000)", valueType: "pct",  value: 20,   minSpend: 30000, code: "HEMAT20" },
];

async function tableIsEmpty(name) {
  const { rows } = await db.execute(`SELECT COUNT(*) AS n FROM ${name}`);
  return Number(rows[0].n) === 0;
}

async function main() {
  const host = url.replace(/^[a-z]+:\/\//, "").split("?")[0];
  console.log(`→ Migrating database: ${host}`);

  /* ── categories (dynamic product categories) ── */
  await db.execute(`
    CREATE TABLE IF NOT EXISTS categories (
      id       TEXT PRIMARY KEY,
      name     TEXT NOT NULL UNIQUE,
      position INTEGER NOT NULL
    )
  `);
  console.log("✓ categories table ready");
  if (await tableIsEmpty("categories")) {
    for (const c of SEED_CATS) {
      await db.execute({
        sql: "INSERT OR IGNORE INTO categories (id, name, position) VALUES (?, ?, ?)",
        args: [c.id, c.name, c.position],
      });
    }
    console.log(`✓ seeded ${SEED_CATS.length} default categories (Kopi, Non-Kopi, Makanan, Snack)`);
  } else {
    console.log("• categories already populated — skipping seed");
  }

  /* ── promotions (discount & voucher system) ── */
  await db.execute(`
    CREATE TABLE IF NOT EXISTS promotions (
      id         TEXT PRIMARY KEY,
      kind       TEXT NOT NULL,
      name       TEXT NOT NULL,
      value_type TEXT NOT NULL,
      value      INTEGER NOT NULL,
      max_value  INTEGER,
      min_spend  INTEGER NOT NULL DEFAULT 0,
      scope      TEXT NOT NULL DEFAULT 'all',
      stackable  INTEGER NOT NULL DEFAULT 0,
      enabled    INTEGER NOT NULL DEFAULT 1,
      code       TEXT UNIQUE,
      max_uses   INTEGER,
      used_count INTEGER NOT NULL DEFAULT 0,
      expires_at INTEGER,
      trigger    TEXT
    )
  `);
  console.log("✓ promotions table ready");
  if (await tableIsEmpty("promotions")) {
    for (const v of SEED_VOUCHERS) {
      await db.execute({
        sql: `INSERT OR IGNORE INTO promotions
              (id, kind, name, value_type, value, max_value, min_spend, scope, stackable, enabled, code, max_uses, used_count, expires_at, trigger)
              VALUES (?, 'voucher', ?, ?, ?, NULL, ?, 'all', 0, 1, ?, NULL, 0, NULL, NULL)`,
        args: [v.id, v.name, v.valueType, v.value, v.minSpend, v.code],
      });
    }
    console.log(`✓ seeded ${SEED_VOUCHERS.length} default vouchers (NGOPI5, WARBUL10, HEMAT20)`);
  } else {
    console.log("• promotions already populated — skipping seed");
  }

  /* ── redemptions (voucher usage log) ── */
  await db.execute(`
    CREATE TABLE IF NOT EXISTS redemptions (
      id           TEXT PRIMARY KEY,
      promotion_id TEXT NOT NULL,
      order_id     TEXT NOT NULL,
      amount       INTEGER NOT NULL,
      redeemed_at  INTEGER NOT NULL
    )
  `);
  console.log("✓ redemptions table ready");

  console.log("✓ Migration complete.");
}

main().catch((e) => {
  console.error("✗ Migration failed:", e.message);
  process.exit(1);
});
