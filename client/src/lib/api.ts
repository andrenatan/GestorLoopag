import { apiRequest } from "./queryClient";

export const api = {
  // Dashboard
  getDashboardStats: () => apiRequest("GET", "/api/dashboard/stats").then(res => res.json()),
  getNewClientsByDay: () => apiRequest("GET", "/api/dashboard/new-clients-by-day").then(res => res.json()),
  getRevenueByPeriod: (period: 'current_month' | 'last_month' | '3_months' | '6_months' | '12_months') => 
    apiRequest("GET", `/api/dashboard/revenue-by-period?period=${period}`).then(res => res.json()),

  // Clients
  getClients: () => apiRequest("GET", "/api/clients").then(res => res.json()),
  getExpiringClients: (days: number) => apiRequest("GET", `/api/clients/expiring/${days}`).then(res => res.json()),
  getOverdueClients: () => apiRequest("GET", "/api/clients/overdue").then(res => res.json()),
  getReferralRankings: (days?: number) => {
    const url = days ? `/api/clients/rankings?days=${days}` : "/api/clients/rankings";
    return apiRequest("GET", url).then(res => res.json());
  },
  createClient: (client: any) => apiRequest("POST", "/api/clients", client),
  updateClient: (id: number, client: any) => apiRequest("PUT", `/api/clients/${id}`, client),
  deleteClient: (id: number) => apiRequest("DELETE", `/api/clients/${id}`),

  // Employees
  getEmployees: () => apiRequest("GET", "/api/employees").then(res => res.json()),
  createEmployee: (employee: any) => apiRequest("POST", "/api/employees", employee),
  updateEmployee: (id: number, employee: any) => apiRequest("PUT", `/api/employees/${id}`, employee),
  deleteEmployee: (id: number) => apiRequest("DELETE", `/api/employees/${id}`),

  // Users
  getUsers: () => apiRequest("GET", "/api/users").then(res => res.json()),
  createUser: (user: any) => apiRequest("POST", "/api/users", user),
  updateUser: (id: number, user: any) => apiRequest("PUT", `/api/users/${id}`, user),

  // WhatsApp
  getWhatsappInstances: () => apiRequest("GET", "/api/whatsapp/instances").then(res => res.json()),
  createWhatsappInstance: (instance: any) => apiRequest("POST", "/api/whatsapp/instances", instance),
  updateWhatsappInstance: (id: number, instance: any) => apiRequest("PUT", `/api/whatsapp/instances/${id}`, instance),
  deleteWhatsappInstance: (id: number) => apiRequest("DELETE", `/api/whatsapp/instances/${id}`),
  connectWhatsappInstance: (id: number) => apiRequest("POST", `/api/whatsapp/instances/${id}/connect`, {}),
  refreshWhatsappStatus: (id: number) => apiRequest("GET", `/api/whatsapp/instances/${id}/status`).then(res => res.json()),

  // Templates
  getMessageTemplates: () => apiRequest("GET", "/api/templates").then(res => res.json()),
  createMessageTemplate: (template: any) => apiRequest("POST", "/api/templates", template),
  updateMessageTemplate: (id: number, template: any) => apiRequest("PUT", `/api/templates/${id}`, template),

  // Billing
  getBillingHistory: () => apiRequest("GET", "/api/billing/history").then(res => res.json()),
  sendBillingMessages: (data: { clientIds: number[]; templateId: number; instanceId: number }) => 
    apiRequest("POST", "/api/billing/send", data),
};
