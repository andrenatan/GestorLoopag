import {
  plans, users, employees, systems, clients, paymentHistory, clientPlans,
  apps, clientApps,
  systemCreditRules, manualRenewalPlans, manualRenewalInstallments, creditConsumptionHistory,
  manualFinancialEntries,
  crmContacts, crmMessages, crmAutomations, crmAutomationRuns, crmTemplates,
  whatsappConnections,
  type Plan, type InsertPlan,
  type User, type InsertUser,
  type Employee, type InsertEmployee,
  type System, type InsertSystem,
  type Client, type InsertClient,
  type PaymentHistory, type InsertPaymentHistory,
  type ClientPlan, type InsertClientPlan,
  type App, type InsertApp,
  type ClientApp,
  type SystemCreditRule, type InsertSystemCreditRule,
  type ManualRenewalPlan,
  type ManualRenewalInstallment,
  type ManualFinancialEntry, type InsertManualFinancialEntry,
  type WhatsappConnection, type InsertWhatsappConnection,
  type CrmContact, type CrmMessage, type InsertCrmMessage,
  type CrmAutomation, type InsertCrmAutomation,
  type CrmAutomationRun, type InsertCrmAutomationRun,
  type CrmTemplate,
} from "@shared/schema";
import { getBrasiliaDate, getBrasiliaDateString, getBrasiliaStartOfDay, parseDateString } from "./utils/timezone";
import { normalizePhoneDigits } from "./utils/whatsapp";
import { getStateFromPhone } from "@shared/ddd-map";
import { db } from "../db";
import { eq, and, gte, lte, sql, desc, inArray } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

export interface ManualRenewalPlanView extends Omit<ManualRenewalPlan, "status"> {
  planStatus: ManualRenewalPlan["status"];
  clientNumber: number;
  clientName: string;
  clientUsername: string;
  systemName: string;
  installments: ManualRenewalInstallment[];
  status: "ULTIMO OK" | "FALTA" | "ULTIMO";
}

export interface FinancialMovement {
  id: number;
  source: "payment" | "credit" | "manual";
  type: "entrada" | "saida";
  productLabel: string;
  clientName: string | null;
  value: number;
  date: string;
  description: string | null;
}

function addMonthsToDateString(dateStr: string, months: number, dayOverride?: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const day = dayOverride ?? d;
  const targetMonthIndex = (m - 1) + months;
  const targetYear = y + Math.floor(targetMonthIndex / 12);
  const targetMonth = ((targetMonthIndex % 12) + 12) % 12; // 0-based, safe for negative input
  const daysInTargetMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
  const clampedDay = Math.min(day, daysInTargetMonth);
  const mm = String(targetMonth + 1).padStart(2, "0");
  const dd = String(clampedDay).padStart(2, "0");
  return `${targetYear}-${mm}-${dd}`;
}

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
  getEmployeeByAccessAuthUserId(accessAuthUserId: string): Promise<Employee | undefined>;
  createEmployee(authUserId: string, employee: InsertEmployee): Promise<Employee>;
  updateEmployee(authUserId: string, id: number, employee: Partial<InsertEmployee>): Promise<Employee | undefined>;
  deleteEmployee(authUserId: string, id: number): Promise<boolean>;

  // Systems
  getAllSystems(authUserId: string): Promise<(System & { clientCount: number })[]>;
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

  // Payment History
  getAllPaymentHistory(authUserId: string): Promise<PaymentHistory[]>;
  getPaymentHistoryByClient(authUserId: string, clientId: number): Promise<PaymentHistory[]>;
  createPaymentHistory(authUserId: string, payment: InsertPaymentHistory): Promise<PaymentHistory>;
  getPaymentHistoryByDateRange(authUserId: string, startDate: string, endDate: string): Promise<PaymentHistory[]>;
  createAddonPayment(
    authUserId: string,
    clientId: number,
    amount: string,
    paymentDate: string,
    description: string | null,
    bumpClientValue: boolean,
  ): Promise<{ payment: PaymentHistory; client: Client | undefined }>;

  // Dashboard Stats
  getDashboardStats(authUserId: string): Promise<{
    activeClients: number;
    inactiveClients: number;
    totalClients: number;
    expiringTomorrow: number;
    expiredYesterday: number;
    expiringToday: number;
    expiring3Days: number;
    overdue: number;
    billingSentToday: number;
    newClientsToday: number;
    newClientsThisWeek: number;
    newClientsThisMonth: number;
    clientsNotRenewedThisMonth: number;
    clientsRecoveredThisMonth: number;
    totalRecoveredThisMonth: number;
    totalRevenue: number;
    projectedMonthlyRevenue: number;
    revenueToday: number;
    revenueTomorrow: number;
  }>;
  getNewClientsByDay(authUserId: string, startDate: string, endDate: string): Promise<{ day: number; date: string; count: number }[]>;
  getChurnByDay(authUserId: string, startDate: string, endDate: string): Promise<{ day: number; date: string; count: number }[]>;
  getRevenueByPeriod(authUserId: string, period: 'current_month' | 'last_month' | '3_months' | '6_months' | '12_months'): Promise<{ label: string; value: number }[]>;
  getPaymentsByDay(authUserId: string, startDate: string, endDate: string): Promise<{
    total: number;
    count: number;
    average: number;
    bestDayAmount: number;
    dailyData: { day: number; date: string; total: number; count: number }[];
  }>;
  
  // Dashboard Charts - New
  getRevenueBySystem(authUserId: string, month: string): Promise<{ system: string; value: number }[]>;
  getActiveClientsBySystem(authUserId: string, month: string): Promise<{ system: string; count: number }[]>;
  getActiveClientsByState(authUserId: string, month: string): Promise<{ state: string; count: number }[]>;

  // Scheduler helpers
  getAllActiveUsers(): Promise<User[]>;

  // Stripe subscription methods
  updateUserStripeInfo(userId: number, stripeCustomerId: string, stripeSubscriptionId: string): Promise<User | undefined>;
  updateUserSubscriptionStatus(userId: number, status: string, expiresAt?: Date | null): Promise<User | undefined>;

  // Client Plans (tenant-scoped IPTV subscription plans)
  getAllClientPlans(authUserId: string): Promise<(ClientPlan & { clientCount: number })[]>;
  getClientPlan(authUserId: string, id: number): Promise<ClientPlan | undefined>;
  createClientPlan(authUserId: string, plan: InsertClientPlan): Promise<ClientPlan>;
  updateClientPlan(authUserId: string, id: number, plan: Partial<InsertClientPlan>): Promise<ClientPlan | undefined>;
  deleteClientPlan(authUserId: string, id: number): Promise<boolean>;

  // Apps (IPTV client apps catalog)
  getAllApps(authUserId: string): Promise<(App & { clientCount: number })[]>;
  getApp(authUserId: string, id: number): Promise<App | undefined>;
  createApp(authUserId: string, data: InsertApp): Promise<App>;
  updateApp(authUserId: string, id: number, data: Partial<InsertApp>): Promise<App | undefined>;
  deleteApp(authUserId: string, id: number): Promise<boolean>;
  toggleAppStatus(authUserId: string, id: number): Promise<App | undefined>;

  // Client Apps (links clients to apps)
  getClientApps(authUserId: string, clientId: number): Promise<(ClientApp & { appName: string })[]>;
  setClientApps(
    authUserId: string,
    clientId: number,
    primary: { appId: number; expiryDate?: string | null } | null,
    additional: { appId: number; expiryDate?: string | null }[]
  ): Promise<void>;

  // System Credit Rules (credits consumed per system + client plan)
  getSystemCreditRules(authUserId: string, systemId: number): Promise<(SystemCreditRule & { clientPlanName: string })[]>;
  createSystemCreditRule(authUserId: string, data: InsertSystemCreditRule): Promise<SystemCreditRule>;
  updateSystemCreditRule(authUserId: string, id: number, data: Partial<InsertSystemCreditRule>): Promise<SystemCreditRule | undefined>;
  deleteSystemCreditRule(authUserId: string, id: number): Promise<boolean>;

  // Manual Renewal Plans (month-by-month tracked Trimestral/Semestral/Anual plans)
  getActiveManualRenewalPlanForClient(authUserId: string, clientId: number): Promise<ManualRenewalPlan | undefined>;
  createManualRenewalPlanForClient(authUserId: string, client: Client, renewDay: number): Promise<ManualRenewalPlan | undefined>;
  closeManualRenewalPlan(authUserId: string, id: number): Promise<void>;
  getManualRenewalPlans(authUserId: string, period: "trimestral" | "semestral" | "anual"): Promise<ManualRenewalPlanView[]>;
  toggleManualRenewalInstallment(
    authUserId: string,
    planId: number,
    monthNumber: number
  ): Promise<{ installment: ManualRenewalInstallment; creditsLogged: number | null } | undefined>;

  // Financial (Financeiro > Visão Geral)
  getFinancialSummary(authUserId: string, startDate: string, endDate: string): Promise<{
    entradas: number;
    saidas: number;
    lucros: number;
    dailyEntradas: { date: string; value: number }[];
    dailySaidas: { date: string; value: number }[];
    dailyLucros: { date: string; value: number }[];
  }>;
  getFinancialProjections(authUserId: string): Promise<{
    avgDailyProfit: number;
    weekly: number;
    monthly: number;
    annual: number;
  }>;
  getFinancialMovements(authUserId: string, filters: {
    startDate?: string;
    endDate?: string;
    type?: "entrada" | "saida";
    productId?: number;
    search?: string;
    page: number;
    limit: number;
  }): Promise<{ movements: FinancialMovement[]; total: number }>;
  bulkDeleteFinancialMovements(authUserId: string, items: { id: number; source: "payment" | "credit" | "manual" }[]): Promise<number>;
  createManualFinancialEntry(authUserId: string, data: InsertManualFinancialEntry): Promise<ManualFinancialEntry>;
  updateManualFinancialEntry(authUserId: string, id: number, data: Partial<InsertManualFinancialEntry>): Promise<ManualFinancialEntry | undefined>;
  deleteManualFinancialEntry(authUserId: string, id: number): Promise<boolean>;
  deleteFinancialMovement(authUserId: string, id: number, source: "payment" | "credit" | "manual"): Promise<boolean>;

  // WhatsApp Connections (CRM)
  getWhatsappConnection(authUserId: string): Promise<WhatsappConnection | undefined>;
  upsertWhatsappConnection(authUserId: string, data: InsertWhatsappConnection): Promise<WhatsappConnection>;
  deleteWhatsappConnection(authUserId: string): Promise<boolean>;

  // CRM Contacts & Messages
  getCrmConversations(authUserId: string): Promise<(CrmContact & { lastMessage: string | null; lastMessageDirection: "inbound" | "outbound" | null })[]>;
  getCrmContactByPhone(authUserId: string, phone: string): Promise<CrmContact | undefined>;
  getCrmMessagesByContact(authUserId: string, contactId: number): Promise<CrmMessage[]>;
  createCrmMessage(authUserId: string, data: InsertCrmMessage): Promise<CrmMessage>;
  touchCrmContactLastMessage(authUserId: string, contactId: number, at: Date): Promise<void>;
  updateCrmMessageStatusByWaId(authUserId: string, waMessageId: string, status: string): Promise<void>;
  getWhatsappConnectionByPhoneNumberId(phoneNumberId: string): Promise<WhatsappConnection | undefined>;
  getWhatsappConnectionByVerifyToken(verifyToken: string): Promise<WhatsappConnection | undefined>;

  // CRM Automations
  getAllCrmAutomations(authUserId: string): Promise<CrmAutomation[]>;
  getCrmAutomation(authUserId: string, id: number): Promise<CrmAutomation | undefined>;
  createCrmAutomation(authUserId: string, data: InsertCrmAutomation): Promise<CrmAutomation>;
  updateCrmAutomation(authUserId: string, id: number, data: Partial<InsertCrmAutomation>): Promise<CrmAutomation | undefined>;
  deleteCrmAutomation(authUserId: string, id: number): Promise<boolean>;
  getActiveCrmAutomations(authUserId: string): Promise<CrmAutomation[]>;
  getCrmContactByClientId(authUserId: string, clientId: number): Promise<CrmContact | undefined>;
  createCrmAutomationRun(authUserId: string, data: InsertCrmAutomationRun): Promise<CrmAutomationRun>;
  hasCrmAutomationRunToday(authUserId: string, automationId: number, contactId: number): Promise<boolean>;
  getCrmAutomationRuns(authUserId: string, automationId: number, filters: { startDate?: string; endDate?: string; status?: string }): Promise<(CrmAutomationRun & { contactName: string | null; contactPhone: string | null })[]>;

  // CRM Templates
  getAllCrmTemplates(authUserId: string): Promise<CrmTemplate[]>;
  getCrmTemplate(authUserId: string, id: number): Promise<CrmTemplate | undefined>;
  getCrmTemplateByName(authUserId: string, name: string): Promise<CrmTemplate | undefined>;
  createCrmTemplate(authUserId: string, data: Omit<CrmTemplate, "id" | "authUserId" | "createdAt" | "updatedAt">): Promise<CrmTemplate>;
  updateCrmTemplate(authUserId: string, id: number, data: Partial<Omit<CrmTemplate, "id" | "authUserId" | "createdAt">>): Promise<CrmTemplate | undefined>;
  deleteCrmTemplate(authUserId: string, id: number): Promise<boolean>;
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
  async getAllSystems(authUserId: string): Promise<(System & { clientCount: number })[]> {
    const allSystems = await db.select().from(systems).where(eq(systems.authUserId, authUserId));

    const activeClients = await db.select({ system: clients.system })
      .from(clients)
      .where(and(eq(clients.authUserId, authUserId), eq(clients.subscriptionStatus, "Ativa")));

    const countBySystem = new Map<string, number>();
    for (const c of activeClients) {
      if (c.system) {
        countBySystem.set(c.system, (countBySystem.get(c.system) ?? 0) + 1);
      }
    }

    return allSystems.map((s) => ({ ...s, clientCount: countBySystem.get(s.name) ?? 0 }));
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
    return await db.transaction(async (tx) => {
      const planInUse = await tx.select({ id: manualRenewalPlans.id }).from(manualRenewalPlans)
        .where(and(eq(manualRenewalPlans.systemId, id), eq(manualRenewalPlans.authUserId, authUserId)))
        .limit(1);
      if (planInUse.length > 0) {
        throw new Error("SYSTEM_IN_USE_BY_MANUAL_RENEWAL_PLANS");
      }

      await tx.delete(systemCreditRules)
        .where(and(eq(systemCreditRules.systemId, id), eq(systemCreditRules.authUserId, authUserId)));

      const result = await tx.delete(systems)
        .where(and(eq(systems.id, id), eq(systems.authUserId, authUserId)))
        .returning();
      return result.length > 0;
    });
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

  async getEmployeeByAccessAuthUserId(accessAuthUserId: string): Promise<Employee | undefined> {
    const result = await db.select().from(employees)
      .where(eq(employees.accessAuthUserId, accessAuthUserId))
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

  private buildCrmDisplayName(client: Client): string {
    return `#${client.clientNumber} - ${client.name} (${client.system}) - ${client.username}`;
  }

  private async syncCrmContact(authUserId: string, client: Client): Promise<void> {
    const displayName = this.buildCrmDisplayName(client);
    await db.insert(crmContacts)
      .values({
        authUserId,
        clientId: client.id,
        phone: client.phone,
        displayName,
      })
      .onConflictDoUpdate({
        target: [crmContacts.authUserId, crmContacts.clientId],
        set: {
          phone: client.phone,
          displayName,
          updatedAt: new Date(),
        },
      });
  }

  async createClient(authUserId: string, insertClient: InsertClient): Promise<Client> {
    const clientNumber = await this.getNextClientNumber(authUserId);
    const result = await db.insert(clients).values({ ...insertClient, authUserId, clientNumber }).returning();
    const client = result[0];
    await this.syncCrmContact(authUserId, client);
    return client;
  }

  async updateClient(authUserId: string, id: number, updateData: Partial<InsertClient>): Promise<Client | undefined> {
    const result = await db.update(clients)
      .set(updateData)
      .where(and(eq(clients.id, id), eq(clients.authUserId, authUserId)))
      .returning();
    const client = result[0];
    if (client) {
      await this.syncCrmContact(authUserId, client);
    }
    return client;
  }

  async deleteClient(authUserId: string, id: number): Promise<boolean> {
    return await db.transaction(async (tx) => {
      const contact = await tx.select({ id: crmContacts.id }).from(crmContacts)
        .where(and(eq(crmContacts.clientId, id), eq(crmContacts.authUserId, authUserId)))
        .limit(1);

      if (contact[0]) {
        await tx.delete(crmAutomationRuns).where(eq(crmAutomationRuns.contactId, contact[0].id));
        await tx.delete(crmMessages).where(eq(crmMessages.contactId, contact[0].id));
        await tx.delete(crmContacts).where(eq(crmContacts.id, contact[0].id));
      }

      await tx.delete(clientApps)
        .where(and(eq(clientApps.clientId, id), eq(clientApps.authUserId, authUserId)));

      const renewalPlans = await tx.select({ id: manualRenewalPlans.id }).from(manualRenewalPlans)
        .where(and(eq(manualRenewalPlans.clientId, id), eq(manualRenewalPlans.authUserId, authUserId)));
      if (renewalPlans.length > 0) {
        const planIds = renewalPlans.map((p) => p.id);
        const installments = await tx.select({ id: manualRenewalInstallments.id }).from(manualRenewalInstallments)
          .where(inArray(manualRenewalInstallments.manualRenewalPlanId, planIds));
        if (installments.length > 0) {
          const installmentIds = installments.map((i) => i.id);
          await tx.delete(creditConsumptionHistory)
            .where(inArray(creditConsumptionHistory.manualRenewalInstallmentId, installmentIds));
          await tx.delete(manualRenewalInstallments)
            .where(inArray(manualRenewalInstallments.id, installmentIds));
        }
        await tx.delete(manualRenewalPlans).where(inArray(manualRenewalPlans.id, planIds));
      }

      const result = await tx.delete(clients)
        .where(and(eq(clients.id, id), eq(clients.authUserId, authUserId)))
        .returning();
      return result.length > 0;
    });
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

  // Logs panel-credit consumption for a new_client/renewal payment on a
  // renewalMode='automatic' client (the manual-renewal flow logs its own
  // consumption separately via toggleManualRenewalInstallment). Looks up
  // system_credit_rules for the client's system+plan; falls back to 1 credit
  // when no rule is registered. Never throws — a payment must never be
  // blocked by credit bookkeeping, and clients whose free-text system/plan
  // can't be resolved to a real systems/client_plans row are silently
  // skipped (pre-existing data-quality gap, not something to block on here).
  private async logAutomaticCreditConsumption(authUserId: string, payment: PaymentHistory): Promise<void> {
    try {
      const client = await this.getClient(authUserId, payment.clientId);
      if (!client || client.renewalMode !== "automatic") return;

      const [clientPlan, system] = await Promise.all([
        this.getClientPlanByName(authUserId, client.plan),
        this.getSystemByName(authUserId, client.system),
      ]);
      if (!clientPlan || !system) return;

      const ruleRows = await db.select().from(systemCreditRules)
        .where(and(
          eq(systemCreditRules.authUserId, authUserId),
          eq(systemCreditRules.systemId, system.id),
          eq(systemCreditRules.clientPlanId, clientPlan.id),
        ))
        .limit(1);
      const credits = ruleRows[0]?.creditsConsumed ?? 1;

      await db.insert(creditConsumptionHistory).values({
        authUserId,
        systemId: system.id,
        clientPlanId: clientPlan.id,
        manualRenewalInstallmentId: null,
        sourcePaymentHistoryId: payment.id,
        credits,
      }).onConflictDoNothing();
    } catch (error) {
      console.error(`[Credit Consumption] Failed to log automatic consumption for payment ${payment.id}:`, error);
    }
  }

  async createPaymentHistory(authUserId: string, insertPayment: InsertPaymentHistory): Promise<PaymentHistory> {
    const result = await db.insert(paymentHistory).values({ ...insertPayment, authUserId }).returning();
    const payment = result[0];
    if (payment.type === "new_client" || payment.type === "renewal") {
      await this.logAutomaticCreditConsumption(authUserId, payment);
    }
    return payment;
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

  async createAddonPayment(
    authUserId: string,
    clientId: number,
    amount: string,
    paymentDate: string,
    description: string | null,
    bumpClientValue: boolean,
  ): Promise<{ payment: PaymentHistory; client: Client | undefined }> {
    return await db.transaction(async (tx) => {
      const inserted = await tx.insert(paymentHistory)
        .values({
          authUserId,
          clientId,
          amount,
          paymentDate,
          type: 'addon',
          previousExpiryDate: null,
          newExpiryDate: null,
          description,
        })
        .returning();

      let updatedClient: Client | undefined;
      if (bumpClientValue) {
        const current = await tx.select().from(clients)
          .where(and(eq(clients.id, clientId), eq(clients.authUserId, authUserId)))
          .limit(1);
        if (current[0]) {
          const newValue = (Number(current[0].value || 0) + Number(amount)).toFixed(2);
          const updated = await tx.update(clients)
            .set({ value: newValue, updatedAt: new Date() })
            .where(and(eq(clients.id, clientId), eq(clients.authUserId, authUserId)))
            .returning();
          updatedClient = updated[0];
        }
      } else {
        const current = await tx.select().from(clients)
          .where(and(eq(clients.id, clientId), eq(clients.authUserId, authUserId)))
          .limit(1);
        updatedClient = current[0];
      }

      return { payment: inserted[0], client: updatedClient };
    });
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
    // THIS IS AN INSERT, NOT AN UPDATE - each renewal creates a new record
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

    const payment = result[0];
    await this.logAutomaticCreditConsumption(authUserId, payment);
    return payment;
  }

  // Dashboard Stats
  async getDashboardStats(authUserId: string): Promise<{
    activeClients: number;
    inactiveClients: number;
    totalClients: number;
    expiringTomorrow: number;
    expiredYesterday: number;
    expiringToday: number;
    expiring3Days: number;
    overdue: number;
    billingSentToday: number;
    newClientsToday: number;
    newClientsThisWeek: number;
    newClientsThisMonth: number;
    clientsNotRenewedThisMonth: number;
    clientsRecoveredThisMonth: number;
    totalRecoveredThisMonth: number;
    totalRevenue: number;
    projectedMonthlyRevenue: number;
    revenueToday: number;
    revenueTomorrow: number;
  }> {
    const allClients = await db.select().from(clients).where(eq(clients.authUserId, authUserId));
    
    // Use Brasília timezone (GMT-3) for all date calculations
    const today = getBrasiliaStartOfDay();
    
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    
    const threeDaysFromNow = new Date(today);
    threeDaysFromNow.setDate(today.getDate() + 3);

    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 7);
    
    const todayStr = getBrasiliaDateString();
    const tomorrowStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;
    
    // Current month range
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth() + 1;
    const monthStart = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`;
    const monthEnd = new Date(currentYear, currentMonth, 0).toISOString().split('T')[0];

    // Week start string
    const weekStartStr = `${sevenDaysAgo.getFullYear()}-${String(sevenDaysAgo.getMonth() + 1).padStart(2, '0')}-${String(sevenDaysAgo.getDate()).padStart(2, '0')}`;
    
    let activeClients = 0;
    let inactiveClients = 0;
    let expiringToday = 0;
    let expiringTomorrow = 0;
    let expiring3Days = 0;
    let overdue = 0;
    let expiredYesterday = 0;
    let projectedMonthlyRevenue = 0;
    let clientsNotRenewedThisMonth = 0;
    
    allClients.forEach(client => {
      const expiryDate = parseDateString(client.expiryDate);
      expiryDate.setHours(0, 0, 0, 0);
      const isActive = client.subscriptionStatus === 'Ativa';
      
      if (isActive) {
        activeClients++;
        // Projeção Mensal = only active clients expiring THIS month (pending renewals)
        if (client.expiryDate >= monthStart && client.expiryDate <= monthEnd) {
          projectedMonthlyRevenue += Number(client.value || 0);
        }
        
        if (expiryDate.getTime() === today.getTime()) expiringToday++;
        if (expiryDate.getTime() === tomorrow.getTime()) expiringTomorrow++;
        if (expiryDate.getTime() === threeDaysFromNow.getTime()) expiring3Days++;
      } else {
        inactiveClients++;
        overdue++;
        
        if (expiryDate.getTime() === yesterday.getTime()) expiredYesterday++;

        // Clients with expiryDate in current month that are NOT active (haven't renewed)
        if (client.expiryDate >= monthStart && client.expiryDate <= monthEnd) {
          clientsNotRenewedThisMonth++;
        }
      }
    });
    
    const billingSentToday = 0;
    
    const newClientsToday = allClients.filter(c => c.activationDate === todayStr).length;
    const newClientsThisWeek = allClients.filter(c => c.activationDate >= weekStartStr && c.activationDate <= todayStr).length;
    const newClientsThisMonth = allClients.filter(c => c.activationDate >= monthStart && c.activationDate <= monthEnd).length;
    
    // Payments this month
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

    // Revenue today
    const revenueToday = monthlyPayments
      .filter(p => p.paymentDate === todayStr)
      .reduce((sum, p) => sum + Number(p.amount || 0), 0);

    // Revenue tomorrow: sum of value of clients expiring tomorrow (expected renewals)
    const revenueTomorrow = allClients
      .filter(c => c.expiryDate === tomorrowStr)
      .reduce((sum, c) => sum + Number(c.value || 0), 0);

    // Clients recovered this month: distinct clients that had a renewal this month where previousExpiryDate < monthStart
    const renewalsThisMonth = await db.select().from(paymentHistory)
      .where(
        and(
          eq(paymentHistory.authUserId, authUserId),
          eq(paymentHistory.type, 'renewal'),
          gte(paymentHistory.paymentDate, monthStart),
          lte(paymentHistory.paymentDate, monthEnd)
        )
      );
    
    const recoveredClientIds = new Set(
      renewalsThisMonth
        .filter(r => r.previousExpiryDate !== null && r.previousExpiryDate < monthStart)
        .map(r => r.clientId)
    );
    const clientsRecoveredThisMonth = recoveredClientIds.size;
    // totalRecoveredThisMonth: all distinct clients that renewed this month (including on-time renewals)
    const allRenewalClientIds = new Set(renewalsThisMonth.map(r => r.clientId));
    const totalRecoveredThisMonth = allRenewalClientIds.size;
    
    return {
      activeClients,
      inactiveClients,
      totalClients: allClients.length,
      expiringTomorrow,
      expiredYesterday,
      expiringToday,
      expiring3Days,
      overdue,
      billingSentToday,
      newClientsToday,
      newClientsThisWeek,
      newClientsThisMonth,
      clientsNotRenewedThisMonth,
      clientsRecoveredThisMonth,
      totalRecoveredThisMonth,
      totalRevenue,
      projectedMonthlyRevenue,
      revenueToday,
      revenueTomorrow
    };
  }

  async getPaymentsByDay(authUserId: string, startDate: string, endDate: string): Promise<{
    total: number;
    count: number;
    average: number;
    bestDayAmount: number;
    dailyData: { day: number; date: string; total: number; count: number }[];
  }> {
    const rangePayments = await db.select().from(paymentHistory)
      .where(
        and(
          eq(paymentHistory.authUserId, authUserId),
          gte(paymentHistory.paymentDate, startDate),
          lte(paymentHistory.paymentDate, endDate)
        )
      );

    // Build ordered list of all dates in range
    const byDate: { [date: string]: { total: number; count: number } } = {};
    const start = new Date(startDate + 'T00:00:00');
    const end = new Date(endDate + 'T00:00:00');
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      byDate[key] = { total: 0, count: 0 };
    }

    rangePayments.forEach(p => {
      const key = p.paymentDate;
      if (byDate[key]) {
        byDate[key].total += Number(p.amount || 0);
        byDate[key].count += 1;
      }
    });

    const totalAmount = rangePayments.reduce((s, p) => s + Number(p.amount || 0), 0);
    const totalCount = rangePayments.length;
    const daysWithPayments = Object.values(byDate).filter(d => d.total > 0).length || 1;
    const average = totalAmount / daysWithPayments;
    const bestDayAmount = Math.max(...Object.values(byDate).map(d => d.total), 0);

    const dailyData = Object.entries(byDate)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, v], idx) => ({
        day: idx + 1,
        date,
        total: v.total,
        count: v.count,
      }));

    return { total: totalAmount, count: totalCount, average, bestDayAmount, dailyData };
  }

  async getNewClientsByDay(authUserId: string, startDate: string, endDate: string): Promise<{ day: number; date: string; count: number }[]> {
    const allClients = await db.select().from(clients).where(eq(clients.authUserId, authUserId));

    // Build ordered list of all dates in range
    const byDate: { [date: string]: number } = {};
    const start = new Date(startDate + 'T00:00:00');
    const end = new Date(endDate + 'T00:00:00');
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      byDate[key] = 0;
    }

    allClients.forEach(client => {
      if (!client.activationDate) return;
      if (byDate[client.activationDate] !== undefined) {
        byDate[client.activationDate] += 1;
      }
    });

    return Object.entries(byDate)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, count], idx) => ({
        day: idx + 1,
        date,
        count,
      }));
  }

  async getChurnByDay(authUserId: string, startDate: string, endDate: string): Promise<{ day: number; date: string; count: number }[]> {
    const allClients = await db.select().from(clients).where(eq(clients.authUserId, authUserId));

    const byDate: { [date: string]: number } = {};
    const start = new Date(startDate + 'T00:00:00');
    const end = new Date(endDate + 'T00:00:00');
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      byDate[key] = 0;
    }

    allClients.forEach(client => {
      if (!client.expiryDate) return;
      if (client.subscriptionStatus !== 'Inativa') return;
      if (byDate[client.expiryDate] !== undefined) {
        byDate[client.expiryDate] += 1;
      }
    });

    return Object.entries(byDate)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, count], idx) => ({
        day: idx + 1,
        date,
        count,
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

  // Scheduler helpers
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

  // Dashboard Charts - New methods
  async getRevenueBySystem(authUserId: string, month: string): Promise<{ system: string; value: number }[]> {
    const [year, monthNum] = month.split('-').map(Number);
    const daysInMonth = new Date(year, monthNum, 0).getDate();
    const monthStart = `${year}-${String(monthNum).padStart(2, '0')}-01`;
    const monthEnd = `${year}-${String(monthNum).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;
    
    const payments = await db.select().from(paymentHistory)
      .where(
        and(
          eq(paymentHistory.authUserId, authUserId),
          gte(paymentHistory.paymentDate, monthStart),
          lte(paymentHistory.paymentDate, monthEnd)
        )
      );
    
    const allClients = await db.select().from(clients).where(eq(clients.authUserId, authUserId));
    const clientMap = new Map(allClients.map(c => [c.id, c]));
    
    const revenueBySystem: Record<string, number> = {};
    
    payments.forEach(payment => {
      const client = payment.clientId ? clientMap.get(payment.clientId) : null;
      const system = client?.system || 'Outros';
      revenueBySystem[system] = (revenueBySystem[system] || 0) + Number(payment.amount || 0);
    });
    
    return Object.entries(revenueBySystem)
      .map(([system, value]) => ({ system, value }))
      .sort((a, b) => b.value - a.value);
  }

  async getActiveClientsBySystem(authUserId: string, month: string): Promise<{ system: string; count: number }[]> {
    const [year, monthNum] = month.split('-').map(Number);
    const daysInMonth = new Date(year, monthNum, 0).getDate();
    const monthEnd = `${year}-${String(monthNum).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;
    
    const allClients = await db.select().from(clients).where(eq(clients.authUserId, authUserId));
    
    const clientsBySystem: Record<string, number> = {};
    
    allClients.forEach(client => {
      const expiryDate = parseDateString(client.expiryDate);
      const endOfMonth = parseDateString(monthEnd);
      
      if (expiryDate >= endOfMonth) {
        const system = client.system || 'Outros';
        clientsBySystem[system] = (clientsBySystem[system] || 0) + 1;
      }
    });
    
    return Object.entries(clientsBySystem)
      .map(([system, count]) => ({ system, count }))
      .sort((a, b) => b.count - a.count);
  }

  async getActiveClientsByState(authUserId: string, month: string): Promise<{ state: string; count: number }[]> {
    const [year, monthNum] = month.split('-').map(Number);
    const daysInMonth = new Date(year, monthNum, 0).getDate();
    const monthEnd = `${year}-${String(monthNum).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;
    
    const allClients = await db.select().from(clients).where(eq(clients.authUserId, authUserId));
    
    const clientsByState: Record<string, number> = {};
    
    allClients.forEach(client => {
      const expiryDate = parseDateString(client.expiryDate);
      const endOfMonth = parseDateString(monthEnd);
      
      if (expiryDate >= endOfMonth && client.phone) {
        const state = getStateFromPhone(client.phone);
        clientsByState[state] = (clientsByState[state] || 0) + 1;
      }
    });
    
    return Object.entries(clientsByState)
      .map(([state, count]) => ({ state, count }))
      .sort((a, b) => b.count - a.count);
  }

  // Client Plans
  async getAllClientPlans(authUserId: string): Promise<(ClientPlan & { clientCount: number })[]> {
    const plans = await db.select().from(clientPlans)
      .where(eq(clientPlans.authUserId, authUserId))
      .orderBy(desc(clientPlans.createdAt));

    const allClients = await db.select({ plan: clients.plan })
      .from(clients)
      .where(eq(clients.authUserId, authUserId));

    const countByPlan = new Map<string, number>();
    for (const c of allClients) {
      if (c.plan) {
        countByPlan.set(c.plan, (countByPlan.get(c.plan) ?? 0) + 1);
      }
    }

    return plans.map((p) => ({ ...p, clientCount: countByPlan.get(p.name) ?? 0 }));
  }

  async getClientPlan(authUserId: string, id: number): Promise<ClientPlan | undefined> {
    const result = await db.select().from(clientPlans)
      .where(and(eq(clientPlans.id, id), eq(clientPlans.authUserId, authUserId)))
      .limit(1);
    return result[0];
  }

  async createClientPlan(authUserId: string, insertData: InsertClientPlan): Promise<ClientPlan> {
    const result = await db.insert(clientPlans).values({ ...insertData, authUserId }).returning();
    return result[0];
  }

  async updateClientPlan(authUserId: string, id: number, updateData: Partial<InsertClientPlan>): Promise<ClientPlan | undefined> {
    const result = await db.update(clientPlans)
      .set(updateData)
      .where(and(eq(clientPlans.id, id), eq(clientPlans.authUserId, authUserId)))
      .returning();
    return result[0];
  }

  async deleteClientPlan(authUserId: string, id: number): Promise<boolean> {
    return await db.transaction(async (tx) => {
      const planInUse = await tx.select({ id: manualRenewalPlans.id }).from(manualRenewalPlans)
        .where(and(eq(manualRenewalPlans.clientPlanId, id), eq(manualRenewalPlans.authUserId, authUserId)))
        .limit(1);
      if (planInUse.length > 0) {
        throw new Error("CLIENT_PLAN_IN_USE_BY_MANUAL_RENEWAL_PLANS");
      }

      await tx.delete(systemCreditRules)
        .where(and(eq(systemCreditRules.clientPlanId, id), eq(systemCreditRules.authUserId, authUserId)));

      const result = await tx.delete(clientPlans)
        .where(and(eq(clientPlans.id, id), eq(clientPlans.authUserId, authUserId)))
        .returning();
      return result.length > 0;
    });
  }

  // Apps (IPTV client apps catalog)
  async getAllApps(authUserId: string): Promise<(App & { clientCount: number })[]> {
    const allApps = await db.select().from(apps)
      .where(eq(apps.authUserId, authUserId))
      .orderBy(desc(apps.createdAt));

    const counts = await db.select({ appId: clientApps.appId, count: sql<number>`COUNT(*)` })
      .from(clientApps)
      .where(eq(clientApps.authUserId, authUserId))
      .groupBy(clientApps.appId);

    const countMap = new Map(counts.map((c) => [c.appId, Number(c.count)]));
    return allApps.map((a) => ({ ...a, clientCount: countMap.get(a.id) ?? 0 }));
  }

  async getApp(authUserId: string, id: number): Promise<App | undefined> {
    const result = await db.select().from(apps)
      .where(and(eq(apps.id, id), eq(apps.authUserId, authUserId)))
      .limit(1);
    return result[0];
  }

  async createApp(authUserId: string, insertData: InsertApp): Promise<App> {
    const result = await db.insert(apps).values({ ...insertData, authUserId }).returning();
    return result[0];
  }

  async updateApp(authUserId: string, id: number, updateData: Partial<InsertApp>): Promise<App | undefined> {
    const result = await db.update(apps)
      .set({ ...updateData, updatedAt: new Date() })
      .where(and(eq(apps.id, id), eq(apps.authUserId, authUserId)))
      .returning();
    return result[0];
  }

  async deleteApp(authUserId: string, id: number): Promise<boolean> {
    return await db.transaction(async (tx) => {
      await tx.delete(clientApps)
        .where(and(eq(clientApps.appId, id), eq(clientApps.authUserId, authUserId)));
      const result = await tx.delete(apps)
        .where(and(eq(apps.id, id), eq(apps.authUserId, authUserId)))
        .returning();
      return result.length > 0;
    });
  }

  async toggleAppStatus(authUserId: string, id: number): Promise<App | undefined> {
    const existing = await this.getApp(authUserId, id);
    if (!existing) return undefined;
    const result = await db.update(apps)
      .set({ isActive: !existing.isActive, updatedAt: new Date() })
      .where(and(eq(apps.id, id), eq(apps.authUserId, authUserId)))
      .returning();
    return result[0];
  }

  // Client Apps
  async getClientApps(authUserId: string, clientId: number): Promise<(ClientApp & { appName: string })[]> {
    const rows = await db.select({
      id: clientApps.id,
      authUserId: clientApps.authUserId,
      clientId: clientApps.clientId,
      appId: clientApps.appId,
      isPrimary: clientApps.isPrimary,
      expiryDate: clientApps.expiryDate,
      createdAt: clientApps.createdAt,
      appName: apps.name,
    })
      .from(clientApps)
      .innerJoin(apps, eq(clientApps.appId, apps.id))
      .where(and(eq(clientApps.clientId, clientId), eq(clientApps.authUserId, authUserId)))
      .orderBy(desc(clientApps.isPrimary));
    return rows;
  }

  async setClientApps(
    authUserId: string,
    clientId: number,
    primary: { appId: number; expiryDate?: string | null } | null,
    additional: { appId: number; expiryDate?: string | null }[]
  ): Promise<void> {
    await db.transaction(async (tx) => {
      await tx.delete(clientApps)
        .where(and(eq(clientApps.clientId, clientId), eq(clientApps.authUserId, authUserId)));

      const rows: (typeof clientApps.$inferInsert)[] = [];
      if (primary) {
        rows.push({
          authUserId,
          clientId,
          appId: primary.appId,
          isPrimary: true,
          expiryDate: primary.expiryDate ?? null,
        });
      }
      for (const item of additional) {
        rows.push({
          authUserId,
          clientId,
          appId: item.appId,
          isPrimary: false,
          expiryDate: item.expiryDate ?? null,
        });
      }

      if (rows.length > 0) {
        await tx.insert(clientApps).values(rows);
      }
    });
  }

  // System Credit Rules
  async getSystemCreditRules(authUserId: string, systemId: number): Promise<(SystemCreditRule & { clientPlanName: string })[]> {
    return await db.select({
      id: systemCreditRules.id,
      authUserId: systemCreditRules.authUserId,
      systemId: systemCreditRules.systemId,
      clientPlanId: systemCreditRules.clientPlanId,
      creditsConsumed: systemCreditRules.creditsConsumed,
      createdAt: systemCreditRules.createdAt,
      updatedAt: systemCreditRules.updatedAt,
      clientPlanName: clientPlans.name,
    })
      .from(systemCreditRules)
      .innerJoin(clientPlans, eq(systemCreditRules.clientPlanId, clientPlans.id))
      .where(and(eq(systemCreditRules.authUserId, authUserId), eq(systemCreditRules.systemId, systemId)));
  }

  async createSystemCreditRule(authUserId: string, insertData: InsertSystemCreditRule): Promise<SystemCreditRule> {
    const result = await db.insert(systemCreditRules).values({ ...insertData, authUserId }).returning();
    return result[0];
  }

  async updateSystemCreditRule(authUserId: string, id: number, updateData: Partial<InsertSystemCreditRule>): Promise<SystemCreditRule | undefined> {
    const result = await db.update(systemCreditRules)
      .set({ ...updateData, updatedAt: new Date() })
      .where(and(eq(systemCreditRules.id, id), eq(systemCreditRules.authUserId, authUserId)))
      .returning();
    return result[0];
  }

  async deleteSystemCreditRule(authUserId: string, id: number): Promise<boolean> {
    const result = await db.delete(systemCreditRules)
      .where(and(eq(systemCreditRules.id, id), eq(systemCreditRules.authUserId, authUserId)))
      .returning();
    return result.length > 0;
  }

  // Manual Renewal Plans
  private async getClientPlanByName(authUserId: string, name: string): Promise<ClientPlan | undefined> {
    const result = await db.select().from(clientPlans)
      .where(and(eq(clientPlans.authUserId, authUserId), eq(clientPlans.name, name)))
      .limit(1);
    return result[0];
  }

  private async getSystemByName(authUserId: string, name: string): Promise<System | undefined> {
    const result = await db.select().from(systems)
      .where(and(eq(systems.authUserId, authUserId), eq(systems.name, name)))
      .limit(1);
    return result[0];
  }

  async getActiveManualRenewalPlanForClient(authUserId: string, clientId: number): Promise<ManualRenewalPlan | undefined> {
    const result = await db.select().from(manualRenewalPlans)
      .where(and(
        eq(manualRenewalPlans.clientId, clientId),
        eq(manualRenewalPlans.authUserId, authUserId),
        eq(manualRenewalPlans.status, "active"),
      ))
      .limit(1);
    return result[0];
  }

  // Latest 'renewal' payment for a client, if any — used as the date-base for
  // manual renewal plan math instead of the original activationDate once the
  // client has actually renewed.
  private async getLatestRenewalPaymentDate(authUserId: string, clientId: number): Promise<string | undefined> {
    const rows = await db.select({ paymentDate: paymentHistory.paymentDate })
      .from(paymentHistory)
      .where(and(
        eq(paymentHistory.authUserId, authUserId),
        eq(paymentHistory.clientId, clientId),
        eq(paymentHistory.type, "renewal"),
      ))
      .orderBy(desc(paymentHistory.paymentDate))
      .limit(1);
    return rows[0]?.paymentDate;
  }

  async createManualRenewalPlanForClient(authUserId: string, client: Client, renewDay: number): Promise<ManualRenewalPlan | undefined> {
    const clientPlan = await this.getClientPlanByName(authUserId, client.plan);
    if (!clientPlan || clientPlan.durationType !== "months") return undefined;

    const period = clientPlan.durationQuantity === 3 ? "trimestral"
      : clientPlan.durationQuantity === 6 ? "semestral"
      : clientPlan.durationQuantity === 12 ? "anual"
      : null;
    if (!period) return undefined;

    const system = await this.getSystemByName(authUserId, client.system);
    if (!system) return undefined;

    const totalInstallments = clientPlan.durationQuantity;

    // Date-base: the client's most recent renewal payment, if it's later than
    // the original activation, otherwise the activation itself.
    const latestRenewalDate = await this.getLatestRenewalPaymentDate(authUserId, client.id);
    const baseDate = latestRenewalDate && latestRenewalDate > client.activationDate
      ? latestRenewalDate
      : client.activationDate;

    // finalDate keeps the DAY of baseDate — renewDay is only for installment
    // due dates, never for the plan's own final date.
    const finalDate = addMonthsToDateString(baseDate, totalInstallments);

    return await db.transaction(async (tx) => {
      const [plan] = await tx.insert(manualRenewalPlans).values({
        authUserId,
        clientId: client.id,
        systemId: system.id,
        clientPlanId: clientPlan.id,
        planPeriod: period,
        activationDate: baseDate,
        renewDay,
        finalDate,
        totalInstallments,
        status: "active",
      }).returning();

      const installmentRows = Array.from({ length: totalInstallments }, (_, i) => {
        const monthNumber = i + 1;
        return {
          authUserId,
          manualRenewalPlanId: plan.id,
          monthNumber,
          dueDate: addMonthsToDateString(baseDate, monthNumber, renewDay),
          completed: false,
        };
      });
      await tx.insert(manualRenewalInstallments).values(installmentRows);

      return plan;
    });
  }

  async closeManualRenewalPlan(authUserId: string, id: number): Promise<void> {
    await db.update(manualRenewalPlans)
      .set({ status: "closed", updatedAt: new Date() })
      .where(and(eq(manualRenewalPlans.id, id), eq(manualRenewalPlans.authUserId, authUserId)));
  }

  async getManualRenewalPlans(authUserId: string, period: "trimestral" | "semestral" | "anual"): Promise<ManualRenewalPlanView[]> {
    const planRows = await db.select({
      id: manualRenewalPlans.id,
      authUserId: manualRenewalPlans.authUserId,
      clientId: manualRenewalPlans.clientId,
      systemId: manualRenewalPlans.systemId,
      clientPlanId: manualRenewalPlans.clientPlanId,
      planPeriod: manualRenewalPlans.planPeriod,
      activationDate: manualRenewalPlans.activationDate,
      renewDay: manualRenewalPlans.renewDay,
      finalDate: manualRenewalPlans.finalDate,
      totalInstallments: manualRenewalPlans.totalInstallments,
      planStatus: manualRenewalPlans.status,
      notes: manualRenewalPlans.notes,
      createdAt: manualRenewalPlans.createdAt,
      updatedAt: manualRenewalPlans.updatedAt,
      clientNumber: clients.clientNumber,
      clientName: clients.name,
      clientUsername: clients.username,
      systemName: systems.name,
    })
      .from(manualRenewalPlans)
      .innerJoin(clients, eq(manualRenewalPlans.clientId, clients.id))
      .innerJoin(systems, eq(manualRenewalPlans.systemId, systems.id))
      .where(and(
        eq(manualRenewalPlans.authUserId, authUserId),
        eq(manualRenewalPlans.planPeriod, period),
        eq(manualRenewalPlans.status, "active"),
      ))
      .orderBy(manualRenewalPlans.activationDate, clients.clientNumber);

    if (planRows.length === 0) return [];

    const planIds = planRows.map((p) => p.id);
    const installmentRows = await db.select().from(manualRenewalInstallments)
      .where(and(
        eq(manualRenewalInstallments.authUserId, authUserId),
        inArray(manualRenewalInstallments.manualRenewalPlanId, planIds),
      ))
      .orderBy(manualRenewalInstallments.monthNumber);

    const installmentsByPlan = new Map<number, ManualRenewalInstallment[]>();
    for (const inst of installmentRows) {
      const list = installmentsByPlan.get(inst.manualRenewalPlanId) ?? [];
      list.push(inst);
      installmentsByPlan.set(inst.manualRenewalPlanId, list);
    }

    const todayStr = getBrasiliaDateString();

    return planRows.map((p) => {
      const installments = installmentsByPlan.get(p.id) ?? [];
      const firstPending = installments.find((i) => !i.completed);
      let status: "ULTIMO OK" | "FALTA" | "ULTIMO";
      if (!firstPending) {
        status = "ULTIMO OK";
      } else if (firstPending.dueDate < todayStr) {
        status = "FALTA";
      } else {
        status = "ULTIMO";
      }
      return { ...p, installments, status };
    });
  }

  async toggleManualRenewalInstallment(
    authUserId: string,
    planId: number,
    monthNumber: number
  ): Promise<{ installment: ManualRenewalInstallment; creditsLogged: number | null } | undefined> {
    return await db.transaction(async (tx) => {
      const planRows = await tx.select().from(manualRenewalPlans)
        .where(and(eq(manualRenewalPlans.id, planId), eq(manualRenewalPlans.authUserId, authUserId)))
        .limit(1);
      const plan = planRows[0];
      if (!plan) return undefined;

      const instRows = await tx.select().from(manualRenewalInstallments)
        .where(and(
          eq(manualRenewalInstallments.manualRenewalPlanId, planId),
          eq(manualRenewalInstallments.monthNumber, monthNumber),
          eq(manualRenewalInstallments.authUserId, authUserId),
        ))
        .limit(1);
      const installment = instRows[0];
      if (!installment) return undefined;

      const newCompleted = !installment.completed;

      const [updated] = await tx.update(manualRenewalInstallments)
        .set({ completed: newCompleted, completedAt: newCompleted ? new Date() : null })
        .where(eq(manualRenewalInstallments.id, installment.id))
        .returning();

      let creditsLogged: number | null = null;

      if (newCompleted) {
        const ruleRows = await tx.select().from(systemCreditRules)
          .where(and(
            eq(systemCreditRules.authUserId, authUserId),
            eq(systemCreditRules.systemId, plan.systemId),
            eq(systemCreditRules.clientPlanId, plan.clientPlanId),
          ))
          .limit(1);
        const rule = ruleRows[0];
        if (rule) {
          const perInstallment = Math.floor(rule.creditsConsumed / plan.totalInstallments);
          const remainder = rule.creditsConsumed - perInstallment * plan.totalInstallments;
          const isLast = monthNumber === plan.totalInstallments;
          const credits = perInstallment + (isLast ? remainder : 0);

          await tx.insert(creditConsumptionHistory).values({
            authUserId,
            systemId: plan.systemId,
            clientPlanId: plan.clientPlanId,
            manualRenewalInstallmentId: installment.id,
            credits,
          }).onConflictDoNothing();
          creditsLogged = credits;
        }
      } else {
        await tx.delete(creditConsumptionHistory)
          .where(and(
            eq(creditConsumptionHistory.manualRenewalInstallmentId, installment.id),
            eq(creditConsumptionHistory.authUserId, authUserId),
          ));
      }

      return { installment: updated, creditsLogged };
    });
  }

  // Financial (Financeiro > Visão Geral)
  async getFinancialSummary(authUserId: string, startDate: string, endDate: string): Promise<{
    entradas: number;
    saidas: number;
    lucros: number;
    dailyEntradas: { date: string; value: number }[];
    dailySaidas: { date: string; value: number }[];
    dailyLucros: { date: string; value: number }[];
  }> {
    const paymentRows = await db.select({ amount: paymentHistory.amount, date: paymentHistory.paymentDate })
      .from(paymentHistory)
      .where(and(
        eq(paymentHistory.authUserId, authUserId),
        gte(paymentHistory.paymentDate, startDate),
        lte(paymentHistory.paymentDate, endDate),
      ));

    const manualEntradaRows = await db.select({ value: manualFinancialEntries.value, date: manualFinancialEntries.date })
      .from(manualFinancialEntries)
      .where(and(
        eq(manualFinancialEntries.authUserId, authUserId),
        eq(manualFinancialEntries.type, "entrada"),
        gte(manualFinancialEntries.date, startDate),
        lte(manualFinancialEntries.date, endDate),
      ));

    const startBound = new Date(`${startDate}T00:00:00`);
    const endBound = new Date(`${endDate}T23:59:59.999`);

    const creditRows = await db.select({
      credits: creditConsumptionHistory.credits,
      createdAt: creditConsumptionHistory.createdAt,
      systemValue: systems.value,
    })
      .from(creditConsumptionHistory)
      .innerJoin(systems, eq(creditConsumptionHistory.systemId, systems.id))
      .where(and(
        eq(creditConsumptionHistory.authUserId, authUserId),
        gte(creditConsumptionHistory.createdAt, startBound),
        lte(creditConsumptionHistory.createdAt, endBound),
      ));

    const manualSaidaRows = await db.select({ value: manualFinancialEntries.value, date: manualFinancialEntries.date })
      .from(manualFinancialEntries)
      .where(and(
        eq(manualFinancialEntries.authUserId, authUserId),
        eq(manualFinancialEntries.type, "saida"),
        gte(manualFinancialEntries.date, startDate),
        lte(manualFinancialEntries.date, endDate),
      ));

    const entradaByDate = new Map<string, number>();
    for (const r of paymentRows) {
      entradaByDate.set(r.date, (entradaByDate.get(r.date) ?? 0) + parseFloat(r.amount));
    }
    for (const r of manualEntradaRows) {
      entradaByDate.set(r.date, (entradaByDate.get(r.date) ?? 0) + parseFloat(r.value));
    }

    const saidaByDate = new Map<string, number>();
    for (const r of creditRows) {
      const dateStr = getBrasiliaDateString(r.createdAt);
      const unitValue = r.systemValue ? parseFloat(r.systemValue) : 0;
      saidaByDate.set(dateStr, (saidaByDate.get(dateStr) ?? 0) + r.credits * unitValue);
    }
    for (const r of manualSaidaRows) {
      saidaByDate.set(r.date, (saidaByDate.get(r.date) ?? 0) + parseFloat(r.value));
    }

    const dailyEntradas: { date: string; value: number }[] = [];
    const dailySaidas: { date: string; value: number }[] = [];
    const dailyLucros: { date: string; value: number }[] = [];

    const cursor = parseDateString(startDate);
    const end = parseDateString(endDate);
    while (cursor <= end) {
      const dateStr = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}-${String(cursor.getDate()).padStart(2, "0")}`;
      const entradaValue = entradaByDate.get(dateStr) ?? 0;
      const saidaValue = saidaByDate.get(dateStr) ?? 0;
      dailyEntradas.push({ date: dateStr, value: entradaValue });
      dailySaidas.push({ date: dateStr, value: saidaValue });
      dailyLucros.push({ date: dateStr, value: entradaValue - saidaValue });
      cursor.setDate(cursor.getDate() + 1);
    }

    const entradas = dailyEntradas.reduce((sum, d) => sum + d.value, 0);
    const saidas = dailySaidas.reduce((sum, d) => sum + d.value, 0);
    const lucros = entradas - saidas;

    return { entradas, saidas, lucros, dailyEntradas, dailySaidas, dailyLucros };
  }

  async getFinancialProjections(authUserId: string): Promise<{
    avgDailyProfit: number;
    weekly: number;
    monthly: number;
    annual: number;
  }> {
    // Formula: avgDailyProfit = soma do lucro (entradas - saidas) dos últimos
    // 30 dias corridos (incluindo hoje) / 30. Projeções são simples múltiplos
    // dessa média diária: semanal = média × 7, mensal = média × 30,
    // anual = média × 365. Não há suavização/sazonalidade — é uma
    // extrapolação linear ingênua da média recente.
    const endDate = getBrasiliaDateString();
    const startDateObj = getBrasiliaDate();
    startDateObj.setDate(startDateObj.getDate() - 29);
    const startDate = getBrasiliaDateString(startDateObj);

    const summary = await this.getFinancialSummary(authUserId, startDate, endDate);
    const avgDailyProfit = summary.lucros / 30;

    return {
      avgDailyProfit,
      weekly: avgDailyProfit * 7,
      monthly: avgDailyProfit * 30,
      annual: avgDailyProfit * 365,
    };
  }

  async getFinancialMovements(authUserId: string, filters: {
    startDate?: string;
    endDate?: string;
    type?: "entrada" | "saida";
    productId?: number;
    search?: string;
    page: number;
    limit: number;
  }): Promise<{ movements: FinancialMovement[]; total: number }> {
    const { startDate, endDate, type, productId, search, page, limit } = filters;
    let movements: FinancialMovement[] = [];

    // clients.system stores the system NAME (not an FK), so filtering
    // entradas by "Produto" requires resolving the system's name first.
    let productSystemName: string | undefined;
    if (productId) {
      const sys = await this.getSystem(authUserId, productId);
      productSystemName = sys?.name;
    }

    if (!type || type === "entrada") {
      const conditions = [eq(paymentHistory.authUserId, authUserId)];
      if (startDate) conditions.push(gte(paymentHistory.paymentDate, startDate));
      if (endDate) conditions.push(lte(paymentHistory.paymentDate, endDate));

      const rows = await db.select({
        id: paymentHistory.id,
        amount: paymentHistory.amount,
        paymentDate: paymentHistory.paymentDate,
        description: paymentHistory.description,
        clientName: clients.name,
        clientPlan: clients.plan,
        clientSystem: clients.system,
      })
        .from(paymentHistory)
        .innerJoin(clients, eq(paymentHistory.clientId, clients.id))
        .where(and(...conditions));

      for (const r of rows) {
        if (productId && r.clientSystem !== productSystemName) continue;
        movements.push({
          id: r.id,
          source: "payment",
          type: "entrada",
          productLabel: r.clientPlan,
          clientName: r.clientName,
          value: parseFloat(r.amount),
          date: r.paymentDate,
          description: r.description,
        });
      }
    }

    if (!type || type === "saida") {
      const conditions = [eq(creditConsumptionHistory.authUserId, authUserId)];
      if (productId) conditions.push(eq(creditConsumptionHistory.systemId, productId));
      if (startDate) conditions.push(gte(creditConsumptionHistory.createdAt, new Date(`${startDate}T00:00:00`)));
      if (endDate) conditions.push(lte(creditConsumptionHistory.createdAt, new Date(`${endDate}T23:59:59.999`)));

      // A credit_consumption_history row originates from exactly one of two
      // paths — a manual renewal installment, or (for renewalMode='automatic'
      // clients) a payment_history row — so both are LEFT JOINed and the
      // client name is resolved from whichever one is populated.
      const paymentClients = alias(clients, "payment_clients");

      const rows = await db.select({
        id: creditConsumptionHistory.id,
        credits: creditConsumptionHistory.credits,
        createdAt: creditConsumptionHistory.createdAt,
        systemName: systems.name,
        systemValue: systems.value,
        manualClientName: clients.name,
        paymentClientName: paymentClients.name,
      })
        .from(creditConsumptionHistory)
        .innerJoin(systems, eq(creditConsumptionHistory.systemId, systems.id))
        .leftJoin(manualRenewalInstallments, eq(creditConsumptionHistory.manualRenewalInstallmentId, manualRenewalInstallments.id))
        .leftJoin(manualRenewalPlans, eq(manualRenewalInstallments.manualRenewalPlanId, manualRenewalPlans.id))
        .leftJoin(clients, eq(manualRenewalPlans.clientId, clients.id))
        .leftJoin(paymentHistory, eq(creditConsumptionHistory.sourcePaymentHistoryId, paymentHistory.id))
        .leftJoin(paymentClients, eq(paymentHistory.clientId, paymentClients.id))
        .where(and(...conditions));

      for (const r of rows) {
        const unitValue = r.systemValue ? parseFloat(r.systemValue) : 0;
        movements.push({
          id: r.id,
          source: "credit",
          type: "saida",
          productLabel: r.systemName,
          clientName: r.manualClientName ?? r.paymentClientName ?? null,
          value: r.credits * unitValue,
          date: getBrasiliaDateString(r.createdAt),
          description: null,
        });
      }
    }

    // Manual entries have no system association, so they're excluded whenever
    // a Produto filter is active.
    if (!productId) {
      const conditions = [eq(manualFinancialEntries.authUserId, authUserId)];
      if (type) conditions.push(eq(manualFinancialEntries.type, type));
      if (startDate) conditions.push(gte(manualFinancialEntries.date, startDate));
      if (endDate) conditions.push(lte(manualFinancialEntries.date, endDate));

      const rows = await db.select().from(manualFinancialEntries).where(and(...conditions));
      for (const r of rows) {
        movements.push({
          id: r.id,
          source: "manual",
          type: r.type,
          productLabel: r.description,
          clientName: null,
          value: parseFloat(r.value),
          date: r.date,
          description: r.description,
        });
      }
    }

    if (search) {
      const term = search.toLowerCase();
      movements = movements.filter((m) =>
        (m.clientName ?? "").toLowerCase().includes(term) || m.productLabel.toLowerCase().includes(term)
      );
    }

    movements.sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);

    const total = movements.length;
    const startIdx = (page - 1) * limit;
    const paginated = movements.slice(startIdx, startIdx + limit);

    return { movements: paginated, total };
  }

  async deleteFinancialMovement(authUserId: string, id: number, source: "payment" | "credit" | "manual"): Promise<boolean> {
    if (source === "payment") {
      const result = await db.delete(paymentHistory)
        .where(and(eq(paymentHistory.id, id), eq(paymentHistory.authUserId, authUserId)))
        .returning();
      return result.length > 0;
    }

    if (source === "credit") {
      return await db.transaction(async (tx) => {
        const rows = await tx.select().from(creditConsumptionHistory)
          .where(and(eq(creditConsumptionHistory.id, id), eq(creditConsumptionHistory.authUserId, authUserId)))
          .limit(1);
        const entry = rows[0];
        if (!entry) return false;

        // Reset the installment to "not completed" so it doesn't show as
        // checked with no corresponding credit ledger entry (no orphan state).
        // Only applies to entries sourced from a manual renewal installment —
        // automatic-renewal entries (sourcePaymentHistoryId) have nothing to reset.
        if (entry.manualRenewalInstallmentId !== null) {
          await tx.update(manualRenewalInstallments)
            .set({ completed: false, completedAt: null })
            .where(eq(manualRenewalInstallments.id, entry.manualRenewalInstallmentId));
        }

        const result = await tx.delete(creditConsumptionHistory)
          .where(eq(creditConsumptionHistory.id, id))
          .returning();
        return result.length > 0;
      });
    }

    return await this.deleteManualFinancialEntry(authUserId, id);
  }

  async bulkDeleteFinancialMovements(authUserId: string, items: { id: number; source: "payment" | "credit" | "manual" }[]): Promise<number> {
    let deletedCount = 0;
    for (const item of items) {
      const deleted = await this.deleteFinancialMovement(authUserId, item.id, item.source);
      if (deleted) deletedCount++;
    }
    return deletedCount;
  }

  async createManualFinancialEntry(authUserId: string, insertData: InsertManualFinancialEntry): Promise<ManualFinancialEntry> {
    const result = await db.insert(manualFinancialEntries).values({ ...insertData, authUserId }).returning();
    return result[0];
  }

  async updateManualFinancialEntry(authUserId: string, id: number, updateData: Partial<InsertManualFinancialEntry>): Promise<ManualFinancialEntry | undefined> {
    const result = await db.update(manualFinancialEntries)
      .set(updateData)
      .where(and(eq(manualFinancialEntries.id, id), eq(manualFinancialEntries.authUserId, authUserId)))
      .returning();
    return result[0];
  }

  async deleteManualFinancialEntry(authUserId: string, id: number): Promise<boolean> {
    const result = await db.delete(manualFinancialEntries)
      .where(and(eq(manualFinancialEntries.id, id), eq(manualFinancialEntries.authUserId, authUserId)))
      .returning();
    return result.length > 0;
  }

  // WhatsApp Connections (CRM)
  async getWhatsappConnection(authUserId: string): Promise<WhatsappConnection | undefined> {
    const result = await db.select().from(whatsappConnections)
      .where(eq(whatsappConnections.authUserId, authUserId))
      .limit(1);
    return result[0];
  }

  async upsertWhatsappConnection(authUserId: string, data: InsertWhatsappConnection): Promise<WhatsappConnection> {
    const result = await db.insert(whatsappConnections)
      .values({ ...data, authUserId })
      .onConflictDoUpdate({
        target: whatsappConnections.authUserId,
        set: { ...data, updatedAt: new Date() },
      })
      .returning();
    return result[0];
  }

  async deleteWhatsappConnection(authUserId: string): Promise<boolean> {
    const result = await db.delete(whatsappConnections)
      .where(eq(whatsappConnections.authUserId, authUserId))
      .returning();
    return result.length > 0;
  }

  // CRM Contacts & Messages
  async getCrmConversations(authUserId: string): Promise<(CrmContact & { lastMessage: string | null; lastMessageDirection: "inbound" | "outbound" | null })[]> {
    const contacts = await db.select().from(crmContacts).where(eq(crmContacts.authUserId, authUserId));
    const messages = await db.select().from(crmMessages)
      .where(eq(crmMessages.authUserId, authUserId))
      .orderBy(desc(crmMessages.createdAt));

    const lastByContact = new Map<number, typeof messages[number]>();
    for (const m of messages) {
      if (!lastByContact.has(m.contactId)) lastByContact.set(m.contactId, m);
    }

    return contacts
      .map((c) => {
        const last = lastByContact.get(c.id);
        return {
          ...c,
          lastMessage: last?.content ?? null,
          lastMessageDirection: last?.direction ?? null,
        };
      })
      .sort((a, b) => {
        const at = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
        const bt = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
        return bt - at;
      });
  }

  async getCrmContactByPhone(authUserId: string, phone: string): Promise<CrmContact | undefined> {
    const target = normalizePhoneDigits(phone);
    const contacts = await db.select().from(crmContacts).where(eq(crmContacts.authUserId, authUserId));
    return contacts.find((c) => normalizePhoneDigits(c.phone) === target);
  }

  async getCrmMessagesByContact(authUserId: string, contactId: number): Promise<CrmMessage[]> {
    return await db.select().from(crmMessages)
      .where(and(eq(crmMessages.authUserId, authUserId), eq(crmMessages.contactId, contactId)))
      .orderBy(crmMessages.createdAt);
  }

  async createCrmMessage(authUserId: string, data: InsertCrmMessage): Promise<CrmMessage> {
    const result = await db.insert(crmMessages).values({ ...data, authUserId }).returning();
    return result[0];
  }

  async touchCrmContactLastMessage(authUserId: string, contactId: number, at: Date): Promise<void> {
    await db.update(crmContacts)
      .set({ lastMessageAt: at, updatedAt: new Date() })
      .where(and(eq(crmContacts.id, contactId), eq(crmContacts.authUserId, authUserId)));
  }

  async updateCrmMessageStatusByWaId(authUserId: string, waMessageId: string, status: string): Promise<void> {
    await db.update(crmMessages)
      .set({ status })
      .where(and(eq(crmMessages.authUserId, authUserId), eq(crmMessages.waMessageId, waMessageId)));
  }

  async getWhatsappConnectionByPhoneNumberId(phoneNumberId: string): Promise<WhatsappConnection | undefined> {
    const result = await db.select().from(whatsappConnections)
      .where(eq(whatsappConnections.phoneNumberId, phoneNumberId))
      .limit(1);
    return result[0];
  }

  async getWhatsappConnectionByVerifyToken(verifyToken: string): Promise<WhatsappConnection | undefined> {
    const result = await db.select().from(whatsappConnections)
      .where(eq(whatsappConnections.verifyToken, verifyToken))
      .limit(1);
    return result[0];
  }

  // CRM Automations
  async getAllCrmAutomations(authUserId: string): Promise<CrmAutomation[]> {
    return await db.select().from(crmAutomations)
      .where(eq(crmAutomations.authUserId, authUserId))
      .orderBy(desc(crmAutomations.createdAt));
  }

  async getCrmAutomation(authUserId: string, id: number): Promise<CrmAutomation | undefined> {
    const result = await db.select().from(crmAutomations)
      .where(and(eq(crmAutomations.id, id), eq(crmAutomations.authUserId, authUserId)))
      .limit(1);
    return result[0];
  }

  async createCrmAutomation(authUserId: string, data: InsertCrmAutomation): Promise<CrmAutomation> {
    const result = await db.insert(crmAutomations)
      .values({ ...data, authUserId } as typeof crmAutomations.$inferInsert)
      .returning();
    return result[0];
  }

  async updateCrmAutomation(authUserId: string, id: number, data: Partial<InsertCrmAutomation>): Promise<CrmAutomation | undefined> {
    const result = await db.update(crmAutomations)
      .set({ ...data, updatedAt: new Date() } as Partial<typeof crmAutomations.$inferInsert>)
      .where(and(eq(crmAutomations.id, id), eq(crmAutomations.authUserId, authUserId)))
      .returning();
    return result[0];
  }

  async deleteCrmAutomation(authUserId: string, id: number): Promise<boolean> {
    return await db.transaction(async (tx) => {
      await tx.delete(crmAutomationRuns)
        .where(and(eq(crmAutomationRuns.automationId, id), eq(crmAutomationRuns.authUserId, authUserId)));

      const result = await tx.delete(crmAutomations)
        .where(and(eq(crmAutomations.id, id), eq(crmAutomations.authUserId, authUserId)))
        .returning();
      return result.length > 0;
    });
  }

  async getActiveCrmAutomations(authUserId: string): Promise<CrmAutomation[]> {
    return await db.select().from(crmAutomations)
      .where(and(eq(crmAutomations.authUserId, authUserId), eq(crmAutomations.isActive, true)));
  }

  async getCrmContactByClientId(authUserId: string, clientId: number): Promise<CrmContact | undefined> {
    const result = await db.select().from(crmContacts)
      .where(and(eq(crmContacts.authUserId, authUserId), eq(crmContacts.clientId, clientId)))
      .limit(1);
    return result[0];
  }

  async createCrmAutomationRun(authUserId: string, data: InsertCrmAutomationRun): Promise<CrmAutomationRun> {
    const result = await db.insert(crmAutomationRuns).values({ ...data, authUserId }).returning();
    return result[0];
  }

  async hasCrmAutomationRunToday(authUserId: string, automationId: number, contactId: number): Promise<boolean> {
    const todayStart = getBrasiliaStartOfDay();
    const runs = await db.select().from(crmAutomationRuns)
      .where(and(
        eq(crmAutomationRuns.authUserId, authUserId),
        eq(crmAutomationRuns.automationId, automationId),
        eq(crmAutomationRuns.contactId, contactId),
        eq(crmAutomationRuns.status, "sent"),
      ));
    return runs.some((r) => new Date(r.executedAt) >= todayStart);
  }

  async getCrmAutomationRuns(authUserId: string, automationId: number, filters: { startDate?: string; endDate?: string; status?: string }): Promise<(CrmAutomationRun & { contactName: string | null; contactPhone: string | null })[]> {
    const conditions = [eq(crmAutomationRuns.authUserId, authUserId), eq(crmAutomationRuns.automationId, automationId)];
    if (filters.status) conditions.push(eq(crmAutomationRuns.status, filters.status as "sent" | "failed" | "skipped"));

    let runs = await db.select().from(crmAutomationRuns)
      .where(and(...conditions))
      .orderBy(desc(crmAutomationRuns.executedAt));

    if (filters.startDate) {
      const start = parseDateString(filters.startDate);
      runs = runs.filter((r) => new Date(r.executedAt) >= start);
    }
    if (filters.endDate) {
      const end = parseDateString(filters.endDate);
      end.setHours(23, 59, 59, 999);
      runs = runs.filter((r) => new Date(r.executedAt) <= end);
    }

    const contactIds = Array.from(new Set(runs.map((r) => r.contactId)));
    const contacts = contactIds.length > 0
      ? await db.select().from(crmContacts).where(and(eq(crmContacts.authUserId, authUserId), inArray(crmContacts.id, contactIds)))
      : [];
    const contactMap = new Map(contacts.map((c) => [c.id, c]));

    return runs.map((r) => ({
      ...r,
      contactName: contactMap.get(r.contactId)?.displayName ?? null,
      contactPhone: contactMap.get(r.contactId)?.phone ?? null,
    }));
  }

  // CRM Templates
  async getAllCrmTemplates(authUserId: string): Promise<CrmTemplate[]> {
    return await db.select().from(crmTemplates)
      .where(eq(crmTemplates.authUserId, authUserId))
      .orderBy(desc(crmTemplates.createdAt));
  }

  async getCrmTemplate(authUserId: string, id: number): Promise<CrmTemplate | undefined> {
    const result = await db.select().from(crmTemplates)
      .where(and(eq(crmTemplates.id, id), eq(crmTemplates.authUserId, authUserId)))
      .limit(1);
    return result[0];
  }

  async getCrmTemplateByName(authUserId: string, name: string): Promise<CrmTemplate | undefined> {
    const result = await db.select().from(crmTemplates)
      .where(and(eq(crmTemplates.authUserId, authUserId), eq(crmTemplates.name, name)))
      .limit(1);
    return result[0];
  }

  async createCrmTemplate(authUserId: string, data: Omit<CrmTemplate, "id" | "authUserId" | "createdAt" | "updatedAt">): Promise<CrmTemplate> {
    const result = await db.insert(crmTemplates).values({ ...data, authUserId }).returning();
    return result[0];
  }

  async updateCrmTemplate(authUserId: string, id: number, data: Partial<Omit<CrmTemplate, "id" | "authUserId" | "createdAt">>): Promise<CrmTemplate | undefined> {
    const result = await db.update(crmTemplates)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(crmTemplates.id, id), eq(crmTemplates.authUserId, authUserId)))
      .returning();
    return result[0];
  }

  async deleteCrmTemplate(authUserId: string, id: number): Promise<boolean> {
    const result = await db.delete(crmTemplates)
      .where(and(eq(crmTemplates.id, id), eq(crmTemplates.authUserId, authUserId)))
      .returning();
    return result.length > 0;
  }
}

export const storage = new DbStorage();
