import { headers } from "next/headers";
import { auth } from "./auth";

/** Returns the current Better Auth session (or null) in a route handler / RSC. */
export async function getServerSession() {
  return auth.api.getSession({ headers: await headers() });
}

/** Throws a 401-style guard for authed POS/owner API routes. Returns the user. */
export async function requireUser() {
  const s = await getServerSession();
  if (!s?.user) {
    throw new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }
  return s.user;
}
