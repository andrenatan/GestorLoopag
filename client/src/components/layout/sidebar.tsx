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
  Zap,
  Server
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
    title: "Sistemas",
    href: "/systems",
    icon: Server,
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
        "bg-black/40 backdrop-blur-xl border-r border-white/10 transition-all duration-300 relative text-white",
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
            <span className="text-xl font-bold text-white">Loopag</span>
          )}
        </div>

        {/* Collapse Toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-6 rounded-full border border-white/20 bg-black/40 backdrop-blur-xl text-white hover:bg-white/10"
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
                    variant="ghost"
                    className={cn(
                      "w-full justify-start h-10 px-4 py-2 text-white/80 hover:text-white hover:bg-white/10 transition-all duration-200 bg-transparent border-0",
                      isActive && "bg-blue-600 text-white hover:bg-blue-700 border border-blue-500/50"
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
