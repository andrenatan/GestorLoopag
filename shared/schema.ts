import { pgTable, text, serial, integer, boolean, timestamp, decimal, varchar, date, jsonb, uuid, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Plans table for subscription plans
export const plans = pgTable("plans", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  billingPeriod: text("billing_period", {
    enum: ["monthly", "semiannual", "yearly", "lifetime"]
  }).notNull(),
  stripePriceId: text("stripe_price_id"),
  features: jsonb("features").$type<string[]>().notNull().default([]),
  isPopular: boolean("is_popular").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Users table for authentication and access control
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  authUserId: uuid("auth_user_id").unique(),
  ownerAuthUserId: uuid("owner_auth_user_id"),
  name: text("name"),
  username: text("username").notNull().unique(),
  password: text("password"),
  email: text("email"),
  phone: text("phone"),
  planId: integer("plan_id").references(() => plans.id),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  subscriptionStatus: text("subscription_status", {
    enum: ["active", "inactive", "trialing", "past_due", "canceled"]
  }).default("inactive"),
  subscriptionExpiresAt: timestamp("subscription_expires_at"),
  role: text("role", { enum: ["admin", "operator", "viewer"] }).notNull().default("operator"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Employees table
export const employees = pgTable("employees", {
  id: serial("id").primaryKey(),
  authUserId: uuid("auth_user_id").notNull().references(() => users.authUserId),
  employeeNumber: integer("employee_number").notNull(),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  email: text("email").notNull().unique(),
  birthDate: date("birth_date"),
  address: text("address"),
  position: text("position").notNull(),
  salary: decimal("salary", { precision: 10, scale: 2 }),
  hireDate: date("hire_date").notNull(),
  photo: text("photo"),
  isActive: boolean("is_active").notNull().default(true),
  accessAuthUserId: uuid("access_auth_user_id"),
  accessEmail: text("access_email"),
  // Granular sidebar/route permission keys for employees with login access
  // (e.g. "clients.list", "financial.overview"). Ignored for the owner, who
  // always has full access regardless of this field.
  permissions: jsonb("permissions").$type<string[]>().notNull().default([]),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Systems table
export const systems = pgTable("systems", {
  id: serial("id").primaryKey(),
  authUserId: uuid("auth_user_id").notNull().references(() => users.authUserId),
  systemNumber: integer("system_number").notNull(),
  name: text("name").notNull(),
  value: decimal("value", { precision: 10, scale: 2 }),
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Clients table for IPTV subscribers
export const clients = pgTable("clients", {
  id: serial("id").primaryKey(),
  authUserId: uuid("auth_user_id").notNull().references(() => users.authUserId),
  clientNumber: integer("client_number").notNull(),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  username: text("username").notNull(),
  password: text("password").notNull(),
  system: text("system").notNull(),
  subscriptionStatus: text("subscription_status", {
    enum: ["Ativa", "Inativa", "Aguardando", "Teste"]
  }).notNull().default("Ativa"),
  paymentMethod: text("payment_method").notNull().default("pix"),
  activationDate: date("activation_date").notNull(),
  expiryDate: date("expiry_date").notNull(),
  paymentStatus: text("payment_status", {
    enum: ["Pago", "Vencido", "A Pagar"]
  }).notNull().default("Pago"),
  plan: text("plan").notNull(),
  value: decimal("value", { precision: 10, scale: 2 }).notNull(),
  renewalMode: text("renewal_mode", { enum: ["automatic", "manual"] }).notNull().default("automatic"),
  referralSource: text("referral_source"),
  referredById: integer("referred_by_id"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Payment history table - tracks actual revenue from new clients and renewals
export const paymentHistory = pgTable("payment_history", {
  id: serial("id").primaryKey(),
  authUserId: uuid("auth_user_id").notNull().references(() => users.authUserId),
  clientId: integer("client_id").notNull().references(() => clients.id),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  paymentDate: date("payment_date").notNull(),
  type: text("type", {
    enum: ["new_client", "renewal", "addon"]
  }).notNull(),
  previousExpiryDate: date("previous_expiry_date"),
  newExpiryDate: date("new_expiry_date"),
  description: text("description"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Client plans table - tenant-scoped IPTV subscription plans
export const clientPlans = pgTable("client_plans", {
  id: serial("id").primaryKey(),
  authUserId: uuid("auth_user_id").notNull().references(() => users.authUserId),
  name: text("name").notNull(),
  value: decimal("value", { precision: 10, scale: 2 }).notNull(),
  durationType: text("duration_type", { enum: ["months", "days"] }).notNull().default("months"),
  durationQuantity: integer("duration_quantity").notNull().default(1),
  description: text("description"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// System credit rules - how many panel credits a full plan renewal consumes,
// per system + client plan combination
export const systemCreditRules = pgTable("system_credit_rules", {
  id: serial("id").primaryKey(),
  authUserId: uuid("auth_user_id").notNull().references(() => users.authUserId),
  systemId: integer("system_id").notNull().references(() => systems.id),
  clientPlanId: integer("client_plan_id").notNull().references(() => clientPlans.id),
  creditsConsumed: integer("credits_consumed").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  systemPlanUnique: unique().on(table.authUserId, table.systemId, table.clientPlanId),
}));

// Manual renewal plans - header for a client's manually month-by-month tracked
// plan (Trimestral/Semestral/Anual), replacing the spreadsheet control
export const manualRenewalPlans = pgTable("manual_renewal_plans", {
  id: serial("id").primaryKey(),
  authUserId: uuid("auth_user_id").notNull().references(() => users.authUserId),
  clientId: integer("client_id").notNull().references(() => clients.id),
  systemId: integer("system_id").notNull().references(() => systems.id),
  clientPlanId: integer("client_plan_id").notNull().references(() => clientPlans.id),
  planPeriod: text("plan_period", { enum: ["trimestral", "semestral", "anual"] }).notNull(),
  activationDate: date("activation_date").notNull(),
  renewDay: integer("renew_day").notNull(),
  finalDate: date("final_date").notNull(),
  totalInstallments: integer("total_installments").notNull(),
  // Not requested verbatim in the column list, but required to fulfill the
  // "encerrar o plano manual sem apagar o histórico" behavior when a client
  // switches back to renewalMode='automatic'.
  status: text("status", { enum: ["active", "closed"] }).notNull().default("active"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// One row per month (MÊS 1...MÊS N in the spreadsheet) for a manual renewal plan
export const manualRenewalInstallments = pgTable("manual_renewal_installments", {
  id: serial("id").primaryKey(),
  authUserId: uuid("auth_user_id").notNull().references(() => users.authUserId),
  manualRenewalPlanId: integer("manual_renewal_plan_id").notNull().references(() => manualRenewalPlans.id),
  monthNumber: integer("month_number").notNull(),
  dueDate: date("due_date").notNull(),
  completed: boolean("completed").notNull().default(false),
  completedAt: timestamp("completed_at"),
}, (table) => ({
  planMonthUnique: unique().on(table.manualRenewalPlanId, table.monthNumber),
}));

// Panel-credit consumption ledger - separate from payment_history (revenue),
// tracks internal credit usage per completed manual renewal installment
export const creditConsumptionHistory = pgTable("credit_consumption_history", {
  id: serial("id").primaryKey(),
  authUserId: uuid("auth_user_id").notNull().references(() => users.authUserId),
  systemId: integer("system_id").notNull().references(() => systems.id),
  clientPlanId: integer("client_plan_id").notNull().references(() => clientPlans.id),
  // Exactly one of these two is set, depending on origin:
  // - manualRenewalInstallmentId: consumption logged from a manual renewal
  //   plan installment being checked off (Renovações Manuais).
  // - sourcePaymentHistoryId: consumption logged automatically alongside a
  //   payment_history row (new_client/renewal) for a renewalMode='automatic'
  //   client — either live (at insert time) or via the one-time backfill.
  manualRenewalInstallmentId: integer("manual_renewal_installment_id").unique()
    .references(() => manualRenewalInstallments.id),
  sourcePaymentHistoryId: integer("source_payment_history_id").unique()
    .references(() => paymentHistory.id),
  credits: integer("credits").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Manual financial entries - freestanding entradas/saidas not tied to an
// automatic system event (e.g. administrative expenses, manual adjustments)
export const manualFinancialEntries = pgTable("manual_financial_entries", {
  id: serial("id").primaryKey(),
  authUserId: uuid("auth_user_id").notNull().references(() => users.authUserId),
  type: text("type", { enum: ["entrada", "saida"] }).notNull(),
  description: text("description").notNull(),
  value: decimal("value", { precision: 10, scale: 2 }).notNull(),
  date: date("date").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Apps - IPTV client apps catalog (e.g. Clouddy, Smartone)
export const apps = pgTable("apps", {
  id: serial("id").primaryKey(),
  authUserId: uuid("auth_user_id").notNull().references(() => users.authUserId),
  name: text("name").notNull(),
  activationValue: decimal("activation_value", { precision: 10, scale: 2 }).notNull(),
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Client Apps - links a client to one or more apps (one primary + optional additional)
export const clientApps = pgTable("client_apps", {
  id: serial("id").primaryKey(),
  authUserId: uuid("auth_user_id").notNull().references(() => users.authUserId),
  clientId: integer("client_id").notNull().references(() => clients.id),
  appId: integer("app_id").notNull().references(() => apps.id),
  isPrimary: boolean("is_primary").notNull().default(true),
  expiryDate: date("expiry_date"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// CRM contacts - synced automatically from clients, one contact per client per tenant
export const crmContacts = pgTable("crm_contacts", {
  id: serial("id").primaryKey(),
  authUserId: uuid("auth_user_id").notNull().references(() => users.authUserId),
  clientId: integer("client_id").notNull().references(() => clients.id),
  phone: text("phone").notNull(),
  displayName: text("display_name").notNull(),
  lastMessageAt: timestamp("last_message_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  clientTenantUnique: unique().on(table.authUserId, table.clientId),
}));

// CRM messages - conversation history per contact
export const crmMessages = pgTable("crm_messages", {
  id: serial("id").primaryKey(),
  authUserId: uuid("auth_user_id").notNull().references(() => users.authUserId),
  contactId: integer("contact_id").notNull().references(() => crmContacts.id),
  direction: text("direction", { enum: ["inbound", "outbound"] }).notNull(),
  content: text("content").notNull(),
  status: text("status"),
  waMessageId: text("wa_message_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// WhatsApp connection per tenant (Embedded Signup or manual WABA)
export const whatsappConnections = pgTable("whatsapp_connections", {
  id: serial("id").primaryKey(),
  authUserId: uuid("auth_user_id").notNull().unique().references(() => users.authUserId),
  connectionType: text("connection_type", { enum: ["embedded_signup", "manual"] }).notNull(),
  wabaId: text("waba_id"),
  phoneNumberId: text("phone_number_id").notNull(),
  accessToken: text("access_token").notNull(),
  displayPhoneNumber: text("display_phone_number"),
  verifyToken: text("verify_token").notNull(),
  status: text("status", { enum: ["connected", "disconnected", "error"] }).notNull().default("disconnected"),
  connectedAt: timestamp("connected_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// CRM message templates (WhatsApp Business Message Templates via Graph API)
export const crmTemplates = pgTable("crm_templates", {
  id: serial("id").primaryKey(),
  authUserId: uuid("auth_user_id").notNull().references(() => users.authUserId),
  metaTemplateId: text("meta_template_id"),
  name: text("name").notNull(),
  category: text("category", { enum: ["utility", "marketing", "authentication"] }).notNull(),
  language: text("language").notNull().default("pt_BR"),
  status: text("status", { enum: ["pending", "approved", "rejected", "disabled"] }).notNull().default("pending"),
  headerText: text("header_text"),
  bodyText: text("body_text").notNull(),
  footerText: text("footer_text"),
  variablesCount: integer("variables_count").notNull().default(0),
  buttons: jsonb("buttons").$type<{ type: string; text: string; url?: string; phoneNumber?: string }[]>(),
  rejectionReason: text("rejection_reason"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  nameTenantUnique: unique().on(table.authUserId, table.name),
}));

// CRM automation rules - internal engine replacing n8n for WhatsApp triggers
export const crmAutomations = pgTable("crm_automations", {
  id: serial("id").primaryKey(),
  authUserId: uuid("auth_user_id").notNull().references(() => users.authUserId),
  name: text("name").notNull(),
  triggerType: text("trigger_type", {
    enum: ["before_expiry", "after_expiry", "client_created", "manual"]
  }).notNull(),
  triggerDays: integer("trigger_days"),
  templateId: integer("template_id").notNull().references(() => crmTemplates.id),
  templateVariableMapping: jsonb("template_variable_mapping").$type<string[]>().notNull().default([]),
  targetFilter: jsonb("target_filter").$type<Record<string, unknown>>(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// CRM automation execution log - one row per dispatch attempt
export const crmAutomationRuns = pgTable("crm_automation_runs", {
  id: serial("id").primaryKey(),
  authUserId: uuid("auth_user_id").notNull().references(() => users.authUserId),
  automationId: integer("automation_id").notNull().references(() => crmAutomations.id),
  contactId: integer("contact_id").notNull().references(() => crmContacts.id),
  status: text("status", { enum: ["sent", "failed", "skipped"] }).notNull(),
  waMessageId: text("wa_message_id"),
  errorMessage: text("error_message"),
  executedAt: timestamp("executed_at").notNull().defaultNow(),
});

// Insert schemas
export const insertPlanSchema = createInsertSchema(plans).omit({
  id: true,
  createdAt: true,
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertEmployeeSchema = createInsertSchema(employees).omit({
  id: true,
  authUserId: true,
  employeeNumber: true,
  createdAt: true,
});

export const insertSystemSchema = createInsertSchema(systems).omit({
  id: true,
  authUserId: true,
  systemNumber: true,
  createdAt: true,
});

export const insertClientSchema = createInsertSchema(clients).omit({
  id: true,
  authUserId: true,
  clientNumber: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPaymentHistorySchema = createInsertSchema(paymentHistory).omit({
  id: true,
  authUserId: true,
  createdAt: true,
});

export const insertClientPlanSchema = createInsertSchema(clientPlans).omit({
  id: true,
  authUserId: true,
  createdAt: true,
});

export const insertSystemCreditRuleSchema = createInsertSchema(systemCreditRules).omit({
  id: true,
  authUserId: true,
  createdAt: true,
  updatedAt: true,
});

export const insertManualRenewalPlanSchema = createInsertSchema(manualRenewalPlans).omit({
  id: true,
  authUserId: true,
  createdAt: true,
  updatedAt: true,
});

export const insertManualRenewalInstallmentSchema = createInsertSchema(manualRenewalInstallments).omit({
  id: true,
  authUserId: true,
});

export const insertCreditConsumptionHistorySchema = createInsertSchema(creditConsumptionHistory).omit({
  id: true,
  authUserId: true,
  createdAt: true,
});

export const insertManualFinancialEntrySchema = createInsertSchema(manualFinancialEntries).omit({
  id: true,
  authUserId: true,
  createdAt: true,
});

export const insertAppSchema = createInsertSchema(apps).omit({
  id: true,
  authUserId: true,
  createdAt: true,
  updatedAt: true,
});

export const insertClientAppSchema = createInsertSchema(clientApps).omit({
  id: true,
  authUserId: true,
  createdAt: true,
});

export const insertCrmContactSchema = createInsertSchema(crmContacts).omit({
  id: true,
  authUserId: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCrmMessageSchema = createInsertSchema(crmMessages).omit({
  id: true,
  authUserId: true,
  createdAt: true,
});

export const insertWhatsappConnectionSchema = createInsertSchema(whatsappConnections).omit({
  id: true,
  authUserId: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCrmAutomationSchema = createInsertSchema(crmAutomations).omit({
  id: true,
  authUserId: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCrmAutomationRunSchema = createInsertSchema(crmAutomationRuns).omit({
  id: true,
  authUserId: true,
  executedAt: true,
});

export const insertCrmTemplateSchema = createInsertSchema(crmTemplates).omit({
  id: true,
  authUserId: true,
  metaTemplateId: true,
  status: true,
  variablesCount: true,
  rejectionReason: true,
  createdAt: true,
  updatedAt: true,
});

// Types
export type Plan = typeof plans.$inferSelect;
export type InsertPlan = z.infer<typeof insertPlanSchema>;

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Employee = typeof employees.$inferSelect;
export type InsertEmployee = z.infer<typeof insertEmployeeSchema>;

export type System = typeof systems.$inferSelect;
export type InsertSystem = z.infer<typeof insertSystemSchema>;

export type Client = typeof clients.$inferSelect;
export type InsertClient = z.infer<typeof insertClientSchema>;

export type PaymentHistory = typeof paymentHistory.$inferSelect;
export type InsertPaymentHistory = z.infer<typeof insertPaymentHistorySchema>;


export type ClientPlan = typeof clientPlans.$inferSelect;
export type InsertClientPlan = z.infer<typeof insertClientPlanSchema>;

export type SystemCreditRule = typeof systemCreditRules.$inferSelect;
export type InsertSystemCreditRule = z.infer<typeof insertSystemCreditRuleSchema>;

export type ManualRenewalPlan = typeof manualRenewalPlans.$inferSelect;
export type InsertManualRenewalPlan = z.infer<typeof insertManualRenewalPlanSchema>;

export type ManualRenewalInstallment = typeof manualRenewalInstallments.$inferSelect;
export type InsertManualRenewalInstallment = z.infer<typeof insertManualRenewalInstallmentSchema>;

export type CreditConsumptionHistory = typeof creditConsumptionHistory.$inferSelect;
export type InsertCreditConsumptionHistory = z.infer<typeof insertCreditConsumptionHistorySchema>;

export type ManualFinancialEntry = typeof manualFinancialEntries.$inferSelect;
export type InsertManualFinancialEntry = z.infer<typeof insertManualFinancialEntrySchema>;

export type App = typeof apps.$inferSelect;
export type InsertApp = z.infer<typeof insertAppSchema>;

export type ClientApp = typeof clientApps.$inferSelect;
export type InsertClientApp = z.infer<typeof insertClientAppSchema>;

export type CrmContact = typeof crmContacts.$inferSelect;
export type InsertCrmContact = z.infer<typeof insertCrmContactSchema>;

export type CrmMessage = typeof crmMessages.$inferSelect;
export type InsertCrmMessage = z.infer<typeof insertCrmMessageSchema>;

export type WhatsappConnection = typeof whatsappConnections.$inferSelect;
export type InsertWhatsappConnection = z.infer<typeof insertWhatsappConnectionSchema>;

export type CrmAutomation = typeof crmAutomations.$inferSelect;
export type InsertCrmAutomation = z.infer<typeof insertCrmAutomationSchema>;

export type CrmAutomationRun = typeof crmAutomationRuns.$inferSelect;
export type InsertCrmAutomationRun = z.infer<typeof insertCrmAutomationRunSchema>;

export type CrmTemplate = typeof crmTemplates.$inferSelect;
export type InsertCrmTemplate = z.infer<typeof insertCrmTemplateSchema>;
