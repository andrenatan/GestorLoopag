import { useMemo, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Plus, Edit2, Trash2, Zap, PlayCircle, ListChecks, BarChart3 } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { CrmAutomation, CrmAutomationRun, CrmTemplate, System } from "@shared/schema";

type EnrichedRun = CrmAutomationRun & { contactName: string | null; contactPhone: string | null };

type TriggerType = "before_expiry" | "after_expiry" | "client_created" | "manual";

interface TargetFilter {
  systems?: string[];
  statuses?: string[];
}

interface AutomationFormState {
  name: string;
  triggerType: TriggerType;
  triggerDays: number;
  templateId: number | null;
  templateVariableMapping: string[];
  targetSystems: string[];
  targetStatuses: string[];
  isActive: boolean;
}

const STATUS_OPTIONS = ["Ativa", "Inativa", "Aguardando", "Teste"];

const FIELD_OPTIONS: { value: string; label: string }[] = [
  { value: "name", label: "Nome do cliente" },
  { value: "system", label: "Sistema" },
  { value: "username", label: "Usuário" },
  { value: "expiry_date", label: "Data de vencimento" },
  { value: "value", label: "Valor do plano" },
];

const SAMPLE_VALUES: Record<string, string> = {
  name: "João Silva",
  system: "IPTV - Geral",
  username: "joaosilva",
  expiry_date: "15/07/2026",
  value: "R$ 30,00",
};

function renderTemplatePreview(bodyText: string, mapping: string[]): string {
  return bodyText.replace(/\{\{(\d+)\}\}/g, (_match, num) => {
    const idx = parseInt(num, 10) - 1;
    const field = mapping[idx];
    return field ? SAMPLE_VALUES[field] ?? `{{${num}}}` : `{{${num}}}`;
  });
}

const DEFAULT_FORM: AutomationFormState = {
  name: "",
  triggerType: "before_expiry",
  triggerDays: 3,
  templateId: null,
  templateVariableMapping: [],
  targetSystems: [],
  targetStatuses: [],
  isActive: true,
};

function triggerLabel(automation: CrmAutomation): string {
  switch (automation.triggerType) {
    case "before_expiry":
      return `${automation.triggerDays ?? "?"} dia(s) antes do vencimento`;
    case "after_expiry":
      return `${automation.triggerDays ?? "?"} dia(s) depois do vencimento`;
    case "client_created":
      return "Ao criar cliente";
    case "manual":
      return "Manual (sob demanda)";
    default:
      return automation.triggerType;
  }
}

export default function CrmAutomations() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAutomation, setEditingAutomation] = useState<CrmAutomation | null>(null);
  const [formData, setFormData] = useState<AutomationFormState>(DEFAULT_FORM);
  const [runsDialogAutomation, setRunsDialogAutomation] = useState<CrmAutomation | null>(null);
  const [runsFilter, setRunsFilter] = useState({ startDate: "", endDate: "", status: "all" });

  const { data: automations = [], isLoading } = useQuery<CrmAutomation[]>({
    queryKey: ["/api/crm/automations"],
  });

  const { data: systems = [] } = useQuery<System[]>({
    queryKey: ["/api/systems"],
  });

  const { data: templates = [] } = useQuery<CrmTemplate[]>({
    queryKey: ["/api/crm/templates"],
  });
  const approvedTemplates = templates.filter((t) => t.status === "approved");
  const selectedTemplate = approvedTemplates.find((t) => t.id === formData.templateId);

  const runsQuery = useQuery<EnrichedRun[]>({
    queryKey: [
      "/api/crm/automations",
      runsDialogAutomation?.id,
      "runs",
      runsFilter.startDate,
      runsFilter.endDate,
      runsFilter.status,
    ],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (runsFilter.startDate) params.set("startDate", runsFilter.startDate);
      if (runsFilter.endDate) params.set("endDate", runsFilter.endDate);
      if (runsFilter.status !== "all") params.set("status", runsFilter.status);
      const qs = params.toString();
      const res = await apiRequest(
        `/api/crm/automations/${runsDialogAutomation!.id}/runs${qs ? `?${qs}` : ""}`,
        "GET"
      );
      return res.json();
    },
    enabled: !!runsDialogAutomation,
  });

  // --- Relatório (aba) ---
  const [reportAutomationId, setReportAutomationId] = useState<number | null>(null);
  const [reportFilter, setReportFilter] = useState({ startDate: "", endDate: "", status: "all" });

  const reportRunsQuery = useQuery<EnrichedRun[]>({
    queryKey: [
      "/api/crm/automations",
      reportAutomationId,
      "runs",
      reportFilter.startDate,
      reportFilter.endDate,
      reportFilter.status,
    ],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (reportFilter.startDate) params.set("startDate", reportFilter.startDate);
      if (reportFilter.endDate) params.set("endDate", reportFilter.endDate);
      if (reportFilter.status !== "all") params.set("status", reportFilter.status);
      const qs = params.toString();
      const res = await apiRequest(`/api/crm/automations/${reportAutomationId}/runs${qs ? `?${qs}` : ""}`, "GET");
      return res.json();
    },
    enabled: !!reportAutomationId,
  });

  const reportRuns = reportRunsQuery.data ?? [];

  const reportSummary = useMemo(() => {
    const total = reportRuns.length;
    const sent = reportRuns.filter((r) => r.status === "sent").length;
    const failed = reportRuns.filter((r) => r.status === "failed").length;
    const attempts = sent + failed;
    const successRate = attempts > 0 ? (sent / attempts) * 100 : 0;
    return { total, sent, failed, successRate };
  }, [reportRuns]);

  const reportChartData = useMemo(() => {
    const byDate = new Map<string, { date: string; sent: number; failed: number }>();
    for (const run of reportRuns) {
      const date = new Date(run.executedAt).toISOString().split("T")[0];
      const entry = byDate.get(date) ?? { date, sent: 0, failed: 0 };
      if (run.status === "sent") entry.sent++;
      if (run.status === "failed") entry.failed++;
      byDate.set(date, entry);
    }
    return Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));
  }, [reportRuns]);

  const buildPayload = (data: AutomationFormState) => ({
    name: data.name,
    triggerType: data.triggerType,
    triggerDays:
      data.triggerType === "before_expiry" || data.triggerType === "after_expiry"
        ? data.triggerDays
        : null,
    templateId: data.templateId,
    templateVariableMapping: data.templateVariableMapping,
    targetFilter: {
      systems: data.targetSystems.length > 0 ? data.targetSystems : undefined,
      statuses: data.targetStatuses.length > 0 ? data.targetStatuses : undefined,
    } satisfies TargetFilter,
    isActive: data.isActive,
  });

  const createMutation = useMutation({
    mutationFn: async (data: AutomationFormState) => {
      const res = await apiRequest("/api/crm/automations", "POST", buildPayload(data));
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/crm/automations"] });
      setIsDialogOpen(false);
      setFormData(DEFAULT_FORM);
      toast({ title: "Automação criada", description: "A automação foi cadastrada com sucesso." });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error?.message || "Não foi possível criar a automação.",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: AutomationFormState }) => {
      const res = await apiRequest(`/api/crm/automations/${id}`, "PUT", buildPayload(data));
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/crm/automations"] });
      setIsDialogOpen(false);
      setEditingAutomation(null);
      setFormData(DEFAULT_FORM);
      toast({ title: "Automação atualizada" });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error?.message || "Não foi possível atualizar a automação.",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest(`/api/crm/automations/${id}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/crm/automations"] });
      toast({ title: "Automação excluída" });
    },
    onError: () => {
      toast({ title: "Erro", description: "Não foi possível excluir a automação.", variant: "destructive" });
    },
  });

  const runNowMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest(`/api/crm/automations/${id}/run-now`, "POST", {});
      return res.json() as Promise<{ processed: number; sent: number; failed: number }>;
    },
    onSuccess: (result) => {
      toast({
        title: "Automação disparada",
        description: `Processados: ${result.processed} · Enviados: ${result.sent} · Falhas: ${result.failed}`,
      });
    },
    onError: () => {
      toast({ title: "Erro", description: "Não foi possível disparar a automação.", variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormData(DEFAULT_FORM);
    setEditingAutomation(null);
  };

  const handleOpenDialog = (automation?: CrmAutomation) => {
    if (automation) {
      setEditingAutomation(automation);
      const filter = (automation.targetFilter as TargetFilter | null) || {};
      setFormData({
        name: automation.name,
        triggerType: automation.triggerType as TriggerType,
        triggerDays: automation.triggerDays ?? 3,
        templateId: automation.templateId,
        templateVariableMapping: (automation.templateVariableMapping as string[]) || [],
        targetSystems: filter.systems ?? [],
        targetStatuses: filter.statuses ?? [],
        isActive: automation.isActive,
      });
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingAutomation) {
      updateMutation.mutate({ id: editingAutomation.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const toggleArrayValue = (arr: string[], value: string) =>
    arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];

  const isDayBased = formData.triggerType === "before_expiry" || formData.triggerType === "after_expiry";
  const isMappingIncomplete =
    !formData.templateId || formData.templateVariableMapping.length === 0 || formData.templateVariableMapping.some((m) => !m);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Automações do CRM</h1>
          <p className="text-muted-foreground">
            Disparos automáticos de WhatsApp por vencimento, criação de cliente ou sob demanda
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()} className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Nova Automação
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingAutomation ? "Editar Automação" : "Nova Automação"}</DialogTitle>
              <DialogDescription>
                Configure o gatilho, o público-alvo e o template aprovado que será enviado via WhatsApp.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome da automação *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Lembrete de vencimento - 3 dias antes"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Gatilho</Label>
                  <Select
                    value={formData.triggerType}
                    onValueChange={(v) => setFormData({ ...formData, triggerType: v as TriggerType })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="before_expiry">Dias antes do vencimento</SelectItem>
                      <SelectItem value="after_expiry">Dias depois do vencimento</SelectItem>
                      <SelectItem value="client_created">Ao criar cliente</SelectItem>
                      <SelectItem value="manual">Manual (só sob demanda)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {isDayBased && (
                  <div className="space-y-2">
                    <Label htmlFor="triggerDays">Quantidade de dias</Label>
                    <Input
                      id="triggerDays"
                      type="number"
                      min={0}
                      value={formData.triggerDays}
                      onChange={(e) => setFormData({ ...formData, triggerDays: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>Filtro por sistema (opcional, nenhum = todos)</Label>
                <div className="flex flex-wrap gap-3 border rounded-md p-3">
                  {systems.length === 0 && (
                    <span className="text-sm text-muted-foreground">Nenhum sistema cadastrado</span>
                  )}
                  {systems.map((system) => (
                    <label key={system.id} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={formData.targetSystems.includes(system.name)}
                        onCheckedChange={() =>
                          setFormData({ ...formData, targetSystems: toggleArrayValue(formData.targetSystems, system.name) })
                        }
                      />
                      {system.name}
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Filtro por status (opcional, nenhum = todos)</Label>
                <div className="flex flex-wrap gap-3 border rounded-md p-3">
                  {STATUS_OPTIONS.map((status) => (
                    <label key={status} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={formData.targetStatuses.includes(status)}
                        onCheckedChange={() =>
                          setFormData({ ...formData, targetStatuses: toggleArrayValue(formData.targetStatuses, status) })
                        }
                      />
                      {status}
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Template aprovado *</Label>
                <Select
                  value={formData.templateId?.toString() ?? ""}
                  onValueChange={(v) => {
                    const template = approvedTemplates.find((t) => t.id === parseInt(v));
                    setFormData({
                      ...formData,
                      templateId: template?.id ?? null,
                      templateVariableMapping: template ? Array(template.variablesCount).fill("") : [],
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={approvedTemplates.length === 0 ? "Nenhum template aprovado" : "Selecione o template"} />
                  </SelectTrigger>
                  <SelectContent>
                    {approvedTemplates.map((t) => (
                      <SelectItem key={t.id} value={t.id.toString()}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {approvedTemplates.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    Nenhum template aprovado ainda. Crie e aguarde aprovação em "Templates".
                  </p>
                )}
              </div>

              {selectedTemplate && (
                <div className="space-y-3 border rounded-md p-3">
                  <p className="text-sm font-medium">Variáveis do template</p>
                  {Array.from({ length: selectedTemplate.variablesCount }).map((_, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground w-16">{`{{${i + 1}}}`}</span>
                      <Select
                        value={formData.templateVariableMapping[i] || ""}
                        onValueChange={(v) => {
                          const next = [...formData.templateVariableMapping];
                          next[i] = v;
                          setFormData({ ...formData, templateVariableMapping: next });
                        }}
                      >
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="Selecione o campo" />
                        </SelectTrigger>
                        <SelectContent>
                          {FIELD_OPTIONS.map((f) => (
                            <SelectItem key={f.value} value={f.value}>
                              {f.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                  <div className="text-xs text-muted-foreground border rounded-md p-2 bg-muted/30">
                    <span className="font-medium">Preview:</span>{" "}
                    {renderTemplatePreview(selectedTemplate.bodyText, formData.templateVariableMapping)}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                />
                <Label>Automação ativa</Label>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending || isMappingIncomplete}
                >
                  {createMutation.isPending || updateMutation.isPending ? "Salvando..." : "Salvar"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="automations">
        <TabsList>
          <TabsTrigger value="automations">Automações</TabsTrigger>
          <TabsTrigger value="report">Relatório</TabsTrigger>
        </TabsList>

        <TabsContent value="automations" className="space-y-6 pt-4">
      <Card className="glassmorphism neon-border">
        <CardHeader>
          <CardTitle>Automações ({automations.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-sm text-muted-foreground py-8 text-center">Carregando...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Gatilho</TableHead>
                  <TableHead>Template</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {automations.map((automation) => (
                  <TableRow key={automation.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Zap className="w-4 h-4 text-muted-foreground" />
                        {automation.name}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{triggerLabel(automation)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {templates.find((t) => t.id === automation.templateId)?.name ?? `#${automation.templateId}`}
                    </TableCell>
                    <TableCell>
                      <Badge className={automation.isActive ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300" : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"}>
                        {automation.isActive ? "Ativa" : "Inativa"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Testar agora"
                          onClick={() => runNowMutation.mutate(automation.id)}
                          disabled={runNowMutation.isPending}
                        >
                          <PlayCircle className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Ver execuções"
                          onClick={() => setRunsDialogAutomation(automation)}
                        >
                          <ListChecks className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" title="Editar" onClick={() => handleOpenDialog(automation)}>
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-red-600"
                          title="Excluir"
                          onClick={() => deleteMutation.mutate(automation.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {!isLoading && automations.length === 0 && (
            <div className="text-center py-12">
              <Zap className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">Nenhuma automação cadastrada</p>
            </div>
          )}
        </CardContent>
      </Card>
        </TabsContent>

        <TabsContent value="report" className="space-y-6 pt-4">
          <Card className="glassmorphism neon-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Relatório de Envios
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Automação</Label>
                  <Select
                    value={reportAutomationId?.toString() ?? ""}
                    onValueChange={(v) => setReportAutomationId(parseInt(v))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={automations.length === 0 ? "Nenhuma automação cadastrada" : "Selecione a automação"} />
                    </SelectTrigger>
                    <SelectContent>
                      {automations.map((a) => (
                        <SelectItem key={a.id} value={a.id.toString()}>
                          {a.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">De</Label>
                  <Input
                    type="date"
                    value={reportFilter.startDate}
                    onChange={(e) => setReportFilter({ ...reportFilter, startDate: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Até</Label>
                  <Input
                    type="date"
                    value={reportFilter.endDate}
                    onChange={(e) => setReportFilter({ ...reportFilter, endDate: e.target.value })}
                  />
                </div>
              </div>

              {!reportAutomationId ? (
                <div className="text-sm text-muted-foreground text-center py-12">
                  Selecione uma automação para ver o relatório
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <Card>
                      <CardContent className="p-4">
                        <p className="text-xs text-muted-foreground">Total Processado</p>
                        <p className="text-2xl font-bold">{reportSummary.total}</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <p className="text-xs text-muted-foreground">Enviados</p>
                        <p className="text-2xl font-bold text-green-600 dark:text-green-400">{reportSummary.sent}</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <p className="text-xs text-muted-foreground">Falhas</p>
                        <p className="text-2xl font-bold text-red-600 dark:text-red-400">{reportSummary.failed}</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <p className="text-xs text-muted-foreground">Taxa de Sucesso</p>
                        <p className="text-2xl font-bold">{reportSummary.successRate.toFixed(1)}%</p>
                      </CardContent>
                    </Card>
                  </div>

                  <div>
                    <Label className="text-xs mb-2 block">Filtrar por status</Label>
                    <Select value={reportFilter.status} onValueChange={(v) => setReportFilter({ ...reportFilter, status: v })}>
                      <SelectTrigger className="w-48">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="sent">Enviados</SelectItem>
                        <SelectItem value="failed">Falhas</SelectItem>
                        <SelectItem value="skipped">Ignorados</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <p className="text-sm font-medium mb-2">Envios por dia</p>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={reportChartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                          <XAxis
                            dataKey="date"
                            tick={{ fontSize: 10 }}
                            tickLine={false}
                            tickFormatter={(d) => {
                              const [, m, day] = String(d).split("-");
                              return `${day}/${m}`;
                            }}
                          />
                          <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
                          <Tooltip
                            labelFormatter={(d) => {
                              const [y, m, day] = String(d).split("-");
                              return `${day}/${m}/${y}`;
                            }}
                          />
                          <Bar dataKey="sent" name="Enviados" fill="#10b981" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="failed" name="Falhas" fill="#ef4444" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    {reportChartData.length === 0 && !reportRunsQuery.isLoading && (
                      <div className="text-sm text-muted-foreground text-center py-6">Nenhum envio no período</div>
                    )}
                  </div>

                  <div>
                    <p className="text-sm font-medium mb-2">Detalhamento</p>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Contato</TableHead>
                          <TableHead>Data</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Erro</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {reportRuns.map((run) => (
                          <TableRow key={run.id}>
                            <TableCell className="text-sm">{run.contactName || run.contactPhone || "-"}</TableCell>
                            <TableCell className="text-sm">{new Date(run.executedAt).toLocaleString("pt-BR")}</TableCell>
                            <TableCell>
                              <Badge
                                className={
                                  run.status === "sent"
                                    ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                                    : run.status === "failed"
                                    ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
                                    : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
                                }
                              >
                                {run.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground max-w-xs truncate">
                              {run.errorMessage || "-"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    {reportRuns.length === 0 && !reportRunsQuery.isLoading && (
                      <div className="text-sm text-muted-foreground text-center py-6">Nenhuma execução encontrada no período</div>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={!!runsDialogAutomation} onOpenChange={(open) => !open && setRunsDialogAutomation(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Execuções — {runsDialogAutomation?.name}</DialogTitle>
            <DialogDescription>Relatório de envios bem-sucedidos e com falha</DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">De</Label>
              <Input
                type="date"
                value={runsFilter.startDate}
                onChange={(e) => setRunsFilter({ ...runsFilter, startDate: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Até</Label>
              <Input
                type="date"
                value={runsFilter.endDate}
                onChange={(e) => setRunsFilter({ ...runsFilter, endDate: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Status</Label>
              <Select value={runsFilter.status} onValueChange={(v) => setRunsFilter({ ...runsFilter, status: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="sent">Enviados</SelectItem>
                  <SelectItem value="failed">Falhas</SelectItem>
                  <SelectItem value="skipped">Ignorados</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Contato</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Detalhe</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(runsQuery.data ?? []).map((run) => (
                <TableRow key={run.id}>
                  <TableCell className="text-sm">{run.contactName || run.contactPhone || "-"}</TableCell>
                  <TableCell className="text-sm">{new Date(run.executedAt).toLocaleString("pt-BR")}</TableCell>
                  <TableCell>
                    <Badge
                      className={
                        run.status === "sent"
                          ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                          : run.status === "failed"
                          ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
                          : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
                      }
                    >
                      {run.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{run.errorMessage || "-"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {(runsQuery.data ?? []).length === 0 && (
            <div className="text-sm text-muted-foreground text-center py-6">Nenhuma execução encontrada</div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
