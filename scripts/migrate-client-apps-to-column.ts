// One-off migration: moves client_apps rows into the clients.apps jsonb
// column and drops the unused clients columns app, reativacao, grupo_msg and
// descadastrar. NOT run on boot — re-running it after users edit apps would
// resurrect stale links from client_apps, so it refuses to run once
// clients.apps exists.
//
// Run: npx tsx scripts/migrate-client-apps-to-column.ts
//
// Before changing anything it writes a JSON backup to backups/ with every
// client_apps row and the values of the dropped columns. client_apps itself
// is left untouched in the DB.
import "dotenv/config";
import postgres from "postgres";
import fs from "fs";
import path from "path";

const DROPPED_COLUMNS = ["app", "reativacao", "grupo_msg", "descadastrar"];

async function migrateClientAppsToColumn(sql: postgres.Sql) {
  const existing = await sql`
    SELECT column_name FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'clients'
  `;
  const columns = new Set(existing.map((c) => c.column_name as string));
  if (columns.has("apps")) {
    console.log("[migrate-client-apps] clients.apps já existe — migração já foi feita, nada a fazer.");
    return;
  }

  // 1. Backup
  const links = await sql`
    SELECT ca.*, a.name AS app_name
    FROM client_apps ca JOIN apps a ON a.id = ca.app_id
    ORDER BY ca.id
  `;
  const dropped = DROPPED_COLUMNS.filter((c) => columns.has(c));
  const droppedValues = dropped.length > 0
    ? await sql`SELECT id, ${sql(dropped)} FROM clients ORDER BY id`
    : [];

  const backupDir = path.resolve("backups");
  fs.mkdirSync(backupDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupFile = path.join(backupDir, `pre-client-apps-migration-${stamp}.json`);
  fs.writeFileSync(backupFile, JSON.stringify({ clientApps: links, clientsDroppedColumns: droppedValues }, null, 2));
  console.log(`[migrate-client-apps] Backup: ${backupFile} (${links.length} vínculos, ${droppedValues.length} clientes)`);

  const expectedLinks = links.length;
  const expectedClients = new Set(links.map((l) => l.client_id)).size;

  // 2. Migrate + verify + drop, all-or-nothing
  await sql.begin(async (tx) => {
    await tx`ALTER TABLE clients ADD COLUMN apps jsonb NOT NULL DEFAULT '[]'::jsonb`;

    await tx`
      UPDATE clients c SET apps = sub.apps
      FROM (
        SELECT ca.client_id, ca.auth_user_id,
          jsonb_agg(jsonb_build_object(
            'appId', ca.app_id,
            'name', a.name,
            'isPrimary', ca.is_primary,
            'expiryDate', ca.expiry_date
          ) ORDER BY ca.is_primary DESC, ca.id) AS apps
        FROM client_apps ca
        JOIN apps a ON a.id = ca.app_id AND a.auth_user_id = ca.auth_user_id
        GROUP BY ca.client_id, ca.auth_user_id
      ) sub
      WHERE c.id = sub.client_id AND c.auth_user_id = sub.auth_user_id
    `;

    const [check] = await tx`
      SELECT COALESCE(SUM(jsonb_array_length(apps)), 0)::int AS links,
             COUNT(*) FILTER (WHERE jsonb_array_length(apps) > 0)::int AS clients
      FROM clients
    `;
    if (check.links !== expectedLinks || check.clients !== expectedClients) {
      throw new Error(
        `Contagem não confere: esperado ${expectedLinks} vínculos/${expectedClients} clientes, ` +
        `obtido ${check.links}/${check.clients}. Nada foi alterado.`
      );
    }
    console.log(`[migrate-client-apps] Migrados ${check.links} vínculos para ${check.clients} clientes.`);

    for (const column of dropped) {
      await tx`ALTER TABLE clients DROP COLUMN ${tx(column)}`;
    }
    if (dropped.length > 0) {
      console.log(`[migrate-client-apps] Colunas removidas: ${dropped.join(", ")}`);
    }
  });
}

const url = process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL;
if (!url) throw new Error("SUPABASE_DATABASE_URL ou DATABASE_URL não definida");
const sql = postgres(url, { max: 1, prepare: false });
migrateClientAppsToColumn(sql)
  .then(() => sql.end())
  .catch(async (error) => {
    console.error("[migrate-client-apps] Falhou:", error);
    await sql.end();
    process.exit(1);
  });
