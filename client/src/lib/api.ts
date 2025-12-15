import { apiRequest } from "./queryClient";

export const api = {
  // Dashboard
  getDashboardStats: () => apiRequest("/api/dashboard/stats", "GET").then(res => res.json()),
  getNewClientsByDay: () => apiRequest("/api/dashboard/new-clients-by-day", "GET").then(res => res.json()),
  getRevenueByPeriod: (period: 'current_month' | 'last_month' | '3_months' | '6_months' | '12_months') => 
    apiRequest(`/api/dashboard/revenue-by-period?period=${period}`, "GET").then(res => res.json()),
  getRevenueBySystem: (month: string) => 
    apiRequest(`/api/dashboard/revenue-by-system?month=${month}`, "GET").then(res => res.json()),
  getClientsBySystem: (month: string) => 
    apiRequest(`/api/dashboard/clients-by-system?month=${month}`, "GET").then(res => res.json()),
  getClientsByState: (month: string) => 
    apiRequest(`/api/dashboard/clients-by-state?month=${month}`, "GET").then(res => res.json()),

  // Clients
  getClients: () => apiRequest("/api/clients", "GET").then(res => res.json()),
  getExpiringClients: (days: number) => apiRequest(`/api/clients/expiring/${days}`, "GET").then(res => res.json()),
  getOverdueClients: () => apiRequest("/api/clients/overdue", "GET").then(res => res.json()),
  getReferralRankings: (days?: number) => {
    const url = days ? `/api/clients/rankings?days=${days}` : "/api/clients/rankings";
    return apiRequest(url, "GET").then(res => res.json());
  },
  createClient: (client: any) => apiRequest("/api/clients", "POST", client),
  updateClient: (id: number, client: any) => apiRequest(`/api/clients/${id}`, "PUT", client),
  deleteClient: (id: number) => apiRequest(`/api/clients/${id}`, "DELETE"),

  // Employees
  getEmployees: () => apiRequest("/api/employees", "GET").then(res => res.json()),
  createEmployee: (employee: any) => apiRequest("/api/employees", "POST", employee),
  updateEmployee: (id: number, employee: any) => apiRequest(`/api/employees/${id}`, "PUT", employee),
  deleteEmployee: (id: number) => apiRequest(`/api/employees/${id}`, "DELETE"),

  // Users
  getUsers: () => apiRequest("/api/users", "GET").then(res => res.json()),
  createUser: (user: any) => apiRequest("/api/users", "POST", user),
  updateUser: (id: number, user: any) => apiRequest(`/api/users/${id}`, "PUT", user),

  // WhatsApp
  getWhatsappInstances: () => apiRequest("/api/whatsapp/instances", "GET").then(res => res.json()),
  createWhatsappInstance: (instance: any) => apiRequest("/api/whatsapp/instances", "POST", instance),
  updateWhatsappInstance: (id: number, instance: any) => apiRequest(`/api/whatsapp/instances/${id}`, "PUT", instance),
  deleteWhatsappInstance: (id: number) => apiRequest(`/api/whatsapp/instances/${id}`, "DELETE"),
  connectWhatsappInstance: (id: number) => apiRequest(`/api/whatsapp/instances/${id}/connect`, "POST", {}),
  refreshWhatsappStatus: (id: number) => apiRequest(`/api/whatsapp/instances/${id}/status`, "GET").then(res => res.json()),

  // Templates
  getMessageTemplates: () => apiRequest("/api/templates", "GET").then(res => res.json()),
  createMessageTemplate: (template: any) => apiRequest("/api/templates", "POST", template),
  updateMessageTemplate: (id: number, template: any) => apiRequest(`/api/templates/${id}`, "PUT", template),

  // Billing
  getBillingHistory: () => apiRequest("/api/billing/history", "GET").then(res => res.json()),
  sendBillingMessages: (data: { clientIds: number[]; templateId: number; instanceId: number }) => 
    apiRequest("/api/billing/send", "POST", data),
};
