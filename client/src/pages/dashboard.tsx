import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { StatsCard } from "@/components/dashboard/stats-card";
import { ChartCard } from "@/components/dashboard/chart-card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api } from "@/lib/api";
import { BrazilMap } from "@/components/dashboard/brazil-map";
import { 
  AlertCircle, 
  Clock, 
  UserPlus, 
  TrendingUp,
  Users,
  UserX,
  Calendar,
  CalendarX
} from "lucide-react";
import {
  LineChart,
  Line,
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
  Legend,
} from "recharts";

// Helper to get month name in Portuguese
const getMonthName = (monthIndex: number) => {
  const months = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];
  return months[monthIndex];
};

const getPeriodLabel = (period: string) => {
  const labels: { [key: string]: string } = {
    'current_month': 'Mês Atual',
    'last_month': 'Mês Passado',
    '3_months': 'Últimos 3 Meses',
    '6_months': 'Últimos 6 Meses',
    '12_months': 'Últimos 12 Meses'
  };
  return labels[period] || 'Mês Atual';
};

const CHART_COLORS = ['#6366f1', '#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899'];

const getCurrentMonth = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

const getMonthLabel = (month: string) => {
  const [year, monthNum] = month.split('-').map(Number);
  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  return `${months[monthNum - 1]}/${year}`;
};

const getMonthOptions = () => {
  const options = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    options.push({ value, label: getMonthLabel(value) });
  }
  return options;
};

export default function Dashboard() {
  const [revenuePeriod, setRevenuePeriod] = useState<'current_month' | 'last_month' | '3_months' | '6_months' | '12_months'>('6_months');
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());

  const { data: stats, isLoading } = useQuery({
    queryKey: ["/api/dashboard/stats"],
    queryFn: api.getDashboardStats,
    refetchInterval: 30000,
  });

  const { data: newClientsByDay, isLoading: isLoadingNewClients } = useQuery({
    queryKey: ["/api/dashboard/new-clients-by-day"],
    queryFn: api.getNewClientsByDay,
    refetchInterval: 30000,
  });

  const { data: revenueData, isLoading: isLoadingRevenue } = useQuery({
    queryKey: ["/api/dashboard/revenue-by-period", revenuePeriod],
    queryFn: () => api.getRevenueByPeriod(revenuePeriod),
    refetchInterval: 30000,
  });

  const { data: revenueBySystem, isLoading: isLoadingRevenueBySystem } = useQuery({
    queryKey: ["/api/dashboard/revenue-by-system", selectedMonth],
    queryFn: () => api.getRevenueBySystem(selectedMonth),
    refetchInterval: 30000,
  });

  const { data: clientsBySystem, isLoading: isLoadingClientsBySystem } = useQuery({
    queryKey: ["/api/dashboard/clients-by-system", selectedMonth],
    queryFn: () => api.getClientsBySystem(selectedMonth),
    refetchInterval: 30000,
  });

  const { data: clientsByState, isLoading: isLoadingClientsByState } = useQuery({
    queryKey: ["/api/dashboard/clients-by-state", selectedMonth],
    queryFn: () => api.getClientsByState(selectedMonth),
    refetchInterval: 30000,
  });

  const currentMonth = getMonthName(new Date().getMonth());
  const monthOptions = getMonthOptions();
  const isDayPeriod = revenuePeriod === 'current_month' || revenuePeriod === 'last_month';

  if (isLoading) {
    return (
      <div className="p-6 space-y-8">
        <div className="animate-pulse">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-32 bg-muted rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Visão geral do sistema de gestão IPTV
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <Select defaultValue="today">
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Hoje</SelectItem>
              <SelectItem value="week">Esta semana</SelectItem>
              <SelectItem value="month">Este mês</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Clientes Ativos"
          value={stats?.activeClients || 0}
          icon={Users}
          color="green"
        />
        <StatsCard
          title="Clientes Inativos"
          value={stats?.inactiveClients || 0}
          icon={UserX}
          color="red"
        />
        <StatsCard
          title="Venceu Ontem"
          value={stats?.expiredYesterday || 0}
          icon={CalendarX}
          color="orange"
        />
        <StatsCard
          title="Vencendo Hoje"
          value={stats?.expiringToday || 0}
          icon={AlertCircle}
          color="red"
        />
        <StatsCard
          title="Vencendo Amanhã"
          value={stats?.expiringTomorrow || 0}
          icon={Calendar}
          color="yellow"
        />
        <StatsCard
          title="Vencendo em 3 Dias"
          value={stats?.expiring3Days || 0}
          icon={Clock}
          color="yellow"
        />
        <StatsCard
          title="Novos Clientes"
          value={stats?.newClientsToday || 0}
          icon={UserPlus}
          color="green"
        />
        <StatsCard
          title="Faturamento"
          value={`R$ ${stats?.totalRevenue?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}`}
          icon={TrendingUp}
          color="purple"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard
          title="Faturamento por Período"
          action={
            <Select value={revenuePeriod} onValueChange={(value: any) => setRevenuePeriod(value)}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="current_month">Mês Atual</SelectItem>
                <SelectItem value="last_month">Mês Passado</SelectItem>
                <SelectItem value="3_months">Últimos 3 Meses</SelectItem>
                <SelectItem value="6_months">Últimos 6 Meses</SelectItem>
                <SelectItem value="12_months">Últimos 12 Meses</SelectItem>
              </SelectContent>
            </Select>
          }
        >
          <div className="h-64">
            {isLoadingRevenue ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-pulse text-muted-foreground">Carregando...</div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart 
                  data={revenueData || []}
                  margin={{ top: 5, right: 20, left: 40, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis 
                    dataKey="label" 
                    label={{ 
                      value: isDayPeriod ? 'Dias do mês' : 'Meses', 
                      position: 'insideBottom', 
                      offset: -5 
                    }}
                  />
                  <YAxis 
                    label={{ 
                      value: 'Faturamento (R$)', 
                      angle: -90, 
                      position: 'insideLeft',
                      style: { textAnchor: 'middle' }
                    }}
                  />
                  <Tooltip 
                    formatter={(value) => [`R$ ${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, "Faturamento"]}
                    labelFormatter={(label) => isDayPeriod ? `Dia ${label}` : label}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="value" 
                    stroke="#8b5cf6" 
                    strokeWidth={2}
                    dot={{ fill: "#8b5cf6", strokeWidth: 2, r: 5 }}
                    activeDot={{ r: 7 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </ChartCard>

        <ChartCard
          title={`Novos Clientes por Dia em ${currentMonth}`}
        >
          <div className="h-64">
            {isLoadingNewClients ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-pulse text-muted-foreground">Carregando...</div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart 
                  data={newClientsByDay || []}
                  margin={{ top: 5, right: 20, left: 60, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis 
                    dataKey="day" 
                    label={{ value: 'Dias do mês', position: 'insideBottom', offset: -5 }}
                  />
                  <YAxis 
                    label={{ 
                      value: 'Total de novos clientes', 
                      angle: -90, 
                      position: 'insideLeft',
                      style: { textAnchor: 'middle' }
                    }}
                    allowDecimals={false}
                  />
                  <Tooltip 
                    formatter={(value) => [`${value}`, "Novos clientes"]}
                    labelFormatter={(label) => `Dia ${label}`}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="count" 
                    stroke="#3b82f6" 
                    strokeWidth={2}
                    dot={{ fill: "#3b82f6", strokeWidth: 2, r: 5 }}
                    activeDot={{ r: 7 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </ChartCard>
      </div>

      {/* New Charts Section - Revenue by System, Clients by System, Clients by State */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue by System */}
        <ChartCard
          title="Financeiro"
          subtitle={`${getMonthLabel(selectedMonth)}`}
          action={
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {monthOptions.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          }
        >
          <div className="h-64">
            {isLoadingRevenueBySystem ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-pulse text-muted-foreground">Carregando...</div>
              </div>
            ) : revenueBySystem && revenueBySystem.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueBySystem} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="system" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip 
                    formatter={(value) => [`R$ ${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, "Faturamento"]}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]}>
                    {revenueBySystem.map((_: { system: string; value: number }, index: number) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                Sem dados para este período
              </div>
            )}
          </div>
        </ChartCard>

        {/* Clients by System (Pie Chart) */}
        <ChartCard
          title="Servidores"
          subtitle={`${getMonthLabel(selectedMonth)}`}
        >
          <div className="h-64">
            {isLoadingClientsBySystem ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-pulse text-muted-foreground">Carregando...</div>
              </div>
            ) : clientsBySystem && clientsBySystem.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={clientsBySystem}
                    cx="50%"
                    cy="50%"
                    outerRadius={70}
                    innerRadius={0}
                    dataKey="count"
                    nameKey="system"
                    label={({ cx, cy, midAngle, outerRadius, system }: { cx: number; cy: number; midAngle: number; outerRadius: number; system: string }) => {
                      const RADIAN = Math.PI / 180;
                      const radius = outerRadius + 25;
                      const x = cx + radius * Math.cos(-midAngle * RADIAN);
                      const y = cy + radius * Math.sin(-midAngle * RADIAN);
                      return (
                        <text
                          x={x}
                          y={y}
                          textAnchor={x > cx ? 'start' : 'end'}
                          dominantBaseline="central"
                          className="fill-current text-xs"
                          style={{ fontSize: '11px' }}
                        >
                          {system}
                        </text>
                      );
                    }}
                    labelLine={{
                      stroke: 'hsl(var(--muted-foreground))',
                      strokeWidth: 1,
                    }}
                  >
                    {clientsBySystem.map((_: { system: string; count: number }, index: number) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value) => [`${value} cliente${Number(value) !== 1 ? 's' : ''}`, "Total"]}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                Sem dados para este período
              </div>
            )}
          </div>
        </ChartCard>

        {/* Clients by State (Brazil Map) */}
        <ChartCard
          title="Clientes por estado"
          subtitle={`${getMonthLabel(selectedMonth)}`}
        >
          <div className="h-64">
            {isLoadingClientsByState ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-pulse text-muted-foreground">Carregando...</div>
              </div>
            ) : clientsByState && clientsByState.length > 0 ? (
              <BrazilMap data={clientsByState} />
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                Sem dados para este período
              </div>
            )}
          </div>
        </ChartCard>
      </div>
    </div>
  );
}
