import { 
  plans, users, employees, systems, clients, whatsappInstances, messageTemplates, billingHistory, paymentHistory, automationConfigs,
  type Plan, type InsertPlan,
  type User, type InsertUser,
  type Employee, type InsertEmployee,
  type System, type InsertSystem,
  type Client, type InsertClient,
  type WhatsappInstance, type InsertWhatsappInstance,
  type MessageTemplate, type InsertMessageTemplate,
  type BillingHistory, type InsertBillingHistory,
  type PaymentHistory, type InsertPaymentHistory,
  type AutomationConfig, type InsertAutomationConfig
} from "@shared/schema";
import { getBrasiliaDate, getBrasiliaDateString, getBrasiliaStartOfDay, parseDateString } from "./utils/timezone";
import { db } from "../db";
import { eq, and, gte, lte, sql, desc } from "drizzle-orm";

export interface IStorage {
  // Plans
  getAllPlans(): Promise<Plan[]>;
  getPlan(id: number): Promise<Plan | undefined>;
  createPlan(plan: InsertPlan): Promise<Plan>;
  updatePlan(id: number, plan: Partial<InsertPlan>): Promise<Plan | undefined>;

  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByAuthId(authUserId: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<InsertUser>): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;

  // Employees
  getAllEmployees(authUserId: string): Promise<Employee[]>;
  getEmployee(authUserId: string, id: number): Promise<Employee | undefined>;
  createEmployee(authUserId: string, employee: InsertEmployee): Promise<Employee>;
  updateEmployee(authUserId: string, id: number, employee: Partial<InsertEmployee>): Promise<Employee | undefined>;
  deleteEmployee(authUserId: string, id: number): Promise<boolean>;

  // Systems
  getAllSystems(authUserId: string): Promise<System[]>;
  getSystem(authUserId: string, id: number): Promise<System | undefined>;
  createSystem(authUserId: string, system: InsertSystem): Promise<System>;
  updateSystem(authUserId: string, id: number, system: Partial<InsertSystem>): Promise<System | undefined>;
  deleteSystem(authUserId: string, id: number): Promise<boolean>;

  // Clients
  getAllClients(authUserId: string): Promise<Client[]>;
  getClient(authUserId: string, id: number): Promise<Client | undefined>;
  createClient(authUserId: string, client: InsertClient): Promise<Client>;
  updateClient(authUserId: string, id: number, client: Partial<InsertClient>): Promise<Client | undefined>;
  deleteClient(authUserId: string, id: number): Promise<boolean>;
  getExpiringClients(authUserId: string, days: number): Promise<Client[]>;
  getOverdueClients(authUserId: string): Promise<Client[]>;
  getReferralRankings(authUserId: string, days?: number): Promise<{ client: Client; referralCount: number }[]>;

  // WhatsApp Instances
  getAllWhatsappInstances(authUserId: string): Promise<WhatsappInstance[]>;
  getWhatsappInstance(authUserId: string, id: number): Promise<WhatsappInstance | undefined>;
  createWhatsappInstance(authUserId: string, instance: InsertWhatsappInstance): Promise<WhatsappInstance>;
  updateWhatsappInstance(authUserId: string, id: number, instance: Partial<InsertWhatsappInstance>): Promise<WhatsappInstance | undefined>;
  deleteWhatsappInstance(authUserId: string, id: number): Promise<boolean>;

  // Message Templates
  getAllMessageTemplates(authUserId: string): Promise<MessageTemplate[]>;
  getMessageTemplate(authUserId: string, id: number): Promise<MessageTemplate | undefined>;
  createMessageTemplate(authUserId: string, template: InsertMessageTemplate): Promise<MessageTemplate>;
  updateMessageTemplate(authUserId: string, id: number, template: Partial<InsertMessageTemplate>): Promise<MessageTemplate | undefined>;
  deleteMessageTemplate(authUserId: string, id: number): Promise<boolean>;

  // Billing History
  getAllBillingHistory(authUserId: string): Promise<BillingHistory[]>;
  getBillingHistory(authUserId: string, clientId: number): Promise<BillingHistory[]>;
  createBillingHistory(authUserId: string, billing: InsertBillingHistory): Promise<BillingHistory>;
  updateBillingHistory(authUserId: string, id: number, billing: Partial<InsertBillingHistory>): Promise<BillingHistory | undefined>;

  // Payment History
  getAllPaymentHistory(authUserId: string): Promise<PaymentHistory[]>;
  getPaymentHistoryByClient(authUserId: string, clientId: number): Promise<PaymentHistory[]>;
  createPaymentHistory(authUserId: string, payment: InsertPaymentHistory): Promise<PaymentHistory>;
  getPaymentHistoryByDateRange(authUserId: string, startDate: string, endDate: string): Promise<PaymentHistory[]>;

  // Dashboard Stats
  getDashboardStats(authUserId: string): Promise<{
    activeClients: number;
    inactiveClients: number;
    expiringTomorrow: number;
    expiredYesterday: number;
    expiringToday: number;
    expiring3Days: number;
    overdue: number;
    billingSentToday: number;
    newClientsToday: number;
    totalRevenue: number;
  }>;
  getNewClientsByDay(authUserId: string): Promise<{ day: number; count: number }[]>;
  getRevenueByPeriod(authUserId: string, period: 'current_month' | 'last_month' | '3_months' | '6_months' | '12_months'): Promise<{ label: string; value: number }[]>;

  // Automation Configs
  getAllAutomationConfigs(authUserId: string): Promise<AutomationConfig[]>;
  getAutomationConfig(authUserId: string, automationType: string): Promise<AutomationConfig | undefined>;
  createAutomationConfig(authUserId: string, config: InsertAutomationConfig): Promise<AutomationConfig>;
  updateAutomationConfig(authUserId: string, automationType: string, config: Partial<InsertAutomationConfig> & { lastRunAt?: Date | null }): Promise<AutomationConfig | undefined>;

  // Client counting for automations
  getClientsExpiringInDays(authUserId: string, days: number): Promise<Client[]>;
  getClientsExpiredForDays(authUserId: string, days: number): Promise<Client[]>;
  getClientsActiveForDays(authUserId: string, days: number): Promise<Client[]>;
  
  // Scheduler helpers
  getAllUsersWithActiveAutomations(): Promise<string[]>;
  getAllActiveUsers(): Promise<User[]>;

  // Stripe subscription methods
  updateUserStripeInfo(userId: number, stripeCustomerId: string, stripeSubscriptionId: string): Promise<User | undefined>;
  updateUserSubscriptionStatus(userId: number, status: string, expiresAt?: Date | null): Promise<User | undefined>;
}


export class DbStorage implements IStorage {
  // Plans
  async getAllPlans(): Promise<Plan[]> {
    return await db.select().from(plans);
  }

  async getPlan(id: number): Promise<Plan | undefined> {
    const result = await db.select().from(plans).where(eq(plans.id, id)).limit(1);
    return result[0];
  }

  async createPlan(insertPlan: InsertPlan): Promise<Plan> {
    const result = await db.insert(plans).values(insertPlan).returning();
    return result[0];
  }

  async updatePlan(id: number, updateData: Partial<InsertPlan>): Promise<Plan | undefined> {
    const result = await db.update(plans).set(updateData).where(eq(plans.id, id)).returning();
    return result[0];
  }

  // Users
  async getUser(id: number): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username)).limit(1);
    return result[0];
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
    return result[0];
  }

  async getUserByAuthId(authUserId: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.authUserId, authUserId)).limit(1);
    return result[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const result = await db.insert(users).values(insertUser).returning();
    return result[0];
  }

  async updateUser(id: number, updateData: Partial<InsertUser>): Promise<User | undefined> {
    const result = await db.update(users).set(updateData).where(eq(users.id, id)).returning();
    return result[0];
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  // Systems
  async getAllSystems(authUserId: string): Promise<System[]> {
    return await db.select().from(systems).where(eq(systems.authUserId, authUserId));
  }

  async getSystem(authUserId: string, id: number): Promise<System | undefined> {
    const result = await db.select().from(systems)
      .where(and(eq(systems.id, id), eq(systems.authUserId, authUserId)))
      .limit(1);
    return result[0];
  }

  private async getNextSystemNumber(authUserId: string): Promise<number> {
    const result = await db.select({ maxNumber: sql<number>`COALESCE(MAX(${systems.systemNumber}), 0)` })
      .from(systems)
      .where(eq(systems.authUserId, authUserId));
    return (result[0]?.maxNumber || 0) + 1;
  }

  async createSystem(authUserId: string, insertSystem: InsertSystem): Promise<System> {
    const systemNumber = await this.getNextSystemNumber(authUserId);
    const result = await db.insert(systems).values({ ...insertSystem, authUserId, systemNumber }).returning();
    return result[0];
  }

  async updateSystem(authUserId: string, id: number, updateData: Partial<InsertSystem>): Promise<System | undefined> {
    const result = await db.update(systems)
      .set(updateData)
      .where(and(eq(systems.id, id), eq(systems.authUserId, authUserId)))
      .returning();
    return result[0];
  }

  async deleteSystem(authUserId: string, id: number): Promise<boolean> {
    const result = await db.delete(systems)
      .where(and(eq(systems.id, id), eq(systems.authUserId, authUserId)))
      .returning();
    return result.length > 0;
  }

  // Employees
  async getAllEmployees(authUserId: string): Promise<Employee[]> {
    return await db.select().from(employees).where(eq(employees.authUserId, authUserId));
  }

  async getEmployee(authUserId: string, id: number): Promise<Employee | undefined> {
    const result = await db.select().from(employees)
      .where(and(eq(employees.id, id), eq(employees.authUserId, authUserId)))
      .limit(1);
    return result[0];
  }

  private async getNextEmployeeNumber(authUserId: string): Promise<number> {
    const result = await db.select({ maxNumber: sql<number>`COALESCE(MAX(${employees.employeeNumber}), 0)` })
      .from(employees)
      .where(eq(employees.authUserId, authUserId));
    return (result[0]?.maxNumber || 0) + 1;
  }

  async createEmployee(authUserId: string, insertEmployee: InsertEmployee): Promise<Employee> {
    const employeeNumber = await this.getNextEmployeeNumber(authUserId);
    const result = await db.insert(employees).values({ ...insertEmployee, authUserId, employeeNumber }).returning();
    return result[0];
  }

  async updateEmployee(authUserId: string, id: number, updateData: Partial<InsertEmployee>): Promise<Employee | undefined> {
    const result = await db.update(employees)
      .set(updateData)
      .where(and(eq(employees.id, id), eq(employees.authUserId, authUserId)))
      .returning();
    return result[0];
  }

  async deleteEmployee(authUserId: string, id: number): Promise<boolean> {
    const result = await db.delete(employees)
      .where(and(eq(employees.id, id), eq(employees.authUserId, authUserId)))
      .returning();
    return result.length > 0;
  }

  // Clients
  async getAllClients(authUserId: string): Promise<Client[]> {
    return await db.select().from(clients)
      .where(eq(clients.authUserId, authUserId))
      .orderBy(desc(clients.id));
  }

  async getClient(authUserId: string, id: number): Promise<Client | undefined> {
    const result = await db.select().from(clients)
      .where(and(eq(clients.id, id), eq(clients.authUserId, authUserId)))
      .limit(1);
    return result[0];
  }

  private async getNextClientNumber(authUserId: string): Promise<number> {
    const result = await db.select({ maxNumber: sql<number>`COALESCE(MAX(${clients.clientNumber}), 0)` })
      .from(clients)
      .where(eq(clients.authUserId, authUserId));
    return (result[0]?.maxNumber || 0) + 1;
  }

  async createClient(authUserId: string, insertClient: InsertClient): Promise<Client> {
    const clientNumber = await this.getNextClientNumber(authUserId);
    const result = await db.insert(clients).values({ ...insertClient, authUserId, clientNumber }).returning();
    return result[0];
  }

  async updateClient(authUserId: string, id: number, updateData: Partial<InsertClient>): Promise<Client | undefined> {
    const result = await db.update(clients)
      .set(updateData)
      .where(and(eq(clients.id, id), eq(clients.authUserId, authUserId)))
      .returning();
    return result[0];
  }

  async deleteClient(authUserId: string, id: number): Promise<boolean> {
    const result = await db.delete(clients)
      .where(and(eq(clients.id, id), eq(clients.authUserId, authUserId)))
      .returning();
    return result.length > 0;
  }

  async getExpiringClients(authUserId: string, days: number): Promise<Client[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + days);
    
    const allClients = await db.select().from(clients).where(eq(clients.authUserId, authUserId));
    return allClients.filter(client => {
      const [year, month, day] = client.expiryDate.split('-').map(Number);
      const expiryDate = new Date(year, month - 1, day);
      expiryDate.setHours(0, 0, 0, 0);
      return expiryDate >= targetDate && expiryDate < new Date(targetDate.getTime() + 86400000);
    });
  }

  async getOverdueClients(authUserId: string): Promise<Client[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const allClients = await db.select().from(clients).where(eq(clients.authUserId, authUserId));
    return allClients.filter(client => {
      const [year, month, day] = client.expiryDate.split('-').map(Number);
      const expiryDate = new Date(year, month - 1, day);
      expiryDate.setHours(0, 0, 0, 0);
      return expiryDate < today;
    });
  }

  async getReferralRankings(authUserId: string, days?: number): Promise<{ client: Client; referralCount: number }[]> {
    const allClients = await db.select().from(clients).where(eq(clients.authUserId, authUserId));
    const referralMap = new Map<number, number>();
    
    allClients.forEach(client => {
      if (client.referredById) {
        referralMap.set(client.referredById, (referralMap.get(client.referredById) || 0) + 1);
      }
    });
    
    return allClients
      .map(client => ({
        client,
        referralCount: referralMap.get(client.id) || 0
      }))
      .filter(item => item.referralCount > 0)
      .sort((a, b) => b.referralCount - a.referralCount);
  }

  // WhatsApp Instances
  async getAllWhatsappInstances(authUserId: string): Promise<WhatsappInstance[]> {
    return await db.select().from(whatsappInstances).where(eq(whatsappInstances.authUserId, authUserId));
  }

  async getWhatsappInstance(authUserId: string, id: number): Promise<WhatsappInstance | undefined> {
    const result = await db.select().from(whatsappInstances)
      .where(and(eq(whatsappInstances.id, id), eq(whatsappInstances.authUserId, authUserId)))
      .limit(1);
    return result[0];
  }

  async createWhatsappInstance(authUserId: string, insertInstance: InsertWhatsappInstance): Promise<WhatsappInstance> {
    const result = await db.insert(whatsappInstances).values({ ...insertInstance, authUserId }).returning();
    return result[0];
  }

  async updateWhatsappInstance(authUserId: string, id: number, updateData: Partial<InsertWhatsappInstance>): Promise<WhatsappInstance | undefined> {
    const result = await db.update(whatsappInstances)
      .set(updateData)
      .where(and(eq(whatsappInstances.id, id), eq(whatsappInstances.authUserId, authUserId)))
      .returning();
    return result[0];
  }

  async deleteWhatsappInstance(authUserId: string, id: number): Promise<boolean> {
    // First, update all automation configs that reference this instance to null
    await db
      .update(automationConfigs)
      .set({ whatsappInstanceId: null })
      .where(and(eq(automationConfigs.whatsappInstanceId, id), eq(automationConfigs.authUserId, authUserId)));
    
    // Then delete the instance
    const result = await db.delete(whatsappInstances)
      .where(and(eq(whatsappInstances.id, id), eq(whatsappInstances.authUserId, authUserId)))
      .returning();
    return result.length > 0;
  }

  // Message Templates
  async getAllMessageTemplates(authUserId: string): Promise<MessageTemplate[]> {
    return await db.select().from(messageTemplates).where(eq(messageTemplates.authUserId, authUserId));
  }

  async getMessageTemplate(authUserId: string, id: number): Promise<MessageTemplate | undefined> {
    const result = await db.select().from(messageTemplates)
      .where(and(eq(messageTemplates.id, id), eq(messageTemplates.authUserId, authUserId)))
      .limit(1);
    return result[0];
  }

  async createMessageTemplate(authUserId: string, insertTemplate: InsertMessageTemplate): Promise<MessageTemplate> {
    const result = await db.insert(messageTemplates).values({ ...insertTemplate, authUserId }).returning();
    return result[0];
  }

  async updateMessageTemplate(authUserId: string, id: number, updateData: Partial<InsertMessageTemplate>): Promise<MessageTemplate | undefined> {
    const result = await db.update(messageTemplates)
      .set(updateData)
      .where(and(eq(messageTemplates.id, id), eq(messageTemplates.authUserId, authUserId)))
      .returning();
    return result[0];
  }

  async deleteMessageTemplate(authUserId: string, id: number): Promise<boolean> {
    const result = await db.delete(messageTemplates)
      .where(and(eq(messageTemplates.id, id), eq(messageTemplates.authUserId, authUserId)))
      .returning();
    return result.length > 0;
  }

  // Billing History
  async getAllBillingHistory(authUserId: string): Promise<BillingHistory[]> {
    return await db.select().from(billingHistory)
      .where(eq(billingHistory.authUserId, authUserId))
      .orderBy(desc(billingHistory.createdAt));
  }

  async getBillingHistory(authUserId: string, clientId: number): Promise<BillingHistory[]> {
    return await db.select().from(billingHistory)
      .where(and(eq(billingHistory.clientId, clientId), eq(billingHistory.authUserId, authUserId)))
      .orderBy(desc(billingHistory.createdAt));
  }

  async createBillingHistory(authUserId: string, insertBilling: InsertBillingHistory): Promise<BillingHistory> {
    const result = await db.insert(billingHistory).values({ ...insertBilling, authUserId }).returning();
    return result[0];
  }

  async updateBillingHistory(authUserId: string, id: number, updateData: Partial<InsertBillingHistory>): Promise<BillingHistory | undefined> {
    const result = await db.update(billingHistory)
      .set(updateData)
      .where(and(eq(billingHistory.id, id), eq(billingHistory.authUserId, authUserId)))
      .returning();
    return result[0];
  }

  // Payment History
  async getAllPaymentHistory(authUserId: string): Promise<PaymentHistory[]> {
    return await db.select().from(paymentHistory)
      .where(eq(paymentHistory.authUserId, authUserId))
      .orderBy(desc(paymentHistory.createdAt));
  }

  async getPaymentHistoryByClient(authUserId: string, clientId: number): Promise<PaymentHistory[]> {
    return await db.select().from(paymentHistory)
      .where(and(eq(paymentHistory.clientId, clientId), eq(paymentHistory.authUserId, authUserId)))
      .orderBy(desc(paymentHistory.createdAt));
  }

  async createPaymentHistory(authUserId: string, insertPayment: InsertPaymentHistory): Promise<PaymentHistory> {
    const result = await db.insert(paymentHistory).values({ ...insertPayment, authUserId }).returning();
    return result[0];
  }

  async getPaymentHistoryByDateRange(authUserId: string, startDate: string, endDate: string): Promise<PaymentHistory[]> {
    return await db.select().from(paymentHistory)
      .where(
        and(
          eq(paymentHistory.authUserId, authUserId),
          gte(paymentHistory.paymentDate, startDate),
          lte(paymentHistory.paymentDate, endDate)
        )
      )
      .orderBy(paymentHistory.paymentDate);
  }

  async createRenewalPayment(
    authUserId: string,
    clientId: number,
    amount: string,
    previousExpiryDate: string,
    newExpiryDate: string,
    brasiliaDateString: string
  ): Promise<PaymentHistory> {
    // Always create a new record for each renewal to preserve historical data
    const result = await db.insert(paymentHistory)
      .values({
        authUserId,
        clientId,
        amount,
        paymentDate: brasiliaDateString,
        type: 'renewal',
        previousExpiryDate,
        newExpiryDate,
      })
      .returning();
    return result[0];
  }

  // Dashboard Stats
  async getDashboardStats(authUserId: string): Promise<{
    activeClients: number;
    inactiveClients: number;
    expiringTomorrow: number;
    expiredYesterday: number;
    expiringToday: number;
    expiring3Days: number;
    overdue: number;
    billingSentToday: number;
    newClientsToday: number;
    totalRevenue: number;
  }> {
    const allClients = await db.select().from(clients).where(eq(clients.authUserId, authUserId));
    const allBilling = await db.select().from(billingHistory).where(eq(billingHistory.authUserId, authUserId));
    
    // Use Brasília timezone (GMT-3) for all date calculations
    const today = getBrasiliaStartOfDay();
    
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    
    const threeDaysFromNow = new Date(today);
    threeDaysFromNow.setDate(today.getDate() + 3);
    
    const todayStr = getBrasiliaDateString();
    
    let activeClients = 0;
    let inactiveClients = 0;
    let expiringToday = 0;
    let expiringTomorrow = 0;
    let expiring3Days = 0;
    let overdue = 0;
    let expiredYesterday = 0;
    
    allClients.forEach(client => {
      const expiryDate = parseDateString(client.expiryDate);
      expiryDate.setHours(0, 0, 0, 0);
      
      if (expiryDate >= today) {
        activeClients++;
        
        if (expiryDate.getTime() === today.getTime()) expiringToday++;
        if (expiryDate.getTime() === tomorrow.getTime()) expiringTomorrow++;
        if (expiryDate.getTime() === threeDaysFromNow.getTime()) expiring3Days++;
      } else {
        inactiveClients++;
        overdue++;
        
        if (expiryDate.getTime() === yesterday.getTime()) expiredYesterday++;
      }
    });
    
    const billingSentToday = allBilling.filter(b => 
      b.createdAt.toISOString().split('T')[0] === todayStr
    ).length;
    
    const newClientsToday = allClients.filter(c => 
      c.activationDate === todayStr
    ).length;
    
    // Calculate monthly revenue from payment_history (current month)
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth() + 1;
    const monthStart = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`;
    const monthEnd = new Date(currentYear, currentMonth, 0).toISOString().split('T')[0];
    
    const monthlyPayments = await db.select().from(paymentHistory)
      .where(
        and(
          eq(paymentHistory.authUserId, authUserId),
          gte(paymentHistory.paymentDate, monthStart),
          lte(paymentHistory.paymentDate, monthEnd)
        )
      );
    
    const totalRevenue = monthlyPayments.reduce((sum, payment) => 
      sum + Number(payment.amount || 0), 0
    );
    
    return {
      activeClients,
      inactiveClients,
      expiringTomorrow,
      expiredYesterday,
      expiringToday,
      expiring3Days,
      overdue,
      billingSentToday,
      newClientsToday,
      totalRevenue
    };
  }

  async getNewClientsByDay(authUserId: string): Promise<{ day: number; count: number }[]> {
    const allClients = await db.select().from(clients).where(eq(clients.authUserId, authUserId));
    // Use Brasília timezone (GMT-3)
    const today = getBrasiliaDate();
    const currentMonth = today.getMonth(); // 0-11
    const currentYear = today.getFullYear();
    
    // Get number of days in current month
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    
    // Initialize stats for each day of the month
    const clientsByDay: { [key: number]: number } = {};
    for (let day = 1; day <= daysInMonth; day++) {
      clientsByDay[day] = 0;
    }
    
    // Count clients by activation date
    allClients.forEach(client => {
      if (!client.activationDate) return;
      
      const activationDateStr = client.activationDate;
      const [year, month, day] = activationDateStr.split('-').map(Number);
      
      // Only count if it's in the current month and year
      if (year === currentYear && month === currentMonth + 1) {
        clientsByDay[day] = (clientsByDay[day] || 0) + 1;
      }
    });
    
    // Return array sorted by day (ascending)
    return Object.entries(clientsByDay).map(([day, count]) => ({
      day: parseInt(day),
      count
    }));
  }

  async getRevenueByPeriod(authUserId: string, period: 'current_month' | 'last_month' | '3_months' | '6_months' | '12_months'): Promise<{ label: string; value: number }[]> {
    // Use Brasília timezone (GMT-3)
    const today = getBrasiliaDate();
    const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    
    if (period === 'current_month' || period === 'last_month') {
      // Day-by-day revenue for current or last month
      const targetMonth = period === 'current_month' ? today.getMonth() : today.getMonth() - 1;
      const targetYear = targetMonth < 0 ? today.getFullYear() - 1 : today.getFullYear();
      const month = targetMonth < 0 ? 11 : targetMonth;
      
      const daysInMonth = new Date(targetYear, month + 1, 0).getDate();
      const result: { label: string; value: number }[] = [];
      
      // Get all payments for the target month
      const monthStart = `${targetYear}-${String(month + 1).padStart(2, '0')}-01`;
      const monthEnd = `${targetYear}-${String(month + 1).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;
      
      const monthPayments = await db.select().from(paymentHistory)
        .where(
          and(
            eq(paymentHistory.authUserId, authUserId),
            gte(paymentHistory.paymentDate, monthStart),
            lte(paymentHistory.paymentDate, monthEnd)
          )
        );
      
      // Group payments by day
      const revenueByDay: { [key: number]: number } = {};
      for (let day = 1; day <= daysInMonth; day++) {
        revenueByDay[day] = 0;
      }
      
      monthPayments.forEach(payment => {
        const [year, month, day] = payment.paymentDate.split('-').map(Number);
        revenueByDay[day] = (revenueByDay[day] || 0) + Number(payment.amount || 0);
      });
      
      for (let day = 1; day <= daysInMonth; day++) {
        result.push({ label: String(day), value: revenueByDay[day] });
      }
      
      return result;
    } else {
      // Monthly revenue for 3, 6, or 12 months
      const months = period === '3_months' ? 3 : period === '6_months' ? 6 : 12;
      const result: { label: string; value: number }[] = [];
      
      for (let i = months - 1; i >= 0; i--) {
        const targetDate = new Date(today);
        targetDate.setMonth(today.getMonth() - i);
        const month = targetDate.getMonth();
        const year = targetDate.getFullYear();
        
        // Get month start and end dates
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const monthStart = `${year}-${String(month + 1).padStart(2, '0')}-01`;
        const monthEnd = `${year}-${String(month + 1).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;
        
        const monthPayments = await db.select().from(paymentHistory)
          .where(
            and(
              eq(paymentHistory.authUserId, authUserId),
              gte(paymentHistory.paymentDate, monthStart),
              lte(paymentHistory.paymentDate, monthEnd)
            )
          );
        
        const value = monthPayments.reduce((sum, payment) => 
          sum + Number(payment.amount || 0), 0
        );
        
        result.push({ label: monthNames[month], value });
      }
      
      return result;
    }
  }

  // Automation Configs
  async getAllAutomationConfigs(authUserId: string): Promise<AutomationConfig[]> {
    return await db.select().from(automationConfigs).where(eq(automationConfigs.authUserId, authUserId));
  }

  async getAutomationConfig(authUserId: string, automationType: string): Promise<AutomationConfig | undefined> {
    const result = await db.select().from(automationConfigs)
      .where(and(eq(automationConfigs.automationType, automationType), eq(automationConfigs.authUserId, authUserId)))
      .limit(1);
    return result[0];
  }

  async createAutomationConfig(authUserId: string, insertConfig: InsertAutomationConfig): Promise<AutomationConfig> {
    const result = await db.insert(automationConfigs).values({ ...insertConfig, authUserId }).returning();
    return result[0];
  }

  async updateAutomationConfig(authUserId: string, automationType: string, updateConfig: Partial<InsertAutomationConfig> & { lastRunAt?: Date | null }): Promise<AutomationConfig | undefined> {
    const result = await db.update(automationConfigs)
      .set(updateConfig)
      .where(and(eq(automationConfigs.automationType, automationType), eq(automationConfigs.authUserId, authUserId)))
      .returning();
    return result[0];
  }

  // Client counting for automations
  async getClientsExpiringInDays(authUserId: string, days: number): Promise<Client[]> {
    const allClients = await db.select().from(clients).where(eq(clients.authUserId, authUserId));
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + days);
    
    return allClients.filter(client => {
      const [year, month, day] = client.expiryDate.split('-').map(Number);
      const expiryDate = new Date(year, month - 1, day);
      return expiryDate.getTime() === targetDate.getTime();
    });
  }

  async getClientsExpiredForDays(authUserId: string, days: number): Promise<Client[]> {
    const allClients = await db.select().from(clients).where(eq(clients.authUserId, authUserId));
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() - days);
    
    return allClients.filter(client => {
      const [year, month, day] = client.expiryDate.split('-').map(Number);
      const expiryDate = new Date(year, month - 1, day);
      return expiryDate.getTime() === targetDate.getTime();
    });
  }

  async getClientsActiveForDays(authUserId: string, days: number): Promise<Client[]> {
    const allClients = await db.select().from(clients).where(eq(clients.authUserId, authUserId));
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() - days);
    
    return allClients.filter(client => {
      const [year, month, day] = client.activationDate.split('-').map(Number);
      const activationDate = new Date(year, month - 1, day);
      return activationDate.getTime() === targetDate.getTime();
    });
  }
  
  // Scheduler helpers
  async getAllUsersWithActiveAutomations(): Promise<string[]> {
    const configs = await db.select().from(automationConfigs).where(eq(automationConfigs.isActive, true));
    const authUserIdSet = new Set<string>();
    configs.forEach(c => authUserIdSet.add(c.authUserId));
    return Array.from(authUserIdSet);
  }
  
  async getAllActiveUsers(): Promise<User[]> {
    // Return all users that have an authUserId (are registered users)
    return await db.select().from(users).where(sql`${users.authUserId} IS NOT NULL`);
  }

  // Stripe subscription methods
  async updateUserStripeInfo(userId: number, stripeCustomerId: string, stripeSubscriptionId: string): Promise<User | undefined> {
    const result = await db.update(users)
      .set({ stripeCustomerId, stripeSubscriptionId })
      .where(eq(users.id, userId))
      .returning();
    return result[0];
  }

  async updateUserSubscriptionStatus(userId: number, status: string, expiresAt?: Date | null): Promise<User | undefined> {
    const result = await db.update(users)
      .set({ 
        subscriptionStatus: status as "active" | "inactive" | "trialing" | "past_due" | "canceled",
        subscriptionExpiresAt: expiresAt
      })
      .where(eq(users.id, userId))
      .returning();
    return result[0];
  }
}

export const storage = new DbStorage();
