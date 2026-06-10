import { defineConfig } from "drizzle-kit";
import "dotenv/config";

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "turso", // libsql — works with local file: URLs and Turso
  dbCredentials: {
    url: process.env.DATABASE_URL || process.env.TURSO_DATABASE_URL || "file:warbul.db",
    authToken: process.env.DATABASE_AUTH_TOKEN || process.env.TURSO_AUTH_TOKEN,
  },
});
