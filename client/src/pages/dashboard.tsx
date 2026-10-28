import { useState, Component, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { BrazilMap } from "@/components/dashboard/brazil-map";
import { PeriodSelector, defaultPeriod } from "@/components/dashboard/period-selector";
import type { PeriodValue } from "@/components/dashboard/period-selector";
import { PageHeader, PageShell } from "@/components/layout/page-header";
import { useTheme } from "@/hooks/use-theme";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import {
  CHART_PALETTE,
  chartAxisTick,
  chartColors,
  chartCursor,
  chartGridStroke,
  chartTooltipItemStyle,
  chartTooltipLabelStyle,
  chartTooltipStyle,
} from "@/lib/chart-theme";
import {
  Users,
  UserCheck,
  UserX,
  UserPlus,
  Calendar,
  Send,
  RefreshCw,
  Eye,
  EyeOff,
  Moon,
  Sun,
  Crown,
  Trophy,
  Medal,
  Map as MapIcon,
  Download,
  DollarSign,
  CalendarClock,
  AlertTriangle,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  ComposedChart,
  Line,
} from "recharts";

const CHART_COLORS = CHART_PALETTE;

const getCurrentMonth = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
};

const getMonthLabel = (month: string) => {
  const [year, monthNum] = month.split("-").map(Number);
  const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  return `${months[monthNum - 1]}/${year}`;
};

const getMonthOptions = () => {
  const options = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    options.push({ value, label: getMonthLabel(value) });
  }
  return options;
};

const fmt = (v: number) =>
  v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const MONTH_SHORT = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

function formatXLabel(date: string, totalDays: number): string {
  if (totalDays <= 31) {
    return String(Number(date.split("-")[2]));
  }
  const [, m, d] = date.split("-").map(Number);
  return `${d}/${MONTH_SHORT[m - 1]}`;
}

const formatTooltipDate = (d: unknown) => {
  if (!d) return "";
  const [y, m, day] = String(d).split("-").map(Number);
  return `${String(day).padStart(2, "0")}/${String(m).padStart(2, "0")}/${y}`;
};

const blurStyle = (on: boolean) =>
  on
    ? { filter: "blur(8px)", transition: "filter 0.3s ease", pointerEvents: "none" as const }
    : { transition: "filter 0.3s ease" };

interface ClientsByDayItem {
  day: number;
  date: string;
  count: number;
}

interface PaymentsByDayResult {
  total: number;
  count: number;
  average: number;
  bestDayAmount: number;
  dailyData: { day: number; date: string; total: number; count: number }[];
}

function StatusScreen({ title, message, action }: { title: string; message: string; action: ReactNode }) {
  return (
    <PageShell className="flex min-h-[70vh] items-center justify-center">
      <div className="glass-strong max-w-md space-y-4 p-8 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <h2 className="text-xl font-semibold text-foreground">{title}</h2>
        <p className="text-sm text-muted-foreground">{message}</p>
        {action}
      </div>
    </PageShell>
  );
}

class DashboardErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <StatusScreen
          title="Algo deu errado"
          message="Ocorreu um erro inesperado. Recarregue a página para tentar novamente."
          action={
            <Button onClick={() => window.location.reload()} className="mt-2">
              <RefreshCw className="h-4 w-4" />
              Recarregar página
            </Button>
          }
        />
      );
    }
    return this.props.children;
  }
}

function DashboardContent() {
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
  const [blurBilling, setBlurBilling] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [clientsPeriod, setClientsPeriod] = useState<PeriodValue>(defaultPeriod());
  const [paymentsPeriod, setPaymentsPeriod] = useState<PeriodValue>(defaultPeriod());
  const [churnPeriod, setChurnPeriod] = useState<PeriodValue>(defaultPeriod());
  const queryClient = useQueryClient();
  const { theme, setTheme } = useTheme();
  const { user } = useAuth();

  const { data: stats, isLoading, isError } = useQuery({
    queryKey: ["/api/dashboard/stats"],
    queryFn: api.getDashboardStats,
    refetchInterval: 30000,
  });

  const { data: newClientsByDay } = useQuery<ClientsByDayItem[]>({
    queryKey: ["/api/dashboard/new-clients-by-day", clientsPeriod.startDate, clientsPeriod.endDate],
    queryFn: () => api.getNewClientsByDay(clientsPeriod.startDate, clientsPeriod.endDate),
    refetchInterval: 30000,
  });

  const { data: paymentsByDay } = useQuery<PaymentsByDayResult>({
    queryKey: ["/api/dashboard/payments-by-day", paymentsPeriod.startDate, paymentsPeriod.endDate],
    queryFn: () => api.getPaymentsByDay(paymentsPeriod.startDate, paymentsPeriod.endDate),
    refetchInterval: 30000,
  });

  const { data: churnByDay } = useQuery<ClientsByDayItem[]>({
    queryKey: ["/api/dashboard/churn-by-day", churnPeriod.startDate, churnPeriod.endDate],
    queryFn: () => api.getChurnByDay(churnPeriod.startDate, churnPeriod.endDate),
    refetchInterval: 30000,
  });

  const { data: revenueBySystem } = useQuery({
    queryKey: ["/api/dashboard/revenue-by-system", selectedMonth],
    queryFn: () => api.getRevenueBySystem(selectedMonth),
    refetchInterval: 30000,
  });

  const { data: clientsBySystem } = useQuery({
    queryKey: ["/api/dashboard/clients-by-system", selectedMonth],
    queryFn: () => api.getClientsBySystem(selectedMonth),
    refetchInterval: 30000,
  });

  const { data: clientsByState } = useQuery({
    queryKey: ["/api/dashboard/clients-by-state", selectedMonth],
    queryFn: () => api.getClientsByState(selectedMonth),
    refetchInterval: 30000,
  });

  const monthOptions = getMonthOptions();

  const clientsChartData: ClientsByDayItem[] = newClientsByDay || [];
  const clientsTotalDays = clientsChartData.length || 1;
  const totalClientsMonth = clientsChartData.reduce((s, d) => s + d.count, 0);
  const daysWithClients = clientsChartData.filter((d) => d.count > 0).length || 1;
  const avgClientsPerDay = totalClientsMonth / daysWithClients;
  const bestClientsDay = Math.max(...clientsChartData.map((d) => d.count), 0);

  const paymentsData: PaymentsByDayResult = paymentsByDay || { total: 0, count: 0, average: 0, bestDayAmount: 0, dailyData: [] };
  const paymentsChartData = paymentsData.dailyData;
  const paymentsTotalDays = paymentsChartData.length || 1;

  const churnChartData: ClientsByDayItem[] = churnByDay || [];
  const churnTotalDays = churnChartData.length || 1;
  const totalChurn = churnChartData.reduce((s, d) => s + d.count, 0);
  const daysWithChurn = churnChartData.filter((d) => d.count > 0).length || 1;
  const avgChurnPerDay = totalChurn / daysWithChurn;
  const worstChurnDay = Math.max(...churnChartData.map((d) => d.count), 0);

  if (isLoading) {
    return (
      <PageShell>
        <div className="space-y-2">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-4 w-80" />
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass h-36 p-6">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="mt-5 h-10 w-24" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass h-48 p-6">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="mt-4 h-4 w-full" />
              <Skeleton className="mt-3 h-4 w-full" />
            </div>
          ))}
        </div>
      </PageShell>
    );
  }

  if (isError) {
    return (
      <StatusScreen
        title="Erro ao carregar dados"
        message="Não foi possível conectar ao servidor. Tente novamente."
        action={
          <Button
            onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] })}
            className="mt-2"
          >
            <RefreshCw className="h-4 w-4" />
            Tentar novamente
          </Button>
        }
      />
    );
  }

  const totalClients = stats?.totalClients ?? 0;
  const activeClients = stats?.activeClients ?? 0;
  const inactiveClients = stats?.inactiveClients ?? 0;
  const share = (n: number) => (totalClients > 0 ? Math.round((n / totalClients) * 100) : 0);
  const firstName = (user?.name || user?.username || "").trim().split(/\s+/)[0];

  return (
    <PageShell>
      <PageHeader
        title={firstName ? `Olá, ${firstName}` : "Dashboard"}
        description="Visão geral do sistema de gestão IPTV"
        actions={
          <div className="flex items-center gap-1.5 rounded-full border border-edge bg-secondary p-1 shadow-glass">
            <Button
              variant="ghost"
              size="icon"
              onClick={async () => {
                setIsRefreshing(true);
                await queryClient.invalidateQueries();
                setTimeout(() => setIsRefreshing(false), 1000);
              }}
              title="Atualizar dados"
              aria-label="Atualizar dados"
              className="h-9 w-9"
            >
              <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setBlurBilling(!blurBilling)}
              title={blurBilling ? "Mostrar faturamento" : "Ocultar faturamento"}
              aria-label={blurBilling ? "Mostrar faturamento" : "Ocultar faturamento"}
              aria-pressed={blurBilling}
              className={cn("h-9 w-9", blurBilling && "bg-ink text-ink-foreground hover:bg-ink/90 hover:text-ink-foreground")}
            >
              {blurBilling ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === "light" ? "dark" : "light")}
              title={theme === "light" ? "Modo escuro" : "Modo claro"}
              aria-label={theme === "light" ? "Modo escuro" : "Modo claro"}
              className="relative h-9 w-9"
            >
              <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            </Button>
          </div>
        }
      />

      {/* Row 1 — headline metrics */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div data-reveal className="relative overflow-hidden rounded-card bg-ink p-6 text-ink-foreground shadow-float">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium opacity-80">Total de Clientes</span>
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-highlight text-highlight-foreground">
              <Users className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-4 font-display text-5xl font-semibold tracking-tight">{totalClients}</p>
          <p className="mt-1 text-sm opacity-70">Cadastrados na sua base</p>
        </div>

        <MetricCard
          label="Clientes Ativos"
          value={activeClients}
          icon={<UserCheck className="h-4 w-4" />}
          iconClass="bg-success/15 text-success"
          barClass="bg-highlight"
          percent={share(activeClients)}
        />
        <MetricCard
          label="Clientes Inativos"
          value={inactiveClients}
          icon={<UserX className="h-4 w-4" />}
          iconClass="bg-destructive/10 text-destructive"
          barClass="bg-ink"
          percent={share(inactiveClients)}
        />
      </div>

      {/* Row 2 — grouped lists */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <ListCard title="Novos clientes" icon={<UserPlus className="h-4 w-4" />}>
          <InfoRow label="Novos Clientes Hoje" value={stats?.newClientsToday ?? 0} />
          <InfoRow label="Novos Clientes Esta Semana" value={stats?.newClientsThisWeek ?? 0} />
          <InfoRow label="Novos Clientes Este Mês" value={stats?.newClientsThisMonth ?? 0} />
        </ListCard>

        <ListCard title="Vencimentos e renovações" icon={<CalendarClock className="h-4 w-4" />}>
          <InfoRow label="Clientes Vencendo Hoje" value={stats?.expiringToday ?? 0} accent />
          <InfoRow label="Clientes Vencendo em 3 Dias" value={stats?.expiring3Days ?? 0} />
          <InfoRow label="Sem Renovar este Mês" value={stats?.clientsNotRenewedThisMonth ?? 0} />
          <InfoRow label="Recuperados este Mês" value={stats?.clientsRecoveredThisMonth ?? 0} />
          <InfoRow label="Total Renovados este Mês" value={stats?.totalRecoveredThisMonth ?? 0} />
        </ListCard>

        <ListCard title="A receber" icon={<Send className="h-4 w-4" />}>
          <div style={blurStyle(blurBilling)}>
            <InfoRowMoney label="A Receber no Mês" value={stats?.projectedMonthlyRevenue ?? 0} featured />
            <InfoRowMoney label="Hoje" value={stats?.revenueToday ?? 0} />
            <InfoRowMoney label="Amanhã" value={stats?.revenueTomorrow ?? 0} />
          </div>
        </ListCard>
      </div>

      {/* Row 3 — daily charts */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Clientes Novos Por Dia */}
        <div className="glass p-5 sm:p-6">
          <PaneHeader
            icon={<UserPlus className="h-4 w-4" />}
            title="Clientes Novos Por Dia"
            description="Cadastros diários no período selecionado"
            action={<PeriodSelector value={clientsPeriod} onChange={setClientsPeriod} />}
          />

          <div className="mb-4 grid grid-cols-3 gap-2.5">
            <MiniCard label="Total no Período" value={String(totalClientsMonth)} color={chartColors.lagoa} />
            <MiniCard label="Média por Dia" value={avgClientsPerDay.toFixed(1)} color={chartColors.anil} />
            <MiniCard label="Melhor Dia" value={String(bestClientsDay)} color={chartColors.pitaya} />
          </div>

          <p className="mb-2 text-center text-xs text-muted-foreground">
            Clientes Novos — {clientsPeriod.label}
          </p>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={clientsChartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <defs>
                  <linearGradient id="clientsGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={chartColors.lagoa} stopOpacity={0.45} />
                    <stop offset="95%" stopColor={chartColors.lagoa} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={chartGridStroke} vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ ...chartAxisTick, fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(d) => formatXLabel(d, clientsTotalDays)}
                  interval={clientsTotalDays <= 31 ? 0 : Math.floor(clientsTotalDays / 8)}
                />
                <YAxis tick={chartAxisTick} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={chartTooltipStyle}
                  labelStyle={chartTooltipLabelStyle}
                  itemStyle={chartTooltipItemStyle}
                  formatter={(v: number) => [v, "Novos Clientes"]}
                  labelFormatter={formatTooltipDate}
                />
                <Area type="monotone" dataKey="count" stroke={chartColors.lagoa} strokeWidth={2.5} fill="url(#clientsGrad)" dot={clientsTotalDays <= 31 ? { fill: chartColors.lagoa, r: 2.5, strokeWidth: 0 } : false} activeDot={{ r: 5 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pagamentos Por Dia */}
        <div className="glass p-5 sm:p-6" style={blurStyle(blurBilling)}>
          <PaneHeader
            icon={<DollarSign className="h-4 w-4" />}
            title="Pagamentos Por Dia"
            description="Faturamento diário no período selecionado"
            action={<PeriodSelector value={paymentsPeriod} onChange={setPaymentsPeriod} />}
          />

          <div className="mb-4 grid grid-cols-2 gap-2.5 2xl:grid-cols-4">
            <MiniCard label="Total no Período" value={`R$ ${fmt(paymentsData.total || 0)}`} color={chartColors.pitaya} small />
            <MiniCard label="Total Pagamentos" value={String(paymentsData.count || 0)} color={chartColors.anil} small />
            <MiniCard label="Média por Dia" value={`R$ ${fmt(paymentsData.average || 0)}`} color={chartColors.lagoa} small />
            <MiniCard label="Melhor Dia" value={`R$ ${fmt(paymentsData.bestDayAmount || 0)}`} color={chartColors.sol} small />
          </div>

          <p className="mb-2 text-center text-xs text-muted-foreground">
            Pagamentos — {paymentsPeriod.label}
          </p>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={paymentsChartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartGridStroke} vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ ...chartAxisTick, fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(d) => formatXLabel(d, paymentsTotalDays)}
                  interval={paymentsTotalDays <= 31 ? 0 : Math.floor(paymentsTotalDays / 8)}
                />
                <YAxis yAxisId="left" tick={chartAxisTick} tickLine={false} axisLine={false} />
                <YAxis yAxisId="right" orientation="right" tick={chartAxisTick} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={chartTooltipStyle}
                  labelStyle={chartTooltipLabelStyle}
                  itemStyle={chartTooltipItemStyle}
                  cursor={chartCursor}
                  formatter={(v: number, name: string) => [
                    name === "total" ? `R$ ${fmt(Number(v))}` : v,
                    name === "total" ? "Valor dos Pagamentos" : "Quantidade de Pagamentos",
                  ]}
                  labelFormatter={formatTooltipDate}
                />
                <Bar yAxisId="right" dataKey="count" fill={chartColors.anil} fillOpacity={0.45} radius={[6, 6, 0, 0]} />
                <Line yAxisId="left" type="monotone" dataKey="total" stroke={chartColors.pitaya} strokeWidth={2.5} dot={paymentsTotalDays <= 31 ? { fill: chartColors.pitaya, r: 2.5, strokeWidth: 0 } : false} activeDot={{ r: 5 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Row 4 — Financeiro, Servidores, Churn */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="glass p-5 sm:p-6">
          <PaneHeader
            title="Financeiro"
            description={getMonthLabel(selectedMonth)}
            action={
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="h-8 w-28 rounded-full text-xs font-semibold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {monthOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            }
          />
          <div className="h-56" style={blurStyle(blurBilling)}>
            {revenueBySystem && revenueBySystem.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueBySystem} margin={{ top: 5, right: 5, left: -20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartGridStroke} vertical={false} />
                  <XAxis dataKey="system" tick={chartAxisTick} tickLine={false} axisLine={false} />
                  <YAxis tick={chartAxisTick} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={chartTooltipStyle}
                    labelStyle={chartTooltipLabelStyle}
                    itemStyle={chartTooltipItemStyle}
                    cursor={chartCursor}
                    formatter={(v: number) => [`R$ ${fmt(Number(v))}`, "Faturamento"]}
                  />
                  <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                    {revenueBySystem.map((_: unknown, index: number) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart />
            )}
          </div>
        </div>

        <div className="glass p-5 sm:p-6">
          <PaneHeader title="Servidores" description={getMonthLabel(selectedMonth)} />
          <div className="h-64">
            {clientsBySystem && clientsBySystem.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={clientsBySystem}
                    cx="50%"
                    cy="50%"
                    innerRadius={52}
                    outerRadius={90}
                    paddingAngle={2}
                    cornerRadius={6}
                    stroke="none"
                    dataKey="count"
                    nameKey="system"
                    label={({ cx, cy, midAngle, outerRadius, system }: { cx: number; cy: number; midAngle: number; outerRadius: number; system: string }) => {
                      const RADIAN = Math.PI / 180;
                      const radius = outerRadius + 28;
                      const x = cx + radius * Math.cos(-midAngle * RADIAN);
                      const y = cy + radius * Math.sin(-midAngle * RADIAN);
                      return (
                        <text x={x} y={y} textAnchor={x > cx ? "start" : "end"} dominantBaseline="central" fill="hsl(var(--muted-foreground))" fontSize={11}>
                          {system}
                        </text>
                      );
                    }}
                  >
                    {clientsBySystem.map((_: unknown, index: number) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={chartTooltipStyle}
                    labelStyle={chartTooltipLabelStyle}
                    itemStyle={chartTooltipItemStyle}
                    formatter={(v: number, _name: string, props: any) => [
                      `${v} (${((v / clientsBySystem.reduce((s: number, c: { count: number }) => s + c.count, 0)) * 100).toFixed(1)}%)`,
                      props.payload.system,
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart />
            )}
          </div>
        </div>

        <div className="glass p-5 sm:p-6">
          <PaneHeader
            icon={<UserX className="h-4 w-4" />}
            iconClass="bg-destructive/10 text-destructive"
            title="Churn por Dia"
            description="Clientes que não renovaram no período"
            action={<PeriodSelector value={churnPeriod} onChange={setChurnPeriod} />}
          />

          <div className="mb-4 grid grid-cols-3 gap-2.5">
            <MiniCard label="Total no Período" value={String(totalChurn)} color={chartColors.danger} />
            <MiniCard label="Média por Dia" value={avgChurnPerDay.toFixed(1)} color={chartColors.laranja} />
            <MiniCard label="Pior Dia" value={String(worstChurnDay)} color={chartColors.uva} />
          </div>

          <p className="mb-2 text-center text-xs text-muted-foreground">
            Churn — {churnPeriod.label}
          </p>
          <div className="h-52">
            {totalChurn > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={churnChartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                  <defs>
                    <linearGradient id="churnGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={chartColors.danger} stopOpacity={0.4} />
                      <stop offset="95%" stopColor={chartColors.danger} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartGridStroke} vertical={false} />
                  <XAxis
                    dataKey="date"
                    tick={{ ...chartAxisTick, fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(d) => formatXLabel(d, churnTotalDays)}
                    interval={churnTotalDays <= 31 ? 0 : Math.floor(churnTotalDays / 8)}
                  />
                  <YAxis tick={chartAxisTick} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={chartTooltipStyle}
                    labelStyle={chartTooltipLabelStyle}
                    itemStyle={chartTooltipItemStyle}
                    formatter={(v: number) => [v, "Churn"]}
                    labelFormatter={formatTooltipDate}
                  />
                  <Area type="monotone" dataKey="count" stroke={chartColors.danger} strokeWidth={2.5} fill="url(#churnGrad)" dot={churnTotalDays <= 31 ? { fill: chartColors.danger, r: 2.5, strokeWidth: 0 } : false} activeDot={{ r: 5 }} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart />
            )}
          </div>
        </div>
      </div>

      {/* Row 5 — Mapa Do Brasil (Top 5 + interactive map) */}
      <div className="glass p-5 sm:p-6">
        <PaneHeader
          icon={<MapIcon className="h-4 w-4" />}
          title="Mapa Do Brasil"
          description="Distribuição geográfica de clientes"
          large
          action={
            <Button
              type="button"
              variant="secondary"
              size="icon"
              className="h-9 w-9"
              aria-label="Exportar mapa"
              data-testid="button-map-export"
            >
              <Download className="h-4 w-4" />
            </Button>
          }
        />

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="glass-inset p-4 lg:col-span-1">
            <div className="mb-1 flex items-center gap-2">
              <Trophy className="h-4 w-4 text-warning" />
              <h4 className="text-sm font-semibold text-foreground">Top 5 Estados</h4>
            </div>
            <p className="mb-3 text-xs text-muted-foreground">Estados com mais clientes</p>

            {clientsByState && clientsByState.length > 0 ? (
              <TopStatesList data={clientsByState} />
            ) : (
              <div className="py-6 text-center text-xs text-muted-foreground">Sem dados</div>
            )}
          </div>

          <div className="glass-inset p-4 lg:col-span-2">
            <div className="mb-1 flex items-center gap-2">
              <MapIcon className="h-4 w-4 text-primary" />
              <h4 className="text-sm font-semibold text-foreground">Clientes por Estado</h4>
            </div>
            <p className="mb-3 text-xs text-muted-foreground">Zoom e arraste com o mouse</p>

            <div className="relative h-[480px] overflow-hidden rounded-xl">
              {clientsByState && clientsByState.length > 0 ? (
                <BrazilMap data={clientsByState} />
              ) : (
                <EmptyChart />
              )}
            </div>
          </div>
        </div>
      </div>
    </PageShell>
  );
}

const STATE_FULL_NAMES: Record<string, string> = {
  AC: "Acre", AL: "Alagoas", AM: "Amazonas", AP: "Amapá", BA: "Bahia",
  CE: "Ceará", DF: "Distrito Federal", ES: "Espírito Santo", GO: "Goiás",
  MA: "Maranhão", MG: "Minas Gerais", MS: "Mato Grosso do Sul", MT: "Mato Grosso",
  PA: "Pará", PB: "Paraíba", PE: "Pernambuco", PI: "Piauí", PR: "Paraná",
  RJ: "Rio de Janeiro", RN: "Rio Grande do Norte", RO: "Rondônia", RR: "Roraima",
  RS: "Rio Grande do Sul", SC: "Santa Catarina", SE: "Sergipe", SP: "São Paulo",
  TO: "Tocantins",
};

function TopStatesList({ data }: { data: { state: string; count: number }[] }) {
  const sorted = [...data].sort((a, b) => b.count - a.count);
  const top5 = sorted.slice(0, 5);
  const total = data.reduce((s, d) => s + d.count, 0);
  const maxValue = Math.max(...data.map((d) => d.count), 1);

  // Same cold-to-hot ramp as the map (anil -> pitaya).
  const colorScale = (count: number) =>
    `color-mix(in oklab, hsl(var(--chart-1)) ${Math.round((count / maxValue) * 100)}%, hsl(var(--chart-2)))`;

  const rankIcon = (idx: number) => {
    if (idx === 0) return <Crown className="h-3.5 w-3.5 text-warning" />;
    if (idx === 1) return <Medal className="h-3.5 w-3.5 text-muted-foreground" />;
    if (idx === 2) return <Medal className="h-3.5 w-3.5 text-chart-5" />;
    return <span className="text-[11px] font-semibold text-muted-foreground">{idx + 1}</span>;
  };

  return (
    <div className="flex flex-col gap-2">
      {top5.map((item, idx) => {
        const pct = (item.count / maxValue) * 100;
        const color = colorScale(item.count);
        return (
          <div
            key={item.state}
            className="flex items-center gap-2 rounded-xl border border-edge bg-secondary px-2.5 py-2"
            data-testid={`top-state-${item.state}`}
          >
            <div className="flex w-5 items-center justify-center">{rankIcon(idx)}</div>
            <span
              className="rounded-full px-2 py-0.5 text-[10px] font-bold text-white"
              style={{ backgroundColor: color }}
              title={STATE_FULL_NAMES[item.state] || item.state}
            >
              {item.state}
            </span>
            <span className="w-7 text-center text-sm font-bold tabular-nums text-foreground">{item.count}</span>
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-foreground/10">
              <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
            </div>
          </div>
        );
      })}

      <div className="mt-2 rounded-xl bg-ink py-3 text-center text-ink-foreground">
        <div className="font-display text-2xl font-semibold leading-tight">{total}</div>
        <div className="text-xs opacity-75">Total de Clientes</div>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  icon,
  iconClass,
  barClass,
  percent,
}: {
  label: string;
  value: number;
  icon: ReactNode;
  iconClass: string;
  barClass: string;
  percent: number;
}) {
  return (
    <div className="glass p-6">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
        <span className={cn("flex h-9 w-9 items-center justify-center rounded-full", iconClass)}>{icon}</span>
      </div>
      <p className="mt-4 font-display text-5xl font-semibold tracking-tight text-foreground">{value}</p>
      <div className="mt-3 flex items-center gap-3">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-foreground/10">
          <div className={cn("h-full rounded-full transition-[width] duration-700", barClass)} style={{ width: `${percent}%` }} />
        </div>
        <span className="text-xs font-semibold tabular-nums text-muted-foreground">{percent}% da base</span>
      </div>
    </div>
  );
}

function ListCard({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return (
    <div className="glass p-5 sm:p-6">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-base font-semibold text-foreground">{title}</h3>
        <span className="flex h-9 w-9 items-center justify-center rounded-full border border-edge bg-secondary text-foreground shadow-glass">
          {icon}
        </span>
      </div>
      <div className="divide-y divide-border">{children}</div>
    </div>
  );
}

function PaneHeader({
  icon,
  iconClass,
  title,
  description,
  action,
  large,
}: {
  icon?: ReactNode;
  iconClass?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  large?: boolean;
}) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div className="flex min-w-0 items-start gap-3">
        {icon && (
          <span className={cn("mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary", iconClass)}>
            {icon}
          </span>
        )}
        <div className="min-w-0">
          <h3 className={cn("font-semibold leading-tight text-foreground", large ? "text-lg" : "text-base")}>{title}</h3>
          {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

function EmptyChart() {
  return (
    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
      Sem dados para este período
    </div>
  );
}

function InfoRow({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <div className="flex min-w-0 items-center gap-2.5">
        <span className={cn("h-2 w-2 shrink-0 rounded-full", accent && value > 0 ? "bg-highlight" : "bg-foreground/25")} aria-hidden />
        <span className="truncate text-sm text-foreground/80">{label}</span>
      </div>
      <span
        className={cn(
          "min-w-[2.25rem] rounded-full px-2.5 py-0.5 text-center text-sm font-bold tabular-nums",
          accent && value > 0 ? "bg-highlight text-highlight-foreground" : "text-foreground",
        )}
      >
        {value}
      </span>
    </div>
  );
}

function InfoRowMoney({ label, value, featured }: { label: string; value: number; featured?: boolean }) {
  const formatted = `R$${value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
  if (featured) {
    return (
      <div className="pb-3 pt-1">
        <span className="text-sm text-muted-foreground">{label}</span>
        <p className="mt-1 font-display text-3xl font-semibold tracking-tight tabular-nums text-foreground">{formatted}</p>
      </div>
    );
  }
  return (
    <div className="flex items-center justify-between gap-3 border-t border-border py-2.5">
      <div className="flex items-center gap-2.5">
        <Calendar className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm text-foreground/80">{label}</span>
      </div>
      <span className="text-sm font-bold tabular-nums text-foreground">{formatted}</span>
    </div>
  );
}

function MiniCard({ label, value, color, small }: { label: string; value: string; color: string; small?: boolean }) {
  return (
    <div className="glass-inset px-3 py-2.5">
      <div className="flex items-center gap-1.5">
        <span className="mt-0.5 h-2 w-2 shrink-0 self-start rounded-full" style={{ background: color }} aria-hidden />
        <p className="text-[11px] leading-tight text-muted-foreground">{label}</p>
      </div>
      <p className={cn("mt-1 font-display font-semibold tabular-nums text-foreground", small ? "text-sm sm:text-base" : "text-xl")}>
        {value}
      </p>
    </div>
  );
}

export default function Dashboard() {
  return (
    <DashboardErrorBoundary>
      <DashboardContent />
    </DashboardErrorBoundary>
  );
}
