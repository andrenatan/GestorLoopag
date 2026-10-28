import { useState } from "react";
import { useSearch } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { formatDateString } from "@/lib/timezone";
import { CalendarClock } from "lucide-react";

type Period = "trimestral" | "semestral" | "anual";

interface Installment {
  id: number;
  monthNumber: number;
  dueDate: string;
  completed: boolean;
  completedAt: string | null;
}

interface ManualRenewalPlanRow {
  id: number;
  clientNumber: number;
  clientName: string;
  clientUsername: string;
  systemName: string;
  activationDate: string;
  renewDay: number;
  finalDate: string;
  totalInstallments: number;
  installments: Installment[];
  status: "ULTIMO OK" | "FALTA" | "ULTIMO";
}

const STATUS_STYLE: Record<ManualRenewalPlanRow["status"], string> = {
  "ULTIMO OK": "bg-success/10 text-success  ",
  "ULTIMO": "bg-warning/10 text-warning  ",
  "FALTA": "bg-destructive/10 text-destructive  ",
};

const PERIOD_LABELS: Record<Period, string> = {
  trimestral: "Trimestral",
  semestral: "Semestral",
  anual: "Anual",
};

// Soft, theme-aware backgrounds for grouping rows by calendar month of the
// plan's date-base (activation or last renewal). Cycles when months repeat.
const MONTH_GROUP_COLORS = [
  "bg-primary/10 ",
  "bg-warning/10 ",
  "bg-success/10 ",
  "bg-info/10 ",
  "bg-primary/10 ",
];

function buildMonthGroupColorMap(plans: ManualRenewalPlanRow[]): Map<string, string> {
  const colorByMonthKey = new Map<string, string>();
  let nextColorIndex = 0;
  for (const plan of plans) {
    const monthKey = plan.activationDate.slice(0, 7); // YYYY-MM
    if (!colorByMonthKey.has(monthKey)) {
      colorByMonthKey.set(monthKey, MONTH_GROUP_COLORS[nextColorIndex % MONTH_GROUP_COLORS.length]);
      nextColorIndex++;
    }
  }
  return colorByMonthKey;
}

function RenewalTable({ period }: { period: Period }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: plans = [], isLoading } = useQuery<ManualRenewalPlanRow[]>({
    queryKey: ["/api/manual-renewals", period],
    queryFn: async () => {
      const res = await apiRequest(`/api/manual-renewals?period=${period}`, "GET");
      return res.json();
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ planId, monthNumber }: { planId: number; monthNumber: number }) =>
      apiRequest(`/api/manual-renewals/${planId}/installments/${monthNumber}/toggle`, "PATCH"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/manual-renewals", period] });
    },
    onError: () => {
      toast({ title: "Erro ao atualizar parcela", variant: "destructive" });
    },
  });

  const monthCount = period === "trimestral" ? 3 : period === "semestral" ? 6 : 12;
  const monthColumns = Array.from({ length: monthCount }, (_, i) => i + 1);

  const sortedPlans = [...plans].sort((a, b) => a.activationDate.localeCompare(b.activationDate));
  const monthGroupColors = buildMonthGroupColorMap(sortedPlans);

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground">Carregando...</div>;
  }

  if (plans.length === 0) {
    return (
      <div className="text-center py-12">
        <CalendarClock className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
        <p className="text-muted-foreground">Nenhum plano {PERIOD_LABELS[period].toLowerCase()} em acompanhamento</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Cliente Nº</TableHead>
            <TableHead>Nome</TableHead>
            <TableHead>Servidor</TableHead>
            <TableHead>Usuário</TableHead>
            <TableHead>Ativação do Plano</TableHead>
            <TableHead>Dia de Renovação</TableHead>
            <TableHead>Final do Plano</TableHead>
            {monthColumns.map((m) => (
              <TableHead key={m} className="text-center">Mês {m}</TableHead>
            ))}
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedPlans.map((plan) => (
            <TableRow
              key={plan.id}
              className={`${monthGroupColors.get(plan.activationDate.slice(0, 7))} hover:brightness-95 dark:hover:brightness-110`}
            >
              <TableCell className="font-mono text-sm">#{plan.clientNumber}</TableCell>
              <TableCell className="font-medium">{plan.clientName}</TableCell>
              <TableCell className="text-sm text-muted-foreground">{plan.systemName}</TableCell>
              <TableCell className="text-sm text-muted-foreground">{plan.clientUsername}</TableCell>
              <TableCell className="text-sm">{formatDateString(plan.activationDate)}</TableCell>
              <TableCell className="text-sm text-center">{plan.renewDay}</TableCell>
              <TableCell className="text-sm">{formatDateString(plan.finalDate)}</TableCell>
              {monthColumns.map((m) => {
                const installment = plan.installments.find((i) => i.monthNumber === m);
                return (
                  <TableCell key={m} className="text-center">
                    {installment ? (
                      <Checkbox
                        checked={installment.completed}
                        onCheckedChange={() => toggleMutation.mutate({ planId: plan.id, monthNumber: m })}
                        disabled={toggleMutation.isPending}
                        title={formatDateString(installment.dueDate)}
                      />
                    ) : (
                      <span className="text-muted-foreground text-xs">-</span>
                    )}
                  </TableCell>
                );
              })}
              <TableCell>
                <Badge className={STATUS_STYLE[plan.status]}>{plan.status}</Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function isPeriod(value: string | null): value is Period {
  return value === "trimestral" || value === "semestral" || value === "anual";
}

export default function ManualRenewals() {
  const search = useSearch();
  const initialTab = isPeriod(new URLSearchParams(search).get("tab")) ? (new URLSearchParams(search).get("tab") as Period) : "trimestral";
  const [tab, setTab] = useState<Period>(initialTab);

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-6 px-4 pb-10 pt-5 sm:px-6 lg:px-8 lg:pt-8">
      <div data-reveal>
        <h1 className="text-balance font-display text-3xl font-semibold leading-[1.05] tracking-tight text-foreground sm:text-[2.6rem]">Renovações Manuais</h1>
        <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground sm:text-base">
          Acompanhamento mês a mês dos planos Trimestral, Semestral e Anual renovados manualmente no servidor
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Planos em Acompanhamento</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={tab} onValueChange={(v) => setTab(v as Period)}>
            <TabsList>
              <TabsTrigger value="trimestral">Trimestral</TabsTrigger>
              <TabsTrigger value="semestral">Semestral</TabsTrigger>
              <TabsTrigger value="anual">Anual</TabsTrigger>
            </TabsList>

            <TabsContent value="trimestral" className="pt-4">
              <RenewalTable period="trimestral" />
            </TabsContent>
            <TabsContent value="semestral" className="pt-4">
              <RenewalTable period="semestral" />
            </TabsContent>
            <TabsContent value="anual" className="pt-4">
              <RenewalTable period="anual" />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
