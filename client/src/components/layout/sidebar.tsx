import { useState } from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  LayoutDashboard, 
  Users, 
  CreditCard, 
  Trophy, 
  UserCheck, 
  MessageCircle,
  Menu,
  Zap
} from "lucide-react";

const sidebarItems = [
  {
    title: "Dashboard",
    href: "/",
    icon: LayoutDashboard,
  },
  {
    title: "Clientes",
    href: "/clients",
    icon: Users,
  },
  {
    title: "Cobranças",
    href: "/billing",
    icon: CreditCard,
  },
  {
    title: "Rankings",
    href: "/rankings",
    icon: Trophy,
  },
  {
    title: "Funcionários",
    href: "/employees",
    icon: UserCheck,
  },
  {
    title: "WhatsApp",
    href: "/whatsapp",
    icon: MessageCircle,
  },
];

interface SidebarProps {
  className?: string;
}

export function Sidebar({ className }: SidebarProps) {
  const [location] = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside 
      className={cn(
        "glassmorphism border-r border-border transition-all duration-300 relative",
        collapsed ? "w-16" : "w-64",
        className
      )}
    >
      <div className="p-6">
        {/* Logo */}
        <div className="flex items-center space-x-3 mb-8">
          <div className="w-10 h-10 gradient-bg rounded-xl flex items-center justify-center">
            <Zap className="w-6 h-6 text-white" />
          </div>
          {!collapsed && (
            <span className="text-xl font-bold">Loopag</span>
          )}
        </div>

        {/* Collapse Toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-6 rounded-full border glassmorphism"
        >
          <Menu className="h-4 w-4" />
        </Button>

        {/* Navigation */}
        <ScrollArea className="h-[calc(100vh-120px)]">
          <nav className="space-y-2">
            {sidebarItems.map((item) => {
              const Icon = item.icon;
              const isActive = location === item.href;

              return (
                <Link key={item.href} href={item.href}>
                  <Button
                    variant={isActive ? "secondary" : "ghost"}
                    className={cn(
                      "w-full justify-start nav-item",
                      isActive && "active bg-primary/10 text-primary border border-primary/20",
                      collapsed && "justify-center px-2"
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    {!collapsed && <span className="ml-3">{item.title}</span>}
                  </Button>
                </Link>
              );
            })}
          </nav>
        </ScrollArea>
      </div>
    </aside>
  );
}
