import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import { Trophy, Medal, Award, Crown } from "lucide-react";

export default function Rankings() {
  const [period30Days, setPeriod30Days] = useState("30");
  const [periodAnnual, setPeriodAnnual] = useState("365");

  const { data: rankings30Days = [], isLoading: loading30Days } = useQuery({
    queryKey: ["/api/clients/rankings", period30Days],
    queryFn: () => api.getReferralRankings(parseInt(period30Days)),
  });

  const { data: rankingsAnnual = [], isLoading: loadingAnnual } = useQuery({
    queryKey: ["/api/clients/rankings", periodAnnual],
    queryFn: () => api.getReferralRankings(parseInt(periodAnnual)),
  });

  const getRankIcon = (position: number) => {
    switch (position) {
      case 1:
        return <Crown className="w-5 h-5 text-warning" />;
      case 2:
        return <Medal className="w-5 h-5 text-muted-foreground" />;
      case 3:
        return <Award className="w-5 h-5 text-warning" />;
      default:
        return <Trophy className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const getRankBadge = (position: number) => {
    switch (position) {
      case 1:
        return <Badge variant="highlight">1º</Badge>;
      case 2:
        return <Badge variant="ink">2º</Badge>;
      case 3:
        return <Badge variant="warning">3º</Badge>;
      default:
        return <Badge variant="outline">{position}º</Badge>;
    }
  };

  const RankingList = ({ 
    rankings, 
    isLoading, 
    title 
  }: { 
    rankings: any[]; 
    isLoading: boolean; 
    title: string;
  }) => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2 text-lg">
          <Trophy className="w-5 h-5 text-warning" />
          <span>{title}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center space-x-4 animate-pulse">
                <div className="w-8 h-8 bg-muted rounded-full" />
                <div className="flex-1">
                  <div className="h-4 bg-muted rounded w-32 mb-2" />
                  <div className="h-3 bg-muted rounded w-24" />
                </div>
                <div className="h-6 bg-muted rounded w-16" />
              </div>
            ))}
          </div>
        ) : rankings.length === 0 ? (
          <div className="text-center py-8">
            <Trophy className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Nenhuma indicação encontrada neste período</p>
          </div>
        ) : (
          <div className="space-y-4">
            {rankings.slice(0, 10).map((ranking: any, index: number) => {
              const position = index + 1;
              return (
                <div
                  key={ranking.client.id}
                  className={`flex items-center space-x-4 p-4 rounded-xl border transition-all duration-200 ${
                    position <= 3
                      ? "border-highlight/50 bg-highlight/15"
                      : "border-border bg-muted"
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    {getRankIcon(position)}
                    {getRankBadge(position)}
                  </div>
                  
                  <div className="w-10 h-10 brand-tile rounded-full flex items-center justify-center text-white font-medium">
                    {ranking.client.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                  </div>
                  
                  <div className="flex-1">
                    <p className="font-semibold">{ranking.client.name}</p>
                    <p className="text-sm text-muted-foreground">{ranking.client.phone}</p>
                  </div>
                  
                  <div className="text-right">
                    <p className="font-bold text-lg">{ranking.referralCount}</p>
                    <p className="text-xs text-muted-foreground">indicações</p>
                  </div>
                  
                  <div className="text-right">
                    <p className="font-semibold text-success">
                      R$ {(ranking.referralCount * 50).toLocaleString('pt-BR', { 
                        minimumFractionDigits: 2 
                      })}
                    </p>
                    <p className="text-xs text-muted-foreground">prêmio</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-6 px-4 pb-10 pt-5 sm:px-6 lg:px-8 lg:pt-8">
      {/* Header */}
      <div data-reveal className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div>
          <h1 className="text-balance font-display text-3xl font-semibold leading-[1.05] tracking-tight text-foreground sm:text-[2.6rem]">Rankings de Indicações</h1>
          <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground sm:text-base">
            Acompanhe os melhores indicadores e seus prêmios
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Total de Indicações (30 dias)</p>
                <p className="font-display text-3xl font-semibold tracking-tight text-warning">
                  {rankings30Days.reduce((sum: number, r: any) => sum + r.referralCount, 0)}
                </p>
              </div>
              <div className="p-3 bg-warning/10 rounded-full">
                <Trophy className="w-6 h-6 text-warning" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Prêmios Pagos (30 dias)</p>
                <p className="font-display text-3xl font-semibold tracking-tight text-success">
                  R$ {(rankings30Days.reduce((sum: number, r: any) => sum + r.referralCount, 0) * 50)
                    .toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="p-3 bg-success/10 rounded-full">
                <Award className="w-6 h-6 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Indicadores Ativos</p>
                <p className="font-display text-3xl font-semibold tracking-tight text-primary">{rankings30Days.length}</p>
              </div>
              <div className="p-3 bg-primary/10 rounded-full">
                <Crown className="w-6 h-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Rankings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Top 10 - Últimos 30 dias</h2>
            <Select value={period30Days} onValueChange={setPeriod30Days}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7 dias</SelectItem>
                <SelectItem value="30">30 dias</SelectItem>
                <SelectItem value="90">90 dias</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <RankingList 
            rankings={rankings30Days} 
            isLoading={loading30Days} 
            title="Ranking Mensal"
          />
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Top 10 - Anual</h2>
            <Select value={periodAnnual} onValueChange={setPeriodAnnual}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="365">1 ano</SelectItem>
                <SelectItem value="180">6 meses</SelectItem>
                <SelectItem value="90">3 meses</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <RankingList 
            rankings={rankingsAnnual} 
            isLoading={loadingAnnual} 
            title="Ranking Anual"
          />
        </div>
      </div>
    </div>
  );
}
