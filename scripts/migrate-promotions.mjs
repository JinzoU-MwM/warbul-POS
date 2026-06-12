/**
 * One-off migration: create the `promotions` and `redemptions` tables (the
 * discount/voucher system) and seed the three default vouchers.
 *
 * Safe to run repeatedly — uses CREATE TABLE IF NOT EXISTS and only seeds when
 * the promotions table is empty.
 *
 * Usage (points at whatever DB your env vars name — set these to PRODUCTION to
 * migrate the live Turso database):
 *
 *   # Windows PowerShell
 *   $env:DATABASE_URL="libsql://<your-prod-db>.turso.io"
 *   $env:DATABASE_AUTH_TOKEN="<prod-token>"
 *   node scripts/migrate-promotions.mjs
 *
 * Or, if the vars are already in a .env file the app loads:
 *   node -r dotenv/config scripts/migrate-promotions.mjs
 */
import { createClient } from "@libsql/client";

const url = process.env.DATABASE_URL || process.env.TURSO_DATABASE_URL;
const authToken = process.env.DATABASE_AUTH_TOKEN || process.env.TURSO_AUTH_TOKEN;

if (!url) {
  console.error("✗ No DATABASE_URL / TURSO_DATABASE_URL set. Aborting.");
  process.exit(1);
}

const db = createClient({ url, authToken });

const SEED_VOUCHERS = [
  { id: "promo_ngopi5",   name: "Potongan Rp5.000",          valueType: "flat", value: 5000, minSpend: 20000, code: "NGOPI5" },
  { id: "promo_warbul10", name: "Diskon 10%",                 valueType: "pct",  value: 10,   minSpend: 0,     code: "WARBUL10" },
  { id: "promo_hemat20",  name: "Diskon 20% (maks Rp15.000)", valueType: "pct",  value: 20,   minSpend: 30000, code: "HEMAT20" },
];

async function main() {
  const host = url.replace(/^[a-z]+:\/\//, "").split("?")[0];
  console.log(`→ Migrating database: ${host}`);

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

  const { rows } = await db.execute("SELECT COUNT(*) AS n FROM promotions");
  const count = Number(rows[0].n);
  if (count > 0) {
    console.log(`• promotions already has ${count} row(s) — skipping seed`);
  } else {
    for (const v of SEED_VOUCHERS) {
      await db.execute({
        sql: `INSERT OR IGNORE INTO promotions
              (id, kind, name, value_type, value, max_value, min_spend, scope, stackable, enabled, code, max_uses, used_count, expires_at, trigger)
              VALUES (?, 'voucher', ?, ?, ?, NULL, ?, 'all', 0, 1, ?, NULL, 0, NULL, NULL)`,
        args: [v.id, v.name, v.valueType, v.value, v.minSpend, v.code],
      });
    }
    console.log(`✓ seeded ${SEED_VOUCHERS.length} default vouchers (NGOPI5, WARBUL10, HEMAT20)`);
  }

  console.log("✓ Migration complete.");
}

main().catch((e) => {
  console.error("✗ Migration failed:", e.message);
  process.exit(1);
});
