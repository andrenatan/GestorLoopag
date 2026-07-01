import { db } from "../db";
import { systems, users } from "../shared/schema";

async function seed() {
  console.log("🌱 Seeding database...");

  try {
    // Create default system
    const [defaultSystem] = await db.insert(systems).values({
      name: "Sistema Principal",
      description: "Sistema padrão do Loopag",
      isActive: true,
    }).returning();
    console.log("✅ Sistema padrão criado:", defaultSystem.name);

    // Create admin user
    const [adminUser] = await db.insert(users).values({
      username: "admin",
      password: "admin123", // In production, this should be hashed
      email: "admin@loopag.com",
      role: "admin",
      isActive: true,
    }).returning();
    console.log("✅ Usuário admin criado:", adminUser.username);

    console.log("\n✅ Seed concluído com sucesso!");
    console.log("\n📊 Dados criados:");
    console.log(`   - ${1} Sistema`);
    console.log(`   - ${1} Usuário (admin/admin123)`);

  } catch (error) {
    console.error("❌ Erro ao popular banco:", error);
    throw error;
  }

  process.exit(0);
}

seed();
