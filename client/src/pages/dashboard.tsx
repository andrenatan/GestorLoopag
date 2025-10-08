import { useQuery } from "@tanstack/react-query";
import { StatsCard } from "@/components/dashboard/stats-card";
import { ChartCard } from "@/components/dashboard/chart-card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api } from "@/lib/api";
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
  PieChart,
  Pie,
  Cell,
} from "recharts";

// Mock data for charts
const revenueData = [
  { month: "Jul", value: 8500 },
  { month: "Ago", value: 9200 },
  { month: "Set", value: 10800 },
  { month: "Out", value: 11500 },
  { month: "Nov", value: 12100 },
  { month: "Dez", value: 12450 },
];

const subscriptionData = [
  { name: "IPTV - Geral", value: 45, color: "#3b82f6" },
  { name: "P2P - Android", value: 30, color: "#8b5cf6" },
  { name: "Dois Pontos Distintos", value: 25, color: "#f59e0b" },
];

export default function Dashboard() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["/api/dashboard/stats"],
    queryFn: api.getDashboardStats,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

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
          title="Faturamento Mensal"
          action={
            <Select defaultValue="6months">
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="6months">Últimos 6 meses</SelectItem>
                <SelectItem value="12months">Últimos 12 meses</SelectItem>
              </SelectContent>
            </Select>
          }
        >
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip 
                  formatter={(value) => [`R$ ${value}`, "Faturamento"]}
                  labelFormatter={(label) => `Mês: ${label}`}
                />
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={3}
                  dot={{ fill: "hsl(var(--primary))", strokeWidth: 2, r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard
          title="Tipos de Assinatura"
          action={
            <Button variant="ghost" size="sm">
              Ver Detalhes
            </Button>
          }
        >
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={subscriptionData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  label={(entry) => `${entry.name}: ${entry.value}%`}
                >
                  {subscriptionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>
    </div>
  );
}
