import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { BrazilMap } from "@/components/dashboard/brazil-map";
import { PeriodSelector, defaultPeriod } from "@/components/dashboard/period-selector";
import type { PeriodValue } from "@/components/dashboard/period-selector";
import { useTheme } from "@/hooks/use-theme";
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

const CHART_COLORS = ["#6366f1", "#8b5cf6", "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#ec4899"];

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

export default function Dashboard() {
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
  const [blurBilling, setBlurBilling] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [clientsPeriod, setClientsPeriod] = useState<PeriodValue>(defaultPeriod());
  const [paymentsPeriod, setPaymentsPeriod] = useState<PeriodValue>(defaultPeriod());
  const queryClient = useQueryClient();
  const { theme, setTheme } = useTheme();

  const { data: stats, isLoading } = useQuery({
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

  if (isLoading) {
    return (
      <div className="p-6 space-y-6 bg-[#0d1b2a] min-h-screen">
        <div className="animate-pulse space-y-4">
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-28 rounded-xl bg-[#1a2a3a]" />
            ))}
          </div>
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-40 rounded-xl bg-[#1a2a3a]" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const cardTooltipStyle = {
    backgroundColor: "#1a2a3a",
    border: "1px solid #2a3a4a",
    borderRadius: "8px",
    color: "#e2e8f0",
  };

  return (
    <div className="p-5 space-y-4 bg-[#0d1b2a] min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-slate-400 text-sm">Visão geral do sistema de gestão IPTV</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="icon"
            onClick={async () => {
              setIsRefreshing(true);
              await queryClient.invalidateQueries();
              setTimeout(() => setIsRefreshing(false), 1000);
            }}
            title="Atualizar dados"
            className="border-slate-600 bg-[#1a2a3a] text-slate-300 hover:bg-[#243447] hover:scale-110 transition-all duration-300"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setBlurBilling(!blurBilling)}
            title={blurBilling ? "Mostrar faturamento" : "Ocultar faturamento"}
            className="border-slate-600 bg-[#1a2a3a] text-slate-300 hover:bg-[#243447] hover:scale-110 transition-all duration-300"
          >
            {blurBilling ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setTheme(theme === "light" ? "dark" : "light")}
            title={theme === "light" ? "Modo escuro" : "Modo claro"}
            className="border-slate-600 bg-[#1a2a3a] text-slate-300 hover:bg-[#243447] hover:scale-110 transition-all duration-300"
          >
            <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          </Button>
        </div>
      </div>

      {/* Row 1 — 3 big colored cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-xl p-5 bg-[#1a2a3a] border border-[#2a3a4a] flex items-center justify-between">
          <div>
            <p className="text-4xl font-bold text-white">{stats?.totalClients ?? 0}</p>
            <p className="text-slate-400 text-sm mt-1">Total de clientes</p>
          </div>
          <div className="bg-[#243447] p-3 rounded-full">
            <Users className="w-8 h-8 text-slate-300" />
          </div>
        </div>
        <div className="rounded-xl p-5 bg-[#0891b2] flex items-center justify-between">
          <div>
            <p className="text-4xl font-bold text-white">{stats?.activeClients ?? 0}</p>
            <p className="text-cyan-100 text-sm mt-1">Clientes ativos</p>
          </div>
          <div className="bg-[#0e7490] p-3 rounded-full">
            <UserCheck className="w-8 h-8 text-white" />
          </div>
        </div>
        <div className="rounded-xl p-5 bg-[#dc2626] flex items-center justify-between">
          <div>
            <p className="text-4xl font-bold text-white">{stats?.inactiveClients ?? 0}</p>
            <p className="text-red-100 text-sm mt-1">Clientes inativos</p>
          </div>
          <div className="bg-[#b91c1c] p-3 rounded-full">
            <UserX className="w-8 h-8 text-white" />
          </div>
        </div>
      </div>

      {/* Row 2 — 3 grouped cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-xl p-5 bg-[#1a2a3a] border border-[#2a3a4a] flex items-start justify-between">
          <div className="space-y-3 flex-1">
            <InfoRow icon={<UserPlus className="w-4 h-4 text-cyan-400" />} label="Novos Clientes Hoje" value={stats?.newClientsToday ?? 0} />
            <InfoRow icon={<UserPlus className="w-4 h-4 text-cyan-400" />} label="Novos Clientes Esta Semana" value={stats?.newClientsThisWeek ?? 0} />
            <InfoRow icon={<UserPlus className="w-4 h-4 text-cyan-400" />} label="Novos Clientes Este Mês" value={stats?.newClientsThisMonth ?? 0} />
          </div>
          <div className="bg-[#243447] p-3 rounded-full ml-4">
            <UserCheck className="w-6 h-6 text-cyan-400" />
          </div>
        </div>

        <div className="rounded-xl p-5 bg-[#1a2a3a] border border-[#2a3a4a] flex items-start justify-between">
          <div className="space-y-3 flex-1">
            <InfoRow icon={<Calendar className="w-4 h-4 text-cyan-400" />} label="Clientes Vencendo Hoje" value={stats?.expiringToday ?? 0} />
            <InfoRow icon={<Calendar className="w-4 h-4 text-cyan-400" />} label="Clientes Vencendo em 3 Dias" value={stats?.expiring3Days ?? 0} />
            <InfoRow icon={<Calendar className="w-4 h-4 text-cyan-400" />} label="Sem Renovar este Mês" value={stats?.clientsNotRenewedThisMonth ?? 0} />
            <InfoRow icon={<Calendar className="w-4 h-4 text-cyan-400" />} label="Recuperados este Mês" value={stats?.clientsRecoveredThisMonth ?? 0} />
            <InfoRow icon={<Calendar className="w-4 h-4 text-cyan-400" />} label="Total Renovados este Mês" value={stats?.totalRecoveredThisMonth ?? 0} />
          </div>
          <div className="bg-[#243447] p-3 rounded-full ml-4">
            <UserCheck className="w-6 h-6 text-cyan-400" />
          </div>
        </div>

        <div className="rounded-xl p-5 bg-[#1a2a3a] border border-[#2a3a4a] flex items-start justify-between">
          <div
            className="space-y-3 flex-1"
            style={blurBilling ? { filter: "blur(8px)", transition: "filter 0.3s ease", pointerEvents: "none" } : { transition: "filter 0.3s ease" }}
          >
            <InfoRowMoney icon={<span className="text-cyan-400 text-xs font-bold">📈</span>} label="A Receber no Mês" value={stats?.projectedMonthlyRevenue ?? 0} />
            <InfoRowMoney icon={<span className="text-cyan-400 text-xs font-bold">📅</span>} label="Hoje" value={stats?.revenueToday ?? 0} />
            <InfoRowMoney icon={<span className="text-cyan-400 text-xs font-bold">📅</span>} label="Amanhã" value={stats?.revenueTomorrow ?? 0} />
          </div>
          <div className="bg-[#243447] p-3 rounded-full ml-4">
            <Send className="w-6 h-6 text-cyan-400" />
          </div>
        </div>
      </div>

      {/* Row 3 — 2 charts with mini stats and period selectors */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Clientes Novos Por Dia */}
        <div className="rounded-xl bg-[#1a2a3a] border border-[#2a3a4a] p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-white font-semibold flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-cyan-400" />
                Clientes Novos Por Dia
              </h3>
              <p className="text-slate-400 text-xs mt-0.5">Cadastros diários no período selecionado</p>
            </div>
            <PeriodSelector value={clientsPeriod} onChange={setClientsPeriod} />
          </div>

          <div className="grid grid-cols-3 gap-3 mb-4">
            <MiniCard label="Total no Período" value={String(totalClientsMonth)} color="#10b981" />
            <MiniCard label="Média por Dia" value={avgClientsPerDay.toFixed(1)} color="#6366f1" />
            <MiniCard label="Melhor Dia" value={String(bestClientsDay)} color="#8b5cf6" />
          </div>

          <p className="text-center text-xs text-slate-400 mb-2">
            Clientes Novos — {clientsPeriod.label}
          </p>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={clientsChartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <defs>
                  <linearGradient id="clientsGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a3a4a" />
                <XAxis
                  dataKey="date"
                  tick={{ fill: "#94a3b8", fontSize: 10 }}
                  tickLine={false}
                  tickFormatter={(d) => formatXLabel(d, clientsTotalDays)}
                  interval={clientsTotalDays <= 31 ? 0 : Math.floor(clientsTotalDays / 8)}
                />
                <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={cardTooltipStyle}
                  formatter={(v: number) => [v, "Novos Clientes"]}
                  labelFormatter={(d) => {
                    if (!d) return "";
                    const [y, m, day] = String(d).split("-").map(Number);
                    return `${String(day).padStart(2, "0")}/${String(m).padStart(2, "0")}/${y}`;
                  }}
                />
                <Area type="monotone" dataKey="count" stroke="#10b981" strokeWidth={2} fill="url(#clientsGrad)" dot={clientsTotalDays <= 31 ? { fill: "#10b981", r: 3 } : false} activeDot={{ r: 5 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pagamentos Por Dia */}
        <div
          className="rounded-xl bg-[#1a2a3a] border border-[#2a3a4a] p-5"
          style={blurBilling ? { filter: "blur(8px)", transition: "filter 0.3s ease", pointerEvents: "none" } : { transition: "filter 0.3s ease" }}
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-white font-semibold flex items-center gap-2">
                <span className="text-cyan-400">$</span>
                Pagamentos Por Dia
              </h3>
              <p className="text-slate-400 text-xs mt-0.5">Faturamento diário no período selecionado</p>
            </div>
            <PeriodSelector value={paymentsPeriod} onChange={setPaymentsPeriod} />
          </div>

          <div className="grid grid-cols-4 gap-2 mb-4">
            <MiniCard label="Total no Período" value={`R$ ${fmt(paymentsData.total || 0)}`} color="#f59e0b" small />
            <MiniCard label="Total Pagamentos" value={String(paymentsData.count || 0)} color="#10b981" small />
            <MiniCard label="Média por Dia" value={`R$ ${fmt(paymentsData.average || 0)}`} color="#6366f1" small />
            <MiniCard label="Melhor Dia" value={`R$ ${fmt(paymentsData.bestDayAmount || 0)}`} color="#8b5cf6" small />
          </div>

          <p className="text-center text-xs text-slate-400 mb-2">
            Pagamentos — {paymentsPeriod.label}
          </p>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={paymentsChartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a3a4a" />
                <XAxis
                  dataKey="date"
                  tick={{ fill: "#94a3b8", fontSize: 10 }}
                  tickLine={false}
                  tickFormatter={(d) => formatXLabel(d, paymentsTotalDays)}
                  interval={paymentsTotalDays <= 31 ? 0 : Math.floor(paymentsTotalDays / 8)}
                />
                <YAxis yAxisId="left" tick={{ fill: "#94a3b8", fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis yAxisId="right" orientation="right" tick={{ fill: "#94a3b8", fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={cardTooltipStyle}
                  formatter={(v: number, name: string) => [
                    name === "total" ? `R$ ${fmt(Number(v))}` : v,
                    name === "total" ? "Valor dos Pagamentos" : "Quantidade de Pagamentos",
                  ]}
                  labelFormatter={(d) => {
                    if (!d) return "";
                    const [y, m, day] = String(d).split("-").map(Number);
                    return `${String(day).padStart(2, "0")}/${String(m).padStart(2, "0")}/${y}`;
                  }}
                />
                <Bar yAxisId="right" dataKey="count" fill="#10b981" fillOpacity={0.6} radius={[2, 2, 0, 0]} />
                <Line yAxisId="left" type="monotone" dataKey="total" stroke="#f59e0b" strokeWidth={2} dot={paymentsTotalDays <= 31 ? { fill: "#f59e0b", r: 3 } : false} activeDot={{ r: 5 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Row 4 — existing charts (Financeiro, Servidores, Estado) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="rounded-xl bg-[#1a2a3a] border border-[#2a3a4a] p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-white font-semibold">Financeiro</h3>
              <p className="text-slate-400 text-xs">{getMonthLabel(selectedMonth)}</p>
            </div>
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-28 h-8 text-xs bg-[#243447] border-[#2a3a4a] text-slate-300">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#1a2a3a] border-[#2a3a4a] text-slate-300">
                {monthOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div
            className="h-56"
            style={blurBilling ? { filter: "blur(8px)", transition: "filter 0.3s ease", pointerEvents: "none" } : { transition: "filter 0.3s ease" }}
          >
            {revenueBySystem && revenueBySystem.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueBySystem} margin={{ top: 5, right: 5, left: -20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a3a4a" />
                  <XAxis dataKey="system" tick={{ fill: "#94a3b8", fontSize: 11 }} tickLine={false} />
                  <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={cardTooltipStyle}
                    formatter={(v: number) => [`R$ ${fmt(Number(v))}`, "Faturamento"]}
                  />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {revenueBySystem.map((_: unknown, index: number) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-500 text-sm">
                Sem dados para este período
              </div>
            )}
          </div>
        </div>

        <div className="rounded-xl bg-[#1a2a3a] border border-[#2a3a4a] p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-white font-semibold">Servidores</h3>
              <p className="text-slate-400 text-xs">{getMonthLabel(selectedMonth)}</p>
            </div>
          </div>
          <div className="h-64">
            {clientsBySystem && clientsBySystem.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={clientsBySystem}
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    dataKey="count"
                    nameKey="system"
                    label={({ cx, cy, midAngle, outerRadius, system }: { cx: number; cy: number; midAngle: number; outerRadius: number; system: string }) => {
                      const RADIAN = Math.PI / 180;
                      const radius = outerRadius + 28;
                      const x = cx + radius * Math.cos(-midAngle * RADIAN);
                      const y = cy + radius * Math.sin(-midAngle * RADIAN);
                      return (
                        <text x={x} y={y} textAnchor={x > cx ? "start" : "end"} dominantBaseline="central" fill="#94a3b8" fontSize={11}>
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
                    contentStyle={cardTooltipStyle}
                    formatter={(v: number, _name: string, props: any) => [
                      `${v} (${((v / clientsBySystem.reduce((s: number, c: { count: number }) => s + c.count, 0)) * 100).toFixed(1)}%)`,
                      props.payload.system,
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-500 text-sm">
                Sem dados para este período
              </div>
            )}
          </div>
        </div>

        <div className="rounded-xl bg-[#1a2a3a] border border-[#2a3a4a] p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-white font-semibold">Clientes por Estado</h3>
              <p className="text-slate-400 text-xs">{getMonthLabel(selectedMonth)}</p>
            </div>
          </div>
          <div className="h-64">
            {clientsByState && clientsByState.length > 0 ? (
              <BrazilMap data={clientsByState} />
            ) : (
              <div className="flex items-center justify-center h-full text-slate-500 text-sm">
                Sem dados para este período
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-slate-300 text-sm">{label}</span>
      </div>
      <span className="text-white font-bold text-sm">{value}</span>
    </div>
  );
}

function InfoRowMoney({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-slate-300 text-sm">{label}</span>
      </div>
      <span className="text-white font-bold text-sm">
        R${value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
      </span>
    </div>
  );
}

function MiniCard({ label, value, color, small }: { label: string; value: string; color: string; small?: boolean }) {
  return (
    <div className="rounded-lg bg-[#243447] p-3 text-center">
      <p className={`font-bold text-white ${small ? "text-sm" : "text-lg"}`} style={{ color }}>
        {value}
      </p>
      <p className="text-slate-400 text-xs mt-0.5 leading-tight">{label}</p>
    </div>
  );
}
