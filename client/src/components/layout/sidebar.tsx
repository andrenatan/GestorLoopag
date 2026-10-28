import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { useAuth } from "@/hooks/use-auth";
import {
  LayoutDashboard,
  Users,
  Trophy,
  UserCheck,
  Menu,
  Zap,
  Server,
  LogOut,
  ChevronDown,
  ListFilter,
  Tag,
  MessageCircle,
  Link2,
  FileText,
  Smartphone,
  CalendarClock,
  Wallet,
  BarChart3,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";

interface NavChild {
  title: string;
  href: string;
  icon: React.ElementType;
  permission: string;
}

interface NavItem {
  title: string;
  href: string;
  icon: React.ElementType;
  children?: NavChild[];
}

interface NavItemEx extends NavItem {
  // Present on leaf items (no children); children carry their own permission.
  permission?: string;
}

// Permission keys mirror server/routes.ts's PermissionKey 1:1 — keep both in
// sync when adding/removing a protected sidebar item.
const sidebarItems: NavItemEx[] = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard, permission: "dashboard" },
  {
    title: "Clientes",
    href: "/clients",
    icon: Users,
    children: [
      { title: "Listar/Criar", href: "/clients", icon: ListFilter, permission: "clients.list" },
      { title: "Planos", href: "/clients/plans", icon: Tag, permission: "clients.plans" },
      { title: "Sistemas", href: "/systems", icon: Server, permission: "clients.systems" },
      { title: "Aplicativos", href: "/apps", icon: Smartphone, permission: "clients.apps" },
      { title: "Renovações Manuais", href: "/manual-renewals", icon: CalendarClock, permission: "clients.manual_renewals" },
    ],
  },
  { title: "Rankings", href: "/rankings", icon: Trophy, permission: "rankings" },
  { title: "Funcionários", href: "/employees", icon: UserCheck, permission: "employees" },
  {
    title: "Financeiro",
    href: "/financeiro",
    icon: Wallet,
    children: [
      { title: "Visão Geral", href: "/financeiro", icon: ListFilter, permission: "financial.overview" },
      { title: "Relatórios", href: "/financeiro/relatorios", icon: BarChart3, permission: "financial.reports" },
    ],
  },
  {
    title: "CRM WhatsApp",
    href: "/crm",
    icon: MessageCircle,
    children: [
      { title: "Conversas", href: "/crm", icon: MessageCircle, permission: "crm.conversations" },
      { title: "Automações", href: "/crm/automations", icon: Zap, permission: "crm.automations" },
      { title: "Templates", href: "/crm/templates", icon: FileText, permission: "crm.templates" },
      { title: "Conexão", href: "/crm/connection", icon: Link2, permission: "crm.connection" },
    ],
  },
];

const pillBase =
  "flex w-full items-center rounded-full text-sm font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
const pillIdle = "text-foreground/75 hover:bg-accent hover:text-foreground";
const pillActive = "bg-ink text-ink-foreground shadow-float hover:bg-ink hover:text-ink-foreground";

function Brand({ collapsed }: { collapsed: boolean }) {
  return (
    <div className={cn("flex items-center gap-3", collapsed && "justify-center")}>
      <div className="brand-tile flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl">
        <Zap className="h-5 w-5" strokeWidth={2.4} />
      </div>
      {!collapsed && <span className="font-display text-xl font-bold tracking-tight text-foreground">Loopag</span>}
    </div>
  );
}

interface SidebarBodyProps {
  collapsed: boolean;
  onNavigate?: () => void;
}

function SidebarBody({ collapsed, onNavigate }: SidebarBodyProps) {
  const [location] = useLocation();
  const { logout, user, hasPermission } = useAuth();
  const visibleItems = sidebarItems
    .map((it) => {
      if (it.children) {
        const visibleChildren = it.children.filter((c) => hasPermission(c.permission));
        return visibleChildren.length > 0 ? { ...it, children: visibleChildren } : null;
      }
      return !it.permission || hasPermission(it.permission) ? it : null;
    })
    .filter((it): it is NavItemEx => it !== null);

  const isClientsActive = location === "/clients" || location.startsWith("/clients/") || location === "/systems" || location.startsWith("/systems/") || location === "/apps" || location.startsWith("/apps/") || location === "/manual-renewals" || location.startsWith("/manual-renewals/");

  const [openItems, setOpenItems] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    if (isClientsActive) initial.add("/clients");
    return initial;
  });

  const toggleItem = (href: string) => {
    setOpenItems((prev) => {
      const next = new Set(prev);
      if (next.has(href)) {
        next.delete(href);
      } else {
        next.add(href);
      }
      return next;
    });
  };

  const displayName = user?.name || user?.username;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ScrollArea className="-mx-1 flex-1 px-1">
        <nav className="space-y-1 pb-2" aria-label="Navegação principal">
          {visibleItems.map((item) => {
            const Icon = item.icon;

            if (item.children) {
              const isParentActive =
                location === item.href ||
                location.startsWith(`${item.href}/`) ||
                item.children.some((c) => location === c.href || location.startsWith(`${c.href}/`));
              const isOpen = openItems.has(item.href) || isParentActive;

              return (
                <div key={item.href}>
                  <button
                    type="button"
                    aria-expanded={collapsed ? undefined : isOpen}
                    title={collapsed ? item.title : undefined}
                    onClick={() => {
                      if (collapsed) return;
                      toggleItem(item.href);
                    }}
                    className={cn(
                      pillBase,
                      pillIdle,
                      "h-11",
                      collapsed ? "justify-center px-0" : "px-3.5",
                      isParentActive && "text-foreground",
                      collapsed && isParentActive && "bg-accent",
                    )}
                  >
                    <Icon className="h-[18px] w-[18px] shrink-0" />
                    {!collapsed && (
                      <>
                        <span className={cn("ml-3 flex-1 text-left", isParentActive && "font-semibold")}>{item.title}</span>
                        {isParentActive && <span className="mr-2 h-1.5 w-1.5 rounded-full bg-highlight" aria-hidden />}
                        <ChevronDown
                          className={cn("h-4 w-4 text-muted-foreground transition-transform duration-200", isOpen && "rotate-180")}
                        />
                      </>
                    )}
                  </button>

                  {!collapsed && isOpen && (
                    <div className="ml-[1.6rem] mt-1 space-y-0.5 border-l border-border pb-1 pl-2.5">
                      {item.children.map((child) => {
                        const ChildIcon = child.icon;
                        const isChildActive = location === child.href;
                        return (
                          <Link
                            key={child.href}
                            href={child.href}
                            onClick={onNavigate}
                            aria-current={isChildActive ? "page" : undefined}
                            className={cn(pillBase, "h-9 px-3 text-[13.5px]", isChildActive ? pillActive : pillIdle)}
                          >
                            <ChildIcon className="h-4 w-4 shrink-0" />
                            <span className="ml-2.5 truncate text-left">{child.title}</span>
                          </Link>
                        );
                      })}
                    </div>
                  )}

                  {collapsed && isParentActive && (
                    <div className="mt-1 space-y-1">
                      {item.children.map((child) => {
                        const ChildIcon = child.icon;
                        const isChildActive = location === child.href;
                        return (
                          <Link
                            key={child.href}
                            href={child.href}
                            onClick={onNavigate}
                            title={child.title}
                            aria-label={child.title}
                            aria-current={isChildActive ? "page" : undefined}
                            className={cn(pillBase, "h-9 justify-center", isChildActive ? pillActive : pillIdle)}
                          >
                            <ChildIcon className="h-4 w-4" />
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
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                title={collapsed ? item.title : undefined}
                aria-current={isActive ? "page" : undefined}
                className={cn(pillBase, "h-11", collapsed ? "justify-center px-0" : "px-3.5", isActive ? pillActive : pillIdle)}
              >
                <Icon className="h-[18px] w-[18px] shrink-0" />
                {!collapsed && <span className="ml-3 font-semibold">{item.title}</span>}
              </Link>
            );
          })}
        </nav>
      </ScrollArea>

      {/* User, theme & logout */}
      <div className="mt-3 space-y-2 border-t border-border pt-3">
        {!collapsed && user && (
          <div className="flex items-center gap-3 rounded-2xl px-1.5 py-1">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-highlight font-display text-sm font-bold text-highlight-foreground">
              {(displayName || "?").charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">{displayName}</p>
              <p className="truncate text-xs text-muted-foreground">{user.email}</p>
            </div>
          </div>
        )}
        <div className={cn("flex gap-2", collapsed ? "flex-col items-center" : "items-center")}>
          <Button
            data-testid="button-logout"
            variant="ghost"
            onClick={() => logout()}
            title={collapsed ? "Sair" : undefined}
            className={cn(
              "h-10 rounded-full text-foreground/75 hover:bg-destructive/10 hover:text-destructive",
              collapsed ? "w-10 px-0" : "flex-1 justify-start px-3.5",
            )}
          >
            <LogOut className="h-[18px] w-[18px]" />
            {!collapsed && <span className="ml-1">Sair</span>}
          </Button>
          <ThemeToggle />
        </div>
      </div>
    </div>
  );
}

interface SidebarProps {
  className?: string;
}

export function Sidebar({ className }: SidebarProps) {
  const [location] = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [location]);

  return (
    <>
      {/* Desktop: floating glass rail */}
      <aside
        className={cn(
          "glass relative my-3 ml-3 hidden shrink-0 flex-col rounded-panel p-4 transition-[width] duration-300 lg:flex",
          collapsed ? "w-[76px]" : "w-[264px]",
          className,
        )}
      >
        <div className={cn("mb-6 flex items-center", collapsed ? "flex-col gap-3" : "justify-between")}>
          <Brand collapsed={collapsed} />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
          >
            {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </Button>
        </div>
        <SidebarBody collapsed={collapsed} />
      </aside>

      {/* Mobile: floating top bar + drawer */}
      <div className="glass fixed inset-x-3 top-3 z-40 flex h-14 items-center justify-between rounded-full py-2 pl-4 pr-2 lg:hidden">
        <Brand collapsed={false} />
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setMobileOpen(true)}
          aria-label="Abrir menu"
          className="text-foreground"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </div>
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="flex w-[86%] max-w-[300px] flex-col p-4 pt-5">
          <SheetTitle className="sr-only">Menu</SheetTitle>
          <div className="mb-6">
            <Brand collapsed={false} />
          </div>
          <SidebarBody collapsed={false} onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>
    </>
  );
}
