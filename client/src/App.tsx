import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/hooks/use-theme";
import { Sidebar } from "@/components/layout/sidebar";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import Clients from "@/pages/clients";
import Systems from "@/pages/systems";
import Billing from "@/pages/billing";
import Rankings from "@/pages/rankings";
import Employees from "@/pages/employees";
import Users from "@/pages/users";
import Templates from "@/pages/templates";
import WhatsApp from "@/pages/whatsapp";

function Router() {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <Switch>
          <Route path="/" component={Dashboard} />
          <Route path="/clients" component={Clients} />
          <Route path="/systems" component={Systems} />
          <Route path="/billing" component={Billing} />
          <Route path="/rankings" component={Rankings} />
          <Route path="/employees" component={Employees} />
          <Route path="/users" component={Users} />
          <Route path="/templates" component={Templates} />
          <Route path="/whatsapp" component={WhatsApp} />
          <Route component={NotFound} />
        </Switch>
      </main>
      <ThemeToggle />
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="dark" storageKey="loopag-theme">
        <TooltipProvider>
          <div className="min-h-screen bg-background text-foreground">
            <Toaster />
            <Router />
          </div>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
