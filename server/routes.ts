import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertUserSchema, insertEmployeeSchema, insertSystemSchema, insertClientSchema, 
  insertWhatsappInstanceSchema, insertMessageTemplateSchema, insertBillingHistorySchema 
} from "@shared/schema";
import multer from "multer";
import { Client } from "@replit/object-storage";

export async function registerRoutes(app: Express): Promise<Server> {
  
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
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
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
      res.status(500).json({ message: "Failed to fetch revenue by period" });
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
      res.status(201).json(client);
    } catch (error) {
      res.status(400).json({ message: "Invalid client data", error });
    }
  });

  app.put("/api/clients/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertClientSchema.partial().parse(req.body);
      const client = await storage.updateClient(id, validatedData);
      
      if (!client) {
        return res.status(404).json({ message: "Client not found" });
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

  const httpServer = createServer(app);
  return httpServer;
}
