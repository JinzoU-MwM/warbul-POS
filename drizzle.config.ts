import { defineConfig } from "drizzle-kit";
import "dotenv/config";

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "turso", // libsql — works with local file: URLs and Turso
  dbCredentials: {
    url: process.env.DATABASE_URL || "file:warbul.db",
  },
});
