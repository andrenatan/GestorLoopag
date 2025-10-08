import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertUserSchema, insertEmployeeSchema, insertSystemSchema, insertClientSchema, 
  insertWhatsappInstanceSchema, insertMessageTemplateSchema, insertBillingHistorySchema 
} from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  
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
      res.status(201).json(instance);
    } catch (error) {
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
