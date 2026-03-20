import { useState } from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/hooks/use-auth";
import {
  LayoutDashboard,
  Users,
  CreditCard,
  Trophy,
  UserCheck,
  MessageCircle,
  Menu,
  Zap,
  Server,
  FileText,
  LogOut,
  Smartphone,
  ChevronDown,
} from "lucide-react";

interface NavItem {
  title: string;
  href: string;
  icon: React.ElementType;
  children?: { title: string; href: string; icon: React.ElementType }[];
}

const sidebarItems: NavItem[] = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { title: "Clientes", href: "/clients", icon: Users },
  { title: "Sistemas", href: "/systems", icon: Server },
  { title: "Cobranças", href: "/billing", icon: CreditCard },
  { title: "Templates", href: "/templates", icon: FileText },
  { title: "Rankings", href: "/rankings", icon: Trophy },
  { title: "Funcionários", href: "/employees", icon: UserCheck },
  {
    title: "WhatsApp",
    href: "/whatsapp",
    icon: MessageCircle,
    children: [
      { title: "Conectar WhatsApp", href: "/whatsapp/connect", icon: Smartphone },
      { title: "Criar Templates", href: "/whatsapp/templates", icon: FileText },
    ],
  },
];

interface SidebarProps {
  className?: string;
}

export function Sidebar({ className }: SidebarProps) {
  const [location] = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const { logout, user } = useAuth();

  const isWhatsAppActive =
    location === "/whatsapp" ||
    location.startsWith("/whatsapp/");

  const [whatsappOpen, setWhatsappOpen] = useState(isWhatsAppActive);

  return (
    <aside
      className={cn(
        "bg-black/40 backdrop-blur-xl border-r border-white/10 transition-all duration-300 relative text-white flex flex-col",
        collapsed ? "w-16" : "w-64",
        className
      )}
    >
      <div className="p-6 flex-1 flex flex-col">
        {/* Logo */}
        <div className="flex items-center space-x-3 mb-8">
          <div className="w-10 h-10 gradient-bg rounded-xl flex items-center justify-center">
            <Zap className="w-6 h-6 text-white" />
          </div>
          {!collapsed && <span className="text-xl font-bold text-white">Loopag</span>}
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
        <ScrollArea className="flex-1 mb-4">
          <nav className="space-y-1">
            {sidebarItems.map((item) => {
              const Icon = item.icon;

              if (item.children) {
                const isParentActive = location === item.href || location.startsWith(`${item.href}/`);
                return (
                  <div key={item.href}>
                    <button
                      onClick={() => {
                        if (collapsed) return;
                        setWhatsappOpen((o) => !o);
                      }}
                      className={cn(
                        "w-full flex items-center justify-start h-10 px-4 py-2 rounded-md text-white/80 hover:text-white hover:bg-white/10 transition-all duration-200",
                        isParentActive && "bg-blue-600/30 text-white border border-blue-500/30"
                      )}
                    >
                      <Icon className="h-5 w-5 shrink-0" />
                      {!collapsed && (
                        <>
                          <span className="ml-3 flex-1 text-left text-sm">{item.title}</span>
                          <ChevronDown
                            className={cn(
                              "h-4 w-4 text-white/50 transition-transform duration-200",
                              whatsappOpen && "rotate-180"
                            )}
                          />
                        </>
                      )}
                    </button>

                    {/* Submenu */}
                    {!collapsed && whatsappOpen && (
                      <div className="ml-4 mt-1 space-y-1 border-l border-white/10 pl-3">
                        {item.children.map((child) => {
                          const ChildIcon = child.icon;
                          const isChildActive = location === child.href;
                          return (
                            <Link key={child.href} href={child.href}>
                              <button
                                className={cn(
                                  "w-full flex items-center h-9 px-3 py-1.5 rounded-md text-sm text-white/70 hover:text-white hover:bg-white/10 transition-all duration-200",
                                  isChildActive && "bg-blue-600 text-white hover:bg-blue-700 border border-blue-500/50"
                                )}
                              >
                                <ChildIcon className="h-4 w-4 shrink-0" />
                                <span className="ml-2.5">{child.title}</span>
                              </button>
                            </Link>
                          );
                        })}
                      </div>
                    )}

                    {/* Collapsed: show first child icon */}
                    {collapsed && isParentActive && (
                      <div className="space-y-1 mt-1">
                        {item.children.map((child) => {
                          const ChildIcon = child.icon;
                          const isChildActive = location === child.href;
                          return (
                            <Link key={child.href} href={child.href}>
                              <button
                                className={cn(
                                  "w-full flex items-center justify-center h-9 rounded-md text-white/60 hover:text-white hover:bg-white/10 transition-all",
                                  isChildActive && "bg-blue-600 text-white"
                                )}
                                title={child.title}
                              >
                                <ChildIcon className="h-4 w-4" />
                              </button>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              }

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

        {/* User Info & Logout */}
        <div className="border-t border-white/10 pt-4">
          {!collapsed && user && (
            <div className="mb-3 px-2">
              <p className="text-sm text-white font-semibold truncate">{user.name || user.username}</p>
              <p className="text-xs text-white/60 truncate">{user.email}</p>
            </div>
          )}
          <Button
            data-testid="button-logout"
            variant="ghost"
            onClick={() => logout()}
            className="w-full justify-start h-10 px-4 py-2 text-white/80 hover:text-white hover:bg-red-500/20 transition-all duration-200 bg-transparent border-0"
          >
            <LogOut className="h-5 w-5" />
            {!collapsed && <span className="ml-3">Sair</span>}
          </Button>
        </div>
      </div>
    </aside>
  );
}
