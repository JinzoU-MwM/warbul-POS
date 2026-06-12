import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

/* ─────────────────────────── Better Auth tables ───────────────────────────
   Standard Better Auth schema (email/password + username plugin) for
   cashier/owner accounts. Customer side is anonymous, so it has no rows here. */

export const user = sqliteTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: integer("email_verified", { mode: "boolean" }).notNull().default(false),
  image: text("image"),
  username: text("username").unique(),
  displayUsername: text("display_username"),
  role: text("role").notNull().default("kasir"), // "kasir" | "owner"
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

export const session = sqliteTable("session", {
  id: text("id").primaryKey(),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  token: text("token").notNull().unique(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
});

export const account = sqliteTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: integer("access_token_expires_at", { mode: "timestamp" }),
  refreshTokenExpiresAt: integer("refresh_token_expires_at", { mode: "timestamp" }),
  scope: text("scope"),
  password: text("password"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

export const verification = sqliteTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }),
  updatedAt: integer("updated_at", { mode: "timestamp" }),
});

/* ─────────────────────────── Warbul domain tables ─────────────────────────── */

export const products = sqliteTable("products", {
  id: text("id").primaryKey(), // e.g. "k1"
  name: text("name").notNull(),
  price: integer("price").notNull(), // rupiah
  cat: text("cat").notNull(), // Category
  g: text("g").notNull(), // glyph: cup | bowl | fries
  grad: text("grad", { mode: "json" }).notNull().$type<[string, string]>(),
  tag: text("tag"),
  // Manual on/off toggle. Effective availability also requires the recipe's
  // ingredients to be in stock (derived at read time).
  available: integer("available", { mode: "boolean" }).notNull().default(true),
  desc: text("desc").notNull().default(""),
  sort: integer("sort").notNull().default(0), // preserve seed display order
});

// Raw materials / ingredients (beans, milk, cups, …).
export const ingredients = sqliteTable("ingredients", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  unit: text("unit").notNull().default("pcs"), // g | ml | pcs | shot | …
  stock: integer("stock").notNull().default(0), // current quantity on hand
  lowThreshold: integer("low_threshold").notNull().default(0),
  sort: integer("sort").notNull().default(0),
});

// Bill of materials: how much of each ingredient a product (or a modifier
// option) consumes per serving. ownerType distinguishes the two.
export const recipes = sqliteTable("recipes", {
  id: text("id").primaryKey(),
  ownerType: text("owner_type").notNull(), // "product" | "option"
  ownerId: text("owner_id").notNull(),
  ingredientId: text("ingredient_id").notNull().references(() => ingredients.id, { onDelete: "cascade" }),
  qty: integer("qty").notNull().default(0),
});

export const orders = sqliteTable("orders", {
  id: text("id").primaryKey(), // WB-xxx
  table: integer("table").notNull().default(0), // 0 = takeaway / bungkus
  method: text("method").notNull(), // qris | kasir | tunai | kartu
  paid: integer("paid", { mode: "boolean" }).notNull().default(false),
  status: text("status").notNull(),
  payDetail: text("pay_detail"),
  note: text("note"),
  subtotal: integer("subtotal").notNull().default(0),
  service: integer("service").notNull().default(0),
  discount: integer("discount").notNull().default(0),
  total: integer("total").notNull().default(0),
  promo: text("promo", { mode: "json" }).$type<{ id: string; name: string; code?: string; amount: number }[]>(),
  phone: text("phone"),
  createdAt: integer("created_at").notNull(), // epoch ms
  // Pakasir QRIS charge data (set when a customer pays via QRIS gateway)
  pakasir: text("pakasir", { mode: "json" }).$type<{
    paymentNumber: string;
    totalPayment: number;
    fee: number;
    expiredAt: string;
  } | null>(),
});

export const orderItems = sqliteTable("order_items", {
  id: text("id").primaryKey(),
  orderId: text("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  productId: text("product_id").notNull(),
  name: text("name").notNull(),
  price: integer("price").notNull(), // unit price incl. modifiers
  qty: integer("qty").notNull(),
  opts: text("opts", { mode: "json" }).notNull().$type<string[]>(),
});

export const members = sqliteTable("members", {
  phone: text("phone").primaryKey(),
  points: integer("points").notNull().default(0),
  stamps: integer("stamps").notNull().default(0),
  visits: integer("visits").notNull().default(0),
  freeEarned: integer("free_earned").notNull().default(0),
});

// Single-row store configuration (id is always "store").
export const settings = sqliteTable("settings", {
  id: text("id").primaryKey().default("store"),
  data: text("data", { mode: "json" }).notNull(),
});

export const categories = sqliteTable("categories", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
  position: integer("position").notNull(),
});

export const promotions = sqliteTable("promotions", {
  id:        text("id").primaryKey(),
  kind:      text("kind").notNull(),          // "voucher" | "auto"
  name:      text("name").notNull(),
  valueType: text("value_type").notNull(),    // "flat" | "pct"
  value:     integer("value").notNull(),      // flat: rupiah; pct: 0–100
  maxValue:  integer("max_value"),            // pct only: discount cap in rupiah
  minSpend:  integer("min_spend").notNull().default(0),
  scope:     text("scope").notNull().default("all"), // "all" | category name
  stackable: integer("stackable").notNull().default(0),
  enabled:   integer("enabled").notNull().default(1),
  // voucher-only (null for auto)
  code:      text("code").unique(),
  maxUses:   integer("max_uses"),             // null = unlimited
  usedCount: integer("used_count").notNull().default(0),
  expiresAt: integer("expires_at"),           // epoch ms
  // auto-only (null for voucher)
  trigger:   text("trigger"),                 // JSON: {type,from?,to?,amount?,count?}
});

export const redemptions = sqliteTable("redemptions", {
  id:          text("id").primaryKey(),
  promotionId: text("promotion_id").notNull(),
  orderId:     text("order_id").notNull(),
  amount:      integer("amount").notNull(),
  redeemedAt:  integer("redeemed_at").notNull(),
});

// Modifier / add-on groups (e.g. Ukuran, Tambahan) assigned to product categories.
export const modifierGroups = sqliteTable("modifier_groups", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(), // "single" | "multi"
  categories: text("categories", { mode: "json" }).notNull().$type<string[]>(),
  sort: integer("sort").notNull().default(0),
});

export const modifierOptions = sqliteTable("modifier_options", {
  id: text("id").primaryKey(),
  groupId: text("group_id").notNull().references(() => modifierGroups.id, { onDelete: "cascade" }),
  label: text("label").notNull(),
  price: integer("price").notNull().default(0),
  isDefault: integer("is_default", { mode: "boolean" }).notNull().default(false),
  sort: integer("sort").notNull().default(0),
});
