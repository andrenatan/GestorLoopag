import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/hooks/use-theme";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute, PublicRoute, RequireOwner, RequirePermission } from "@/components/auth/protected-route";
import { Sidebar } from "@/components/layout/sidebar";

import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import Clients from "@/pages/clients";
import Systems from "@/pages/systems";
import Rankings from "@/pages/rankings";
import Employees from "@/pages/employees";
import Users from "@/pages/users";
import Landing from "@/pages/landing";
import Sales from "@/pages/sales";
import Plans from "@/pages/plans";
import Success from "@/pages/success";
import ClientPlans from "@/pages/client-plans";
import Apps from "@/pages/apps";
import ManualRenewals from "@/pages/manual-renewals";
import FinancialOverview from "@/pages/financial-overview";
import FinancialReports from "@/pages/financial-reports";
import CrmConnection from "@/pages/crm-connection";
import Crm from "@/pages/crm";
import CrmAutomations from "@/pages/crm-automations";
import CrmTemplates from "@/pages/crm-templates";
import CrmTemplateNew from "@/pages/crm-template-new";

function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-[#0d1b2a]">
      <Sidebar />
      <main className="flex-1 overflow-auto bg-[#0d1b2a]">
        {children}
      </main>
    </div>
  );
}

function Router() {
  return (
    <Switch>
      {/* Login page - public only for non-authenticated */}
      <Route path="/login">
        <PublicRoute>
          <Landing />
        </PublicRoute>
      </Route>

      {/* Plan selection - accessible after registration */}
      <Route path="/plans">
        <ProtectedRoute>
          <Plans />
        </ProtectedRoute>
      </Route>

      {/* Success page after Stripe checkout */}
      <Route path="/success">
        <ProtectedRoute>
          <Success />
        </ProtectedRoute>
      </Route>

      {/* Protected dashboard routes */}
      <Route path="/dashboard">
        <ProtectedRoute>
          <RequirePermission permission="dashboard">
            <DashboardLayout>
              <Dashboard />
            </DashboardLayout>
          </RequirePermission>
        </ProtectedRoute>
      </Route>

      <Route path="/clients/plans">
        <ProtectedRoute>
          <RequirePermission permission="clients.plans">
            <DashboardLayout>
              <ClientPlans />
            </DashboardLayout>
          </RequirePermission>
        </ProtectedRoute>
      </Route>

      <Route path="/clients">
        <ProtectedRoute>
          <RequirePermission permission="clients.list">
            <DashboardLayout>
              <Clients />
            </DashboardLayout>
          </RequirePermission>
        </ProtectedRoute>
      </Route>

      <Route path="/systems">
        <ProtectedRoute>
          <RequirePermission permission="clients.systems">
            <DashboardLayout>
              <Systems />
            </DashboardLayout>
          </RequirePermission>
        </ProtectedRoute>
      </Route>

      <Route path="/apps">
        <ProtectedRoute>
          <RequirePermission permission="clients.apps">
            <DashboardLayout>
              <Apps />
            </DashboardLayout>
          </RequirePermission>
        </ProtectedRoute>
      </Route>

      <Route path="/manual-renewals">
        <ProtectedRoute>
          <RequirePermission permission="clients.manual_renewals">
            <DashboardLayout>
              <ManualRenewals />
            </DashboardLayout>
          </RequirePermission>
        </ProtectedRoute>
      </Route>

      <Route path="/financeiro">
        <ProtectedRoute>
          <RequirePermission permission="financial.overview">
            <DashboardLayout>
              <FinancialOverview />
            </DashboardLayout>
          </RequirePermission>
        </ProtectedRoute>
      </Route>

      <Route path="/financeiro/relatorios">
        <ProtectedRoute>
          <RequirePermission permission="financial.reports">
            <DashboardLayout>
              <FinancialReports />
            </DashboardLayout>
          </RequirePermission>
        </ProtectedRoute>
      </Route>

      <Route path="/rankings">
        <ProtectedRoute>
          <RequirePermission permission="rankings">
            <DashboardLayout>
              <Rankings />
            </DashboardLayout>
          </RequirePermission>
        </ProtectedRoute>
      </Route>

      <Route path="/employees">
        <ProtectedRoute>
          <RequirePermission permission="employees">
            <DashboardLayout>
              <Employees />
            </DashboardLayout>
          </RequirePermission>
        </ProtectedRoute>
      </Route>

      <Route path="/users">
        <ProtectedRoute>
          <RequireOwner>
            <DashboardLayout>
              <Users />
            </DashboardLayout>
          </RequireOwner>
        </ProtectedRoute>
      </Route>

      <Route path="/crm">
        <ProtectedRoute>
          <RequirePermission permission="crm.conversations">
            <DashboardLayout>
              <Crm />
            </DashboardLayout>
          </RequirePermission>
        </ProtectedRoute>
      </Route>

      <Route path="/crm/automations">
        <ProtectedRoute>
          <RequirePermission permission="crm.automations">
            <DashboardLayout>
              <CrmAutomations />
            </DashboardLayout>
          </RequirePermission>
        </ProtectedRoute>
      </Route>

      <Route path="/crm/templates/new">
        <ProtectedRoute>
          <RequirePermission permission="crm.templates">
            <DashboardLayout>
              <CrmTemplateNew />
            </DashboardLayout>
          </RequirePermission>
        </ProtectedRoute>
      </Route>

      <Route path="/crm/templates">
        <ProtectedRoute>
          <RequirePermission permission="crm.templates">
            <DashboardLayout>
              <CrmTemplates />
            </DashboardLayout>
          </RequirePermission>
        </ProtectedRoute>
      </Route>

      <Route path="/crm/connection">
        <ProtectedRoute>
          <RequirePermission permission="crm.connection">
            <DashboardLayout>
              <CrmConnection />
            </DashboardLayout>
          </RequirePermission>
        </ProtectedRoute>
      </Route>

      {/* Sales landing page - public (must be before 404) */}
      <Route path="/">
        <Sales />
      </Route>

      {/* 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="dark" storageKey="loopag-theme">
        <AuthProvider>
          <TooltipProvider>
            <div className="min-h-screen bg-background text-foreground">
              <Toaster />
              <Router />
            </div>
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
