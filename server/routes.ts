import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertUserSchema, insertEmployeeSchema, insertSystemSchema, insertClientSchema, 
  insertWhatsappInstanceSchema, insertMessageTemplateSchema, insertBillingHistorySchema,
  insertPaymentHistorySchema, insertAutomationConfigSchema, insertPlanSchema
} from "@shared/schema";
import multer from "multer";
import { Client } from "@replit/object-storage";
import bcrypt from "bcryptjs";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { db } from "../db";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_ANON_KEY || ''
);

// Extend Express session types
declare module 'express-session' {
  interface SessionData {
    userId: number;
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  
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
      const user = await storage.getUserByAuthId(authUserId);
      
      if (!user) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }
      
      res.json(user);
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
  app.get("/api/dashboard/stats", async (req, res) => {
    try {
      const stats = await storage.getDashboardStats();
      res.json(stats);
    } catch (error) {
      console.error("[Dashboard Stats Error]:", error);
      res.status(500).json({ message: "Failed to fetch dashboard stats", error: String(error) });
    }
  });

  app.get("/api/dashboard/new-clients-by-day", async (req, res) => {
    try {
      const data = await storage.getNewClientsByDay();
      res.json(data);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch new clients by day" });
    }
  });

  app.get("/api/dashboard/revenue-by-period", async (req, res) => {
    try {
      const period = req.query.period as 'current_month' | 'last_month' | '3_months' | '6_months' | '12_months';
      if (!['current_month', 'last_month', '3_months', '6_months', '12_months'].includes(period)) {
        return res.status(400).json({ message: "Invalid period" });
      }
      const data = await storage.getRevenueByPeriod(period);
      res.json(data);
    } catch (error) {
      console.error("[Revenue By Period Error]:", error);
      res.status(500).json({ message: "Failed to fetch revenue by period", error: String(error) });
    }
  });

  // Users Routes
  app.get("/api/users", async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.post("/api/users", async (req, res) => {
    try {
      const validatedData = insertUserSchema.parse(req.body);
      const user = await storage.createUser(validatedData);
      res.status(201).json(user);
    } catch (error) {
      res.status(400).json({ message: "Invalid user data", error });
    }
  });

  app.put("/api/users/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertUserSchema.partial().parse(req.body);
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
  app.get("/api/employees", async (req, res) => {
    try {
      const employees = await storage.getAllEmployees();
      res.json(employees);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch employees" });
    }
  });

  app.post("/api/employees", async (req, res) => {
    try {
      const validatedData = insertEmployeeSchema.parse(req.body);
      const employee = await storage.createEmployee(validatedData);
      res.status(201).json(employee);
    } catch (error) {
      res.status(400).json({ message: "Invalid employee data", error });
    }
  });

  app.put("/api/employees/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertEmployeeSchema.partial().parse(req.body);
      const employee = await storage.updateEmployee(id, validatedData);
      
      if (!employee) {
        return res.status(404).json({ message: "Employee not found" });
      }
      
      res.json(employee);
    } catch (error) {
      res.status(400).json({ message: "Invalid employee data", error });
    }
  });

  app.delete("/api/employees/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteEmployee(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "Employee not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete employee" });
    }
  });

  // Systems Routes
  app.get("/api/systems", async (req, res) => {
    try {
      const systems = await storage.getAllSystems();
      res.json(systems);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch systems" });
    }
  });

  app.post("/api/systems", async (req, res) => {
    try {
      const validatedData = insertSystemSchema.parse(req.body);
      const system = await storage.createSystem(validatedData);
      res.status(201).json(system);
    } catch (error) {
      res.status(400).json({ message: "Invalid system data", error });
    }
  });

  app.patch("/api/systems/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertSystemSchema.partial().parse(req.body);
      const system = await storage.updateSystem(id, validatedData);
      
      if (!system) {
        return res.status(404).json({ message: "System not found" });
      }
      
      res.json(system);
    } catch (error) {
      res.status(400).json({ message: "Invalid system data", error });
    }
  });

  app.delete("/api/systems/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteSystem(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "System not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete system" });
    }
  });

  // Clients Routes
  app.get("/api/clients", async (req, res) => {
    try {
      const clients = await storage.getAllClients();
      res.json(clients);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch clients" });
    }
  });

  app.get("/api/clients/expiring/:days", async (req, res) => {
    try {
      const days = parseInt(req.params.days);
      const clients = await storage.getExpiringClients(days);
      res.json(clients);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch expiring clients" });
    }
  });

  app.get("/api/clients/overdue", async (req, res) => {
    try {
      const clients = await storage.getOverdueClients();
      res.json(clients);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch overdue clients" });
    }
  });

  app.get("/api/clients/rankings", async (req, res) => {
    try {
      const days = req.query.days ? parseInt(req.query.days as string) : undefined;
      const rankings = await storage.getReferralRankings(days);
      res.json(rankings);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch referral rankings" });
    }
  });

  app.post("/api/clients", async (req, res) => {
    try {
      const validatedData = insertClientSchema.parse(req.body);
      const client = await storage.createClient(validatedData);
      
      // Register initial payment in payment_history
      await storage.createPaymentHistory({
        clientId: client.id,
        amount: validatedData.value,
        paymentDate: validatedData.activationDate,
        type: "new_client",
        newExpiryDate: validatedData.expiryDate,
        previousExpiryDate: null
      });
      
      res.status(201).json(client);
    } catch (error) {
      res.status(400).json({ message: "Invalid client data", error });
    }
  });

  app.put("/api/clients/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertClientSchema.partial().parse(req.body);
      
      // Get current client data before update
      const oldClient = await storage.getClient(id);
      if (!oldClient) {
        return res.status(404).json({ message: "Client not found" });
      }
      
      // Update client
      const client = await storage.updateClient(id, validatedData);
      if (!client) {
        return res.status(404).json({ message: "Client not found" });
      }
      
      // Check if expiryDate changed (renewal detected)
      if (validatedData.expiryDate) {
        // Normalize dates to YYYY-MM-DD string format for comparison
        const normalizeDate = (date: string | Date): string => {
          if (typeof date === 'string') {
            // Already a string in YYYY-MM-DD format
            return date;
          }
          // Convert Date object to YYYY-MM-DD string
          const d = new Date(date);
          return d.toISOString().split('T')[0];
        };
        
        const oldDateNormalized = normalizeDate(oldClient.expiryDate);
        const newDateNormalized = normalizeDate(validatedData.expiryDate);
        
        // Only register renewal if dates actually changed
        if (newDateNormalized !== oldDateNormalized) {
          // Get current date in Brasília timezone for payment date
          const getBrasiliaDateString = () => {
            const now = new Date();
            const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
            const brasiliaTime = new Date(utc + (3600000 * -3));
            return brasiliaTime.toISOString().split('T')[0];
          };
          
          // Register renewal payment
          await storage.createPaymentHistory({
            clientId: client.id,
            amount: client.value, // Use current client value
            paymentDate: getBrasiliaDateString(),
            type: "renewal",
            previousExpiryDate: oldDateNormalized,
            newExpiryDate: newDateNormalized
          });
        }
      }
      
      res.json(client);
    } catch (error) {
      res.status(400).json({ message: "Invalid client data", error });
    }
  });

  app.delete("/api/clients/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteClient(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "Client not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete client" });
    }
  });

  // WhatsApp Instances Routes
  app.get("/api/whatsapp/instances", async (req, res) => {
    try {
      const instances = await storage.getAllWhatsappInstances();
      res.json(instances);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch WhatsApp instances" });
    }
  });

  app.post("/api/whatsapp/instances", async (req, res) => {
    try {
      const validatedData = insertWhatsappInstanceSchema.parse(req.body);
      const instance = await storage.createWhatsappInstance(validatedData);
      
      console.log(`[WhatsApp] Creating instance: ${instance.name} (ID: ${instance.id})`);
      
      // Call webhook to generate QR code - SINGLE REQUEST with 15 second timeout
      try {
        console.log(`[WhatsApp] Sending request to webhook...`);
        
        // Create AbortController for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
        
        const webhookResponse = await fetch("https://webhook.dev.userxai.online/webhook/gestor_loopag_connect", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            instanceName: instance.name,
            instanceId: instance.id,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
        console.log(`[WhatsApp] Webhook response status: ${webhookResponse.status}`);

        if (!webhookResponse.ok) {
          throw new Error(`Webhook error: ${webhookResponse.status}`);
        }

        // Parse JSON response - expecting array format: [{"base64": "data:image/png;base64,..."}]
        const responseData = await webhookResponse.json();
        console.log(`[WhatsApp] Response structure:`, Array.isArray(responseData) ? 'Array' : 'Object');
        console.log(`[WhatsApp] Response preview:`, JSON.stringify(responseData).substring(0, 150));
        
        // Extract QR code from response[0].base64
        let qrCode = null;
        if (Array.isArray(responseData) && responseData.length > 0 && responseData[0].base64) {
          qrCode = responseData[0].base64;
          console.log(`[WhatsApp] QR code extracted from response[0].base64`);
        } else if (responseData.qrCode) {
          // Fallback: check if qrCode is directly in the response
          qrCode = responseData.qrCode;
          console.log(`[WhatsApp] QR code extracted from response.qrCode (fallback)`);
        } else if (responseData.base64) {
          // Fallback: check if base64 is directly in the response
          qrCode = responseData.base64;
          console.log(`[WhatsApp] QR code extracted from response.base64 (fallback)`);
        }

        if (qrCode) {
          // Ensure QR code is in data URI format
          if (typeof qrCode === 'string' && !qrCode.startsWith('data:image/')) {
            qrCode = `data:image/png;base64,${qrCode}`;
            console.log(`[WhatsApp] QR code converted to data URI format`);
          }
          
          // Update instance with QR code
          await storage.updateWhatsappInstance(instance.id, {
            qrCode,
            status: "connecting",
          });
          
          console.log(`[WhatsApp] Instance updated with QR code successfully`);
          
          return res.status(201).json({
            ...instance,
            qrCode,
            status: "connecting",
          });
        } else {
          console.log(`[WhatsApp] No QR code found in webhook response`);
          return res.status(502).json({ message: "Webhook não retornou QR Code" });
        }
      } catch (webhookError: any) {
        if (webhookError.name === 'AbortError') {
          console.error("[WhatsApp] Webhook timeout after 15 seconds");
          return res.status(408).json({ message: "Webhook timeout - tente novamente" });
        }
        console.error("[WhatsApp] Webhook error:", webhookError);
        return res.status(502).json({ message: "Erro ao conectar com webhook", error: String(webhookError?.message || webhookError) });
      }
    } catch (error) {
      console.error("[WhatsApp] Error creating instance:", error);
      res.status(400).json({ message: "Invalid WhatsApp instance data", error });
    }
  });

  app.put("/api/whatsapp/instances/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertWhatsappInstanceSchema.partial().parse(req.body);
      const instance = await storage.updateWhatsappInstance(id, validatedData);
      
      if (!instance) {
        return res.status(404).json({ message: "WhatsApp instance not found" });
      }
      
      res.json(instance);
    } catch (error) {
      res.status(400).json({ message: "Invalid WhatsApp instance data", error });
    }
  });

  app.delete("/api/whatsapp/instances/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // Get instance to retrieve the name for webhook call
      const instance = await storage.getWhatsappInstance(id);
      if (!instance) {
        return res.status(404).json({ message: "WhatsApp instance not found" });
      }

      console.log(`[WhatsApp] Deleting instance: ${instance.name} (ID: ${id})`);

      // Call webhook to delete instance
      try {
        console.log(`[WhatsApp] Calling delete webhook for instance: ${instance.name}`);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);

        const webhookResponse = await fetch("https://webhook.dev.userxai.online/webhook/gestor_loopag_delete_instance", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ instanceName: instance.name }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
        
        console.log(`[WhatsApp] Delete webhook response status: ${webhookResponse.status}`);

        if (!webhookResponse.ok) {
          console.error(`[WhatsApp] Delete webhook returned non-OK status: ${webhookResponse.status}`);
        }
      } catch (webhookError: any) {
        if (webhookError.name === 'AbortError') {
          console.error("[WhatsApp] Delete webhook timeout after 15 seconds");
        } else {
          console.error("[WhatsApp] Delete webhook error:", webhookError);
        }
        // Continue with deletion even if webhook fails
      }

      // Delete instance from storage
      await storage.deleteWhatsappInstance(id);
      console.log(`[WhatsApp] Instance deleted successfully from storage`);

      res.status(204).send();
    } catch (error) {
      console.error("[WhatsApp] Error deleting instance:", error);
      res.status(500).json({ message: "Failed to delete WhatsApp instance", error });
    }
  });

  app.get("/api/whatsapp/instances/:id/status", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // Get instance to retrieve the name
      const instance = await storage.getWhatsappInstance(id);
      if (!instance) {
        return res.status(404).json({ message: "WhatsApp instance not found" });
      }

      console.log(`[WhatsApp] Checking status for instance: ${instance.name} (ID: ${id})`);

      // Call webhook to get connection state
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);

        const webhookResponse = await fetch("https://webhook.dev.userxai.online/webhook/loopag_get_state_connection", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ instanceName: instance.name }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        console.log(`[WhatsApp] Status webhook response: ${webhookResponse.status}`);

        if (!webhookResponse.ok) {
          throw new Error(`Webhook returned status ${webhookResponse.status}`);
        }

        const responseData = await webhookResponse.json();
        console.log(`[WhatsApp] Status response:`, responseData);

        // Update instance status based on webhook response
        // Response format: [{ instance: { instanceName, state } }]
        let newStatus: "disconnected" | "connecting" | "connected" = "disconnected";
        
        // Check if response is an array and has the expected structure
        if (Array.isArray(responseData) && responseData.length > 0) {
          const instanceData = responseData[0]?.instance;
          if (instanceData?.state === "open" || instanceData?.connected === true) {
            newStatus = "connected";
          }
        } else if (responseData.state === "open" || responseData.connected === true) {
          // Fallback: also support direct response format
          newStatus = "connected";
        }

        const updatedInstance = await storage.updateWhatsappInstance(id, {
          status: newStatus,
        });

        console.log(`[WhatsApp] Instance status updated to: ${newStatus}`);
        res.json(updatedInstance);
      } catch (webhookError: any) {
        if (webhookError.name === 'AbortError') {
          console.error("[WhatsApp] Status webhook timeout after 15 seconds");
          return res.status(408).json({ message: "Timeout ao verificar status" });
        }
        console.error("[WhatsApp] Status webhook error:", webhookError);
        return res.status(502).json({ message: "Erro ao verificar status da conexão" });
      }
    } catch (error) {
      console.error("[WhatsApp] Error checking instance status:", error);
      res.status(500).json({ message: "Failed to check instance status", error });
    }
  });

  app.post("/api/whatsapp/instances/:id/connect", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // Call external WhatsApp API
      const response = await fetch("https://webhook.dev.userxai.online/webhook-test/cria_instancia", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ instanceId: id }),
      });

      if (!response.ok) {
        throw new Error("Failed to create WhatsApp instance");
      }

      const data = await response.json();
      
      // Update instance with QR code
      const updatedInstance = await storage.updateWhatsappInstance(id, {
        qrCode: data.qrCode,
        status: "connecting",
        instanceId: data.instanceId,
      });

      res.json(updatedInstance);
    } catch (error) {
      res.status(500).json({ message: "Failed to connect WhatsApp instance", error });
    }
  });

  // Message Templates Routes
  app.get("/api/templates", async (req, res) => {
    try {
      const templates = await storage.getAllMessageTemplates();
      res.json(templates);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch message templates" });
    }
  });

  app.post("/api/templates", async (req, res) => {
    try {
      const validatedData = insertMessageTemplateSchema.parse(req.body);
      const template = await storage.createMessageTemplate(validatedData);
      res.status(201).json(template);
    } catch (error) {
      res.status(400).json({ message: "Invalid template data", error });
    }
  });

  app.put("/api/templates/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertMessageTemplateSchema.partial().parse(req.body);
      const template = await storage.updateMessageTemplate(id, validatedData);
      
      if (!template) {
        return res.status(404).json({ message: "Template not found" });
      }
      
      res.json(template);
    } catch (error) {
      res.status(400).json({ message: "Invalid template data", error });
    }
  });

  app.delete("/api/templates/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteMessageTemplate(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "Template not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete template", error });
    }
  });

  // Billing History Routes
  app.get("/api/billing/history", async (req, res) => {
    try {
      const history = await storage.getAllBillingHistory();
      res.json(history);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch billing history" });
    }
  });

  app.post("/api/billing/send", async (req, res) => {
    try {
      const { clientIds, templateId, instanceId } = req.body;
      
      const results = [];
      
      for (const clientId of clientIds) {
        const client = await storage.getClient(clientId);
        const template = await storage.getMessageTemplate(templateId);
        
        if (!client || !template) {
          continue;
        }

        // Replace template variables
        let message = template.content
          .replace(/{nome}/g, client.name)
          .replace(/{valor}/g, client.value || "")
          .replace(/{vencimento}/g, client.expiryDate)
          .replace(/{plano}/g, client.plan)
          .replace(/{sistema}/g, client.system);

        // Create billing history record
        const billingRecord = await storage.createBillingHistory({
          clientId,
          instanceId,
          templateId,
          message,
          status: "sent",
          sentAt: new Date(),
        });

        results.push(billingRecord);
      }
      
      res.json(results);
    } catch (error) {
      res.status(500).json({ message: "Failed to send billing messages", error });
    }
  });

  // Automation Config Routes
  app.get("/api/automation-configs", async (req, res) => {
    try {
      const configs = await storage.getAllAutomationConfigs();
      res.json(configs);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch automation configs" });
    }
  });

  app.get("/api/automation-configs/:type", async (req, res) => {
    try {
      const config = await storage.getAutomationConfig(req.params.type);
      if (!config) {
        return res.status(404).json({ message: "Automation config not found" });
      }
      res.json(config);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch automation config" });
    }
  });

  app.post("/api/automation-configs", async (req, res) => {
    try {
      const validatedData = insertAutomationConfigSchema.parse(req.body);
      const config = await storage.createAutomationConfig(validatedData);
      res.status(201).json(config);
    } catch (error) {
      res.status(400).json({ message: "Invalid automation config data", error });
    }
  });

  app.put("/api/automation-configs/:type", async (req, res) => {
    try {
      const config = await storage.updateAutomationConfig(req.params.type, req.body);
      if (!config) {
        return res.status(404).json({ message: "Automation config not found" });
      }
      res.json(config);
    } catch (error) {
      res.status(500).json({ message: "Failed to update automation config" });
    }
  });

  // Data Migration: Populate payment_history from existing clients
  app.post("/api/migrate/populate-payment-history", async (req, res) => {
    try {
      const clients = await storage.getAllClients();
      let created = 0;
      let skipped = 0;
      
      for (const client of clients) {
        // Check if payment already exists for this client
        const existingPayments = await storage.getPaymentHistoryByClient(client.id);
        
        // Only create if no payment exists yet
        if (existingPayments.length === 0) {
          await storage.createPaymentHistory({
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

  // Test automation trigger (manual)
  app.post("/api/test/trigger-automation/:type", async (req, res) => {
    try {
      const automationType = req.params.type;
      const config = await storage.getAutomationConfig(automationType);
      
      if (!config) {
        return res.status(404).json({ message: "Automation config not found" });
      }
      
      if (!config.isActive) {
        return res.status(400).json({ message: "Automation is not active" });
      }
      
      // Import the test function from scheduler
      const { testAutomationTrigger } = await import('./scheduler');
      const result = await testAutomationTrigger(config);
      
      res.json({
        message: "Automation test completed",
        automationType: config.automationType,
        webhookUrl: config.webhookUrl,
        ...result
      });
    } catch (error) {
      console.error("[Test Automation Error]:", error);
      res.status(500).json({ message: "Failed to test automation", error: String(error) });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
