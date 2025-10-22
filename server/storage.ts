import { 
  users, employees, systems, clients, whatsappInstances, messageTemplates, billingHistory, automationConfigs,
  type User, type InsertUser,
  type Employee, type InsertEmployee,
  type System, type InsertSystem,
  type Client, type InsertClient,
  type WhatsappInstance, type InsertWhatsappInstance,
  type MessageTemplate, type InsertMessageTemplate,
  type BillingHistory, type InsertBillingHistory,
  type AutomationConfig, type InsertAutomationConfig
} from "@shared/schema";

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
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

export class MemStorage implements IStorage {
  private users: Map<number, User> = new Map();
  private employees: Map<number, Employee> = new Map();
  private systems: Map<number, System> = new Map();
  private clients: Map<number, Client> = new Map();
  private whatsappInstances: Map<number, WhatsappInstance> = new Map();
  private messageTemplates: Map<number, MessageTemplate> = new Map();
  private billingHistory: Map<number, BillingHistory> = new Map();
  private automationConfigs: Map<string, AutomationConfig> = new Map();
  
  private currentUserId = 1;
  private currentEmployeeId = 1;
  private currentSystemId = 1;
  private currentClientId = 1;
  private currentWhatsappInstanceId = 1;
  private currentMessageTemplateId = 1;
  private currentBillingHistoryId = 1;
  private currentAutomationConfigId = 1;

  // Users
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.username === username);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { 
      role: "operator",
      isActive: true,
      ...insertUser, 
      id, 
      createdAt: new Date()
    };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: number, updateUser: Partial<InsertUser>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const updatedUser = { ...user, ...updateUser };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  // Employees
  async getAllEmployees(): Promise<Employee[]> {
    return Array.from(this.employees.values());
  }

  async getEmployee(id: number): Promise<Employee | undefined> {
    return this.employees.get(id);
  }

  async createEmployee(insertEmployee: InsertEmployee): Promise<Employee> {
    const id = this.currentEmployeeId++;
    const employee: Employee = { 
      birthDate: null,
      address: null,
      salary: null,
      photo: null,
      isActive: true,
      ...insertEmployee, 
      id, 
      createdAt: new Date()
    };
    this.employees.set(id, employee);
    return employee;
  }

  async updateEmployee(id: number, updateEmployee: Partial<InsertEmployee>): Promise<Employee | undefined> {
    const employee = this.employees.get(id);
    if (!employee) return undefined;
    
    const updatedEmployee = { ...employee, ...updateEmployee };
    this.employees.set(id, updatedEmployee);
    return updatedEmployee;
  }

  async deleteEmployee(id: number): Promise<boolean> {
    return this.employees.delete(id);
  }

  // Systems
  async getAllSystems(): Promise<System[]> {
    return Array.from(this.systems.values());
  }

  async getSystem(id: number): Promise<System | undefined> {
    return this.systems.get(id);
  }

  async createSystem(insertSystem: InsertSystem): Promise<System> {
    const id = this.currentSystemId++;
    const system: System = { 
      description: null,
      isActive: true,
      ...insertSystem, 
      id, 
      createdAt: new Date()
    };
    this.systems.set(id, system);
    return system;
  }

  async updateSystem(id: number, updateSystem: Partial<InsertSystem>): Promise<System | undefined> {
    const system = this.systems.get(id);
    if (!system) return undefined;
    
    const updatedSystem = { ...system, ...updateSystem };
    this.systems.set(id, updatedSystem);
    return updatedSystem;
  }

  async deleteSystem(id: number): Promise<boolean> {
    return this.systems.delete(id);
  }

  // Clients
  async getAllClients(): Promise<Client[]> {
    return Array.from(this.clients.values());
  }

  async getClient(id: number): Promise<Client | undefined> {
    return this.clients.get(id);
  }

  async createClient(insertClient: InsertClient): Promise<Client> {
    const id = this.currentClientId++;
    const client: Client = { 
      ...insertClient,
      id, 
      createdAt: new Date(),
      updatedAt: new Date(),
      subscriptionStatus: insertClient.subscriptionStatus || "Ativa",
      paymentMethods: (insertClient.paymentMethods || []) as string[],
      paymentStatus: insertClient.paymentStatus || "Pago",
      referralSource: insertClient.referralSource || null,
      referredById: insertClient.referredById || null,
      notes: insertClient.notes || null,
    };
    this.clients.set(id, client);
    return client;
  }

  async updateClient(id: number, updateClient: Partial<InsertClient>): Promise<Client | undefined> {
    const client = this.clients.get(id);
    if (!client) return undefined;
    
    const updatedClient: Client = { 
      ...client, 
      ...updateClient, 
      paymentMethods: (updateClient.paymentMethods !== undefined ? updateClient.paymentMethods : client.paymentMethods) as string[],
      updatedAt: new Date() 
    };
    this.clients.set(id, updatedClient);
    return updatedClient;
  }

  async deleteClient(id: number): Promise<boolean> {
    return this.clients.delete(id);
  }

  async getExpiringClients(days: number): Promise<Client[]> {
    const today = new Date();
    const targetDate = new Date(today.getTime() + days * 24 * 60 * 60 * 1000);
    
    return Array.from(this.clients.values()).filter(client => {
      const expiryDate = new Date(client.expiryDate);
      return expiryDate <= targetDate && expiryDate >= today;
    });
  }

  async getOverdueClients(): Promise<Client[]> {
    const today = new Date();
    
    return Array.from(this.clients.values()).filter(client => {
      const expiryDate = new Date(client.expiryDate);
      return expiryDate < today;
    });
  }

  async getReferralRankings(days = 30): Promise<{ client: Client; referralCount: number }[]> {
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    
    const referralCounts = new Map<number, number>();
    
    Array.from(this.clients.values()).forEach(client => {
      if (client.referredById && new Date(client.createdAt) >= cutoffDate) {
        const count = referralCounts.get(client.referredById) || 0;
        referralCounts.set(client.referredById, count + 1);
      }
    });

    const rankings = Array.from(referralCounts.entries())
      .map(([clientId, count]) => ({
        client: this.clients.get(clientId)!,
        referralCount: count
      }))
      .filter(item => item.client)
      .sort((a, b) => b.referralCount - a.referralCount);

    return rankings;
  }

  // WhatsApp Instances
  async getAllWhatsappInstances(): Promise<WhatsappInstance[]> {
    return Array.from(this.whatsappInstances.values());
  }

  async getWhatsappInstance(id: number): Promise<WhatsappInstance | undefined> {
    return this.whatsappInstances.get(id);
  }

  async createWhatsappInstance(insertInstance: InsertWhatsappInstance): Promise<WhatsappInstance> {
    const id = this.currentWhatsappInstanceId++;
    const instance: WhatsappInstance = { 
      status: "disconnected",
      instanceId: null,
      qrCode: null,
      webhookUrl: null,
      ...insertInstance, 
      id, 
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.whatsappInstances.set(id, instance);
    return instance;
  }

  async updateWhatsappInstance(id: number, updateInstance: Partial<InsertWhatsappInstance>): Promise<WhatsappInstance | undefined> {
    const instance = this.whatsappInstances.get(id);
    if (!instance) return undefined;
    
    const updatedInstance = { ...instance, ...updateInstance, updatedAt: new Date() };
    this.whatsappInstances.set(id, updatedInstance);
    return updatedInstance;
  }

  async deleteWhatsappInstance(id: number): Promise<boolean> {
    return this.whatsappInstances.delete(id);
  }

  // Message Templates
  async getAllMessageTemplates(): Promise<MessageTemplate[]> {
    return Array.from(this.messageTemplates.values());
  }

  async getMessageTemplate(id: number): Promise<MessageTemplate | undefined> {
    return this.messageTemplates.get(id);
  }

  async createMessageTemplate(insertTemplate: InsertMessageTemplate): Promise<MessageTemplate> {
    const id = this.currentMessageTemplateId++;
    const template: MessageTemplate = { 
      isActive: true,
      imageUrl: null,
      ...insertTemplate, 
      id, 
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.messageTemplates.set(id, template);
    return template;
  }

  async updateMessageTemplate(id: number, updateTemplate: Partial<InsertMessageTemplate>): Promise<MessageTemplate | undefined> {
    const template = this.messageTemplates.get(id);
    if (!template) return undefined;
    
    const updatedTemplate = { ...template, ...updateTemplate, updatedAt: new Date() };
    this.messageTemplates.set(id, updatedTemplate);
    return updatedTemplate;
  }

  async deleteMessageTemplate(id: number): Promise<boolean> {
    return this.messageTemplates.delete(id);
  }

  // Billing History
  async getAllBillingHistory(): Promise<BillingHistory[]> {
    return Array.from(this.billingHistory.values());
  }

  async getBillingHistory(clientId: number): Promise<BillingHistory[]> {
    return Array.from(this.billingHistory.values()).filter(history => history.clientId === clientId);
  }

  async createBillingHistory(insertBilling: InsertBillingHistory): Promise<BillingHistory> {
    const id = this.currentBillingHistoryId++;
    const billing: BillingHistory = { 
      status: "pending",
      sentAt: null,
      errorMessage: null,
      ...insertBilling, 
      id, 
      createdAt: new Date()
    };
    this.billingHistory.set(id, billing);
    return billing;
  }

  async updateBillingHistory(id: number, updateBilling: Partial<InsertBillingHistory>): Promise<BillingHistory | undefined> {
    const billing = this.billingHistory.get(id);
    if (!billing) return undefined;
    
    const updatedBilling = { ...billing, ...updateBilling };
    this.billingHistory.set(id, updatedBilling);
    return updatedBilling;
  }

  // Dashboard Stats
  async getDashboardStats() {
    const getBrasiliaDateString = (date: Date) => {
      const utc = date.getTime() + (date.getTimezoneOffset() * 60000);
      const brasiliaTime = new Date(utc + (3600000 * -3));
      return brasiliaTime.toISOString().split('T')[0];
    };

    const now = new Date();
    const todayBrasilia = getBrasiliaDateString(now);
    
    const yesterdayDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const yesterdayBrasilia = getBrasiliaDateString(yesterdayDate);
    
    const tomorrowDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const tomorrowBrasilia = getBrasiliaDateString(tomorrowDate);

    const clients = Array.from(this.clients.values());
    const billingHistory = Array.from(this.billingHistory.values());

    const activeClients = clients.filter(client => 
      client.subscriptionStatus === "Ativa"
    ).length;

    const inactiveClients = clients.filter(client => 
      client.subscriptionStatus === "Inativa"
    ).length;

    const expiringTomorrow = clients.filter(client => {
      const expiryDateStr = typeof client.expiryDate === 'string' 
        ? client.expiryDate 
        : getBrasiliaDateString(new Date(client.expiryDate));
      return expiryDateStr === tomorrowBrasilia;
    }).length;

    const expiredYesterday = clients.filter(client => {
      const expiryDateStr = typeof client.expiryDate === 'string' 
        ? client.expiryDate 
        : getBrasiliaDateString(new Date(client.expiryDate));
      return expiryDateStr === yesterdayBrasilia;
    }).length;

    const expiringToday = clients.filter(client => {
      const expiryDateStr = typeof client.expiryDate === 'string' 
        ? client.expiryDate 
        : getBrasiliaDateString(new Date(client.expiryDate));
      return expiryDateStr === todayBrasilia;
    }).length;

    const expiring3Days = clients.filter(client => {
      const expiryDate = new Date(client.expiryDate);
      const diffTime = expiryDate.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays > 0 && diffDays <= 3;
    }).length;

    const overdue = clients.filter(client => {
      const expiryDate = new Date(client.expiryDate);
      return expiryDate.getTime() < now.getTime();
    }).length;

    const todayStartTime = new Date(todayBrasilia + 'T00:00:00-03:00').getTime();
    const todayEndTime = todayStartTime + (24 * 60 * 60 * 1000);

    const billingSentToday = billingHistory.filter(billing => {
      if (!billing.sentAt) return false;
      const sentTime = new Date(billing.sentAt).getTime();
      return sentTime >= todayStartTime && sentTime < todayEndTime;
    }).length;

    const newClientsToday = clients.filter(client => {
      const createdTime = new Date(client.createdAt).getTime();
      return createdTime >= todayStartTime && createdTime < todayEndTime;
    }).length;

    const totalRevenue = clients
      .filter(client => client.subscriptionStatus === "Ativa")
      .reduce((sum, client) => sum + parseFloat(client.value || "0"), 0);

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

  async getNewClientsByDay() {
    const getBrasiliaDate = () => {
      const now = new Date();
      const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
      return new Date(utc + (3600000 * -3));
    };

    const brasiliaDate = getBrasiliaDate();
    const currentMonth = brasiliaDate.getMonth();
    const currentYear = brasiliaDate.getFullYear();
    
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    
    const clients = Array.from(this.clients.values());
    
    const clientsByDay: { [key: number]: number } = {};
    for (let day = 1; day <= daysInMonth; day++) {
      clientsByDay[day] = 0;
    }
    
    clients.forEach(client => {
      if (!client.activationDate || !/^\d{4}-\d{2}-\d{2}$/.test(client.activationDate)) {
        return;
      }
      
      const activationDateStr = client.activationDate;
      const [year, month, day] = activationDateStr.split('-').map(Number);
      
      if (year === currentYear && month === currentMonth + 1) {
        clientsByDay[day] = (clientsByDay[day] || 0) + 1;
      }
    });
    
    return Object.entries(clientsByDay).map(([day, count]) => ({
      day: parseInt(day),
      count
    }));
  }

  async getRevenueByPeriod(period: 'current_month' | 'last_month' | '3_months' | '6_months' | '12_months') {
    const getBrasiliaDateString = (date: Date) => {
      const utc = date.getTime() + (date.getTimezoneOffset() * 60000);
      const brasiliaTime = new Date(utc + (3600000 * -3));
      return brasiliaTime.toISOString().split('T')[0];
    };

    const now = new Date();
    const clients = Array.from(this.clients.values()).filter(c => c.subscriptionStatus === "Ativa");

    if (period === 'current_month' || period === 'last_month') {
      const targetMonth = period === 'current_month' ? now.getMonth() : now.getMonth() - 1;
      const targetYear = targetMonth < 0 ? now.getFullYear() - 1 : now.getFullYear();
      const adjustedMonth = targetMonth < 0 ? 11 : targetMonth;
      
      const daysInMonth = new Date(targetYear, adjustedMonth + 1, 0).getDate();
      const revenueByDay: { [key: number]: number } = {};
      
      for (let day = 1; day <= daysInMonth; day++) {
        revenueByDay[day] = 0;
      }
      
      clients.forEach(client => {
        const createdDate = new Date(client.createdAt);
        const createdDateStr = getBrasiliaDateString(createdDate);
        const [year, month, day] = createdDateStr.split('-').map(Number);
        
        if (year === targetYear && month === adjustedMonth + 1) {
          revenueByDay[day] = (revenueByDay[day] || 0) + parseFloat(client.value || "0");
        }
      });
      
      return Object.entries(revenueByDay).map(([day, value]) => ({
        label: day,
        value
      }));
    } else {
      const monthsToShow = period === '3_months' ? 3 : period === '6_months' ? 6 : 12;
      const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
      const revenueByMonth: { [key: string]: number } = {};
      
      for (let i = monthsToShow - 1; i >= 0; i--) {
        const targetDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthKey = `${monthNames[targetDate.getMonth()]}`;
        revenueByMonth[monthKey] = 0;
      }
      
      clients.forEach(client => {
        const createdDate = new Date(client.createdAt);
        const createdDateStr = getBrasiliaDateString(createdDate);
        const [year, month] = createdDateStr.split('-').map(Number);
        
        for (let i = monthsToShow - 1; i >= 0; i--) {
          const targetDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
          if (year === targetDate.getFullYear() && month === targetDate.getMonth() + 1) {
            const monthKey = `${monthNames[targetDate.getMonth()]}`;
            revenueByMonth[monthKey] = (revenueByMonth[monthKey] || 0) + parseFloat(client.value || "0");
          }
        }
      });
      
      return Object.entries(revenueByMonth).map(([label, value]) => ({
        label,
        value
      }));
    }
  }

  // Automation Configs
  async getAllAutomationConfigs(): Promise<AutomationConfig[]> {
    return Array.from(this.automationConfigs.values());
  }

  async getAutomationConfig(automationType: string): Promise<AutomationConfig | undefined> {
    return this.automationConfigs.get(automationType);
  }

  async createAutomationConfig(insertConfig: InsertAutomationConfig): Promise<AutomationConfig> {
    const id = this.currentAutomationConfigId++;
    const config: AutomationConfig = {
      id,
      isActive: insertConfig.isActive ?? false,
      whatsappInstanceId: insertConfig.whatsappInstanceId ?? null,
      subItems: (insertConfig.subItems ?? []) as Array<{
        id: string;
        name: string;
        active: boolean;
        templateId: number | null;
        clientCount: number;
      }>,
      automationType: insertConfig.automationType,
      scheduledTime: insertConfig.scheduledTime,
      webhookUrl: insertConfig.webhookUrl,
      lastRunAt: null,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.automationConfigs.set(insertConfig.automationType, config);
    return config;
  }

  async updateAutomationConfig(automationType: string, updateConfig: Partial<InsertAutomationConfig> & { lastRunAt?: Date | null }): Promise<AutomationConfig | undefined> {
    const config = this.automationConfigs.get(automationType);
    if (!config) return undefined;
    
    const updatedConfig: AutomationConfig = {
      id: config.id,
      automationType: config.automationType,
      isActive: updateConfig.isActive ?? config.isActive,
      scheduledTime: updateConfig.scheduledTime ?? config.scheduledTime,
      whatsappInstanceId: updateConfig.whatsappInstanceId ?? config.whatsappInstanceId,
      subItems: (updateConfig.subItems ?? config.subItems) as Array<{
        id: string;
        name: string;
        active: boolean;
        templateId: number | null;
        clientCount: number;
      }>,
      webhookUrl: updateConfig.webhookUrl ?? config.webhookUrl,
      lastRunAt: updateConfig.lastRunAt !== undefined ? updateConfig.lastRunAt : config.lastRunAt,
      createdAt: config.createdAt,
      updatedAt: new Date()
    };
    this.automationConfigs.set(automationType, updatedConfig);
    return updatedConfig;
  }

  // Client counting for automations
  async getClientsExpiringInDays(days: number): Promise<Client[]> {
    const clients = Array.from(this.clients.values());
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + days);
    
    return clients.filter(client => {
      const [year, month, day] = client.expiryDate.split('-').map(Number);
      const expiryDate = new Date(year, month - 1, day);
      return expiryDate.getTime() === targetDate.getTime();
    });
  }

  async getClientsExpiredForDays(days: number): Promise<Client[]> {
    const clients = Array.from(this.clients.values());
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() - days);
    
    return clients.filter(client => {
      const [year, month, day] = client.expiryDate.split('-').map(Number);
      const expiryDate = new Date(year, month - 1, day);
      return expiryDate.getTime() === targetDate.getTime();
    });
  }

  async getClientsActiveForDays(days: number): Promise<Client[]> {
    const clients = Array.from(this.clients.values());
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() - days);
    
    return clients.filter(client => {
      const [year, month, day] = client.activationDate.split('-').map(Number);
      const activationDate = new Date(year, month - 1, day);
      return activationDate.getTime() === targetDate.getTime();
    });
  }
}

export const storage = new MemStorage();
