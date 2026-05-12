import postgres from "postgres";

const SUFFIX_RE = /^(.*?)\s*-\s*(IPTV|P2P)\s*$/i;

interface ClientSystemRow {
  auth_user_id: string;
  system: string;
  qtd: number;
}

export async function normalizeClientSystems(sql: postgres.Sql) {
  const rows = (await sql<ClientSystemRow[]>`
    SELECT auth_user_id::text AS auth_user_id, system, COUNT(*)::int AS qtd
    FROM clients
    WHERE system ~* '\s*-\s*(IPTV|P2P)\s*$'
    GROUP BY auth_user_id, system
  `) as unknown as ClientSystemRow[];

  let updated = 0;
  let orphans = 0;
  const orphanDetails: { authUserId: string; system: string; count: number }[] = [];

  for (const row of rows) {
    const m = row.system.match(SUFFIX_RE);
    if (!m) continue;
    const baseName = m[1].trim();

    const baseExists = (await sql`
      SELECT name FROM systems
      WHERE auth_user_id = ${row.auth_user_id}::uuid
        AND lower(name) = lower(${baseName})
      LIMIT 1
    `) as unknown as { name: string }[];

    if (baseExists.length === 0) {
      orphans += row.qtd;
      orphanDetails.push({ authUserId: row.auth_user_id, system: row.system, count: row.qtd });
      continue;
    }

    const canonical = baseExists[0].name;
    const result = await sql`
      UPDATE clients SET system = ${canonical}
      WHERE auth_user_id = ${row.auth_user_id}::uuid AND system = ${row.system}
    `;
    updated += result.count;
  }

  return { updated, orphans, orphanDetails };
}
