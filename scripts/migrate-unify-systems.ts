import postgres from "postgres";

const SUFFIX_RE = /^(.*?)\s*-\s*(IPTV|P2P)\s*$/i;

interface SystemRow {
  id: number;
  auth_user_id: string;
  system_number: number;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: Date;
}

export async function unifySystemsForAllOwners(sql: postgres.Sql) {
  const rows = (await sql<SystemRow[]>`
    SELECT id, auth_user_id, system_number, name, description, is_active, created_at
    FROM systems
  `) as unknown as SystemRow[];

  const byOwner = new Map<string, SystemRow[]>();
  for (const r of rows) {
    const list = byOwner.get(r.auth_user_id) || [];
    list.push(r);
    byOwner.set(r.auth_user_id, list);
  }

  let totalRenamed = 0;
  let totalRemoved = 0;
  let totalClientUpdates = 0;

  const ownerEntries = Array.from(byOwner.entries());
  for (const [authUserId, ownerSystems] of ownerEntries) {
    // Group by lowercased base name to handle case variants ("NET - IPTV" + "net - P2P")
    const groups = new Map<string, { displayBase: string; rows: SystemRow[] }>();
    for (const s of ownerSystems) {
      const m = s.name.match(SUFFIX_RE);
      const base = (m ? m[1] : s.name).trim();
      const key = base.toLowerCase();
      const entry = groups.get(key) || { displayBase: base, rows: [] };
      entry.rows.push(s);
      groups.set(key, entry);
    }

    const groupEntries = Array.from(groups.entries());
    for (const [, { displayBase, rows: group }] of groupEntries) {
      const baseName = displayBase;
      const existingBase = group.find((g: SystemRow) => g.name.trim().toLowerCase() === baseName.toLowerCase() && !SUFFIX_RE.test(g.name));
      const variants = group.filter((g: SystemRow) => g !== existingBase);

      // Nothing to do: only one row, already at base name (no suffix)
      if (existingBase && variants.length === 0) continue;

      // Track ALL pre-rename names that need client rewrites
      const oldNames = new Set<string>();
      for (const v of variants) oldNames.add(v.name);

      let keeperId: number;
      if (!existingBase) {
        // No base row exists — promote the first variant to base, but record its old name first
        const keeper = variants.shift()!;
        oldNames.delete(keeper.name);
        oldNames.add(keeper.name); // keep tracked for client rewrite (may equal baseName only if no suffix, which can't happen here)
        if (keeper.name !== baseName) {
          await sql`UPDATE systems SET name = ${baseName} WHERE id = ${keeper.id}`;
          totalRenamed++;
        }
        keeperId = keeper.id;
      } else {
        keeperId = existingBase.id;
        if (existingBase.name !== baseName) {
          await sql`UPDATE systems SET name = ${baseName} WHERE id = ${existingBase.id}`;
          totalRenamed++;
          oldNames.add(existingBase.name);
        }
      }

      // Rewrite clients from each old (suffixed/variant) name to the unified base
      const oldNamesArr = Array.from(oldNames);
      for (const oldName of oldNamesArr) {
        if (oldName === baseName) continue;
        const updated = await sql`
          UPDATE clients SET system = ${baseName}
          WHERE auth_user_id = ${authUserId} AND system = ${oldName}
        `;
        totalClientUpdates += updated.count;
      }

      // Delete the variant system rows (keeper retained)
      for (const v of variants) {
        if (v.id === keeperId) continue;
        await sql`DELETE FROM systems WHERE id = ${v.id}`;
        totalRemoved++;
      }
    }
  }

  return { totalRenamed, totalRemoved, totalClientUpdates, ownersProcessed: byOwner.size };
}

