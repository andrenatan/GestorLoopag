import { Switch, Route, useLocation } from "wouter";
import { useEffect } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/hooks/use-theme";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute, PublicRoute, RequireOwner } from "@/components/auth/protected-route";
import { Sidebar } from "@/components/layout/sidebar";

import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import Clients from "@/pages/clients";
import Systems from "@/pages/systems";
import Billing from "@/pages/billing";
import Rankings from "@/pages/rankings";
import Employees from "@/pages/employees";
import Users from "@/pages/users";
import Templates from "@/pages/templates";
import WhatsAppConnect from "@/pages/whatsapp-connect";
import WhatsAppTemplates from "@/pages/whatsapp-templates";
import Landing from "@/pages/landing";
import Sales from "@/pages/sales";
import Plans from "@/pages/plans";
import Success from "@/pages/success";
import ClientPlans from "@/pages/client-plans";

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

function WhatsAppRedirect() {
  const [, navigate] = useLocation();
  useEffect(() => {
    navigate("/whatsapp/connect", { replace: true });
  }, []);
  return null;
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
          <RequireOwner>
            <DashboardLayout>
              <Dashboard />
            </DashboardLayout>
          </RequireOwner>
        </ProtectedRoute>
      </Route>

      <Route path="/clients/plans">
        <ProtectedRoute>
          <DashboardLayout>
            <ClientPlans />
          </DashboardLayout>
        </ProtectedRoute>
      </Route>

      <Route path="/clients">
        <ProtectedRoute>
          <DashboardLayout>
            <Clients />
          </DashboardLayout>
        </ProtectedRoute>
      </Route>

      <Route path="/systems">
        <ProtectedRoute>
          <DashboardLayout>
            <Systems />
          </DashboardLayout>
        </ProtectedRoute>
      </Route>

      <Route path="/billing">
        <ProtectedRoute>
          <DashboardLayout>
            <Billing />
          </DashboardLayout>
        </ProtectedRoute>
      </Route>

      <Route path="/rankings">
        <ProtectedRoute>
          <DashboardLayout>
            <Rankings />
          </DashboardLayout>
        </ProtectedRoute>
      </Route>

      <Route path="/employees">
        <ProtectedRoute>
          <RequireOwner>
            <DashboardLayout>
              <Employees />
            </DashboardLayout>
          </RequireOwner>
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

      <Route path="/templates">
        <ProtectedRoute>
          <DashboardLayout>
            <Templates />
          </DashboardLayout>
        </ProtectedRoute>
      </Route>

      {/* WhatsApp – redirect base path to /connect */}
      <Route path="/whatsapp">
        <ProtectedRoute>
          <DashboardLayout>
            <WhatsAppRedirect />
          </DashboardLayout>
        </ProtectedRoute>
      </Route>

      <Route path="/whatsapp/connect">
        <ProtectedRoute>
          <DashboardLayout>
            <WhatsAppConnect />
          </DashboardLayout>
        </ProtectedRoute>
      </Route>

      <Route path="/whatsapp/templates">
        <ProtectedRoute>
          <DashboardLayout>
            <WhatsAppTemplates />
          </DashboardLayout>
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
