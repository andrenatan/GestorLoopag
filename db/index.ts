import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../shared/schema";

if (!process.env.SUPABASE_DATABASE_URL) {
  throw new Error("SUPABASE_DATABASE_URL must be set");
}

const client = postgres(process.env.SUPABASE_DATABASE_URL);
export const db = drizzle(client, { schema });
