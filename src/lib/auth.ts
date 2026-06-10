import { betterAuth, type BetterAuthOptions } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { username } from "better-auth/plugins";
import { nextCookies } from "better-auth/next-js";
import { db, schema } from "@/db";

// Shared options. The seed script reuses these to build a request-free auth
// instance (it omits the nextCookies plugin, which needs next/headers).
export const authOptions = {
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",
  database: drizzleAdapter(db, {
    provider: "sqlite",
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
  }),
  // Cashier/owner login is username + password (no email verification flow).
  emailAndPassword: { enabled: true },
  user: {
    additionalFields: {
      role: { type: "string", required: false, defaultValue: "kasir", input: false },
    },
  },
  plugins: [username()],
} satisfies BetterAuthOptions;

export const auth = betterAuth({
  ...authOptions,
  plugins: [...authOptions.plugins, nextCookies()],
});

export type Session = typeof auth.$Infer.Session;
