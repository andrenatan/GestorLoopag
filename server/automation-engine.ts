import { storage } from "./storage";
import { sendWhatsappTemplate, renderTemplateBody } from "./utils/whatsapp";
import { getBrasiliaDateString, getBrasiliaStartOfDay, parseDateString } from "./utils/timezone";
import type { Client, CrmAutomation, CrmTemplate } from "@shared/schema";

interface TargetFilter {
  systems?: string[];
  statuses?: string[];
}

const FIELD_RESOLVERS: Record<string, (client: Client) => string> = {
  name: (c) => c.name,
  system: (c) => c.system,
  username: (c) => c.username,
  value: (c) => c.value,
  expiry_date: (c) => {
    const [year, month, day] = c.expiryDate.split("-");
    return `${day}/${month}/${year}`;
  },
};

export function buildTemplateParameters(mapping: string[], client: Client): string[] {
  return mapping.map((field) => FIELD_RESOLVERS[field]?.(client) ?? "");
}

function matchesTargetFilter(client: Client, filter: TargetFilter | null | undefined): boolean {
  if (!filter) return true;
  if (filter.systems && filter.systems.length > 0 && !filter.systems.includes(client.system)) return false;
  if (filter.statuses && filter.statuses.length > 0 && !filter.statuses.includes(client.subscriptionStatus)) return false;
  return true;
}

function diffInDays(a: Date, b: Date): number {
  const MS_PER_DAY = 24 * 60 * 60 * 1000;
  return Math.round((a.getTime() - b.getTime()) / MS_PER_DAY);
}

export function getEligibleClients(automation: CrmAutomation, clients: Client[], todayStr: string, today: Date): Client[] {
  return clients.filter((client) => {
    if (!matchesTargetFilter(client, automation.targetFilter as TargetFilter | null)) return false;

    if (automation.triggerType === "client_created") {
      return client.activationDate === todayStr;
    }

    if (automation.triggerType === "before_expiry" || automation.triggerType === "after_expiry") {
      if (automation.triggerDays == null) return false;
      const expiry = parseDateString(client.expiryDate);
      const diff = automation.triggerType === "before_expiry"
        ? diffInDays(expiry, today)
        : diffInDays(today, expiry);
      return diff === automation.triggerDays;
    }

    return false; // "manual" nunca é varrido automaticamente pelo scheduler
  });
}

export async function executeAutomationForClient(
  authUserId: string,
  automation: CrmAutomation,
  client: Client,
  template: CrmTemplate,
  options: { skipDedup?: boolean } = {}
): Promise<{ status: "sent" | "failed" | "skipped"; error?: string }> {
  const contact = await storage.getCrmContactByClientId(authUserId, client.id);
  if (!contact) {
    console.warn(`[CRM Automation] Sem crm_contact para client=${client.id} (automation=${automation.id}), pulando`);
    return { status: "skipped", error: "Contato CRM não encontrado para o cliente" };
  }

  if (!options.skipDedup) {
    const already = await storage.hasCrmAutomationRunToday(authUserId, automation.id, contact.id);
    if (already) {
      return { status: "skipped", error: "Já processado hoje" };
    }
  }

  if (template.status !== "approved") {
    await storage.createCrmAutomationRun(authUserId, {
      automationId: automation.id,
      contactId: contact.id,
      status: "failed",
      waMessageId: null,
      errorMessage: `Template "${template.name}" não está aprovado (status atual: ${template.status})`,
    });
    return { status: "failed", error: "Template não aprovado" };
  }

  const connection = await storage.getWhatsappConnection(authUserId);
  if (!connection || connection.status !== "connected") {
    await storage.createCrmAutomationRun(authUserId, {
      automationId: automation.id,
      contactId: contact.id,
      status: "failed",
      waMessageId: null,
      errorMessage: "Nenhuma conexão de WhatsApp ativa para o tenant",
    });
    return { status: "failed", error: "Nenhuma conexão de WhatsApp ativa para o tenant" };
  }

  const parameters = buildTemplateParameters((automation.templateVariableMapping as string[]) || [], client);
  const result = await sendWhatsappTemplate(connection, contact.phone, template.name, template.language, parameters);

  if (!result.ok) {
    await storage.createCrmAutomationRun(authUserId, {
      automationId: automation.id,
      contactId: contact.id,
      status: "failed",
      waMessageId: null,
      errorMessage: result.error,
    });
    return { status: "failed", error: result.error };
  }

  await storage.createCrmAutomationRun(authUserId, {
    automationId: automation.id,
    contactId: contact.id,
    status: "sent",
    waMessageId: result.waMessageId,
    errorMessage: null,
  });

  const content = renderTemplateBody(template.bodyText, parameters);
  await storage.createCrmMessage(authUserId, {
    contactId: contact.id,
    direction: "outbound",
    content,
    status: "sent",
    waMessageId: result.waMessageId,
  });
  await storage.touchCrmContactLastMessage(authUserId, contact.id, new Date());

  return { status: "sent" };
}

export async function processTenantAutomations(authUserId: string): Promise<{ processed: number; sent: number; failed: number }> {
  const automations = await storage.getActiveCrmAutomations(authUserId);
  const schedulable = automations.filter((a) => a.triggerType !== "manual");
  if (schedulable.length === 0) return { processed: 0, sent: 0, failed: 0 };

  const clients = await storage.getAllClients(authUserId);
  const todayStr = getBrasiliaDateString();
  const today = getBrasiliaStartOfDay();

  let processed = 0, sent = 0, failed = 0;

  for (const automation of schedulable) {
    const template = await storage.getCrmTemplate(authUserId, automation.templateId);
    if (!template) {
      console.warn(`[CRM Automation] Template ${automation.templateId} não encontrado (automation=${automation.id})`);
      continue;
    }
    const eligible = getEligibleClients(automation, clients, todayStr, today);
    for (const client of eligible) {
      const result = await executeAutomationForClient(authUserId, automation, client, template);
      processed++;
      if (result.status === "sent") sent++;
      if (result.status === "failed") failed++;
    }
  }

  return { processed, sent, failed };
}

export async function runAutomationNow(
  authUserId: string,
  automationId: number,
  clientId?: number
): Promise<{ processed: number; sent: number; failed: number }> {
  const automation = await storage.getCrmAutomation(authUserId, automationId);
  if (!automation) throw new Error("Automação não encontrada");

  const template = await storage.getCrmTemplate(authUserId, automation.templateId);
  if (!template) throw new Error("Template da automação não encontrado");

  let targets: Client[];
  if (clientId != null) {
    const client = await storage.getClient(authUserId, clientId);
    if (!client) throw new Error("Cliente não encontrado");
    targets = [client];
  } else {
    const clients = await storage.getAllClients(authUserId);
    const todayStr = getBrasiliaDateString();
    const today = getBrasiliaStartOfDay();
    targets = getEligibleClients(automation, clients, todayStr, today);
  }

  let processed = 0, sent = 0, failed = 0;
  for (const client of targets) {
    // skipDedup: disparo manual sempre tenta enviar, mesmo se já rodou hoje
    const result = await executeAutomationForClient(authUserId, automation, client, template, { skipDedup: true });
    processed++;
    if (result.status === "sent") sent++;
    if (result.status === "failed") failed++;
  }

  return { processed, sent, failed };
}
