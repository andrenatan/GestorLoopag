import { storage } from "./storage";
import type { AutomationConfig, MessageTemplate, Client } from "@shared/schema";
import { getBrasiliaTimeString, getBrasiliaDate, getBrasiliaStartOfDay, getBrasiliaDateString, parseDateString } from "./utils/timezone";

async function sendWebhook(url: string, data: any): Promise<boolean> {
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data)
    });
    
    return response.ok;
  } catch (error) {
    console.error(`[Scheduler] Failed to send webhook to ${url}:`, error);
    return false;
  }
}

async function getClientsForAutomation(
  automationType: string,
  subItemId: string
): Promise<Client[]> {
  // Map automation type and sub-item to client fetching logic
  const mappings: Record<string, Record<string, () => Promise<Client[]>>> = {
    cobrancas: {
      '3days': () => storage.getClientsExpiringInDays(3),
      '1day': () => storage.getClientsExpiringInDays(1),
      'today': () => storage.getClientsExpiringInDays(0),
    },
    reativacao: {
      '1day': () => storage.getClientsExpiredForDays(1),
      '7days': () => storage.getClientsExpiredForDays(7),
      '30days': () => storage.getClientsExpiredForDays(30),
    },
    novosClientes: {
      '7days': () => storage.getClientsActiveForDays(7),
    }
  };

  const fetcher = mappings[automationType]?.[subItemId];
  if (!fetcher) {
    console.warn(`[Scheduler] No client fetcher for ${automationType}/${subItemId}`);
    return [];
  }

  return fetcher();
}

function getAutomationLabel(automationType: string, subItemId: string): string {
  const labels: Record<string, Record<string, string>> = {
    cobrancas: {
      '3days': 'Vencimento: 3 Dias',
      '1day': 'Vencimento: 1 Dia',
      'today': 'Vencimento: Hoje',
    },
    reativacao: {
      '1day': 'Vencidos: 1 Dia',
      '7days': 'Vencidos: 7 Dias',
      '30days': 'Vencidos: 30 Dias',
    },
    novosClientes: {
      '7days': 'Ativos: 7 Dias',
    }
  };

  return labels[automationType]?.[subItemId] || `${automationType}/${subItemId}`;
}

async function processAutomation(config: AutomationConfig): Promise<void> {
  console.log(`[Scheduler] Processing automation: ${config.automationType}`);

  // Get all templates for reference
  const templates = await storage.getAllMessageTemplates();

  for (const subItem of config.subItems) {
    if (!subItem.active || !subItem.templateId) {
      console.log(`[Scheduler] Skipping inactive or unconfigured item: ${subItem.name}`);
      continue;
    }

    // Get clients for this automation
    const clients = await getClientsForAutomation(config.automationType, subItem.id);
    
    if (clients.length === 0) {
      console.log(`[Scheduler] No clients found for ${subItem.name}`);
      continue;
    }

    // Get template content
    const template = templates.find(t => t.id === subItem.templateId);
    if (!template) {
      console.warn(`[Scheduler] Template ${subItem.templateId} not found for ${subItem.name}`);
      continue;
    }

    // Prepare webhook payload
    const payload = {
      automation_type: getAutomationLabel(config.automationType, subItem.id),
      automation_section: config.automationType,
      sub_automation_id: subItem.id,
      sub_automation_name: subItem.name,
      template_id: template.id,
      template_title: template.title,
      template_text: template.content,
      template_image_url: template.imageUrl,
      scheduled_time: config.scheduledTime,
      whatsapp_instance_id: config.whatsappInstanceId,
      clients: clients.map(client => ({
        id: client.id,
        name: client.name,
        phone: client.phone,
        expiry_date: client.expiryDate,
        activation_date: client.activationDate,
        value: client.value,
        plan: client.plan,
        system: client.system
      })),
      client_count: clients.length,
      executed_at: new Date().toISOString()
    };

    // Send webhook
    console.log(`[Scheduler] Sending webhook for ${subItem.name} with ${clients.length} clients`);
    const success = await sendWebhook(config.webhookUrl, payload);
    
    if (success) {
      console.log(`[Scheduler] ✓ Webhook sent successfully for ${subItem.name}`);
    } else {
      console.error(`[Scheduler] ✗ Webhook failed for ${subItem.name}`);
    }
  }

  // Update last run time
  await storage.updateAutomationConfig(config.automationType, {
    lastRunAt: new Date()
  });
}

async function updateExpiredClientsStatus(): Promise<void> {
  try {
    // Get current date in Brasília timezone (GMT-3)
    const today = getBrasiliaStartOfDay();
    const todayStr = getBrasiliaDateString();
    
    // Get all active clients
    const allClients = await storage.getAllClients();
    const activeClients = allClients.filter(c => c.subscriptionStatus === "Ativa");
    
    console.log(`[Scheduler] Checking ${activeClients.length} active clients for expiration (today: ${todayStr})`);
    
    let updatedCount = 0;
    
    for (const client of activeClients) {
      // Parse expiry date
      const expiryDate = parseDateString(client.expiryDate);
      
      // If expiry date is before today, mark as inactive
      if (expiryDate < today) {
        await storage.updateClient(client.id, {
          subscriptionStatus: "Inativa"
        });
        updatedCount++;
        console.log(`[Scheduler] ✓ Client #${client.id} (${client.name}) marked as Inativo - expired on ${client.expiryDate}`);
      }
    }
    
    if (updatedCount > 0) {
      console.log(`[Scheduler] ✓ Updated ${updatedCount} expired client(s) to Inativo status`);
    } else {
      console.log(`[Scheduler] No expired clients found`);
    }
  } catch (error) {
    console.error('[Scheduler] Error updating expired clients:', error);
  }
}

async function checkAndRunAutomations(): Promise<void> {
  const { timeString } = getBrasiliaTimeString();
  
  // First, update expired clients status (runs only once per check)
  await updateExpiredClientsStatus();
  
  // Get all automation configs
  const configs = await storage.getAllAutomationConfigs();
  const activeConfigs = configs.filter(c => c.isActive);
  
  console.log(`[Scheduler] Checking automations at ${timeString}`);
  
  for (const config of activeConfigs) {
    // Check if it's time to run this automation
    if (config.scheduledTime === timeString) {
      // Check if already ran today (avoid duplicate runs on the same day)
      if (config.lastRunAt) {
        const lastRun = getBrasiliaDate();
        lastRun.setTime(new Date(config.lastRunAt).getTime());
        const now = getBrasiliaDate();
        
        const lastRunDate = getBrasiliaDateString(lastRun);
        const todayDate = getBrasiliaDateString(now);
        
        if (lastRunDate === todayDate) {
          console.log(`[Scheduler] ⏭️  Skipping ${config.automationType} - already ran today at ${config.lastRunAt}`);
          continue;
        }
      }

      console.log(`[Scheduler] 🚀 Triggering automation: ${config.automationType} at ${timeString}`);
      await processAutomation(config);
    }
  }
}

let schedulerInterval: NodeJS.Timeout | null = null;
let lastCheckedMinute: string | null = null;

// Scheduled times to check (GMT-3)
const SCHEDULED_TIMES = ['09:30', '10:00', '19:30'];

function calculateNextCheckDelay(): number {
  const { timeString, hours, minutes } = getBrasiliaTimeString();
  
  // Find next scheduled time
  let nextScheduledMinutes = Infinity;
  const currentTotalMinutes = hours * 60 + minutes;
  
  for (const scheduledTime of SCHEDULED_TIMES) {
    const [schedHours, schedMinutes] = scheduledTime.split(':').map(Number);
    const scheduledTotalMinutes = schedHours * 60 + schedMinutes;
    
    if (scheduledTotalMinutes > currentTotalMinutes) {
      nextScheduledMinutes = Math.min(nextScheduledMinutes, scheduledTotalMinutes);
    }
  }
  
  // If no time today, schedule for first time tomorrow
  if (nextScheduledMinutes === Infinity) {
    const [firstHours, firstMinutes] = SCHEDULED_TIMES[0].split(':').map(Number);
    nextScheduledMinutes = (24 * 60) + (firstHours * 60 + firstMinutes);
  }
  
  const delayMinutes = nextScheduledMinutes - currentTotalMinutes;
  const delayMs = delayMinutes * 60 * 1000;
  
  const nextTime = new Date(Date.now() + delayMs);
  const nextTimeStr = `${nextTime.getHours().toString().padStart(2, '0')}:${nextTime.getMinutes().toString().padStart(2, '0')}`;
  
  console.log(`[Scheduler] Current: ${timeString}, Next check: ${nextTimeStr} (in ${delayMinutes} minutes)`);
  
  return delayMs;
}

function scheduleNextCheck(): void {
  if (schedulerInterval) {
    clearTimeout(schedulerInterval);
  }
  
  const delay = calculateNextCheckDelay();
  
  schedulerInterval = setTimeout(async () => {
    await checkAndRunAutomations();
    scheduleNextCheck(); // Schedule next check after this one completes
  }, delay);
}

export function startScheduler(): void {
  if (schedulerInterval) {
    console.log("[Scheduler] Already running");
    return;
  }

  console.log(`[Scheduler] Starting smart scheduler - will run only at: ${SCHEDULED_TIMES.join(', ')} (GMT-3)`);
  
  // Check if current time matches any scheduled time and run immediately if so
  const { timeString } = getBrasiliaTimeString();
  if (SCHEDULED_TIMES.includes(timeString)) {
    console.log(`[Scheduler] Current time ${timeString} matches scheduled time - running now`);
    checkAndRunAutomations().then(() => {
      scheduleNextCheck();
    });
  } else {
    // Schedule first check
    scheduleNextCheck();
  }
}

export function stopScheduler(): void {
  if (schedulerInterval) {
    clearTimeout(schedulerInterval);
    schedulerInterval = null;
    console.log("[Scheduler] Stopped");
  }
}

// Test function to manually trigger an automation (for testing)
export async function testAutomationTrigger(config: AutomationConfig): Promise<any> {
  console.log(`[Test] Manually triggering automation: ${config.automationType}`);
  
  const results: any[] = [];
  const templates = await storage.getAllMessageTemplates();
  
  for (const subItem of config.subItems) {
    if (!subItem.active || !subItem.templateId) {
      results.push({
        subItem: subItem.name,
        status: 'skipped',
        reason: subItem.active ? 'No template configured' : 'Inactive'
      });
      continue;
    }
    
    const clients = await getClientsForAutomation(config.automationType, subItem.id);
    const template = templates.find(t => t.id === subItem.templateId);
    
    if (!template) {
      results.push({
        subItem: subItem.name,
        status: 'error',
        reason: 'Template not found'
      });
      continue;
    }
    
    if (clients.length === 0) {
      results.push({
        subItem: subItem.name,
        status: 'no_clients',
        clientCount: 0
      });
      continue;
    }
    
    const payload = {
      automation_type: getAutomationLabel(config.automationType, subItem.id),
      automation_section: config.automationType,
      sub_automation_id: subItem.id,
      sub_automation_name: subItem.name,
      template_id: template.id,
      template_title: template.title,
      template_text: template.content,
      template_image_url: template.imageUrl,
      scheduled_time: config.scheduledTime,
      whatsapp_instance_id: config.whatsappInstanceId,
      clients: clients.map(client => ({
        id: client.id,
        name: client.name,
        phone: client.phone,
        expiry_date: client.expiryDate,
        activation_date: client.activationDate,
        value: client.value,
        plan: client.plan,
        system: client.system
      })),
      client_count: clients.length,
      executed_at: new Date().toISOString(),
      test_mode: true
    };
    
    const success = await sendWebhook(config.webhookUrl, payload);
    
    results.push({
      subItem: subItem.name,
      status: success ? 'success' : 'webhook_failed',
      clientCount: clients.length,
      webhookUrl: config.webhookUrl,
      clients: clients.map(c => ({ id: c.id, name: c.name, phone: c.phone }))
    });
  }
  
  return {
    totalSubItems: config.subItems.length,
    activeSubItems: config.subItems.filter(s => s.active).length,
    results
  };
}
