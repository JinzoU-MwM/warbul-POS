import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import * as schema from "./schema";

const url = process.env.DATABASE_URL || "file:warbul.db";
const authToken = process.env.DATABASE_AUTH_TOKEN; // only needed for hosted Turso

const client = createClient({ url, authToken });

export const db = drizzle(client, { schema });
export { schema };
