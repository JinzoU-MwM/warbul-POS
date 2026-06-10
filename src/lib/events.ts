// In-process pub/sub backing the SSE stream. One Node instance per cafe is the
// intended deployment, so an in-memory EventEmitter is correct and simple.
// (On serverless, clients should fall back to short-polling /api/orders.)
import { EventEmitter } from "node:events";

export type ChangeKind = "orders" | "menu" | "members" | "settings" | "modifiers";

// Survive HMR in dev by stashing the emitter on globalThis.
const globalForBus = globalThis as unknown as { __warbulBus?: EventEmitter };
const bus = globalForBus.__warbulBus ?? new EventEmitter();
bus.setMaxListeners(0);
if (process.env.NODE_ENV !== "production") globalForBus.__warbulBus = bus;

export function emitChange(kind: ChangeKind) {
  bus.emit("change", kind);
}

export function onChange(cb: (kind: ChangeKind) => void) {
  bus.on("change", cb);
  return () => bus.off("change", cb);
}
