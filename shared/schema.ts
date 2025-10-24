import { pgTable, text, serial, integer, boolean, timestamp, decimal, varchar, date, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table for authentication and access control
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull().unique(),
  role: text("role", { enum: ["admin", "operator", "viewer"] }).notNull().default("operator"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Employees table
export const employees = pgTable("employees", {
  id: serial("id").primaryKey(),
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
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Systems table
export const systems = pgTable("systems", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Clients table for IPTV subscribers
export const clients = pgTable("clients", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  username: text("username").notNull(),
  password: text("password").notNull(),
  system: text("system").notNull(),
  subscriptionStatus: text("subscription_status", {
    enum: ["Ativa", "Inativa", "Aguardando", "Teste"]
  }).notNull().default("Ativa"),
  paymentMethods: jsonb("payment_methods").$type<string[]>().notNull().default([]),
  activationDate: date("activation_date").notNull(),
  expiryDate: date("expiry_date").notNull(),
  paymentStatus: text("payment_status", {
    enum: ["Pago", "Vencido", "A Pagar"]
  }).notNull().default("Pago"),
  plan: text("plan").notNull(),
  value: decimal("value", { precision: 10, scale: 2 }).notNull(),
  referralSource: text("referral_source"),
  referredById: integer("referred_by_id"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// WhatsApp instances table
export const whatsappInstances = pgTable("whatsapp_instances", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  instanceId: text("instance_id").unique(),
  qrCode: text("qr_code"),
  status: text("status", {
    enum: ["disconnected", "connecting", "connected"]
  }).notNull().default("disconnected"),
  webhookUrl: text("webhook_url"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Message templates table
export const messageTemplates = pgTable("message_templates", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  imageUrl: text("image_url"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Billing history table
export const billingHistory = pgTable("billing_history", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull().references(() => clients.id),
  instanceId: integer("instance_id").notNull().references(() => whatsappInstances.id),
  templateId: integer("template_id").notNull().references(() => messageTemplates.id),
  message: text("message").notNull(),
  status: text("status", {
    enum: ["sent", "failed", "pending"]
  }).notNull().default("pending"),
  sentAt: timestamp("sent_at"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Payment history table - tracks actual revenue from new clients and renewals
export const paymentHistory = pgTable("payment_history", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull().references(() => clients.id),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  paymentDate: date("payment_date").notNull(),
  type: text("type", {
    enum: ["new_client", "renewal"]
  }).notNull(),
  previousExpiryDate: date("previous_expiry_date"),
  newExpiryDate: date("new_expiry_date").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Automation configurations table
export const automationConfigs = pgTable("automation_configs", {
  id: serial("id").primaryKey(),
  automationType: text("automation_type", {
    enum: ["cobrancas", "reativacao", "novosClientes"]
  }).notNull().unique(),
  isActive: boolean("is_active").notNull().default(false),
  scheduledTime: text("scheduled_time").notNull(),
  whatsappInstanceId: integer("whatsapp_instance_id").references(() => whatsappInstances.id),
  subItems: jsonb("sub_items").$type<Array<{
    id: string;
    name: string;
    active: boolean;
    templateId: number | null;
    clientCount: number;
  }>>().notNull().default([]),
  webhookUrl: text("webhook_url").notNull(),
  lastRunAt: timestamp("last_run_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertEmployeeSchema = createInsertSchema(employees).omit({
  id: true,
  createdAt: true,
});

export const insertSystemSchema = createInsertSchema(systems).omit({
  id: true,
  createdAt: true,
});

export const insertClientSchema = createInsertSchema(clients).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertWhatsappInstanceSchema = createInsertSchema(whatsappInstances).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMessageTemplateSchema = createInsertSchema(messageTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertBillingHistorySchema = createInsertSchema(billingHistory).omit({
  id: true,
  createdAt: true,
});

export const insertPaymentHistorySchema = createInsertSchema(paymentHistory).omit({
  id: true,
  createdAt: true,
});

export const insertAutomationConfigSchema = createInsertSchema(automationConfigs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastRunAt: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Employee = typeof employees.$inferSelect;
export type InsertEmployee = z.infer<typeof insertEmployeeSchema>;

export type System = typeof systems.$inferSelect;
export type InsertSystem = z.infer<typeof insertSystemSchema>;

export type Client = typeof clients.$inferSelect;
export type InsertClient = z.infer<typeof insertClientSchema>;

export type WhatsappInstance = typeof whatsappInstances.$inferSelect;
export type InsertWhatsappInstance = z.infer<typeof insertWhatsappInstanceSchema>;

export type MessageTemplate = typeof messageTemplates.$inferSelect;
export type InsertMessageTemplate = z.infer<typeof insertMessageTemplateSchema>;

export type BillingHistory = typeof billingHistory.$inferSelect;
export type InsertBillingHistory = z.infer<typeof insertBillingHistorySchema>;

export type PaymentHistory = typeof paymentHistory.$inferSelect;
export type InsertPaymentHistory = z.infer<typeof insertPaymentHistorySchema>;

export type AutomationConfig = typeof automationConfigs.$inferSelect;
export type InsertAutomationConfig = z.infer<typeof insertAutomationConfigSchema>;
