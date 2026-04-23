import postgres from "postgres";

async function main() {
  const url = process.env.SUPABASE_DATABASE_URL;
  if (!url) {
    throw new Error("SUPABASE_DATABASE_URL must be set");
  }

  const sql = postgres(url, { prepare: false });

  console.log("Adding owner_auth_user_id to users...");
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS owner_auth_user_id UUID`;

  console.log("Adding access columns to employees...");
  await sql`ALTER TABLE employees ADD COLUMN IF NOT EXISTS access_auth_user_id UUID`;
  await sql`ALTER TABLE employees ADD COLUMN IF NOT EXISTS access_email TEXT`;

  console.log("Done.");
  await sql.end();
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
