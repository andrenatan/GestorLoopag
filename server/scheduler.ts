import { storage } from "./storage";
import { getBrasiliaTimeString, getBrasiliaStartOfDay, getBrasiliaDateString, parseDateString } from "./utils/timezone";

async function updateExpiredClientsStatus(): Promise<void> {
  try {
    // Get current date in Brasília timezone (GMT-3)
    const today = getBrasiliaStartOfDay();
    const todayStr = getBrasiliaDateString();

    // Get all active users
    const users = await storage.getAllActiveUsers();

    console.log(`[Scheduler] Checking expired clients for ${users.length} active users (today: ${todayStr})`);

    let updatedCount = 0;

    // Process each user's clients
    for (const user of users) {
      if (!user.authUserId) continue;

      const allClients = await storage.getAllClients(user.authUserId);
      const activeClients = allClients.filter(c => c.subscriptionStatus === "Ativa");

      for (const client of activeClients) {
        // Parse expiry date
        const expiryDate = parseDateString(client.expiryDate);

        // If expiry date is before today, mark as inactive
        if (expiryDate < today) {
          await storage.updateClient(client.authUserId, client.id, {
            subscriptionStatus: "Inativa"
          });
          updatedCount++;
          console.log(`[Scheduler] ✓ Client #${client.id} (${client.name}) marked as Inativa - expired on ${client.expiryDate}`);
        }
      }
    }

    if (updatedCount > 0) {
      console.log(`[Scheduler] ✓ Updated ${updatedCount} expired client(s) to Inativa status`);
    } else {
      console.log(`[Scheduler] No expired clients found`);
    }
  } catch (error) {
    console.error('[Scheduler] Error updating expired clients:', error);
  }
}

let schedulerInterval: NodeJS.Timeout | null = null;

// Scheduled times to check (GMT-3)
const SCHEDULED_TIMES = ['00:00', '09:30', '10:00', '19:30'];

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

  // Calculate next time in Brasilia timezone
  const nextHours = Math.floor(nextScheduledMinutes / 60) % 24;
  const nextMinutes = nextScheduledMinutes % 60;
  const nextTimeStr = `${nextHours.toString().padStart(2, '0')}:${nextMinutes.toString().padStart(2, '0')}`;

  console.log(`[Scheduler] Current: ${timeString}, Next check: ${nextTimeStr} (in ${delayMinutes} minutes)`);

  return delayMs;
}

function scheduleNextCheck(): void {
  if (schedulerInterval) {
    clearTimeout(schedulerInterval);
  }

  const delay = calculateNextCheckDelay();

  schedulerInterval = setTimeout(async () => {
    await updateExpiredClientsStatus();
    scheduleNextCheck(); // Schedule next check after this one completes
  }, delay);
}

export function startScheduler(): void {
  if (schedulerInterval) {
    console.log("[Scheduler] Already running");
    return;
  }

  console.log(`[Scheduler] Starting smart scheduler - will run only at: ${SCHEDULED_TIMES.join(', ')} (GMT-3)`);

  const { timeString } = getBrasiliaTimeString();

  // Check if current time matches any scheduled time and run immediately if so
  if (SCHEDULED_TIMES.includes(timeString)) {
    console.log(`[Scheduler] Current time ${timeString} matches scheduled time - running now`);
    updateExpiredClientsStatus().then(() => {
      scheduleNextCheck();
    });
    return;
  }

  // Otherwise, just schedule the next check
  console.log(`[Scheduler] Waiting for next scheduled time.`);
  scheduleNextCheck();
}

export function stopScheduler(): void {
  if (schedulerInterval) {
    clearTimeout(schedulerInterval);
    schedulerInterval = null;
    console.log("[Scheduler] Stopped");
  }
}
