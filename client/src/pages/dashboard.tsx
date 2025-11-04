import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { StatsCard } from "@/components/dashboard/stats-card";
import { ChartCard } from "@/components/dashboard/chart-card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { apiRequest, queryClient } from "@/lib/queryClient";
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

export default function Dashboard() {
  const [revenuePeriod, setRevenuePeriod] = useState<'current_month' | 'last_month' | '3_months' | '6_months' | '12_months'>('6_months');
  const { toast } = useToast();

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

  const currentMonth = getMonthName(new Date().getMonth());
  const isDayPeriod = revenuePeriod === 'current_month' || revenuePeriod === 'last_month';

  const backfillPaymentHistoryMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("/api/admin/backfill-payment-history", "POST");
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Histórico Preenchido!",
        description: `${data.recordsCreated} registros de pagamento criados para ${data.clientsWithoutHistory} clientes.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/revenue-by-period"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message || "Não foi possível preencher o histórico de pagamentos.",
        variant: "destructive",
      });
    },
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

      {/* Admin Tool: Backfill Payment History */}
      <Card className="glassmorphism neon-border border-yellow-500/30">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 text-yellow-500" />
            <span>Ferramenta Administrativa</span>
          </CardTitle>
          <CardDescription>
            Use este botão UMA ÚNICA VEZ para popular o histórico de pagamentos dos clientes importados
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={() => backfillPaymentHistoryMutation.mutate()}
            disabled={backfillPaymentHistoryMutation.isPending}
            className="bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700"
            data-testid="button-backfill-payment-history"
          >
            {backfillPaymentHistoryMutation.isPending 
              ? "Processando..." 
              : "Popular Histórico de Pagamentos"}
          </Button>
          <p className="text-sm text-muted-foreground mt-2">
            Esta ação vai criar registros de pagamento para todos os clientes que não possuem histórico,
            permitindo que o gráfico de faturamento seja exibido corretamente.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
