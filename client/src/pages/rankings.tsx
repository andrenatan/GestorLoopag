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
        return <Crown className="w-5 h-5 text-yellow-500" />;
      case 2:
        return <Medal className="w-5 h-5 text-gray-400" />;
      case 3:
        return <Award className="w-5 h-5 text-amber-600" />;
      default:
        return <Trophy className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const getRankBadge = (position: number) => {
    switch (position) {
      case 1:
        return <Badge className="bg-gradient-to-r from-yellow-400 to-yellow-600 text-white">1º</Badge>;
      case 2:
        return <Badge className="bg-gradient-to-r from-gray-300 to-gray-500 text-white">2º</Badge>;
      case 3:
        return <Badge className="bg-gradient-to-r from-amber-400 to-amber-600 text-white">3º</Badge>;
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
    <Card className="glassmorphism neon-border">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Trophy className="w-5 h-5 text-yellow-500" />
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
                  className={`flex items-center space-x-4 p-4 rounded-lg border transition-all duration-200 hover:scale-[1.02] ${
                    position <= 3
                      ? "border-yellow-200 bg-gradient-to-r from-yellow-50 to-amber-50 dark:border-yellow-800 dark:from-yellow-900/20 dark:to-amber-900/20"
                      : "border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50"
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    {getRankIcon(position)}
                    {getRankBadge(position)}
                  </div>
                  
                  <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-medium">
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
                    <p className="font-semibold text-green-600">
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
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Rankings de Indicações</h1>
        <p className="text-muted-foreground">
          Acompanhe os melhores indicadores e seus prêmios
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="glassmorphism neon-border border-yellow-500/30">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Total de Indicações (30 dias)</p>
                <p className="text-2xl font-bold text-yellow-500">
                  {rankings30Days.reduce((sum: number, r: any) => sum + r.referralCount, 0)}
                </p>
              </div>
              <div className="p-3 bg-yellow-500/10 rounded-lg">
                <Trophy className="w-6 h-6 text-yellow-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glassmorphism neon-border border-green-500/30">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Prêmios Pagos (30 dias)</p>
                <p className="text-2xl font-bold text-green-500">
                  R$ {(rankings30Days.reduce((sum: number, r: any) => sum + r.referralCount, 0) * 50)
                    .toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="p-3 bg-green-500/10 rounded-lg">
                <Award className="w-6 h-6 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glassmorphism neon-border border-purple-500/30">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Indicadores Ativos</p>
                <p className="text-2xl font-bold text-purple-500">{rankings30Days.length}</p>
              </div>
              <div className="p-3 bg-purple-500/10 rounded-lg">
                <Crown className="w-6 h-6 text-purple-500" />
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
