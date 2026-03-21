import postgres from "postgres";

const supabaseUrl = process.env.SUPABASE_DATABASE_URL;
if (!supabaseUrl) {
  console.error("SUPABASE_DATABASE_URL not set");
  process.exit(1);
}

const authUserId = process.env.N8N_AUTH_USER_ID;
if (!authUserId) {
  console.error("N8N_AUTH_USER_ID not set");
  process.exit(1);
}

const client = postgres(supabaseUrl, { prepare: false, max: 1 });

async function run() {
  console.log("Creating client_plans table if not exists...");
  await client`
    CREATE TABLE IF NOT EXISTS client_plans (
      id SERIAL PRIMARY KEY,
      auth_user_id UUID NOT NULL,
      name TEXT NOT NULL,
      value NUMERIC(10, 2) NOT NULL,
      duration_type TEXT NOT NULL DEFAULT 'months',
      duration_quantity INTEGER NOT NULL DEFAULT 1,
      description TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `;
  console.log("Table ready.");

  const defaultPlans = [
    { name: "Mensal", value: 35.00, duration_type: "months", duration_quantity: 1 },
    { name: "Trimestral", value: 90.00, duration_type: "months", duration_quantity: 3 },
    { name: "Semestral", value: 160.00, duration_type: "months", duration_quantity: 6 },
    { name: "Anual", value: 290.00, duration_type: "months", duration_quantity: 12 },
  ];

  for (const plan of defaultPlans) {
    const existing = await client`
      SELECT id FROM client_plans WHERE auth_user_id = ${authUserId}::uuid AND name = ${plan.name} LIMIT 1
    `;
    if (existing.length > 0) {
      console.log(`Plan "${plan.name}" already exists, skipping.`);
      continue;
    }
    await client`
      INSERT INTO client_plans (auth_user_id, name, value, duration_type, duration_quantity)
      VALUES (${authUserId}::uuid, ${plan.name}, ${plan.value}, ${plan.duration_type}, ${plan.duration_quantity})
    `;
    console.log(`Inserted plan: ${plan.name} — R$${plan.value} — ${plan.duration_quantity} ${plan.duration_type}`);
  }

  console.log("Done.");
  await client.end();
}

run().catch((err) => {
  console.error("Migration failed:", err.message);
  process.exit(1);
});
