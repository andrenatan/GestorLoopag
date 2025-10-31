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
  getAllEmployees(): Promise<Employee[]>;
  getEmployee(id: number): Promise<Employee | undefined>;
  createEmployee(employee: InsertEmployee): Promise<Employee>;
  updateEmployee(id: number, employee: Partial<InsertEmployee>): Promise<Employee | undefined>;
  deleteEmployee(id: number): Promise<boolean>;

  // Systems
  getAllSystems(): Promise<System[]>;
  getSystem(id: number): Promise<System | undefined>;
  createSystem(system: InsertSystem): Promise<System>;
  updateSystem(id: number, system: Partial<InsertSystem>): Promise<System | undefined>;
  deleteSystem(id: number): Promise<boolean>;

  // Clients
  getAllClients(): Promise<Client[]>;
  getClient(id: number): Promise<Client | undefined>;
  createClient(client: InsertClient): Promise<Client>;
  updateClient(id: number, client: Partial<InsertClient>): Promise<Client | undefined>;
  deleteClient(id: number): Promise<boolean>;
  getExpiringClients(days: number): Promise<Client[]>;
  getOverdueClients(): Promise<Client[]>;
  getReferralRankings(days?: number): Promise<{ client: Client; referralCount: number }[]>;

  // WhatsApp Instances
  getAllWhatsappInstances(): Promise<WhatsappInstance[]>;
  getWhatsappInstance(id: number): Promise<WhatsappInstance | undefined>;
  createWhatsappInstance(instance: InsertWhatsappInstance): Promise<WhatsappInstance>;
  updateWhatsappInstance(id: number, instance: Partial<InsertWhatsappInstance>): Promise<WhatsappInstance | undefined>;
  deleteWhatsappInstance(id: number): Promise<boolean>;

  // Message Templates
  getAllMessageTemplates(): Promise<MessageTemplate[]>;
  getMessageTemplate(id: number): Promise<MessageTemplate | undefined>;
  createMessageTemplate(template: InsertMessageTemplate): Promise<MessageTemplate>;
  updateMessageTemplate(id: number, template: Partial<InsertMessageTemplate>): Promise<MessageTemplate | undefined>;
  deleteMessageTemplate(id: number): Promise<boolean>;

  // Billing History
  getAllBillingHistory(): Promise<BillingHistory[]>;
  getBillingHistory(clientId: number): Promise<BillingHistory[]>;
  createBillingHistory(billing: InsertBillingHistory): Promise<BillingHistory>;
  updateBillingHistory(id: number, billing: Partial<InsertBillingHistory>): Promise<BillingHistory | undefined>;

  // Payment History
  getAllPaymentHistory(): Promise<PaymentHistory[]>;
  getPaymentHistoryByClient(clientId: number): Promise<PaymentHistory[]>;
  createPaymentHistory(payment: InsertPaymentHistory): Promise<PaymentHistory>;
  getPaymentHistoryByDateRange(startDate: string, endDate: string): Promise<PaymentHistory[]>;

  // Dashboard Stats
  getDashboardStats(): Promise<{
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
  getNewClientsByDay(): Promise<{ day: number; count: number }[]>;
  getRevenueByPeriod(period: 'current_month' | 'last_month' | '3_months' | '6_months' | '12_months'): Promise<{ label: string; value: number }[]>;

  // Automation Configs
  getAllAutomationConfigs(): Promise<AutomationConfig[]>;
  getAutomationConfig(automationType: string): Promise<AutomationConfig | undefined>;
  createAutomationConfig(config: InsertAutomationConfig): Promise<AutomationConfig>;
  updateAutomationConfig(automationType: string, config: Partial<InsertAutomationConfig> & { lastRunAt?: Date | null }): Promise<AutomationConfig | undefined>;

  // Client counting for automations
  getClientsExpiringInDays(days: number): Promise<Client[]>;
  getClientsExpiredForDays(days: number): Promise<Client[]>;
  getClientsActiveForDays(days: number): Promise<Client[]>;
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
  async getAllSystems(): Promise<System[]> {
    return await db.select().from(systems);
  }

  async getSystem(id: number): Promise<System | undefined> {
    const result = await db.select().from(systems).where(eq(systems.id, id)).limit(1);
    return result[0];
  }

  async createSystem(insertSystem: InsertSystem): Promise<System> {
    const result = await db.insert(systems).values(insertSystem).returning();
    return result[0];
  }

  async updateSystem(id: number, updateData: Partial<InsertSystem>): Promise<System | undefined> {
    const result = await db.update(systems).set(updateData).where(eq(systems.id, id)).returning();
    return result[0];
  }

  async deleteSystem(id: number): Promise<boolean> {
    const result = await db.delete(systems).where(eq(systems.id, id)).returning();
    return result.length > 0;
  }

  // Employees
  async getAllEmployees(): Promise<Employee[]> {
    return await db.select().from(employees);
  }

  async getEmployee(id: number): Promise<Employee | undefined> {
    const result = await db.select().from(employees).where(eq(employees.id, id)).limit(1);
    return result[0];
  }

  async createEmployee(insertEmployee: InsertEmployee): Promise<Employee> {
    const result = await db.insert(employees).values(insertEmployee).returning();
    return result[0];
  }

  async updateEmployee(id: number, updateData: Partial<InsertEmployee>): Promise<Employee | undefined> {
    const result = await db.update(employees).set(updateData).where(eq(employees.id, id)).returning();
    return result[0];
  }

  async deleteEmployee(id: number): Promise<boolean> {
    const result = await db.delete(employees).where(eq(employees.id, id)).returning();
    return result.length > 0;
  }

  // Clients
  async getAllClients(): Promise<Client[]> {
    return await db.select().from(clients).orderBy(desc(clients.id));
  }

  async getClient(id: number): Promise<Client | undefined> {
    const result = await db.select().from(clients).where(eq(clients.id, id)).limit(1);
    return result[0];
  }

  async createClient(insertClient: InsertClient): Promise<Client> {
    const result = await db.insert(clients).values(insertClient).returning();
    return result[0];
  }

  async updateClient(id: number, updateData: Partial<InsertClient>): Promise<Client | undefined> {
    const result = await db.update(clients).set(updateData).where(eq(clients.id, id)).returning();
    return result[0];
  }

  async deleteClient(id: number): Promise<boolean> {
    const result = await db.delete(clients).where(eq(clients.id, id)).returning();
    return result.length > 0;
  }

  async getExpiringClients(days: number): Promise<Client[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + days);
    
    const allClients = await db.select().from(clients);
    return allClients.filter(client => {
      const [year, month, day] = client.expiryDate.split('-').map(Number);
      const expiryDate = new Date(year, month - 1, day);
      expiryDate.setHours(0, 0, 0, 0);
      return expiryDate >= targetDate && expiryDate < new Date(targetDate.getTime() + 86400000);
    });
  }

  async getOverdueClients(): Promise<Client[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const allClients = await db.select().from(clients);
    return allClients.filter(client => {
      const [year, month, day] = client.expiryDate.split('-').map(Number);
      const expiryDate = new Date(year, month - 1, day);
      expiryDate.setHours(0, 0, 0, 0);
      return expiryDate < today;
    });
  }

  async getReferralRankings(days?: number): Promise<{ client: Client; referralCount: number }[]> {
    const allClients = await db.select().from(clients);
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
  async getAllWhatsappInstances(): Promise<WhatsappInstance[]> {
    return await db.select().from(whatsappInstances);
  }

  async getWhatsappInstance(id: number): Promise<WhatsappInstance | undefined> {
    const result = await db.select().from(whatsappInstances).where(eq(whatsappInstances.id, id)).limit(1);
    return result[0];
  }

  async createWhatsappInstance(insertInstance: InsertWhatsappInstance): Promise<WhatsappInstance> {
    const result = await db.insert(whatsappInstances).values(insertInstance).returning();
    return result[0];
  }

  async updateWhatsappInstance(id: number, updateData: Partial<InsertWhatsappInstance>): Promise<WhatsappInstance | undefined> {
    const result = await db.update(whatsappInstances).set(updateData).where(eq(whatsappInstances.id, id)).returning();
    return result[0];
  }

  async deleteWhatsappInstance(id: number): Promise<boolean> {
    // First, update all automation configs that reference this instance to null
    await db
      .update(automationConfigs)
      .set({ whatsappInstanceId: null })
      .where(eq(automationConfigs.whatsappInstanceId, id));
    
    // Then delete the instance
    const result = await db.delete(whatsappInstances).where(eq(whatsappInstances.id, id)).returning();
    return result.length > 0;
  }

  // Message Templates
  async getAllMessageTemplates(): Promise<MessageTemplate[]> {
    return await db.select().from(messageTemplates);
  }

  async getMessageTemplate(id: number): Promise<MessageTemplate | undefined> {
    const result = await db.select().from(messageTemplates).where(eq(messageTemplates.id, id)).limit(1);
    return result[0];
  }

  async createMessageTemplate(insertTemplate: InsertMessageTemplate): Promise<MessageTemplate> {
    const result = await db.insert(messageTemplates).values(insertTemplate).returning();
    return result[0];
  }

  async updateMessageTemplate(id: number, updateData: Partial<InsertMessageTemplate>): Promise<MessageTemplate | undefined> {
    const result = await db.update(messageTemplates).set(updateData).where(eq(messageTemplates.id, id)).returning();
    return result[0];
  }

  async deleteMessageTemplate(id: number): Promise<boolean> {
    const result = await db.delete(messageTemplates).where(eq(messageTemplates.id, id)).returning();
    return result.length > 0;
  }

  // Billing History
  async getAllBillingHistory(): Promise<BillingHistory[]> {
    return await db.select().from(billingHistory).orderBy(desc(billingHistory.createdAt));
  }

  async getBillingHistory(clientId: number): Promise<BillingHistory[]> {
    return await db.select().from(billingHistory)
      .where(eq(billingHistory.clientId, clientId))
      .orderBy(desc(billingHistory.createdAt));
  }

  async createBillingHistory(insertBilling: InsertBillingHistory): Promise<BillingHistory> {
    const result = await db.insert(billingHistory).values(insertBilling).returning();
    return result[0];
  }

  async updateBillingHistory(id: number, updateData: Partial<InsertBillingHistory>): Promise<BillingHistory | undefined> {
    const result = await db.update(billingHistory).set(updateData).where(eq(billingHistory.id, id)).returning();
    return result[0];
  }

  // Payment History
  async getAllPaymentHistory(): Promise<PaymentHistory[]> {
    return await db.select().from(paymentHistory).orderBy(desc(paymentHistory.createdAt));
  }

  async getPaymentHistoryByClient(clientId: number): Promise<PaymentHistory[]> {
    return await db.select().from(paymentHistory)
      .where(eq(paymentHistory.clientId, clientId))
      .orderBy(desc(paymentHistory.createdAt));
  }

  async createPaymentHistory(insertPayment: InsertPaymentHistory): Promise<PaymentHistory> {
    const result = await db.insert(paymentHistory).values(insertPayment).returning();
    return result[0];
  }

  async getPaymentHistoryByDateRange(startDate: string, endDate: string): Promise<PaymentHistory[]> {
    return await db.select().from(paymentHistory)
      .where(
        and(
          gte(paymentHistory.paymentDate, startDate),
          lte(paymentHistory.paymentDate, endDate)
        )
      )
      .orderBy(paymentHistory.paymentDate);
  }

  // Dashboard Stats
  async getDashboardStats(): Promise<{
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
    const allClients = await db.select().from(clients);
    const allBilling = await db.select().from(billingHistory);
    
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
      c.createdAt.toISOString().split('T')[0] === todayStr
    ).length;
    
    // Calculate monthly revenue from payment_history (current month)
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth() + 1;
    const monthStart = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`;
    const monthEnd = new Date(currentYear, currentMonth, 0).toISOString().split('T')[0];
    
    const monthlyPayments = await db.select().from(paymentHistory)
      .where(
        and(
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

  async getNewClientsByDay(): Promise<{ day: number; count: number }[]> {
    const allClients = await db.select().from(clients);
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

  async getRevenueByPeriod(period: 'current_month' | 'last_month' | '3_months' | '6_months' | '12_months'): Promise<{ label: string; value: number }[]> {
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
  async getAllAutomationConfigs(): Promise<AutomationConfig[]> {
    return await db.select().from(automationConfigs);
  }

  async getAutomationConfig(automationType: string): Promise<AutomationConfig | undefined> {
    const result = await db.select().from(automationConfigs)
      .where(eq(automationConfigs.automationType, automationType))
      .limit(1);
    return result[0];
  }

  async createAutomationConfig(insertConfig: InsertAutomationConfig): Promise<AutomationConfig> {
    const result = await db.insert(automationConfigs).values(insertConfig).returning();
    return result[0];
  }

  async updateAutomationConfig(automationType: string, updateConfig: Partial<InsertAutomationConfig> & { lastRunAt?: Date | null }): Promise<AutomationConfig | undefined> {
    const result = await db.update(automationConfigs)
      .set(updateConfig)
      .where(eq(automationConfigs.automationType, automationType))
      .returning();
    return result[0];
  }

  // Client counting for automations
  async getClientsExpiringInDays(days: number): Promise<Client[]> {
    const allClients = await db.select().from(clients);
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

  async getClientsExpiredForDays(days: number): Promise<Client[]> {
    const allClients = await db.select().from(clients);
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

  async getClientsActiveForDays(days: number): Promise<Client[]> {
    const allClients = await db.select().from(clients);
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
}

export const storage = new DbStorage();
