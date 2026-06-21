import assert from "node:assert";
import { cleanNote } from "../src/lib/notes";

assert.strictEqual(cleanNote(undefined), null);
assert.strictEqual(cleanNote(""), null);
assert.strictEqual(cleanNote("   "), null);
assert.strictEqual(cleanNote("  es   sedikit  "), "es sedikit");
assert.strictEqual(cleanNote("a".repeat(200))!.length, 140);
assert.strictEqual(cleanNote("tanpa gula"), "tanpa gula");
console.log("cleanNote OK");
