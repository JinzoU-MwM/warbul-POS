// Shared seed data — used by the db seed script and the demo-reset endpoint.
import type { Category, Glyph } from "./types";
import { ORDER_STATUS } from "./types";

export type SeedProduct = {
  id: string; name: string; price: number; cat: Category; g: Glyph;
  grad: [string, string]; tag?: string; available: boolean; stock: number; desc: string;
};

// Ported verbatim from design-reference/warbul.js SEED_MENU.
export const SEED_MENU: SeedProduct[] = [
  { id: "k1", name: "Es Kopi Susu Warbul", price: 18000, cat: "Kopi", g: "cup", grad: ["#6F4A2C", "#3C2618"], tag: "Best Seller", available: true, stock: 48, desc: "Espresso, susu segar, dan gula aren khas Warbul. Dingin, creamy, bikin nagih." },
  { id: "k2", name: "Kopi Susu Gula Aren", price: 20000, cat: "Kopi", g: "cup", grad: ["#7A5230", "#45291A"], available: true, stock: 30, desc: "Perpaduan kopi dan gula aren cair yang manis-pahit seimbang." },
  { id: "k3", name: "Americano", price: 20000, cat: "Kopi", g: "cup", grad: ["#4A3525", "#241712"], available: true, stock: 25, desc: "Double shot espresso dengan air, bersih dan bold." },
  { id: "k4", name: "Cappuccino", price: 24000, cat: "Kopi", g: "cup", grad: ["#8A6038", "#503118"], available: true, stock: 4, desc: "Espresso dengan foam susu lembut dan taburan cokelat." },
  { id: "k5", name: "Caramel Macchiato", price: 28000, cat: "Kopi", g: "cup", grad: ["#A9743F", "#6B4423"], available: true, stock: 18, desc: "Susu, vanilla, espresso, dan caramel drizzle." },
  { id: "k6", name: "Cafe Latte", price: 24000, cat: "Kopi", g: "cup", grad: ["#9A6E45", "#5C3C22"], available: true, stock: 22, desc: "Espresso lembut dengan banyak susu steamed." },
  { id: "n1", name: "Matcha Latte", price: 26000, cat: "Non-Kopi", g: "cup", grad: ["#5E7B47", "#36502C"], available: true, stock: 16, desc: "Matcha premium Jepang dengan susu segar." },
  { id: "n2", name: "Cokelat Panas", price: 22000, cat: "Non-Kopi", g: "cup", grad: ["#5C3A2A", "#37211A"], available: true, stock: 20, desc: "Cokelat hangat yang kaya dan menenangkan." },
  { id: "n3", name: "Es Teh Leci", price: 16000, cat: "Non-Kopi", g: "cup", grad: ["#B5683E", "#7E4022"], available: true, stock: 35, desc: "Teh segar dengan leci manis, paling pas siang hari." },
  { id: "n4", name: "Red Velvet Latte", price: 26000, cat: "Non-Kopi", g: "cup", grad: ["#9C3B3B", "#5E2222"], available: false, stock: 0, desc: "Red velvet creamy dengan foam lembut." },
  { id: "m1", name: "Nasi Goreng Warbul", price: 28000, cat: "Makanan", g: "bowl", grad: ["#C9762C", "#8A4D1C"], tag: "Spesial", available: true, stock: 14, desc: "Nasi goreng spesial dengan telur, ayam, dan kerupuk." },
  { id: "m2", name: "Mie Goreng Spesial", price: 25000, cat: "Makanan", g: "bowl", grad: ["#BE6F2C", "#7E471A"], available: true, stock: 12, desc: "Mie goreng dengan topping melimpah." },
  { id: "m3", name: "Chicken Katsu Curry", price: 32000, cat: "Makanan", g: "bowl", grad: ["#C98030", "#84511C"], available: true, stock: 3, desc: "Ayam katsu renyah dengan saus kari Jepang." },
  { id: "m4", name: "Spaghetti Aglio Olio", price: 27000, cat: "Makanan", g: "bowl", grad: ["#B0742F", "#6E461C"], available: true, stock: 10, desc: "Spaghetti bawang putih, olive oil, dan cabai." },
  { id: "s1", name: "Kentang Goreng", price: 18000, cat: "Snack", g: "fries", grad: ["#E0A431", "#B97A1E"], available: true, stock: 40, desc: "Kentang goreng renyah dengan saus pilihan." },
  { id: "s2", name: "Pisang Goreng Keju", price: 17000, cat: "Snack", g: "fries", grad: ["#D9982F", "#A66D1C"], available: true, stock: 24, desc: "Pisang goreng dengan keju parut dan susu." },
  { id: "s3", name: "Roti Bakar Cokelat", price: 17000, cat: "Snack", g: "fries", grad: ["#C98A3C", "#915C1E"], available: true, stock: 5, desc: "Roti bakar isi cokelat lumer." },
  { id: "s4", name: "Dimsum Ayam", price: 20000, cat: "Snack", g: "bowl", grad: ["#CC8A34", "#8E5C1E"], available: true, stock: 18, desc: "Dimsum ayam kukus, 4 pcs." },
];

/* ─────────────────────────── raw materials (ingredients) ─────────────────────────── */

export type SeedIngredient = { id: string; name: string; unit: string; stock: number; lowThreshold: number };

export const SEED_INGREDIENTS: SeedIngredient[] = [
  { id: "beans", name: "Biji Kopi", unit: "g", stock: 5000, lowThreshold: 600 },
  { id: "milk", name: "Susu Segar", unit: "ml", stock: 12000, lowThreshold: 1500 },
  { id: "oatmilk", name: "Oat Milk", unit: "ml", stock: 2000, lowThreshold: 300 },
  { id: "sugar", name: "Gula Aren", unit: "ml", stock: 3000, lowThreshold: 400 },
  { id: "ice", name: "Es Batu", unit: "g", stock: 20000, lowThreshold: 2500 },
  { id: "cup", name: "Gelas", unit: "pcs", stock: 220, lowThreshold: 40 },
  { id: "boba", name: "Boba", unit: "g", stock: 1500, lowThreshold: 250 },
  { id: "matcha", name: "Bubuk Matcha", unit: "g", stock: 800, lowThreshold: 120 },
  { id: "choco", name: "Cokelat", unit: "g", stock: 1000, lowThreshold: 150 },
  { id: "tea", name: "Teh", unit: "g", stock: 600, lowThreshold: 100 },
  { id: "rice", name: "Nasi", unit: "g", stock: 8000, lowThreshold: 1000 },
  { id: "noodle", name: "Mie", unit: "porsi", stock: 60, lowThreshold: 10 },
  { id: "egg", name: "Telur", unit: "pcs", stock: 100, lowThreshold: 15 },
  { id: "chicken", name: "Ayam", unit: "g", stock: 5000, lowThreshold: 600 },
  { id: "potato", name: "Kentang", unit: "g", stock: 6000, lowThreshold: 700 },
];

// Product base recipes (productId → ingredient usage per serving). Products NOT
// listed here have no recipe → treated as unlimited / always available.
export const SEED_PRODUCT_RECIPES: Record<string, { ingredientId: string; qty: number }[]> = {
  k1: [{ ingredientId: "beans", qty: 18 }, { ingredientId: "milk", qty: 150 }, { ingredientId: "sugar", qty: 20 }, { ingredientId: "ice", qty: 100 }, { ingredientId: "cup", qty: 1 }],
  k2: [{ ingredientId: "beans", qty: 18 }, { ingredientId: "milk", qty: 120 }, { ingredientId: "sugar", qty: 30 }, { ingredientId: "ice", qty: 100 }, { ingredientId: "cup", qty: 1 }],
  k3: [{ ingredientId: "beans", qty: 18 }, { ingredientId: "ice", qty: 80 }, { ingredientId: "cup", qty: 1 }],
  k4: [{ ingredientId: "beans", qty: 18 }, { ingredientId: "milk", qty: 120 }, { ingredientId: "cup", qty: 1 }],
  k5: [{ ingredientId: "beans", qty: 18 }, { ingredientId: "milk", qty: 150 }, { ingredientId: "sugar", qty: 15 }, { ingredientId: "cup", qty: 1 }],
  k6: [{ ingredientId: "beans", qty: 18 }, { ingredientId: "milk", qty: 180 }, { ingredientId: "cup", qty: 1 }],
  n1: [{ ingredientId: "matcha", qty: 12 }, { ingredientId: "milk", qty: 180 }, { ingredientId: "cup", qty: 1 }],
  n2: [{ ingredientId: "choco", qty: 25 }, { ingredientId: "milk", qty: 180 }, { ingredientId: "cup", qty: 1 }],
  n3: [{ ingredientId: "tea", qty: 8 }, { ingredientId: "ice", qty: 120 }, { ingredientId: "sugar", qty: 20 }, { ingredientId: "cup", qty: 1 }],
  n4: [{ ingredientId: "choco", qty: 20 }, { ingredientId: "milk", qty: 150 }, { ingredientId: "cup", qty: 1 }],
  m1: [{ ingredientId: "rice", qty: 200 }, { ingredientId: "egg", qty: 1 }, { ingredientId: "chicken", qty: 60 }],
  m2: [{ ingredientId: "noodle", qty: 1 }, { ingredientId: "egg", qty: 1 }],
  m3: [{ ingredientId: "chicken", qty: 120 }, { ingredientId: "rice", qty: 150 }],
  s1: [{ ingredientId: "potato", qty: 200 }],
};

// Modifier-option recipes (optionId = `${groupId}-${optionId}` → ingredient usage).
export const SEED_OPTION_RECIPES: Record<string, { ingredientId: string; qty: number }[]> = {
  "addon-shot": [{ ingredientId: "beans", qty: 18 }],
  "addon-oat": [{ ingredientId: "oatmilk", qty: 120 }],
  "addon-boba": [{ ingredientId: "boba", qty: 50 }],
  "extra-egg": [{ ingredientId: "egg", qty: 1 }],
  "extra-rice": [{ ingredientId: "rice", qty: 150 }],
};

export type SeedOrder = {
  id: string; table: number; method: string; paid: boolean; status: string;
  note: string; payDetail?: string; ageMs: number;
  promo?: { code: string; amount: number };
  items: { id: string; name: string; price: number; qty: number; opts: string[] }[];
};

export function seedOrders(): SeedOrder[] {
  return [
    { id: "WB-104", table: 3, method: "qris", paid: false, status: ORDER_STATUS.WAIT_PAY, note: "Menunggu verifikasi kasir", ageMs: 90 * 1000,
      items: [
        { id: "k1", name: "Es Kopi Susu Warbul", price: 18000, qty: 2, opts: ["Large", "Sedikit Gula"] },
        { id: "s1", name: "Kentang Goreng", price: 18000, qty: 1, opts: ["Saus Keju"] },
      ] },
    { id: "WB-103", table: 9, method: "kasir", paid: false, status: ORDER_STATUS.WAIT_PAY, note: "Menunggu pembayaran di kasir", ageMs: 5 * 60 * 1000,
      items: [
        { id: "m1", name: "Nasi Goreng Warbul", price: 33000, qty: 1, opts: ["Pedas", "+ Tambah Telur"] },
        { id: "n1", name: "Matcha Latte", price: 26000, qty: 1, opts: [] },
      ] },
    { id: "WB-102", table: 1, method: "qris", paid: true, status: ORDER_STATUS.COOKING, payDetail: "QRIS terverifikasi", note: "Diteruskan ke dapur", ageMs: 12 * 60 * 1000, promo: { code: "NGOPI5", amount: 5000 },
      items: [
        { id: "k5", name: "Caramel Macchiato", price: 28000, qty: 1, opts: [] },
        { id: "s3", name: "Roti Bakar Cokelat", price: 17000, qty: 2, opts: [] },
      ] },
    { id: "WB-101", table: 5, method: "kasir", paid: true, status: ORDER_STATUS.DONE, payDetail: "Tunai", note: "Pesanan selesai", ageMs: 26 * 60 * 1000,
      items: [{ id: "k4", name: "Cappuccino", price: 24000, qty: 2, opts: ["Tanpa Gula"] }] },
  ];
}
