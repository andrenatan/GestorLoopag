import { db } from "../db";
import { systems, users, messageTemplates, automationConfigs } from "../shared/schema";

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

    // Create message templates
    const templates = [
      {
        title: "Lembrete de Pagamento - 3 Dias",
        content: "Olá {nome}! Seu plano IPTV vence em 3 dias ({data_vencimento}). Renove agora para não perder o acesso! Valor: R$ {valor}",
        isActive: true,
      },
      {
        title: "Lembrete de Pagamento - 1 Dia",
        content: "⚠️ Olá {nome}! Seu plano IPTV vence AMANHÃ ({data_vencimento}). Não perca o acesso! Renove agora por R$ {valor}",
        isActive: true,
      },
      {
        title: "Vencimento Hoje",
        content: "🔴 URGENTE {nome}! Seu plano vence HOJE ({data_vencimento}). Renove agora para manter seu acesso! Valor: R$ {valor}",
        isActive: true,
      },
      {
        title: "Plano Vencido - 1 Dia",
        content: "Olá {nome}, seu plano venceu ontem. Renove agora para reativar seu acesso! Valor: R$ {valor}",
        isActive: true,
      },
      {
        title: "Boas-vindas - Novos Clientes",
        content: "🎉 Bem-vindo(a) ao IPTV {nome}! Seu plano foi ativado com sucesso. Aproveite!",
        isActive: true,
      },
    ];

    for (const template of templates) {
      await db.insert(messageTemplates).values(template);
    }
    console.log(`✅ ${templates.length} templates de mensagens criados`);

    // Create automation configs
    const automations = [
      {
        automationType: "cobrancas" as const,
        isActive: false,
        scheduledTime: "09:30",
        whatsappInstanceId: null,
        webhookUrl: "https://webhook.dev.userxai.online/webhook/send_messages",
        subItems: [
          { id: "3days", name: "Vence em 3 dias", active: false, templateId: null, clientCount: 0 },
          { id: "1day", name: "Vence em 1 dia", active: false, templateId: null, clientCount: 0 },
          { id: "today", name: "Vence hoje", active: false, templateId: null, clientCount: 0 },
          { id: "expired1", name: "Vencidos à 1 dia", active: false, templateId: null, clientCount: 0 },
          { id: "expired7", name: "Vencidos à 7 dias", active: false, templateId: null, clientCount: 0 },
          { id: "expired30", name: "Vencidos à 30 dias", active: false, templateId: null, clientCount: 0 },
        ],
      },
      {
        automationType: "reativacao" as const,
        isActive: false,
        scheduledTime: "19:30",
        whatsappInstanceId: null,
        webhookUrl: "https://webhook.dev.userxai.online/webhook/gestor_loopag_reativacao",
        subItems: [
          { id: "7days", name: "Inativos há 7 dias", active: false, templateId: null, clientCount: 0 },
          { id: "15days", name: "Inativos há 15 dias", active: false, templateId: null, clientCount: 0 },
          { id: "30days", name: "Inativos há 30 dias", active: false, templateId: null, clientCount: 0 },
        ],
      },
      {
        automationType: "novosClientes" as const,
        isActive: false,
        scheduledTime: "10:00",
        whatsappInstanceId: null,
        webhookUrl: "https://webhook.dev.userxai.online/webhook/gestor_loopag_ativos_7dias",
        subItems: [
          { id: "7days", name: "Ativos há 7 dias", active: false, templateId: null, clientCount: 0 },
        ],
      },
    ];

    for (const automation of automations) {
      await db.insert(automationConfigs).values(automation);
    }
    console.log(`✅ ${automations.length} automações criadas`);

    console.log("\n✅ Seed concluído com sucesso!");
    console.log("\n📊 Dados criados:");
    console.log(`   - ${1} Sistema`);
    console.log(`   - ${1} Usuário (admin/admin123)`);
    console.log(`   - ${templates.length} Templates de mensagens`);
    console.log(`   - ${automations.length} Configurações de automação`);

  } catch (error) {
    console.error("❌ Erro ao popular banco:", error);
    throw error;
  }

  process.exit(0);
}

seed();
