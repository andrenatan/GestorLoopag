import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import {
  insertUserSchema, insertEmployeeSchema, insertSystemSchema, insertClientSchema,
  insertPaymentHistorySchema, insertPlanSchema, insertClientPlanSchema,
  insertCrmAutomationSchema, insertAppSchema, insertSystemCreditRuleSchema,
  insertManualFinancialEntrySchema,
  type User, type Client as ClientRow
} from "@shared/schema";
import { runAutomationNow } from "./automation-engine";
import multer from "multer";
import { Client } from "@replit/object-storage";
import bcrypt from "bcryptjs";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { db } from "../db";
import { sql, eq } from "drizzle-orm";
import { users } from "@shared/schema";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";
import {
  sendWhatsappText,
  countTemplateVariables,
  createMetaMessageTemplate,
  fetchMetaMessageTemplateStatus,
  deleteMetaMessageTemplate,
} from "./utils/whatsapp";

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_ANON_KEY || ''
);

const supabaseAdmin = process.env.SUPABASE_SERVICE_ROLE_KEY
  ? createClient(
      process.env.SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )
  : null;

// Extend Express types
declare module 'express-session' {
  interface SessionData {
    userId: number;
  }
}

declare global {
  namespace Express {
    interface Request {
      user?: User;
      effectiveAuthUserId?: string;
      isOwner?: boolean;
      employeePermissions?: string[];
    }
  }
}

// Owner-only middleware: blocks employees (users with ownerAuthUserId set)
function requireOwner(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ message: "Não autenticado" });
  }
  if (req.user.ownerAuthUserId) {
    return res.status(403).json({ message: "Você não tem acesso a esta tela. Verifique com seu gestor." });
  }
  next();
}

// Permission keys mirror the sidebar structure 1:1 — see PERMISSION_KEYS in
// client/src/components/layout/sidebar.tsx, which must be kept in sync.
type PermissionKey =
  | "dashboard"
  | "clients.list"
  | "clients.plans"
  | "clients.systems"
  | "clients.apps"
  | "clients.manual_renewals"
  | "rankings"
  | "employees"
  | "financial.overview"
  | "financial.reports"
  | "crm.conversations"
  | "crm.automations"
  | "crm.templates"
  | "crm.connection";

// Granular middleware: the owner (users.ownerAuthUserId === null) always has
// full access. An employee only passes if `key` is in their linked
// employees.permissions array (populated onto req.employeePermissions by the
// auth middleware below).
function requirePermission(key: PermissionKey) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: "Não autenticado" });
    }
    if (!req.user.ownerAuthUserId) {
      return next();
    }
    if (req.employeePermissions?.includes(key)) {
      return next();
    }
    return res.status(403).json({ message: "Você não tem permissão para acessar este recurso. Verifique com seu gestor." });
  };
}

// Like requirePermission, but passes if the employee has ANY of the given
// keys — used for read-only endpoints shared by two pages that each have
// their own permission (e.g. financial.overview and financial.reports both
// read from /api/financial/*).
function requireAnyPermission(...keys: PermissionKey[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: "Não autenticado" });
    }
    if (!req.user.ownerAuthUserId) {
      return next();
    }
    if (keys.some((key) => req.employeePermissions?.includes(key))) {
      return next();
    }
    return res.status(403).json({ message: "Você não tem permissão para acessar este recurso. Verifique com seu gestor." });
  };
}

function maskPhoneNumber(phone: string | null): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (digits.length <= 4) return phone;
  const visible = digits.slice(-4);
  return `${"*".repeat(digits.length - 4)}${visible}`;
}

const manualConnectSchema = z.object({
  phoneNumberId: z.string().min(1),
  accessToken: z.string().min(1),
  verifyToken: z.string().min(1),
});

const embeddedSignupSchema = z.object({
  code: z.string().min(1),
  phoneNumberId: z.string().min(1),
  wabaId: z.string().optional(),
});

const crmSendSchema = z.object({
  phone: z.string().min(1),
  content: z.string().min(1),
});

function getDateRange(startDateParam?: string, endDateParam?: string): { startDate: string; endDate: string } {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  const defaultStart = `${y}-${String(m).padStart(2, '0')}-01`;
  const lastDay = new Date(y, m, 0).getDate();
  const defaultEnd = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  return {
    startDate: startDateParam && dateRegex.test(startDateParam) ? startDateParam : defaultStart,
    endDate: endDateParam && dateRegex.test(endDateParam) ? endDateParam : defaultEnd,
  };
}

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Health check endpoint for Railway monitoring
  app.get("/health", (req, res) => {
    res.status(200).json({ 
      status: "healthy", 
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    });
  });

  // ============================================
  // N8N INTEGRATION ENDPOINT (registered before session/auth middleware)
  // ============================================
  app.post("/api/n8n/clients", async (req: Request, res: Response) => {
    try {
      const apiKey = (req.headers["x-api-key"] as string || "").trim();
      const expectedKey = (process.env.N8N_API_KEY || "").trim();

      console.log(`[N8N Auth] Expected key exists: ${!!expectedKey}, length: ${expectedKey.length}, starts with: "${expectedKey.substring(0, 8)}..."`);
      console.log(`[N8N Auth] Received key exists: ${!!apiKey}, length: ${apiKey.length}, starts with: "${apiKey.substring(0, 8)}..."`);
      console.log(`[N8N Auth] Keys match: ${apiKey === expectedKey}`);

      if (!expectedKey || apiKey !== expectedKey) {
        return res.status(401).json({ message: "API key inválida ou não configurada" });
      }

      const envAuthUserId = process.env.N8N_AUTH_USER_ID;
      const authUserId = envAuthUserId || (req.headers["x-auth-user-id"] as string);
      if (!authUserId) {
        return res.status(400).json({ message: "N8N_AUTH_USER_ID não configurado e header x-auth-user-id não fornecido" });
      }

      const user = await storage.getUserByAuthId(authUserId);
      if (!user) {
        return res.status(404).json({ message: "Usuário não encontrado para o auth_user_id configurado" });
      }

      const body = req.body;

      const getBrasiliaDateString = () => {
        const now = new Date();
        const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
        const brasiliaTime = new Date(utc + (3600000 * -3));
        return brasiliaTime.toISOString().split('T')[0];
      };

      const parseDateBR = (dateStr: string | undefined | null): string | undefined => {
        if (!dateStr) return undefined;
        const str = String(dateStr).trim();
        const brMatch = str.match(/^(\d{2})[\/\-](\d{2})[\/\-](\d{4})$/);
        if (brMatch) {
          const [, day, month, year] = brMatch;
          return `${year}-${month}-${day}`;
        }
        if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
          return str;
        }
        return str;
      };

      const rawActivationDate = body.activation_date || body.dataAtivacao || body.dataAtivação || getBrasiliaDateString();
      const rawExpiryDate = body.expiry_date || body.DataVencimento || body.dataVencimento;

      console.log(`[N8N] Raw dates received - activation: "${rawActivationDate}", expiry: "${rawExpiryDate}"`);

      const clientData = {
        name: body.name || body.Nome,
        phone: body.phone || body.Telefone,
        username: body.username || body["usuário"] || body.usuario,
        password: body.password || body.Telefone || body.phone,
        system: body.system || body.sistema || body.Sistema,
        subscriptionStatus: body.subscription_status || body["Situação"] || body.situacao || "Ativa",
        paymentMethod: body.payment_method || body["métodoPagamento"] || body.metodoPagamento || "pix",
        activationDate: parseDateBR(rawActivationDate),
        expiryDate: parseDateBR(rawExpiryDate),
        paymentStatus: body.payment_status || "Pago",
        plan: body.plan || body.Plano || body.plano || "Mensal",
        value: body.value || body.Valor || body.valor || "60.00",
        referralSource: body.referral_source || body.indicacao || body.indicação || null,
        notes: body.notes || body.notas || null,
      };

      if (!clientData.name || !clientData.phone || !clientData.username || !clientData.expiryDate) {
        return res.status(400).json({ 
          message: "Campos obrigatórios faltando: name, phone, username, expiry_date",
          received: Object.keys(body)
        });
      }

      const validatedData = insertClientSchema.parse(clientData);
      const client = await storage.createClient(authUserId, validatedData);

      await storage.createPaymentHistory(authUserId, {
        clientId: client.id,
        amount: validatedData.value,
        paymentDate: validatedData.activationDate,
        type: "new_client",
        newExpiryDate: validatedData.expiryDate,
        previousExpiryDate: null
      });

      console.log(`[n8n] Cliente criado: #${client.clientNumber} - ${client.name}`);

      res.status(201).json({
        success: true,
        client: {
          id: client.id,
          clientNumber: client.clientNumber,
          name: client.name,
          phone: client.phone,
          username: client.username,
          system: client.system,
          expiryDate: client.expiryDate,
          plan: client.plan,
          value: client.value,
        }
      });
    } catch (error: any) {
      console.error("[n8n Client Error]:", error.message || error);
      res.status(400).json({
        message: "Erro ao criar cliente via n8n",
        error: error.message || "Dados inválidos"
      });
    }
  });

  // ============================================
  // WHATSAPP CLOUD API WEBHOOK (público, registrado antes do middleware de sessão/auth)
  // ============================================
  app.get("/api/whatsapp/webhook", async (req: Request, res: Response) => {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    if (mode !== "subscribe" || typeof token !== "string") {
      return res.sendStatus(403);
    }

    const globalToken = process.env.WHATSAPP_VERIFY_TOKEN;
    if (globalToken && token === globalToken) {
      return res.status(200).send(challenge);
    }

    const connection = await storage.getWhatsappConnectionByVerifyToken(token);
    if (connection) {
      return res.status(200).send(challenge);
    }

    console.warn("[WhatsApp Webhook] Verification failed: token did not match any known verify_token");
    return res.sendStatus(403);
  });

  app.post("/api/whatsapp/webhook", async (req: Request, res: Response) => {
    // Responde rápido; a Meta reenvia agressivamente em respostas != 200
    res.sendStatus(200);

    try {
      const entries = req.body?.entry || [];
      for (const entry of entries) {
        for (const change of entry.changes || []) {
          const value = change.value;
          if (!value) continue;

          const phoneNumberId = value.metadata?.phone_number_id;
          if (!phoneNumberId) continue;

          const connection = await storage.getWhatsappConnectionByPhoneNumberId(phoneNumberId);
          if (!connection) {
            console.warn(`[WhatsApp Webhook] Nenhuma conexão encontrada para phone_number_id=${phoneNumberId}`);
            continue;
          }

          const authUserId = connection.authUserId;

          for (const message of value.messages || []) {
            const contact = await storage.getCrmContactByPhone(authUserId, message.from);
            if (!contact) {
              console.warn(`[WhatsApp Webhook] Nenhum crm_contact para phone=${message.from} (tenant=${authUserId}), mensagem descartada`);
              continue;
            }

            const content = message.type === "text"
              ? (message.text?.body ?? "")
              : `[mensagem não suportada: ${message.type}]`;

            await storage.createCrmMessage(authUserId, {
              contactId: contact.id,
              direction: "inbound",
              content,
              status: "received",
              waMessageId: message.id,
            });
            await storage.touchCrmContactLastMessage(authUserId, contact.id, new Date());
          }

          for (const status of value.statuses || []) {
            if (status.id && status.status) {
              await storage.updateCrmMessageStatusByWaId(authUserId, status.id, status.status);
            }
          }
        }
      }
    } catch (error) {
      console.error("[WhatsApp Webhook Processing Error]:", error);
    }
  });

  // Supabase config endpoint (anon key is public by design)
  app.get("/api/config/supabase", (req, res) => {
    res.json({
      url: process.env.SUPABASE_URL || '',
      anonKey: process.env.SUPABASE_ANON_KEY || '',
    });
  });
  
  // Configure PostgreSQL session store
  const PgSession = connectPgSimple(session);
  
  app.use(
    session({
      store: new PgSession({
        conObject: {
          connectionString: process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL,
        },
        createTableIfMissing: true,
      }),
      secret: process.env.SESSION_SECRET || 'loopag-secret-key-change-in-production',
      resave: false,
      saveUninitialized: false,
      cookie: {
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
      },
    })
  );

  // Middleware to attach user object to request
  app.use(async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Try Supabase JWT token first (from Authorization header)
      const authHeader = req.headers.authorization;
      
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        const { data: { user: supabaseUser }, error } = await supabase.auth.getUser(token);
        
        if (!error && supabaseUser) {
          // Get user metadata from database using authUserId
          let user = await storage.getUserByAuthId(supabaseUser.id);

          // Auto-repair: if the Supabase user is linked to an employee but
          // the local users row is missing or has no ownerAuthUserId, fix it.
          try {
            const employeeLink = await storage.getEmployeeByAccessAuthUserId(supabaseUser.id);
            if (employeeLink) {
              const ownerAuthUserId = employeeLink.authUserId;
              if (!user) {
                // Build a unique username
                const emailForUser = employeeLink.accessEmail || supabaseUser.email || `func${employeeLink.employeeNumber}`;
                let baseUsername = emailForUser.split("@")[0].toLowerCase().replace(/[^a-z0-9_]/g, "");
                if (!baseUsername) baseUsername = `func${employeeLink.employeeNumber}`;
                let candidate = baseUsername;
                let suffix = 0;
                while (await storage.getUserByUsername(candidate)) {
                  suffix += 1;
                  candidate = `${baseUsername}${suffix}`;
                }
                console.log(`[Auth Repair] Creating missing users row for employee ${employeeLink.id} (owner=${ownerAuthUserId})`);
                user = await storage.createUser({
                  authUserId: supabaseUser.id,
                  ownerAuthUserId,
                  name: employeeLink.name,
                  username: candidate,
                  email: employeeLink.accessEmail || supabaseUser.email || null,
                  phone: employeeLink.phone,
                  password: null,
                  role: "operator",
                  isActive: true,
                  planId: null,
                });
              } else if (!user.ownerAuthUserId) {
                console.log(`[Auth Repair] Linking users row ${user.id} to owner ${ownerAuthUserId} for employee ${employeeLink.id}`);
                const updated = await storage.updateUser(user.id, { ownerAuthUserId });
                if (updated) user = updated;
              }
            }
          } catch (repairErr) {
            console.error("[Auth Repair Error]:", repairErr);
          }

          if (user) {
            req.user = user;
            console.log(`[Auth] user.id=${user.id} authUserId=${user.authUserId} ownerAuthUserId=${user.ownerAuthUserId ?? "null"}`);
          } else {
            console.log(`[Auth] No local users row found for supabaseUser=${supabaseUser.id}`);
          }
        }
      }
      // Fallback to session-based auth (legacy)
      else if (req.session.userId) {
        const user = await storage.getUser(req.session.userId);
        if (user) {
          req.user = user;
        }
      }

      // Compute effective tenant ID (owner's authUserId for employees)
      if (req.user) {
        req.effectiveAuthUserId = req.user.ownerAuthUserId || req.user.authUserId || undefined;
        req.isOwner = !req.user.ownerAuthUserId;

        // Employees only get whatever their linked employees.permissions row
        // allows; the owner bypasses this entirely (isOwner check above).
        if (req.user.ownerAuthUserId && req.user.authUserId) {
          try {
            const employeeLink = await storage.getEmployeeByAccessAuthUserId(req.user.authUserId);
            req.employeePermissions = employeeLink?.permissions ?? [];
          } catch (permErr) {
            console.error("[Auth Middleware] Failed to load employee permissions:", permErr);
            req.employeePermissions = [];
          }
        }
      }
    } catch (error) {
      console.error("[Auth Middleware Error]:", error);
    }
    next();
  });

  // Subscription check middleware - use for protected routes that require active subscription
  const requireActiveSubscription = (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: "Autenticação necessária" });
    }
    
    // Check if user has active subscription
    if (req.user.subscriptionStatus !== 'active') {
      return res.status(403).json({ 
        message: "Assinatura inativa", 
        subscriptionStatus: req.user.subscriptionStatus,
        requiresSubscription: true
      });
    }
    
    // Check if subscription has expired (for recurring subscriptions)
    if (req.user.subscriptionExpiresAt) {
      const now = new Date();
      const expiresAt = new Date(req.user.subscriptionExpiresAt);
      if (now > expiresAt) {
        return res.status(403).json({ 
          message: "Assinatura expirada", 
          subscriptionStatus: 'expired',
          requiresSubscription: true
        });
      }
    }
    
    next();
  };

  // Authentication routes
  
  // Register new user
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { name, username, email, phone, password } = req.body;
      
      // Validation
      if (!name || !username || !email || !phone || !password) {
        return res.status(400).json({ message: "Todos os campos são obrigatórios" });
      }
      
      // Check if username already exists
      const existingUserByUsername = await storage.getUserByUsername(username);
      if (existingUserByUsername) {
        return res.status(400).json({ message: "Nome de usuário já está em uso" });
      }
      
      // Check if email already exists
      const existingUserByEmail = await storage.getUserByEmail(email);
      if (existingUserByEmail) {
        return res.status(400).json({ message: "E-mail já está cadastrado" });
      }
      
      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);
      
      // Create user
      const user = await storage.createUser({
        name,
        username,
        email,
        phone,
        password: hashedPassword,
        role: 'operator',
        isActive: true,
      });
      
      // Set session
      req.session.userId = user.id;
      
      res.json({ 
        id: user.id,
        name: user.name,
        username: user.username,
        email: user.email,
        phone: user.phone,
        planId: user.planId,
        role: user.role 
      });
    } catch (error) {
      console.error("[Register Error]:", error);
      res.status(500).json({ message: "Erro ao criar conta" });
    }
  });
  
  // Login
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ message: "Usuário e senha são obrigatórios" });
      }
      
      // Find user
      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.status(401).json({ message: "Usuário ou senha incorretos" });
      }
      
      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ message: "Usuário ou senha incorretos" });
      }
      
      // Check if user is active
      if (!user.isActive) {
        return res.status(401).json({ message: "Conta desativada" });
      }
      
      // Set session
      req.session.userId = user.id;
      
      res.json({
        id: user.id,
        name: user.name,
        username: user.username,
        email: user.email,
        phone: user.phone,
        planId: user.planId,
        role: user.role
      });
    } catch (error) {
      console.error("[Login Error]:", error);
      res.status(500).json({ message: "Erro ao fazer login" });
    }
  });
  
  // Get current user
  app.get("/api/auth/me", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Não autenticado" });
      }
      
      const user = await storage.getUser(req.session.userId);
      if (!user) {
        req.session.destroy(() => {});
        return res.status(401).json({ message: "Usuário não encontrado" });
      }
      
      res.json({
        id: user.id,
        name: user.name,
        username: user.username,
        email: user.email,
        phone: user.phone,
        planId: user.planId,
        role: user.role
      });
    } catch (error) {
      console.error("[Me Error]:", error);
      res.status(500).json({ message: "Erro ao buscar usuário" });
    }
  });
  
  // Logout
  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Erro ao fazer logout" });
      }
      res.json({ message: "Logout realizado com sucesso" });
    });
  });
  
  // Migration endpoint - run once to add Stripe columns  
  app.post("/api/migrate/stripe-columns", async (req, res) => {
    try {
      // Create plans table if it doesn't exist
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS plans (
          id SERIAL PRIMARY KEY,
          name TEXT NOT NULL UNIQUE,
          price NUMERIC(10, 2) NOT NULL,
          billing_period TEXT NOT NULL,
          stripe_price_id TEXT,
          features JSONB NOT NULL DEFAULT '[]',
          is_popular BOOLEAN NOT NULL DEFAULT FALSE,
          is_active BOOLEAN NOT NULL DEFAULT TRUE,
          created_at TIMESTAMP NOT NULL DEFAULT NOW()
        )
      `);
      
      // Add Stripe columns to users if not exist
      await db.execute(sql`
        ALTER TABLE users 
        ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
        ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
        ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'inactive',
        ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMP
      `);
      
      // Insert plans using ON CONFLICT to avoid duplicates
      await db.execute(sql`
        INSERT INTO plans (name, price, billing_period, features, is_popular, is_active)
        VALUES 
          ('Mensal', 60.00, 'monthly', '["Acesso completo ao sistema", "Suporte por email", "Atualizações automáticas"]'::jsonb, false, true),
          ('Semestral', 300.00, 'semiannual', '["Acesso completo ao sistema", "Suporte por email", "Atualizações automáticas", "15% de desconto"]'::jsonb, true, true),
          ('Anual', 600.00, 'yearly', '["Acesso completo ao sistema", "Suporte prioritário", "Atualizações automáticas", "17% de desconto"]'::jsonb, false, true),
          ('Vitalício', 1490.00, 'lifetime', '["Acesso completo ao sistema", "Suporte prioritário vitalício", "Atualizações automáticas", "Acesso permanente"]'::jsonb, false, true)
        ON CONFLICT (name) DO NOTHING
      `);
      
      res.json({ message: "Migration completed successfully" });
    } catch (error: any) {
      console.error("[Migration Error]:", error);
      res.status(500).json({ message: "Migration failed", error: error.message });
    }
  });
  
  // Update Stripe Price IDs for existing plans
  app.post("/api/migrate/update-stripe-price-ids", async (req, res) => {
    try {
      await db.execute(sql`
        UPDATE plans SET stripe_price_id = 'price_1SPD23ASuJTfpFioFwFru9X6' WHERE name = 'Mensal';
      `);
      await db.execute(sql`
        UPDATE plans SET stripe_price_id = 'price_1SPD3oASuJTfpFioihb9I0zm' WHERE name = 'Semestral';
      `);
      await db.execute(sql`
        UPDATE plans SET stripe_price_id = 'price_1SPD4UASuJTfpFiow91XcPvH' WHERE name = 'Anual';
      `);
      await db.execute(sql`
        UPDATE plans SET stripe_price_id = 'price_1SPD5jASuJTfpFioUSGEjekN' WHERE name = 'Vitalício';
      `);
      
      const updatedPlans = await storage.getAllPlans();
      res.json({ 
        message: "Stripe Price IDs updated successfully",
        plans: updatedPlans
      });
    } catch (error: any) {
      console.error("[Price ID Update Error]:", error);
      res.status(500).json({ message: "Failed to update Price IDs", error: error.message });
    }
  });

  // Plans routes
  app.get("/api/plans", async (req, res) => {
    try {
      const plans = await storage.getAllPlans();
      res.json(plans);
    } catch (error) {
      console.error("[Plans Error]:", error);
      res.status(500).json({ message: "Erro ao buscar planos" });
    }
  });
  
  // Supabase Auth - Get user metadata by auth_user_id
  app.get("/api/users/by-auth-id/:authUserId", async (req, res) => {
    try {
      const { authUserId } = req.params;
      
      // Security: Require authentication
      if (!req.user) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      // Security: Only allow users to fetch their own metadata
      if (req.user.authUserId !== authUserId) {
        return res.status(403).json({ message: "Acesso negado" });
      }
      
      const user = await storage.getUserByAuthId(authUserId);

      if (!user) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }

      // req.employeePermissions was already resolved by the auth middleware
      // for this same request; undefined for owners (no ownerAuthUserId).
      res.json({ ...user, permissions: req.employeePermissions ?? [] });
    } catch (error) {
      console.error("[Get User by Auth ID Error]:", error);
      res.status(500).json({ message: "Erro ao buscar usuário" });
    }
  });
  
  // Supabase Auth - Create user metadata after Supabase signup
  app.post("/api/users/metadata", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: "Token de autenticação não fornecido" });
      }

      const token = authHeader.substring(7);
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(token);
      
      if (authError || !authUser) {
        console.error("[Auth Verification Error]:", authError);
        return res.status(401).json({ message: "Token inválido ou expirado" });
      }

      const { name, username, email, phone } = req.body;
      const authUserId = authUser.id;
      
      if (!username) {
        return res.status(400).json({ message: "username é obrigatório" });
      }
      
      // Check if user already exists by authUserId
      const existingUser = await storage.getUserByAuthId(authUserId);
      if (existingUser) {
        return res.json(existingUser);
      }

      // Check for duplicate username
      const duplicateUsername = await storage.getUserByUsername(username);
      if (duplicateUsername) {
        return res.status(409).json({ message: "Nome de usuário já está em uso" });
      }

      // Check for duplicate email
      if (email) {
        const duplicateEmail = await storage.getUserByEmail(email);
        if (duplicateEmail) {
          return res.status(409).json({ message: "Email já está em uso" });
        }
      }
      
      // Create user metadata with normalized nullable fields
      const user = await storage.createUser({
        authUserId,
        name: name ?? null,
        username,
        email: email ?? null,
        phone: phone ?? null,
        password: null,
        role: 'operator',
        isActive: true,
        planId: null,
      });
      
      res.json(user);
    } catch (error) {
      console.error("[Create User Metadata Error]:", error);
      res.status(500).json({ message: "Erro ao criar metadata do usuário" });
    }
  });
  
  // Update user plan
  app.patch("/api/users/:id/plan", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const { planId } = req.body;
      
      // Check if user is authorized
      if (req.session.userId !== userId) {
        return res.status(403).json({ message: "Não autorizado" });
      }
      
      const user = await storage.updateUser(userId, { planId });
      if (!user) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }
      
      res.json(user);
    } catch (error) {
      console.error("[Update Plan Error]:", error);
      res.status(500).json({ message: "Erro ao atualizar plano" });
    }
  });
  
  // Configure multer for memory storage
  const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
      if (file.mimetype.startsWith('image/')) {
        cb(null, true);
      } else {
        cb(new Error('Only image files are allowed'));
      }
    }
  });

  // Image upload route
  app.post("/api/upload", upload.single('image'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const bucketName = process.env.REPLIT_OBJECT_STORAGE_BUCKET || 'loopag-templates';
      const objectStorageClient = new Client({ bucketId: bucketName });
      const fileName = `templates/${Date.now()}-${req.file.originalname}`;
      
      // Upload to Object Storage
      const { ok, error } = await objectStorageClient.uploadFromBytes(
        fileName,
        req.file.buffer
      );

      if (!ok) {
        console.error("Upload failed:", error);
        return res.status(500).json({ message: "Failed to upload file", error });
      }

      // Return the filename - we'll serve it via another route
      const url = `/api/images/${encodeURIComponent(fileName)}`;
      
      res.json({ url });
    } catch (error) {
      console.error("Upload error:", error);
      res.status(500).json({ message: "Failed to upload image", error });
    }
  });

  // Image serving route
  app.get("/api/images/:filename(*)", async (req, res) => {
    try {
      const fileName = decodeURIComponent(req.params.filename);
      const bucketName = process.env.REPLIT_OBJECT_STORAGE_BUCKET || 'loopag-templates';
      const objectStorageClient = new Client({ bucketId: bucketName });
      
      const { ok, value, error } = await objectStorageClient.downloadAsBytes(fileName);
      
      if (!ok || !value) {
        console.error("Download failed:", error);
        return res.status(404).json({ message: "Image not found" });
      }

      // Set appropriate content type
      const ext = fileName.split('.').pop()?.toLowerCase();
      const contentTypes: Record<string, string> = {
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'gif': 'image/gif',
        'webp': 'image/webp'
      };
      
      res.contentType(contentTypes[ext || 'jpg'] || 'image/jpeg');
      res.send(value);
    } catch (error) {
      console.error("Image serving error:", error);
      res.status(500).json({ message: "Failed to serve image", error });
    }
  });
  
  // Dashboard Stats
  app.get("/api/dashboard/stats", requirePermission("dashboard"), async (req, res) => {
    try {
      const authUserId = req.effectiveAuthUserId;
      if (!authUserId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const stats = await storage.getDashboardStats(authUserId);
      res.json(stats);
    } catch (error) {
      console.error("[Dashboard Stats Error]:", error);
      res.status(500).json({ message: "Failed to fetch dashboard stats", error: String(error) });
    }
  });

  app.get("/api/dashboard/new-clients-by-day", requirePermission("dashboard"), async (req, res) => {
    try {
      const authUserId = req.effectiveAuthUserId;
      if (!authUserId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      const { startDate, endDate } = getDateRange(req.query.startDate as string, req.query.endDate as string);
      const data = await storage.getNewClientsByDay(authUserId, startDate, endDate);
      res.json(data);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch new clients by day" });
    }
  });

  app.get("/api/dashboard/revenue-by-period", requirePermission("dashboard"), async (req, res) => {
    try {
      const authUserId = req.effectiveAuthUserId;
      if (!authUserId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const period = req.query.period as 'current_month' | 'last_month' | '3_months' | '6_months' | '12_months';
      if (!['current_month', 'last_month', '3_months', '6_months', '12_months'].includes(period)) {
        return res.status(400).json({ message: "Invalid period" });
      }
      const data = await storage.getRevenueByPeriod(authUserId, period);
      res.json(data);
    } catch (error) {
      console.error("[Revenue By Period Error]:", error);
      res.status(500).json({ message: "Failed to fetch revenue by period", error: String(error) });
    }
  });

  // Dashboard Charts - New endpoints
  app.get("/api/dashboard/revenue-by-system", requirePermission("dashboard"), async (req, res) => {
    try {
      const authUserId = req.effectiveAuthUserId;
      if (!authUserId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const month = req.query.month as string;
      if (!month || !/^\d{4}-\d{2}$/.test(month)) {
        return res.status(400).json({ message: "Invalid month format. Use YYYY-MM" });
      }
      
      const data = await storage.getRevenueBySystem(authUserId, month);
      res.json(data);
    } catch (error) {
      console.error("[Revenue By System Error]:", error);
      res.status(500).json({ message: "Failed to fetch revenue by system", error: String(error) });
    }
  });

  app.get("/api/dashboard/clients-by-system", requirePermission("dashboard"), async (req, res) => {
    try {
      const authUserId = req.effectiveAuthUserId;
      if (!authUserId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const month = req.query.month as string;
      if (!month || !/^\d{4}-\d{2}$/.test(month)) {
        return res.status(400).json({ message: "Invalid month format. Use YYYY-MM" });
      }
      
      const data = await storage.getActiveClientsBySystem(authUserId, month);
      res.json(data);
    } catch (error) {
      console.error("[Clients By System Error]:", error);
      res.status(500).json({ message: "Failed to fetch clients by system", error: String(error) });
    }
  });

  app.get("/api/dashboard/clients-by-state", requirePermission("dashboard"), async (req, res) => {
    try {
      const authUserId = req.effectiveAuthUserId;
      if (!authUserId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const month = req.query.month as string;
      if (!month || !/^\d{4}-\d{2}$/.test(month)) {
        return res.status(400).json({ message: "Invalid month format. Use YYYY-MM" });
      }
      
      const data = await storage.getActiveClientsByState(authUserId, month);
      res.json(data);
    } catch (error) {
      console.error("[Clients By State Error]:", error);
      res.status(500).json({ message: "Failed to fetch clients by state", error: String(error) });
    }
  });

  app.get("/api/dashboard/churn-by-day", requirePermission("dashboard"), async (req, res) => {
    try {
      const authUserId = req.effectiveAuthUserId;
      if (!authUserId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      const { startDate, endDate } = getDateRange(req.query.startDate as string, req.query.endDate as string);
      const data = await storage.getChurnByDay(authUserId, startDate, endDate);
      res.json(data);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch churn by day", error: String(error) });
    }
  });

  app.get("/api/dashboard/payments-by-day", requirePermission("dashboard"), async (req, res) => {
    try {
      const authUserId = req.effectiveAuthUserId;
      if (!authUserId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      const { startDate, endDate } = getDateRange(req.query.startDate as string, req.query.endDate as string);
      const data = await storage.getPaymentsByDay(authUserId, startDate, endDate);
      res.json(data);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch payments by day", error: String(error) });
    }
  });

  // Users Routes — owner-only, returns only the calling owner's row (no cross-tenant exposure)
  app.get("/api/users", requireOwner, async (req, res) => {
    try {
      // Only return the calling owner's own user row (no cross-tenant leak)
      res.json(req.user ? [req.user] : []);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // Schema for user create/update via the public API — strips privilege/tenant-link fields
  const publicUserCreateSchema = insertUserSchema.omit({
    ownerAuthUserId: true,
    authUserId: true,
    role: true,
  });
  const publicUserUpdateSchema = publicUserCreateSchema.partial();

  app.post("/api/users", requireOwner, async (req, res) => {
    try {
      const validatedData = publicUserCreateSchema.parse(req.body);
      const user = await storage.createUser(validatedData);
      res.status(201).json(user);
    } catch (error) {
      res.status(400).json({ message: "Invalid user data", error });
    }
  });

  app.put("/api/users/:id", requireOwner, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      // Owner can only update their own row
      if (!req.user || req.user.id !== id) {
        return res.status(403).json({ message: "Você só pode atualizar sua própria conta" });
      }
      const validatedData = publicUserUpdateSchema.parse(req.body);
      const user = await storage.updateUser(id, validatedData);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json(user);
    } catch (error) {
      res.status(400).json({ message: "Invalid user data", error });
    }
  });

  // Employees Routes
  app.get("/api/employees", requirePermission("employees"), async (req, res) => {
    try {
      const authUserId = req.effectiveAuthUserId;
      if (!authUserId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const employees = await storage.getAllEmployees(authUserId);
      res.json(employees);
    } catch (error) {
      console.error("[Employees GET]:", error);
      res.status(500).json({ message: "Failed to fetch employees" });
    }
  });

  app.post("/api/employees", requirePermission("employees"), async (req, res) => {
    try {
      const authUserId = req.effectiveAuthUserId;
      if (!authUserId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const validatedData = insertEmployeeSchema.parse(req.body);
      const employee = await storage.createEmployee(authUserId, validatedData);
      res.status(201).json(employee);
    } catch (error) {
      res.status(400).json({ message: "Invalid employee data", error });
    }
  });

  app.put("/api/employees/:id", requirePermission("employees"), async (req, res) => {
    try {
      const authUserId = req.effectiveAuthUserId;
      if (!authUserId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const id = parseInt(req.params.id);
      const validatedData = insertEmployeeSchema.partial().parse(req.body);
      const employee = await storage.updateEmployee(authUserId, id, validatedData);
      
      if (!employee) {
        return res.status(404).json({ message: "Employee not found" });
      }
      
      res.json(employee);
    } catch (error) {
      res.status(400).json({ message: "Invalid employee data", error });
    }
  });

  app.delete("/api/employees/:id", requirePermission("employees"), async (req, res) => {
    try {
      const authUserId = req.effectiveAuthUserId;
      if (!authUserId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const id = parseInt(req.params.id);

      // If employee has access, revoke it first (delete supabase user + users row)
      const employee = await storage.getEmployee(authUserId, id);
      if (employee?.accessAuthUserId && supabaseAdmin) {
        try {
          await supabaseAdmin.auth.admin.deleteUser(employee.accessAuthUserId);
        } catch (e) {
          console.error("[Revoke on delete] Failed to remove supabase user:", e);
        }
        const linkedUser = await storage.getUserByAuthId(employee.accessAuthUserId);
        if (linkedUser) {
          await db.delete(users).where(eq(users.id, linkedUser.id));
        }
      }

      const deleted = await storage.deleteEmployee(authUserId, id);
      
      if (!deleted) {
        return res.status(404).json({ message: "Employee not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete employee" });
    }
  });

  // Grant login access to an employee (creates Supabase user + users metadata row)
  app.post("/api/employees/:id/grant-access", requireOwner, async (req, res) => {
    try {
      const ownerAuthUserId = req.user!.authUserId;
      if (!ownerAuthUserId) return res.status(401).json({ message: "Not authenticated" });
      if (!supabaseAdmin) {
        return res.status(500).json({ message: "Configuração do servidor incompleta (SUPABASE_SERVICE_ROLE_KEY ausente)" });
      }

      const id = parseInt(req.params.id);
      const { email, password } = req.body as { email?: string; password?: string };

      if (!email || !password) {
        return res.status(400).json({ message: "Email e senha são obrigatórios" });
      }
      if (password.length < 6) {
        return res.status(400).json({ message: "Senha deve ter pelo menos 6 caracteres" });
      }

      const employee = await storage.getEmployee(ownerAuthUserId, id);
      if (!employee) return res.status(404).json({ message: "Funcionário não encontrado" });
      if (employee.accessAuthUserId) {
        return res.status(409).json({ message: "Este funcionário já possui acesso. Revogue antes de criar novamente." });
      }

      // Check email already exists in our users table
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(409).json({ message: "Este email já está em uso por outro usuário" });
      }

      // Create Supabase auth user
      const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { name: employee.name, employee_id: employee.id, owner_auth_user_id: ownerAuthUserId },
      });

      if (createErr || !created.user) {
        console.error("[Grant Access] Supabase createUser error:", createErr);
        return res.status(400).json({ message: createErr?.message || "Falha ao criar usuário no Supabase" });
      }

      const newAuthUserId = created.user.id;

      // Build a unique username (employee email's local-part + employee number fallback)
      let baseUsername = email.split("@")[0].toLowerCase().replace(/[^a-z0-9_]/g, "");
      if (!baseUsername) baseUsername = `func${employee.employeeNumber}`;
      let candidate = baseUsername;
      let suffix = 0;
      while (await storage.getUserByUsername(candidate)) {
        suffix += 1;
        candidate = `${baseUsername}${suffix}`;
      }

      try {
        await storage.createUser({
          authUserId: newAuthUserId,
          ownerAuthUserId,
          name: employee.name,
          username: candidate,
          email,
          phone: employee.phone,
          password: null,
          role: "operator",
          isActive: true,
          planId: null,
        });
      } catch (e) {
        // Roll back the Supabase user if metadata insert fails
        await supabaseAdmin.auth.admin.deleteUser(newAuthUserId).catch(() => {});
        throw e;
      }

      await storage.updateEmployee(ownerAuthUserId, id, {
        accessAuthUserId: newAuthUserId,
        accessEmail: email,
      });

      res.json({ success: true, email, employeeId: id });
    } catch (error: any) {
      console.error("[Grant Access Error]:", error);
      res.status(500).json({ message: error?.message || "Erro ao conceder acesso" });
    }
  });

  // Revoke login access from an employee
  app.delete("/api/employees/:id/revoke-access", requireOwner, async (req, res) => {
    try {
      const ownerAuthUserId = req.user!.authUserId;
      if (!ownerAuthUserId) return res.status(401).json({ message: "Not authenticated" });
      if (!supabaseAdmin) {
        return res.status(500).json({ message: "Configuração do servidor incompleta" });
      }

      const id = parseInt(req.params.id);
      const employee = await storage.getEmployee(ownerAuthUserId, id);
      if (!employee) return res.status(404).json({ message: "Funcionário não encontrado" });
      if (!employee.accessAuthUserId) {
        return res.status(400).json({ message: "Este funcionário não possui acesso" });
      }

      try {
        await supabaseAdmin.auth.admin.deleteUser(employee.accessAuthUserId);
      } catch (e) {
        console.error("[Revoke Access] Failed to remove supabase user (continuing):", e);
      }

      const linkedUser = await storage.getUserByAuthId(employee.accessAuthUserId);
      if (linkedUser) {
        await db.delete(users).where(eq(users.id, linkedUser.id));
      }

      await storage.updateEmployee(ownerAuthUserId, id, {
        accessAuthUserId: null,
        accessEmail: null,
      });

      res.json({ success: true });
    } catch (error: any) {
      console.error("[Revoke Access Error]:", error);
      res.status(500).json({ message: error?.message || "Erro ao revogar acesso" });
    }
  });

  // Systems Routes
  // Open read: used as a shared lookup/dropdown by other permitted pages
  // (e.g. the client form's system select). Only writes are gated below.
  app.get("/api/systems", async (req, res) => {
    try {
      const authUserId = req.effectiveAuthUserId;
      if (!authUserId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const systems = await storage.getAllSystems(authUserId);
      res.json(systems);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch systems" });
    }
  });

  app.post("/api/systems", requirePermission("clients.systems"), async (req, res) => {
    try {
      const authUserId = req.effectiveAuthUserId;
      if (!authUserId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const validatedData = insertSystemSchema.parse(req.body);
      const system = await storage.createSystem(authUserId, validatedData);
      res.status(201).json(system);
    } catch (error) {
      res.status(400).json({ message: "Invalid system data", error });
    }
  });

  app.patch("/api/systems/:id", requirePermission("clients.systems"), async (req, res) => {
    try {
      const authUserId = req.effectiveAuthUserId;
      if (!authUserId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const id = parseInt(req.params.id);
      const validatedData = insertSystemSchema.partial().parse(req.body);
      const system = await storage.updateSystem(authUserId, id, validatedData);
      
      if (!system) {
        return res.status(404).json({ message: "System not found" });
      }
      
      res.json(system);
    } catch (error) {
      res.status(400).json({ message: "Invalid system data", error });
    }
  });

  app.delete("/api/systems/:id", requirePermission("clients.systems"), async (req, res) => {
    try {
      const authUserId = req.effectiveAuthUserId;
      if (!authUserId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const id = parseInt(req.params.id);
      const deleted = await storage.deleteSystem(authUserId, id);

      if (!deleted) {
        return res.status(404).json({ message: "System not found" });
      }

      res.status(204).send();
    } catch (error: any) {
      if (error?.message === "SYSTEM_IN_USE_BY_MANUAL_RENEWAL_PLANS") {
        return res.status(409).json({ message: "Sistema em uso por planos de renovação manual — não pode ser excluído" });
      }
      res.status(500).json({ message: "Failed to delete system" });
    }
  });

  // ============================================
  // WHATSAPP CRM - Connection management (seção 6 do CLAUDE.md)
  // ============================================

  app.get("/api/whatsapp/connection", requirePermission("crm.connection"), async (req, res) => {
    try {
      const authUserId = req.effectiveAuthUserId;
      if (!authUserId) return res.status(401).json({ message: "Not authenticated" });

      const connection = await storage.getWhatsappConnection(authUserId);
      if (!connection) {
        return res.json({ status: "disconnected" as const });
      }

      res.json({
        status: connection.status,
        connectionType: connection.connectionType,
        displayPhoneNumber: maskPhoneNumber(connection.displayPhoneNumber),
        connectedAt: connection.connectedAt,
      });
    } catch (error) {
      console.error("[WhatsApp Connection Error]:", error);
      res.status(500).json({ message: "Failed to fetch WhatsApp connection" });
    }
  });

  app.post("/api/whatsapp/connect/manual", requirePermission("crm.connection"), async (req, res) => {
    try {
      const authUserId = req.effectiveAuthUserId;
      if (!authUserId) return res.status(401).json({ message: "Not authenticated" });

      const { phoneNumberId, accessToken, verifyToken } = manualConnectSchema.parse(req.body);

      // Validate the credentials against the Graph API before persisting them
      const graphRes = await fetch(
        `https://graph.facebook.com/v21.0/${phoneNumberId}?fields=display_phone_number`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

      if (!graphRes.ok) {
        const errBody = await graphRes.text();
        console.error("[WhatsApp Manual Connect] Graph API validation failed:", errBody);
        return res.status(400).json({ message: "Não foi possível validar as credenciais informadas com a Meta" });
      }

      const graphData = await graphRes.json();

      const connection = await storage.upsertWhatsappConnection(authUserId, {
        connectionType: "manual",
        phoneNumberId,
        accessToken,
        verifyToken,
        wabaId: null,
        displayPhoneNumber: graphData.display_phone_number || null,
        status: "connected",
        connectedAt: new Date(),
      });

      res.json({
        status: connection.status,
        connectionType: connection.connectionType,
        displayPhoneNumber: maskPhoneNumber(connection.displayPhoneNumber),
        connectedAt: connection.connectedAt,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Dados inválidos", errors: error.errors });
      }
      console.error("[WhatsApp Manual Connect Error]:", error);
      res.status(500).json({ message: "Falha ao conectar o WhatsApp" });
    }
  });

  app.post("/api/whatsapp/connect/embedded-signup", requirePermission("crm.connection"), async (req, res) => {
    try {
      const authUserId = req.effectiveAuthUserId;
      if (!authUserId) return res.status(401).json({ message: "Not authenticated" });

      const { code, phoneNumberId, wabaId } = embeddedSignupSchema.parse(req.body);

      const appId = process.env.WHATSAPP_APP_ID;
      const appSecret = process.env.WHATSAPP_APP_SECRET;
      if (!appId || !appSecret) {
        return res.status(500).json({ message: "WHATSAPP_APP_ID/WHATSAPP_APP_SECRET não configurados no servidor" });
      }

      // Exchange the Embedded Signup authorization code for a system user access token
      const tokenRes = await fetch(
        `https://graph.facebook.com/v21.0/oauth/access_token?client_id=${appId}&client_secret=${appSecret}&code=${encodeURIComponent(code)}`
      );

      if (!tokenRes.ok) {
        const errBody = await tokenRes.text();
        console.error("[WhatsApp Embedded Signup] Token exchange failed:", errBody);
        return res.status(400).json({ message: "Falha ao trocar o código pelo access token na Meta" });
      }

      const tokenData = await tokenRes.json();
      const accessToken = tokenData.access_token as string | undefined;
      if (!accessToken) {
        return res.status(400).json({ message: "Meta não retornou um access_token válido" });
      }

      const phoneRes = await fetch(
        `https://graph.facebook.com/v21.0/${phoneNumberId}?fields=display_phone_number`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      const phoneData = phoneRes.ok ? await phoneRes.json() : {};

      const connection = await storage.upsertWhatsappConnection(authUserId, {
        connectionType: "embedded_signup",
        phoneNumberId,
        accessToken,
        verifyToken: process.env.WHATSAPP_VERIFY_TOKEN || randomUUID(),
        wabaId: wabaId || null,
        displayPhoneNumber: phoneData.display_phone_number || null,
        status: "connected",
        connectedAt: new Date(),
      });

      res.json({
        status: connection.status,
        connectionType: connection.connectionType,
        displayPhoneNumber: maskPhoneNumber(connection.displayPhoneNumber),
        connectedAt: connection.connectedAt,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Dados inválidos", errors: error.errors });
      }
      console.error("[WhatsApp Embedded Signup Error]:", error);
      res.status(500).json({ message: "Falha ao concluir o Login Incorporado" });
    }
  });

  app.delete("/api/whatsapp/connection", requirePermission("crm.connection"), async (req, res) => {
    try {
      const authUserId = req.effectiveAuthUserId;
      if (!authUserId) return res.status(401).json({ message: "Not authenticated" });

      await storage.deleteWhatsappConnection(authUserId);
      res.status(204).send();
    } catch (error) {
      console.error("[WhatsApp Disconnect Error]:", error);
      res.status(500).json({ message: "Failed to disconnect WhatsApp" });
    }
  });

  app.get("/api/crm/conversations", requirePermission("crm.conversations"), async (req, res) => {
    try {
      const authUserId = req.effectiveAuthUserId;
      if (!authUserId) return res.status(401).json({ message: "Not authenticated" });

      const conversations = await storage.getCrmConversations(authUserId);
      res.json(conversations);
    } catch (error) {
      console.error("[CRM Conversations Error]:", error);
      res.status(500).json({ message: "Failed to fetch conversations" });
    }
  });

  app.get("/api/crm/conversations/:phone/messages", requirePermission("crm.conversations"), async (req, res) => {
    try {
      const authUserId = req.effectiveAuthUserId;
      if (!authUserId) return res.status(401).json({ message: "Not authenticated" });

      const contact = await storage.getCrmContactByPhone(authUserId, req.params.phone);
      if (!contact) return res.status(404).json({ message: "Contato não encontrado" });

      const messages = await storage.getCrmMessagesByContact(authUserId, contact.id);
      res.json({ contact, messages });
    } catch (error) {
      console.error("[CRM Messages Error]:", error);
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  app.post("/api/crm/send", requirePermission("crm.conversations"), async (req, res) => {
    try {
      const authUserId = req.effectiveAuthUserId;
      if (!authUserId) return res.status(401).json({ message: "Not authenticated" });

      const { phone, content } = crmSendSchema.parse(req.body);

      const connection = await storage.getWhatsappConnection(authUserId);
      if (!connection || connection.status !== "connected") {
        return res.status(400).json({ message: "Nenhuma conexão de WhatsApp ativa para este tenant" });
      }

      const contact = await storage.getCrmContactByPhone(authUserId, phone);
      if (!contact) {
        return res.status(404).json({ message: "Contato não encontrado" });
      }

      const result = await sendWhatsappText(connection, contact.phone, content);
      if (!result.ok) {
        console.error("[CRM Send Error] Graph API rejeitou a mensagem:", result.error);
        return res.status(400).json({ message: "Falha ao enviar mensagem via Cloud API" });
      }

      const message = await storage.createCrmMessage(authUserId, {
        contactId: contact.id,
        direction: "outbound",
        content,
        status: "sent",
        waMessageId: result.waMessageId,
      });
      await storage.touchCrmContactLastMessage(authUserId, contact.id, new Date());

      res.status(201).json(message);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Dados inválidos", errors: error.errors });
      }
      console.error("[CRM Send Error]:", error);
      res.status(500).json({ message: "Falha ao enviar mensagem" });
    }
  });

  const runNowSchema = z.object({
    clientId: z.number().int().optional(),
  });

  app.get("/api/crm/automations", requirePermission("crm.automations"), async (req, res) => {
    try {
      const authUserId = req.effectiveAuthUserId;
      if (!authUserId) return res.status(401).json({ message: "Not authenticated" });
      const automations = await storage.getAllCrmAutomations(authUserId);
      res.json(automations);
    } catch (error) {
      console.error("[CRM Automations Error]:", error);
      res.status(500).json({ message: "Failed to fetch automations" });
    }
  });

  app.post("/api/crm/automations", requirePermission("crm.automations"), async (req, res) => {
    try {
      const authUserId = req.effectiveAuthUserId;
      if (!authUserId) return res.status(401).json({ message: "Not authenticated" });
      const validatedData = insertCrmAutomationSchema.parse(req.body);

      const template = await storage.getCrmTemplate(authUserId, validatedData.templateId);
      if (!template) return res.status(404).json({ message: "Template não encontrado" });
      if (template.status !== "approved") {
        return res.status(400).json({ message: "Apenas templates aprovados podem ser usados em automações" });
      }
      const mapping = (validatedData.templateVariableMapping as string[]) || [];
      if (mapping.length !== template.variablesCount) {
        return res.status(400).json({
          message: `O template espera ${template.variablesCount} variável(is), mas ${mapping.length} foram informadas`,
        });
      }

      const automation = await storage.createCrmAutomation(authUserId, validatedData);
      res.status(201).json(automation);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Dados inválidos", errors: error.errors });
      }
      console.error("[CRM Automation Create Error]:", error);
      res.status(500).json({ message: "Failed to create automation" });
    }
  });

  app.put("/api/crm/automations/:id", requirePermission("crm.automations"), async (req, res) => {
    try {
      const authUserId = req.effectiveAuthUserId;
      if (!authUserId) return res.status(401).json({ message: "Not authenticated" });
      const id = parseInt(req.params.id);
      const validatedData = insertCrmAutomationSchema.partial().parse(req.body);

      if (validatedData.templateId !== undefined || validatedData.templateVariableMapping !== undefined) {
        const existing = await storage.getCrmAutomation(authUserId, id);
        if (!existing) return res.status(404).json({ message: "Automação não encontrada" });

        const templateId = validatedData.templateId ?? existing.templateId;
        const mapping = (validatedData.templateVariableMapping ?? existing.templateVariableMapping) as string[];

        const template = await storage.getCrmTemplate(authUserId, templateId);
        if (!template) return res.status(404).json({ message: "Template não encontrado" });
        if (template.status !== "approved") {
          return res.status(400).json({ message: "Apenas templates aprovados podem ser usados em automações" });
        }
        if (mapping.length !== template.variablesCount) {
          return res.status(400).json({
            message: `O template espera ${template.variablesCount} variável(is), mas ${mapping.length} foram informadas`,
          });
        }
      }

      const automation = await storage.updateCrmAutomation(authUserId, id, validatedData);
      if (!automation) return res.status(404).json({ message: "Automação não encontrada" });
      res.json(automation);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Dados inválidos", errors: error.errors });
      }
      console.error("[CRM Automation Update Error]:", error);
      res.status(500).json({ message: "Failed to update automation" });
    }
  });

  app.delete("/api/crm/automations/:id", requirePermission("crm.automations"), async (req, res) => {
    try {
      const authUserId = req.effectiveAuthUserId;
      if (!authUserId) return res.status(401).json({ message: "Not authenticated" });
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteCrmAutomation(authUserId, id);
      if (!deleted) return res.status(404).json({ message: "Automação não encontrada" });
      res.status(204).send();
    } catch (error) {
      console.error("[CRM Automation Delete Error]:", error);
      res.status(500).json({ message: "Failed to delete automation" });
    }
  });

  app.post("/api/crm/automations/:id/run-now", requirePermission("crm.automations"), async (req, res) => {
    try {
      const authUserId = req.effectiveAuthUserId;
      if (!authUserId) return res.status(401).json({ message: "Not authenticated" });
      const id = parseInt(req.params.id);
      const { clientId } = runNowSchema.parse(req.body ?? {});
      const result = await runAutomationNow(authUserId, id, clientId);
      res.json(result);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Dados inválidos", errors: error.errors });
      }
      console.error("[CRM Automation Run-Now Error]:", error);
      res.status(400).json({ message: (error as Error).message || "Falha ao disparar automação" });
    }
  });

  app.get("/api/crm/automations/:id/runs", requirePermission("crm.automations"), async (req, res) => {
    try {
      const authUserId = req.effectiveAuthUserId;
      if (!authUserId) return res.status(401).json({ message: "Not authenticated" });
      const id = parseInt(req.params.id);
      const { startDate, endDate, status } = req.query;
      const runs = await storage.getCrmAutomationRuns(authUserId, id, {
        startDate: typeof startDate === "string" ? startDate : undefined,
        endDate: typeof endDate === "string" ? endDate : undefined,
        status: typeof status === "string" ? status : undefined,
      });
      res.json(runs);
    } catch (error) {
      console.error("[CRM Automation Runs Error]:", error);
      res.status(500).json({ message: "Failed to fetch automation runs" });
    }
  });

  const templateButtonSchema = z.object({
    type: z.enum(["QUICK_REPLY", "URL", "PHONE_NUMBER"]),
    text: z.string().min(1),
    url: z.string().url().optional(),
    phoneNumber: z.string().optional(),
  });

  const createTemplateSchema = z.object({
    name: z.string().regex(/^[a-z0-9_]+$/, "Use apenas letras minúsculas, números e underscore"),
    category: z.enum(["utility", "marketing", "authentication"]),
    language: z.string().min(2).default("pt_BR"),
    headerText: z.string().max(60).optional(),
    bodyText: z.string().min(1),
    footerText: z.string().max(60).optional(),
    buttons: z.array(templateButtonSchema).max(3).optional(),
  });

  app.get("/api/crm/templates", requirePermission("crm.templates"), async (req, res) => {
    try {
      const authUserId = req.effectiveAuthUserId;
      if (!authUserId) return res.status(401).json({ message: "Not authenticated" });
      const templates = await storage.getAllCrmTemplates(authUserId);
      res.json(templates);
    } catch (error) {
      console.error("[CRM Templates Error]:", error);
      res.status(500).json({ message: "Failed to fetch templates" });
    }
  });

  app.post("/api/crm/templates", requirePermission("crm.templates"), async (req, res) => {
    try {
      const authUserId = req.effectiveAuthUserId;
      if (!authUserId) return res.status(401).json({ message: "Not authenticated" });

      const validatedData = createTemplateSchema.parse(req.body);

      const existing = await storage.getCrmTemplateByName(authUserId, validatedData.name);
      if (existing) {
        return res.status(409).json({ message: "Já existe um template com esse nome" });
      }

      const connection = await storage.getWhatsappConnection(authUserId);
      if (!connection || connection.status !== "connected") {
        return res.status(400).json({ message: "Nenhuma conexão de WhatsApp ativa para este tenant" });
      }
      if (!connection.wabaId) {
        return res.status(400).json({ message: "A conexão atual não tem um WABA ID configurado, necessário para gerenciar templates" });
      }

      const metaResult = await createMetaMessageTemplate(connection, connection.wabaId, validatedData);
      if (!metaResult.ok) {
        console.error("[CRM Template Create Error] Meta rejeitou o template:", metaResult.error);
        return res.status(400).json({ message: "A Meta rejeitou o template", error: metaResult.error });
      }

      const template = await storage.createCrmTemplate(authUserId, {
        metaTemplateId: metaResult.id,
        name: validatedData.name,
        category: validatedData.category,
        language: validatedData.language,
        status: metaResult.status as "pending" | "approved" | "rejected" | "disabled",
        headerText: validatedData.headerText ?? null,
        bodyText: validatedData.bodyText,
        footerText: validatedData.footerText ?? null,
        variablesCount: countTemplateVariables(validatedData.bodyText),
        buttons: validatedData.buttons ?? null,
        rejectionReason: null,
      });

      res.status(201).json(template);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Dados inválidos", errors: error.errors });
      }
      console.error("[CRM Template Create Error]:", error);
      res.status(500).json({ message: "Falha ao criar template" });
    }
  });

  app.post("/api/crm/templates/:id/sync", requirePermission("crm.templates"), async (req, res) => {
    try {
      const authUserId = req.effectiveAuthUserId;
      if (!authUserId) return res.status(401).json({ message: "Not authenticated" });

      const id = parseInt(req.params.id);
      const template = await storage.getCrmTemplate(authUserId, id);
      if (!template) return res.status(404).json({ message: "Template não encontrado" });

      const connection = await storage.getWhatsappConnection(authUserId);
      if (!connection || !connection.wabaId) {
        return res.status(400).json({ message: "Conexão de WhatsApp sem WABA ID configurado" });
      }

      const result = await fetchMetaMessageTemplateStatus(connection, connection.wabaId, template.name);
      if (!result.ok) {
        return res.status(400).json({ message: "Falha ao consultar status na Meta", error: result.error });
      }

      const updated = await storage.updateCrmTemplate(authUserId, id, {
        status: result.status as "pending" | "approved" | "rejected" | "disabled",
        rejectionReason: result.rejectionReason,
        metaTemplateId: result.metaTemplateId ?? template.metaTemplateId,
      });

      res.json(updated);
    } catch (error) {
      console.error("[CRM Template Sync Error]:", error);
      res.status(500).json({ message: "Falha ao sincronizar status do template" });
    }
  });

  app.delete("/api/crm/templates/:id", requirePermission("crm.templates"), async (req, res) => {
    try {
      const authUserId = req.effectiveAuthUserId;
      if (!authUserId) return res.status(401).json({ message: "Not authenticated" });

      const id = parseInt(req.params.id);
      const template = await storage.getCrmTemplate(authUserId, id);
      if (!template) return res.status(404).json({ message: "Template não encontrado" });

      const automations = await storage.getAllCrmAutomations(authUserId);
      const inUse = automations.filter((a) => a.templateId === id);
      if (inUse.length > 0) {
        return res.status(409).json({
          message: `Este template está em uso por ${inUse.length} automação(ões). Remova ou edite a automação antes de excluir o template.`,
          automations: inUse.map((a) => ({ id: a.id, name: a.name })),
        });
      }

      const connection = await storage.getWhatsappConnection(authUserId);
      if (connection?.wabaId) {
        const result = await deleteMetaMessageTemplate(connection, connection.wabaId, template.name);
        if (!result.ok && !result.notFound) {
          return res.status(400).json({ message: "Falha ao remover o template na Meta", error: result.error });
        }
      }

      await storage.deleteCrmTemplate(authUserId, id);
      res.status(204).send();
    } catch (error) {
      console.error("[CRM Template Delete Error]:", error);
      res.status(500).json({ message: "Falha ao excluir template" });
    }
  });

  // Clients Routes
  app.get("/api/clients", requirePermission("clients.list"), async (req, res) => {
    try {
      const authUserId = req.effectiveAuthUserId;
      if (!authUserId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const clients = await storage.getAllClients(authUserId);
      res.json(clients);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch clients" });
    }
  });

  app.get("/api/clients/expiring/:days", requirePermission("clients.list"), async (req, res) => {
    try {
      const authUserId = req.effectiveAuthUserId;
      if (!authUserId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const days = parseInt(req.params.days);
      const clients = await storage.getExpiringClients(authUserId, days);
      res.json(clients);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch expiring clients" });
    }
  });

  app.get("/api/clients/overdue", requirePermission("clients.list"), async (req, res) => {
    try {
      const authUserId = req.effectiveAuthUserId;
      if (!authUserId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const clients = await storage.getOverdueClients(authUserId);
      res.json(clients);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch overdue clients" });
    }
  });

  app.get("/api/clients/rankings", requirePermission("rankings"), async (req, res) => {
    try {
      const authUserId = req.effectiveAuthUserId;
      if (!authUserId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const days = req.query.days ? parseInt(req.query.days as string) : undefined;
      const rankings = await storage.getReferralRankings(authUserId, days);
      res.json(rankings);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch referral rankings" });
    }
  });

  const clientAppLinkSchema = z.object({
    appId: z.number().int().positive(),
    expiryDate: z.string().nullable().optional(),
  });

  // Syncs client_apps for a client from optional appId/appExpiryDate (primary)
  // and additionalApps (array) fields in the request body. No-op if neither
  // field is present in the payload, so plain client edits that don't touch
  // apps never clear existing links.
  async function syncClientAppsFromBody(authUserId: string, clientId: number, body: any) {
    const hasPrimary = "appId" in body;
    const hasAdditional = "additionalApps" in body;
    if (!hasPrimary && !hasAdditional) return;

    const primary = body.appId
      ? clientAppLinkSchema.parse({ appId: body.appId, expiryDate: body.appExpiryDate ?? null })
      : null;
    const additionalRaw = Array.isArray(body.additionalApps) ? body.additionalApps : [];
    const additional = additionalRaw.map((item: any) => clientAppLinkSchema.parse(item));

    await storage.setClientApps(authUserId, clientId, primary, additional);
  }

  // Syncs the manual renewal plan for a client based on its (already-persisted)
  // renewalMode: creates a plan on first switch to 'manual' (using body.renewDay),
  // closes any active plan on switch back to 'automatic'. Never regenerates an
  // already-active plan, so plain edits to other fields don't duplicate it.
  async function syncManualRenewalFromBody(authUserId: string, client: ClientRow, body: any) {
    const existing = await storage.getActiveManualRenewalPlanForClient(authUserId, client.id);

    if (client.renewalMode === "manual") {
      if (existing) return;
      const renewDayRaw = body.renewDay;
      const renewDay = typeof renewDayRaw === "number" ? renewDayRaw : parseInt(renewDayRaw, 10);
      if (!Number.isInteger(renewDay) || renewDay < 1 || renewDay > 31) return;
      await storage.createManualRenewalPlanForClient(authUserId, client, renewDay);
    } else if (existing) {
      await storage.closeManualRenewalPlan(authUserId, existing.id);
    }
  }

  app.post("/api/clients", requirePermission("clients.list"), async (req, res) => {
    try {
      const authUserId = req.effectiveAuthUserId;
      if (!authUserId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const validatedData = insertClientSchema.parse(req.body);
      const client = await storage.createClient(authUserId, validatedData);

      // Register initial payment in payment_history
      await storage.createPaymentHistory(authUserId, {
        authUserId,
        clientId: client.id,
        amount: validatedData.value,
        paymentDate: validatedData.activationDate,
        type: "new_client",
        newExpiryDate: validatedData.expiryDate,
        previousExpiryDate: null
      });

      await syncClientAppsFromBody(authUserId, client.id, req.body);
      await syncManualRenewalFromBody(authUserId, client, req.body);

      res.status(201).json(client);
    } catch (error: any) {
      console.error("[POST /api/clients] Error:", error);
      const message = error?.issues
        ? error.issues.map((i: any) => `${i.path.join('.')}: ${i.message}`).join('; ')
        : error?.message || "Erro ao cadastrar cliente";
      res.status(400).json({ message, error: String(error?.message || error) });
    }
  });

  app.post("/api/clients/:id/addon", requirePermission("clients.list"), async (req, res) => {
    try {
      const authUserId = req.effectiveAuthUserId;
      if (!authUserId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const clientId = parseInt(req.params.id);
      if (Number.isNaN(clientId)) {
        return res.status(400).json({ message: "ID de cliente inválido" });
      }

      const addonSchema = z.object({
        amount: z.string().min(1, "Valor é obrigatório").regex(/^\d+(\.\d{1,2})?$/, "Valor inválido"),
        paymentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida"),
        description: z.string().max(255).optional().nullable(),
        bumpClientValue: z.boolean().optional().default(false),
      });
      const parsed = addonSchema.parse(req.body);

      const existing = await storage.getClient(authUserId, clientId);
      if (!existing) {
        return res.status(404).json({ message: "Cliente não encontrado" });
      }

      const result = await storage.createAddonPayment(
        authUserId,
        clientId,
        parsed.amount,
        parsed.paymentDate,
        parsed.description ?? null,
        parsed.bumpClientValue === true,
      );

      console.log(`[Addon] Client ${clientId}: registered R$ ${parsed.amount} on ${parsed.paymentDate} (bumpValue=${parsed.bumpClientValue})`);
      res.status(201).json(result);
    } catch (error: any) {
      console.error("[POST /api/clients/:id/addon] Error:", error);
      const message = error?.issues
        ? error.issues.map((i: any) => `${i.path.join('.')}: ${i.message}`).join('; ')
        : error?.message || "Erro ao registrar adesão";
      res.status(400).json({ message, error: String(error?.message || error) });
    }
  });

  app.put("/api/clients/:id", requirePermission("clients.list"), async (req, res) => {
    try {
      const authUserId = req.effectiveAuthUserId;
      if (!authUserId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const id = parseInt(req.params.id);
      const freeMonth = req.body.freeMonth === true;
      const validatedData = insertClientSchema.partial().parse(req.body);
      
      // IMPORTANT: Remove activationDate from update payload - it should be immutable after creation
      // This prevents historical revenue data from being corrupted when renewing clients
      if ('activationDate' in validatedData) {
        console.log(`[Client Update] Removing activationDate from update payload for client ${id} - activationDate is immutable`);
        delete (validatedData as any).activationDate;
      }
      
      // Get current client data before update
      const oldClient = await storage.getClient(authUserId, id);
      if (!oldClient) {
        return res.status(404).json({ message: "Client not found" });
      }
      
      // Update client (skip the no-op update call when the payload only carries
      // app-linking fields, since Drizzle's .set({}) on an empty object errors)
      const client = Object.keys(validatedData).length > 0
        ? await storage.updateClient(authUserId, id, validatedData)
        : oldClient;
      if (!client) {
        return res.status(404).json({ message: "Client not found" });
      }

      await syncClientAppsFromBody(authUserId, client.id, req.body);
      await syncManualRenewalFromBody(authUserId, client, req.body);

      // Check if expiryDate changed (renewal detected)
      // freeMonth=true skips payment history creation (goodwill gesture, invisible to billing)
      // isRenewal=true is REQUIRED to create a payment_history record — plain edits never trigger it
      const isRenewal = req.body.isRenewal === true;
      const isDevMode = process.env.NODE_ENV === 'development';
      if (freeMonth) {
        // Ensure subscriptionStatus is always set to Ativa for free month grants
        if (client.subscriptionStatus !== "Ativa") {
          await storage.updateClient(authUserId, id, { subscriptionStatus: "Ativa" });
        }
        console.log(`[FreeMonth] Client ${client.id}: free month granted until ${client.expiryDate}, skipping renewal payment record`);
        return res.json(client);
      }
      if (isDevMode) {
        console.log(`[Client Update] Full payload received:`, JSON.stringify(validatedData, null, 2));
        console.log(`[Client Update] isRenewal flag:`, isRenewal);
        console.log(`[Client Update] Old client data before update:`, JSON.stringify({
          id: oldClient.id,
          expiryDate: oldClient.expiryDate,
          activationDate: oldClient.activationDate
        }, null, 2));
      }

      // Only create a renewal payment record when the request explicitly marks it as a renewal.
      // Regular edits (via the Edit form) that happen to change expiryDate do NOT count as renewals.
      if (!isRenewal) {
        if (isDevMode) {
          console.log(`[Renewal Check] isRenewal=false — skipping payment record (plain edit)`);
        }
        return res.json(client);
      }
      
      // Check for renewal based on either payload expiryDate OR client's updated expiryDate
      const newExpiryDate = validatedData.expiryDate || client.expiryDate;
      const oldExpiryDate = oldClient.expiryDate;
      
      if (newExpiryDate && oldExpiryDate) {
        // Normalize dates to YYYY-MM-DD string format for comparison
        const normalizeDate = (date: string | Date): string => {
          if (typeof date === 'string') {
            return date;
          }
          const d = new Date(date);
          return d.toISOString().split('T')[0];
        };
        
        const oldDateNormalized = normalizeDate(oldExpiryDate);
        const newDateNormalized = normalizeDate(newExpiryDate);
        
        if (isDevMode) {
          console.log(`[Renewal Check] Client ${client.id}: oldExpiry=${oldDateNormalized}, newExpiry=${newDateNormalized}`);
          console.log(`[Renewal Check] Dates are different: ${newDateNormalized !== oldDateNormalized}`);
        }
        
        // Only register renewal if dates actually changed
        if (newDateNormalized !== oldDateNormalized) {
          // Get current date in Brasília timezone for payment date
          const getBrasiliaDateString = () => {
            const now = new Date();
            const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
            const brasiliaTime = new Date(utc + (3600000 * -3));
            return brasiliaTime.toISOString().split('T')[0];
          };
          
          // Create new renewal payment record (preserves historical data)
          const currentBrasiliaDate = getBrasiliaDateString();
          console.log(`[Renewal] Creating payment record for client ${client.id}: previousExpiry=${oldDateNormalized}, newExpiry=${newDateNormalized}`);
          
          const renewalRecord = await storage.createRenewalPayment(
            authUserId,
            client.id,
            client.value,
            oldDateNormalized,
            newDateNormalized,
            currentBrasiliaDate
          );
          
          console.log(`[Renewal] Payment record created with ID: ${renewalRecord.id} for client ${client.id}`);
        } else if (isDevMode) {
          console.log(`[Renewal Check] No renewal detected - dates are the same`);
        }
      } else if (isDevMode) {
        console.log(`[Renewal Check] Missing expiry date - skipping renewal detection`);
      }
      
      res.json(client);
    } catch (error) {
      res.status(400).json({ message: "Invalid client data", error });
    }
  });

  app.delete("/api/clients/:id", requirePermission("clients.list"), async (req, res) => {
    try {
      const authUserId = req.effectiveAuthUserId;
      if (!authUserId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const id = parseInt(req.params.id);
      const deleted = await storage.deleteClient(authUserId, id);
      
      if (!deleted) {
        return res.status(404).json({ message: "Client not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete client" });
    }
  });

  // Data Migration: Populate payment_history from existing clients
  app.post("/api/migrate/populate-payment-history", async (req, res) => {
    try {
      const authUserId = req.effectiveAuthUserId;
      if (!authUserId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const clients = await storage.getAllClients(authUserId);
      let created = 0;
      let skipped = 0;
      
      for (const client of clients) {
        // Check if payment already exists for this client
        const existingPayments = await storage.getPaymentHistoryByClient(authUserId, client.id);
        
        // Only create if no payment exists yet
        if (existingPayments.length === 0) {
          await storage.createPaymentHistory(authUserId, {
            authUserId,
            clientId: client.id,
            amount: client.value,
            paymentDate: client.activationDate,
            type: 'new_client',
            previousExpiryDate: null,
            newExpiryDate: client.expiryDate
          });
          created++;
        } else {
          skipped++;
        }
      }
      
      res.json({ 
        message: "Payment history populated successfully",
        created,
        skipped,
        total: clients.length
      });
    } catch (error) {
      console.error("[Migration Error]:", error);
      res.status(500).json({ message: "Failed to populate payment history", error: String(error) });
    }
  });

  // Stripe checkout endpoint - reference from blueprint:javascript_stripe
  app.post("/api/stripe/create-checkout-session", requireOwner, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Autenticação necessária" });
      }

      const { planId } = req.body;
      if (!planId) {
        return res.status(400).json({ message: "Plan ID é obrigatório" });
      }

      const plan = await storage.getPlan(planId);
      if (!plan) {
        return res.status(404).json({ message: "Plano não encontrado" });
      }

      if (!plan.stripePriceId) {
        return res.status(400).json({ message: "Plano não configurado com Stripe Price ID" });
      }

      if (!process.env.STRIPE_SECRET_KEY) {
        return res.status(500).json({ message: "Stripe não configurado" });
      }

      const Stripe = (await import('stripe')).default;
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
        apiVersion: "2024-11-20.acacia",
      });

      // Create or get Stripe customer
      let customerId = req.user.stripeCustomerId;
      if (!customerId && req.user.email) {
        const customer = await stripe.customers.create({
          email: req.user.email,
          name: req.user.name || req.user.username,
          metadata: {
            userId: req.user.id.toString(),
            authUserId: req.user.authUserId || '',
          },
        });
        customerId = customer.id;
        await storage.updateUserStripeInfo(req.user.id, customerId, '');
      }

      // Create checkout session using configured Price ID
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ['card'],
        line_items: [
          {
            price: plan.stripePriceId,
            quantity: 1,
          },
        ],
        mode: plan.billingPeriod === 'lifetime' ? 'payment' : 'subscription',
        success_url: `${req.headers.origin}/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${req.headers.origin}/plans`,
        metadata: {
          userId: req.user.id.toString(),
          authUserId: req.user.authUserId || '',
          planId: plan.id.toString(),
        },
      });

      res.json({ url: session.url });
    } catch (error: any) {
      console.error("[Stripe Checkout Error]:", error);
      res.status(500).json({ message: "Erro ao criar sessão de pagamento", error: error.message });
    }
  });

  // Stripe webhook endpoint - reference from blueprint:javascript_stripe
  app.post("/api/stripe/webhook", async (req, res) => {
    try {
      if (!process.env.STRIPE_SECRET_KEY) {
        return res.status(500).json({ message: "Stripe não configurado" });
      }

      const Stripe = (await import('stripe')).default;
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
        apiVersion: "2024-11-20.acacia",
      });

      const sig = req.headers['stripe-signature'];
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

      let event;

      if (webhookSecret && sig) {
        try {
          event = stripe.webhooks.constructEvent(req.body, sig as string, webhookSecret);
        } catch (err: any) {
          console.error('[Webhook Signature Error]:', err.message);
          return res.status(400).send(`Webhook Error: ${err.message}`);
        }
      } else {
        event = req.body;
      }

      // Handle different event types
      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object as any;
          const userId = parseInt(session.metadata?.userId || '0');
          
          if (userId && session.subscription) {
            await storage.updateUserStripeInfo(userId, session.customer as string, session.subscription as string);
            await storage.updateUserSubscriptionStatus(userId, 'active');
          } else if (userId && session.mode === 'payment') {
            await storage.updateUserSubscriptionStatus(userId, 'active');
          }
          break;
        }

        case 'invoice.payment_succeeded': {
          const invoice = event.data.object as any;
          if (invoice.subscription) {
            const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string);
            const userId = parseInt(subscription.metadata?.userId || '0');
            
            if (userId) {
              const expiresAt = new Date(subscription.current_period_end * 1000);
              await storage.updateUserSubscriptionStatus(userId, 'active', expiresAt);
            }
          }
          break;
        }

        case 'invoice.payment_failed': {
          const invoice = event.data.object as any;
          if (invoice.subscription) {
            const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string);
            const userId = parseInt(subscription.metadata?.userId || '0');
            
            if (userId) {
              await storage.updateUserSubscriptionStatus(userId, 'past_due');
            }
          }
          break;
        }

        case 'customer.subscription.deleted': {
          const subscription = event.data.object as any;
          const userId = parseInt(subscription.metadata?.userId || '0');
          
          if (userId) {
            await storage.updateUserSubscriptionStatus(userId, 'canceled');
          }
          break;
        }

        default:
          console.log(`Unhandled event type: ${event.type}`);
      }

      res.json({ received: true });
    } catch (error: any) {
      console.error("[Stripe Webhook Error]:", error);
      res.status(500).json({ message: "Erro ao processar webhook", error: error.message });
    }
  });

  // ============================================
  // CLIENT PLANS ROUTES (tenant-scoped IPTV plans)
  // ============================================

  // Open read: used as a shared lookup/dropdown by other permitted pages
  // (e.g. the client form's plan select). Only writes are gated below.
  app.get("/api/client-plans", async (req, res) => {
    try {
      const authUserId = req.effectiveAuthUserId;
      if (!authUserId) return res.status(401).json({ message: "Não autenticado" });
      const plans = await storage.getAllClientPlans(authUserId);
      res.json(plans);
    } catch (error) {
      console.error("[ClientPlans GET]:", error);
      res.status(500).json({ message: "Erro ao buscar planos" });
    }
  });

  app.post("/api/client-plans", requirePermission("clients.plans"), async (req, res) => {
    try {
      const authUserId = req.effectiveAuthUserId;
      if (!authUserId) return res.status(401).json({ message: "Não autenticado" });
      const data = insertClientPlanSchema.parse(req.body);
      const plan = await storage.createClientPlan(authUserId, data);
      res.status(201).json(plan);
    } catch (error: any) {
      console.error("[ClientPlans POST]:", error);
      res.status(400).json({ message: error.message || "Erro ao criar plano" });
    }
  });

  app.put("/api/client-plans/:id", requirePermission("clients.plans"), async (req, res) => {
    try {
      const authUserId = req.effectiveAuthUserId;
      if (!authUserId) return res.status(401).json({ message: "Não autenticado" });
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "ID inválido" });
      const updateData = insertClientPlanSchema.partial().parse(req.body);
      const plan = await storage.updateClientPlan(authUserId, id, updateData);
      if (!plan) return res.status(404).json({ message: "Plano não encontrado" });
      res.json(plan);
    } catch (error: any) {
      console.error("[ClientPlans PUT]:", error);
      res.status(400).json({ message: error.message || "Erro ao atualizar plano" });
    }
  });

  app.delete("/api/client-plans/:id", requirePermission("clients.plans"), async (req, res) => {
    try {
      const authUserId = req.effectiveAuthUserId;
      if (!authUserId) return res.status(401).json({ message: "Não autenticado" });
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "ID inválido" });
      const deleted = await storage.deleteClientPlan(authUserId, id);
      if (!deleted) return res.status(404).json({ message: "Plano não encontrado" });
      res.json({ message: "Plano excluído com sucesso" });
    } catch (error: any) {
      if (error?.message === "CLIENT_PLAN_IN_USE_BY_MANUAL_RENEWAL_PLANS") {
        return res.status(409).json({ message: "Plano em uso por renovações manuais — não pode ser excluído" });
      }
      console.error("[ClientPlans DELETE]:", error);
      res.status(500).json({ message: "Erro ao excluir plano" });
    }
  });

  // ============================================
  // APPS ROUTES (IPTV client apps catalog)
  // ============================================

  app.get("/api/apps", requirePermission("clients.apps"), async (req, res) => {
    try {
      const authUserId = req.effectiveAuthUserId;
      if (!authUserId) return res.status(401).json({ message: "Não autenticado" });
      const allApps = await storage.getAllApps(authUserId);
      res.json(allApps);
    } catch (error) {
      console.error("[Apps GET]:", error);
      res.status(500).json({ message: "Erro ao buscar aplicativos" });
    }
  });

  app.post("/api/apps", requirePermission("clients.apps"), async (req, res) => {
    try {
      const authUserId = req.effectiveAuthUserId;
      if (!authUserId) return res.status(401).json({ message: "Não autenticado" });
      const data = insertAppSchema.parse(req.body);
      const app = await storage.createApp(authUserId, data);
      res.status(201).json(app);
    } catch (error: any) {
      console.error("[Apps POST]:", error);
      res.status(400).json({ message: error.message || "Erro ao criar aplicativo" });
    }
  });

  app.put("/api/apps/:id", requirePermission("clients.apps"), async (req, res) => {
    try {
      const authUserId = req.effectiveAuthUserId;
      if (!authUserId) return res.status(401).json({ message: "Não autenticado" });
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "ID inválido" });
      const updateData = insertAppSchema.partial().parse(req.body);
      const app = await storage.updateApp(authUserId, id, updateData);
      if (!app) return res.status(404).json({ message: "Aplicativo não encontrado" });
      res.json(app);
    } catch (error: any) {
      console.error("[Apps PUT]:", error);
      res.status(400).json({ message: error.message || "Erro ao atualizar aplicativo" });
    }
  });

  app.delete("/api/apps/:id", requirePermission("clients.apps"), async (req, res) => {
    try {
      const authUserId = req.effectiveAuthUserId;
      if (!authUserId) return res.status(401).json({ message: "Não autenticado" });
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "ID inválido" });
      const deleted = await storage.deleteApp(authUserId, id);
      if (!deleted) return res.status(404).json({ message: "Aplicativo não encontrado" });
      res.json({ message: "Aplicativo excluído com sucesso" });
    } catch (error: any) {
      console.error("[Apps DELETE]:", error);
      res.status(500).json({ message: "Erro ao excluir aplicativo" });
    }
  });

  app.patch("/api/apps/:id/toggle-status", requirePermission("clients.apps"), async (req, res) => {
    try {
      const authUserId = req.effectiveAuthUserId;
      if (!authUserId) return res.status(401).json({ message: "Não autenticado" });
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "ID inválido" });
      const app = await storage.toggleAppStatus(authUserId, id);
      if (!app) return res.status(404).json({ message: "Aplicativo não encontrado" });
      res.json(app);
    } catch (error: any) {
      console.error("[Apps Toggle Status]:", error);
      res.status(500).json({ message: "Erro ao alterar status do aplicativo" });
    }
  });

  app.get("/api/clients/:id/manual-renewal-plan", requirePermission("clients.list"), async (req, res) => {
    try {
      const authUserId = req.effectiveAuthUserId;
      if (!authUserId) return res.status(401).json({ message: "Não autenticado" });
      const clientId = parseInt(req.params.id);
      if (isNaN(clientId)) return res.status(400).json({ message: "ID inválido" });
      const plan = await storage.getActiveManualRenewalPlanForClient(authUserId, clientId);
      if (!plan) return res.status(404).json({ message: "Nenhum plano de renovação manual ativo" });
      res.json(plan);
    } catch (error) {
      console.error("[Manual Renewal Plan GET]:", error);
      res.status(500).json({ message: "Erro ao buscar plano de renovação manual" });
    }
  });

  app.get("/api/clients/:id/apps", requirePermission("clients.list"), async (req, res) => {
    try {
      const authUserId = req.effectiveAuthUserId;
      if (!authUserId) return res.status(401).json({ message: "Não autenticado" });
      const clientId = parseInt(req.params.id);
      if (isNaN(clientId)) return res.status(400).json({ message: "ID inválido" });
      const links = await storage.getClientApps(authUserId, clientId);
      res.json(links);
    } catch (error) {
      console.error("[Client Apps GET]:", error);
      res.status(500).json({ message: "Erro ao buscar aplicativos do cliente" });
    }
  });

  // ============================================
  // SYSTEM CREDIT RULES ROUTES
  // ============================================

  app.get("/api/systems/:systemId/credit-rules", requirePermission("clients.systems"), async (req, res) => {
    try {
      const authUserId = req.effectiveAuthUserId;
      if (!authUserId) return res.status(401).json({ message: "Não autenticado" });
      const systemId = parseInt(req.params.systemId);
      if (isNaN(systemId)) return res.status(400).json({ message: "ID inválido" });
      const rules = await storage.getSystemCreditRules(authUserId, systemId);
      res.json(rules);
    } catch (error) {
      console.error("[Credit Rules GET]:", error);
      res.status(500).json({ message: "Erro ao buscar regras de crédito" });
    }
  });

  app.post("/api/systems/:systemId/credit-rules", requirePermission("clients.systems"), async (req, res) => {
    try {
      const authUserId = req.effectiveAuthUserId;
      if (!authUserId) return res.status(401).json({ message: "Não autenticado" });
      const systemId = parseInt(req.params.systemId);
      if (isNaN(systemId)) return res.status(400).json({ message: "ID inválido" });
      const data = insertSystemCreditRuleSchema.parse({ ...req.body, systemId });
      const rule = await storage.createSystemCreditRule(authUserId, data);
      res.status(201).json(rule);
    } catch (error: any) {
      console.error("[Credit Rules POST]:", error);
      res.status(400).json({ message: error.message || "Erro ao criar regra de crédito" });
    }
  });

  app.put("/api/credit-rules/:id", requirePermission("clients.systems"), async (req, res) => {
    try {
      const authUserId = req.effectiveAuthUserId;
      if (!authUserId) return res.status(401).json({ message: "Não autenticado" });
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "ID inválido" });
      const data = insertSystemCreditRuleSchema.partial().parse(req.body);
      const rule = await storage.updateSystemCreditRule(authUserId, id, data);
      if (!rule) return res.status(404).json({ message: "Regra não encontrada" });
      res.json(rule);
    } catch (error: any) {
      console.error("[Credit Rules PUT]:", error);
      res.status(400).json({ message: error.message || "Erro ao atualizar regra de crédito" });
    }
  });

  app.delete("/api/credit-rules/:id", requirePermission("clients.systems"), async (req, res) => {
    try {
      const authUserId = req.effectiveAuthUserId;
      if (!authUserId) return res.status(401).json({ message: "Não autenticado" });
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "ID inválido" });
      const deleted = await storage.deleteSystemCreditRule(authUserId, id);
      if (!deleted) return res.status(404).json({ message: "Regra não encontrada" });
      res.json({ message: "Regra excluída com sucesso" });
    } catch (error) {
      console.error("[Credit Rules DELETE]:", error);
      res.status(500).json({ message: "Erro ao excluir regra de crédito" });
    }
  });

  // ============================================
  // MANUAL RENEWALS ROUTES
  // ============================================

  app.get("/api/manual-renewals", requirePermission("clients.manual_renewals"), async (req, res) => {
    try {
      const authUserId = req.effectiveAuthUserId;
      if (!authUserId) return res.status(401).json({ message: "Não autenticado" });
      const period = req.query.period as string;
      if (!["trimestral", "semestral", "anual"].includes(period)) {
        return res.status(400).json({ message: "period deve ser trimestral, semestral ou anual" });
      }
      const plans = await storage.getManualRenewalPlans(authUserId, period as "trimestral" | "semestral" | "anual");
      res.json(plans);
    } catch (error) {
      console.error("[Manual Renewals GET]:", error);
      res.status(500).json({ message: "Erro ao buscar renovações manuais" });
    }
  });

  app.patch("/api/manual-renewals/:planId/installments/:monthNumber/toggle", requirePermission("clients.manual_renewals"), async (req, res) => {
    try {
      const authUserId = req.effectiveAuthUserId;
      if (!authUserId) return res.status(401).json({ message: "Não autenticado" });
      const planId = parseInt(req.params.planId);
      const monthNumber = parseInt(req.params.monthNumber);
      if (isNaN(planId) || isNaN(monthNumber)) return res.status(400).json({ message: "Parâmetros inválidos" });
      const result = await storage.toggleManualRenewalInstallment(authUserId, planId, monthNumber);
      if (!result) return res.status(404).json({ message: "Parcela não encontrada" });
      res.json(result);
    } catch (error) {
      console.error("[Manual Renewals Toggle]:", error);
      res.status(500).json({ message: "Erro ao alternar parcela" });
    }
  });

  // ============================================
  // FINANCIAL ROUTES (Financeiro > Visão Geral)
  // ============================================

  app.get("/api/financial/summary", requireAnyPermission("financial.overview", "financial.reports"), async (req, res) => {
    try {
      const authUserId = req.effectiveAuthUserId;
      if (!authUserId) return res.status(401).json({ message: "Não autenticado" });
      const startDate = req.query.startDate as string;
      const endDate = req.query.endDate as string;
      if (!startDate || !endDate) {
        return res.status(400).json({ message: "startDate e endDate são obrigatórios" });
      }
      const summary = await storage.getFinancialSummary(authUserId, startDate, endDate);
      res.json(summary);
    } catch (error) {
      console.error("[Financial Summary]:", error);
      res.status(500).json({ message: "Erro ao buscar resumo financeiro" });
    }
  });

  app.get("/api/financial/projections", requireAnyPermission("financial.overview", "financial.reports"), async (req, res) => {
    try {
      const authUserId = req.effectiveAuthUserId;
      if (!authUserId) return res.status(401).json({ message: "Não autenticado" });
      const projections = await storage.getFinancialProjections(authUserId);
      res.json(projections);
    } catch (error) {
      console.error("[Financial Projections]:", error);
      res.status(500).json({ message: "Erro ao calcular projeções" });
    }
  });

  app.get("/api/financial/movements", requireAnyPermission("financial.overview", "financial.reports"), async (req, res) => {
    try {
      const authUserId = req.effectiveAuthUserId;
      if (!authUserId) return res.status(401).json({ message: "Não autenticado" });

      const startDate = req.query.startDate as string | undefined;
      const endDate = req.query.endDate as string | undefined;
      const type = req.query.type as "entrada" | "saida" | undefined;
      const productId = req.query.productId ? parseInt(req.query.productId as string) : undefined;
      const search = (req.query.search as string | undefined) || undefined;
      const page = req.query.page ? Math.max(1, parseInt(req.query.page as string)) : 1;
      const limit = req.query.limit ? Math.max(1, parseInt(req.query.limit as string)) : 10;

      const result = await storage.getFinancialMovements(authUserId, {
        startDate, endDate, type, productId, search, page, limit,
      });
      res.json(result);
    } catch (error) {
      console.error("[Financial Movements GET]:", error);
      res.status(500).json({ message: "Erro ao buscar movimentações" });
    }
  });

  app.post("/api/financial/movements", requirePermission("financial.overview"), async (req, res) => {
    try {
      const authUserId = req.effectiveAuthUserId;
      if (!authUserId) return res.status(401).json({ message: "Não autenticado" });
      const data = insertManualFinancialEntrySchema.parse(req.body);
      const entry = await storage.createManualFinancialEntry(authUserId, data);
      res.status(201).json(entry);
    } catch (error: any) {
      console.error("[Financial Movements POST]:", error);
      res.status(400).json({ message: error.message || "Erro ao lançar movimentação" });
    }
  });

  app.put("/api/financial/movements/:id", requirePermission("financial.overview"), async (req, res) => {
    try {
      const authUserId = req.effectiveAuthUserId;
      if (!authUserId) return res.status(401).json({ message: "Não autenticado" });
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "ID inválido" });
      const data = insertManualFinancialEntrySchema.partial().parse(req.body);
      const entry = await storage.updateManualFinancialEntry(authUserId, id, data);
      if (!entry) return res.status(404).json({ message: "Lançamento não encontrado" });
      res.json(entry);
    } catch (error: any) {
      console.error("[Financial Movements PUT]:", error);
      res.status(400).json({ message: error.message || "Erro ao atualizar movimentação" });
    }
  });

  // Must be registered before the generic "/:id" DELETE route below, otherwise
  // Express would match "bulk" as an :id value.
  app.delete("/api/financial/movements/bulk", requirePermission("financial.overview"), async (req, res) => {
    try {
      const authUserId = req.effectiveAuthUserId;
      if (!authUserId) return res.status(401).json({ message: "Não autenticado" });
      const bulkDeleteSchema = z.object({
        items: z.array(z.object({
          id: z.number().int(),
          source: z.enum(["payment", "credit", "manual"]),
        })).min(1, "Selecione ao menos um item"),
      });
      const { items } = bulkDeleteSchema.parse(req.body);
      const deletedCount = await storage.bulkDeleteFinancialMovements(authUserId, items);
      res.json({ deletedCount });
    } catch (error: any) {
      console.error("[Financial Movements Bulk Delete]:", error);
      res.status(400).json({ message: error.message || "Erro ao excluir movimentações" });
    }
  });

  app.delete("/api/financial/movements/:id", requirePermission("financial.overview"), async (req, res) => {
    try {
      const authUserId = req.effectiveAuthUserId;
      if (!authUserId) return res.status(401).json({ message: "Não autenticado" });
      const id = parseInt(req.params.id);
      const source = req.query.source as string;
      if (isNaN(id) || !["payment", "credit", "manual"].includes(source)) {
        return res.status(400).json({ message: "Parâmetros inválidos" });
      }
      const deleted = await storage.deleteFinancialMovement(authUserId, id, source as "payment" | "credit" | "manual");
      if (!deleted) return res.status(404).json({ message: "Movimentação não encontrada" });
      res.json({ message: "Movimentação excluída com sucesso" });
    } catch (error) {
      console.error("[Financial Movements DELETE]:", error);
      res.status(500).json({ message: "Erro ao excluir movimentação" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
