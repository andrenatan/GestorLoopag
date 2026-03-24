import postgres from "postgres";

async function main() {
  const url = process.env.SUPABASE_DATABASE_URL;
  if (!url) {
    throw new Error("SUPABASE_DATABASE_URL must be set");
  }

  const sql = postgres(url, { prepare: false });

  console.log("Adding 'type' column to message_templates...");

  await sql`
    ALTER TABLE message_templates
    ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'baileys'
  `;

  console.log("Done. Column 'type' added (or already existed).");

  await sql.end();
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
