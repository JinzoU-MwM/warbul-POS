// Shared domain types for the Warbul system. Used on both server and client.

export type Category = "Kopi" | "Non-Kopi" | "Makanan" | "Snack";
export type Glyph = "cup" | "bowl" | "fries";

export const UNLIMITED_STOCK = 99999; // products with no recipe are unlimited

export interface Product {
  id: string;
  name: string;
  price: number; // unit price in rupiah
  cat: Category;
  g: Glyph;
  grad: [string, string];
  tag?: string | null;
  available: boolean; // DERIVED: manual toggle AND ingredients can make ≥1
  manualAvailable?: boolean; // the stored on/off toggle (owner "stop selling")
  stock: number; // DERIVED: max servings makeable from ingredients (UNLIMITED_STOCK if no recipe)
  hasRecipe?: boolean;
  desc: string;
}

// Raw material / ingredient.
export interface Ingredient {
  id: string;
  name: string;
  unit: string; // g | ml | pcs | shot | …
  stock: number;
  lowThreshold: number;
}

// One line of a recipe (bill of materials) for a product or modifier option.
export interface RecipeItem {
  ingredientId: string;
  qty: number;
}

export interface RecipeRow extends RecipeItem {
  ingredientName: string;
  unit: string;
}

export type ModType = "single" | "multi";

export interface ModOption {
  id: string;
  label: string;
  price: number;
  def?: boolean;
}

export interface ModGroup {
  id: string;
  name: string;
  type: ModType;
  options: ModOption[];
}

/** A modifier group plus the product categories it applies to (DB-backed). */
export interface ModGroupFull extends ModGroup {
  categories: Category[];
}

/** A modifier selection: single groups map to an option id, multi groups to an array of ids. */
export type Selection = Record<string, string | string[]>;

export interface Promo {
  code: string;
  type: "flat" | "pct";
  value: number;
  min?: number;
  max?: number;
  desc: string;
}

export interface PromoResult {
  ok: boolean;
  amount: number;
  message: string;
  code?: string;
  promo?: Promo;
}

export interface Totals {
  subtotal: number;
  service: number;
  discount: number;
  total: number;
}

export type OrderMethod = "qris" | "kasir" | "tunai" | "kartu";

export const ORDER_STATUS = {
  WAIT_PAY: "Menunggu Pembayaran",
  PAID: "Dibayar",
  COOKING: "Diproses",
  DONE: "Selesai",
  CANCELLED: "Dibatalkan",
} as const;

export type OrderStatus = (typeof ORDER_STATUS)[keyof typeof ORDER_STATUS];

export interface OrderItem {
  id: string; // product id
  name: string;
  price: number; // unit price (incl. modifiers) at time of order
  qty: number;
  opts: string[]; // human-readable modifier labels
}

export interface PakasirInfo {
  paymentNumber: string; // raw QRIS payload string (render as a scannable QR)
  totalPayment: number; // amount the customer actually pays (incl. gateway fee)
  fee: number;
  expiredAt: string; // ISO timestamp
}

export interface Order {
  id: string; // WB-xxx
  table: number; // 0 = takeaway / bungkus
  method: OrderMethod;
  paid: boolean;
  status: OrderStatus;
  payDetail?: string | null;
  note?: string;
  items: OrderItem[];
  subtotal: number;
  service: number;
  discount: number;
  total: number;
  promo?: { code: string; amount: number } | null;
  phone?: string | null;
  createdAt: number; // epoch ms
  pakasir?: PakasirInfo | null;
}

export interface Member {
  phone: string;
  points: number;
  stamps: number;
  visits: number;
  freeEarned: number;
}

export interface StoreSettings {
  storeName: string;
  branch: string;
  address: string;
  phone: string;
  hoursOpen: string;
  hoursClose: string;
  qrisMerchant: string;
  serviceFee: number;
  payQris: boolean;
  payKasir: boolean;
  notifyNewOrder: boolean;
  notifyOutOfStock: boolean;
}
