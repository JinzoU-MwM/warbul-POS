import "dotenv/config";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { username } from "better-auth/plugins";
import { db } from "./index";
import {
  products, orders, orderItems, members, settings,
  user, session, account, verification, modifierGroups, modifierOptions,
  ingredients, recipes,
} from "./schema";
import { computeTotals } from "../lib/pricing";
import { DEFAULT_SETTINGS } from "../lib/store-defaults";
import {
  SEED_MENU, seedOrders, SEED_INGREDIENTS, SEED_PRODUCT_RECIPES, SEED_OPTION_RECIPES,
} from "../lib/seed-data";
import { DEFAULT_MODIFIER_GROUPS } from "../lib/modifiers";

async function main() {
  console.log("⛏  Seeding Warbul database…");

  // Clean slate (idempotent re-seed).
  await db.delete(orderItems);
  await db.delete(orders);
  await db.delete(members);
  await db.delete(recipes);
  await db.delete(products);
  await db.delete(modifierOptions);
  await db.delete(modifierGroups);
  await db.delete(ingredients);
  await db.delete(settings);
  await db.delete(session);
  await db.delete(account);
  await db.delete(user);
  await db.delete(verification);

  // Products (stock is now derived from ingredients; no stock column)
  await db.insert(products).values(
    SEED_MENU.map((p, i) => ({
      id: p.id, name: p.name, price: p.price, cat: p.cat, g: p.g, grad: p.grad,
      tag: p.tag ?? null, available: p.available, desc: p.desc, sort: i,
    })),
  );
  console.log(`   ✓ ${SEED_MENU.length} products`);

  // Ingredients (raw materials)
  await db.insert(ingredients).values(
    SEED_INGREDIENTS.map((ing, i) => ({
      id: ing.id, name: ing.name, unit: ing.unit, stock: ing.stock, lowThreshold: ing.lowThreshold, sort: i,
    })),
  );
  // Recipes (product base + modifier option)
  let rseq = 0;
  for (const [pid, items] of Object.entries(SEED_PRODUCT_RECIPES)) {
    for (const it of items) {
      await db.insert(recipes).values({ id: `r${rseq++}`, ownerType: "product", ownerId: pid, ingredientId: it.ingredientId, qty: it.qty });
    }
  }
  for (const [oid, items] of Object.entries(SEED_OPTION_RECIPES)) {
    for (const it of items) {
      await db.insert(recipes).values({ id: `r${rseq++}`, ownerType: "option", ownerId: oid, ingredientId: it.ingredientId, qty: it.qty });
    }
  }
  console.log(`   ✓ ${SEED_INGREDIENTS.length} ingredients + recipes`);

  // Modifier groups + options
  for (let gi = 0; gi < DEFAULT_MODIFIER_GROUPS.length; gi++) {
    const g = DEFAULT_MODIFIER_GROUPS[gi];
    await db.insert(modifierGroups).values({ id: g.id, name: g.name, type: g.type, categories: g.categories, sort: gi });
    for (let oi = 0; oi < g.options.length; oi++) {
      const o = g.options[oi];
      await db.insert(modifierOptions).values({
        id: `${g.id}-${o.id}`, groupId: g.id, label: o.label, price: o.price, isDefault: !!o.def, sort: oi,
      });
    }
  }
  console.log(`   ✓ ${DEFAULT_MODIFIER_GROUPS.length} modifier groups`);

  // Demo orders
  const now = Date.now();
  for (const o of seedOrders()) {
    const totals = computeTotals(o.items, o.promo?.amount ?? 0);
    await db.insert(orders).values({
      id: o.id, table: o.table, method: o.method, paid: o.paid, status: o.status,
      payDetail: o.payDetail ?? null, note: o.note, subtotal: totals.subtotal,
      service: totals.service, discount: totals.discount, total: totals.total,
      promo: o.promo ?? null, phone: null, createdAt: now - o.ageMs,
    });
    for (const it of o.items) {
      await db.insert(orderItems).values({
        id: `${o.id}-${it.id}`, orderId: o.id, productId: it.id, name: it.name,
        price: it.price, qty: it.qty, opts: it.opts,
      });
    }
  }
  console.log(`   ✓ 4 demo orders`);

  // Settings
  await db.insert(settings).values({ id: "store", data: DEFAULT_SETTINGS });
  console.log("   ✓ store settings");

  // Users via Better Auth (request-free instance — no nextCookies plugin)
  const seedAuth = betterAuth({
    secret: process.env.BETTER_AUTH_SECRET,
    database: drizzleAdapter(db, {
      provider: "sqlite",
      schema: { user, session, account, verification },
    }),
    emailAndPassword: { enabled: true },
    user: { additionalFields: { role: { type: "string", required: false, defaultValue: "kasir", input: false } } },
    plugins: [username()],
  });

  await seedAuth.api.signUpEmail({
    body: { email: "owner@warbul.local", password: "owner123", name: "Budi", username: "owner" },
  });
  await seedAuth.api.signUpEmail({
    body: { email: "kasir@warbul.local", password: "kasir123", name: "Rani", username: "kasir" },
  });
  // Promote the owner account.
  const { eq } = await import("drizzle-orm");
  await db.update(user).set({ role: "owner", emailVerified: true }).where(eq(user.username, "owner"));
  await db.update(user).set({ emailVerified: true }).where(eq(user.username, "kasir"));
  console.log("   ✓ users: owner/owner123 (Budi), kasir/kasir123 (Rani)");

  console.log("✅ Seed complete.");
  process.exit(0);
}

main().catch((e) => {
  console.error("Seed failed:", e);
  process.exit(1);
});
