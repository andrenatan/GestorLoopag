import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { LineChart, Line, ResponsiveContainer } from "recharts";
import { PageHeader } from "@/components/layout/page-header";
import { getBrasiliaDateString } from "@/lib/timezone";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Eye,
  EyeOff,
  BarChart3,
  Plus,
  X,
  Search,
  Filter,
  Trash2,
  Edit2,
  Info,
  CalendarRange,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

interface DailyPoint {
  date: string;
  value: number;
}

interface FinancialSummary {
  entradas: number;
  saidas: number;
  lucros: number;
  dailyEntradas: DailyPoint[];
  dailySaidas: DailyPoint[];
  dailyLucros: DailyPoint[];
}

interface FinancialProjections {
  avgDailyProfit: number;
  weekly: number;
  monthly: number;
  annual: number;
}

interface Movement {
  id: number;
  source: "payment" | "credit" | "manual";
  type: "entrada" | "saida";
  productLabel: string;
  clientName: string | null;
  value: number;
  date: string;
  description: string | null;
}

interface MovementsResponse {
  movements: Movement[];
  total: number;
}

interface SystemOption {
  id: number;
  name: string;
}

interface ManualEntryForm {
  type: "entrada" | "saida";
  description: string;
  value: string;
  date: string;
}

function todayStr(): string {
  return new Date().toISOString().split("T")[0];
}

function daysAgoStr(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split("T")[0];
}

function formatCurrency(val: number): string {
  return val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDateBr(dateStr: string): string {
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}

const emptyManualForm = (): ManualEntryForm => ({
  type: "entrada",
  description: "",
  value: "",
  date: todayStr(),
});

function Sparkline({ data, color }: { data: DailyPoint[]; color: string }) {
  if (data.length === 0) return null;
  return (
    <div className="h-10 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2.5} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function FinancialOverview() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [hideValues, setHideValues] = useState(false);
  const [startDate, setStartDate] = useState(daysAgoStr(29));
  const [endDate, setEndDate] = useState(todayStr());
  const [appliedStartDate, setAppliedStartDate] = useState(daysAgoStr(29));
  const [appliedEndDate, setAppliedEndDate] = useState(todayStr());
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [productFilter, setProductFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualForm, setManualForm] = useState<ManualEntryForm>(emptyManualForm());
  const [editingEntry, setEditingEntry] = useState<Movement | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Movement | null>(null);
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);

  const mask = (formatted: string) => (hideValues ? "****" : formatted);

  const { data: summary } = useQuery<FinancialSummary>({
    queryKey: ["/api/financial/summary", appliedStartDate, appliedEndDate],
    queryFn: async () => {
      const res = await apiRequest(`/api/financial/summary?startDate=${appliedStartDate}&endDate=${appliedEndDate}`, "GET");
      return res.json();
    },
  });

  const { data: projections } = useQuery<FinancialProjections>({
    queryKey: ["/api/financial/projections"],
    queryFn: async () => {
      const res = await apiRequest("/api/financial/projections", "GET");
      return res.json();
    },
  });

  const { data: systemsList = [] } = useQuery<SystemOption[]>({
    queryKey: ["/api/systems"],
  });

  const movementsQueryParams = useMemo(() => {
    const params = new URLSearchParams();
    params.set("startDate", appliedStartDate);
    params.set("endDate", appliedEndDate);
    if (typeFilter !== "all") params.set("type", typeFilter);
    if (productFilter !== "all") params.set("productId", productFilter);
    if (search) params.set("search", search);
    params.set("page", String(page));
    params.set("limit", String(perPage));
    return params.toString();
  }, [appliedStartDate, appliedEndDate, typeFilter, productFilter, search, page, perPage]);

  const { data: movementsData, isLoading: movementsLoading } = useQuery<MovementsResponse>({
    queryKey: ["/api/financial/movements", movementsQueryParams],
    queryFn: async () => {
      const res = await apiRequest(`/api/financial/movements?${movementsQueryParams}`, "GET");
      return res.json();
    },
  });

  const movements = movementsData?.movements ?? [];
  const total = movementsData?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / perPage));

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/financial/summary"] });
    queryClient.invalidateQueries({ queryKey: ["/api/financial/projections"] });
    queryClient.invalidateQueries({ queryKey: ["/api/financial/movements"] });
  };

  const createMutation = useMutation({
    mutationFn: (data: ManualEntryForm) => apiRequest("/api/financial/movements", "POST", data),
    onSuccess: () => {
      invalidateAll();
      closeManualModal();
      toast({ title: "Lançamento registrado com sucesso." });
    },
    onError: (e: any) => toast({ title: e?.message || "Erro ao registrar lançamento.", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: ManualEntryForm }) =>
      apiRequest(`/api/financial/movements/${id}`, "PUT", data),
    onSuccess: () => {
      invalidateAll();
      closeManualModal();
      toast({ title: "Lançamento atualizado com sucesso." });
    },
    onError: (e: any) => toast({ title: e?.message || "Erro ao atualizar lançamento.", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (m: Movement) => apiRequest(`/api/financial/movements/${m.id}?source=${m.source}`, "DELETE"),
    onSuccess: () => {
      invalidateAll();
      setDeleteConfirm(null);
      toast({ title: "Movimentação excluída com sucesso." });
    },
    onError: () => toast({ title: "Erro ao excluir movimentação.", variant: "destructive" }),
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: (items: { id: number; source: string }[]) =>
      apiRequest("/api/financial/movements/bulk", "DELETE", { items }),
    onSuccess: () => {
      invalidateAll();
      setSelected(new Set());
      setBulkDeleteConfirm(false);
      toast({ title: "Movimentações excluídas com sucesso." });
    },
    onError: () => toast({ title: "Erro ao excluir movimentações.", variant: "destructive" }),
  });

  const rowKey = (m: Movement) => `${m.source}:${m.id}`;

  const toggleSelectAll = (checked: boolean) => {
    setSelected(checked ? new Set(movements.map(rowKey)) : new Set());
  };

  const toggleSelectRow = (m: Movement, checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      const key = rowKey(m);
      if (checked) next.add(key);
      else next.delete(key);
      return next;
    });
  };

  const closeManualModal = () => {
    setShowManualModal(false);
    setEditingEntry(null);
    setManualForm(emptyManualForm());
  };

  const openCreateManual = () => {
    setEditingEntry(null);
    setManualForm(emptyManualForm());
    setShowManualModal(true);
  };

  const openEditManual = (m: Movement) => {
    setEditingEntry(m);
    setManualForm({
      type: m.type,
      description: m.description ?? "",
      value: String(m.value),
      date: m.date,
    });
    setShowManualModal(true);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualForm.description.trim()) {
      toast({ title: "Descrição é obrigatória.", variant: "destructive" });
      return;
    }
    if (!manualForm.value || isNaN(parseFloat(manualForm.value)) || parseFloat(manualForm.value) <= 0) {
      toast({ title: "Informe um valor válido.", variant: "destructive" });
      return;
    }
    if (editingEntry) {
      updateMutation.mutate({ id: editingEntry.id, data: manualForm });
    } else {
      createMutation.mutate(manualForm);
    }
  };

  const handleFilter = () => {
    setAppliedStartDate(startDate);
    setAppliedEndDate(endDate);
    setPage(1);
  };

  const isManualSavePending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-6 px-4 pb-10 pt-5 sm:px-6 lg:px-8 lg:pt-8">
      <PageHeader
        title="Financeiro"
        description="Entradas, saídas e lucro consolidados do seu negócio."
        actions={
          <>
              <button
                onClick={() => setHideValues((v) => !v)}
                title={hideValues ? "Exibir valores" : "Ocultar valores"}
                className="flex items-center justify-center w-10 h-10 rounded-full border border-edge bg-secondary text-foreground shadow-glass hover:bg-accent transition-colors"
              >
                {hideValues ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
              <Link href="/financeiro/relatorios">
                <button
                  disabled
                  title="Em breve"
                  className="flex items-center gap-2 px-4 py-2.5 rounded-full border border-edge bg-secondary text-muted-foreground text-sm font-medium cursor-not-allowed opacity-60"
                >
                  <BarChart3 className="w-4 h-4" />
                  Relatórios
                </button>
              </Link>
              <button
                onClick={openCreateManual}
                className="flex items-center gap-2 font-semibold px-4 py-2.5 rounded-full transition-all text-sm bg-primary text-primary-foreground shadow-glow hover:bg-primary/90"
              >
                <Plus className="w-4 h-4" />
                Novo
              </button>
          </>
        }
      />

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass p-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-muted-foreground text-xs font-semibold">
              <TrendingUp className="w-4 h-4 text-primary" />
              Lucros
            </span>
          </div>
          <p className={`font-display text-3xl font-semibold tracking-tight ${(summary?.lucros ?? 0) >= 0 ? "text-primary" : "text-destructive"}`}>
            {summary ? mask(formatCurrency(summary.lucros)) : "—"}
          </p>
          {summary && <Sparkline data={summary.dailyLucros} color="hsl(var(--primary))" />}
        </div>

        <div className="glass p-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-muted-foreground text-xs font-semibold">
              <TrendingUp className="w-4 h-4 text-success" />
              Entradas
            </span>
          </div>
          <p className="font-display text-3xl font-semibold tracking-tight text-success">{summary ? mask(formatCurrency(summary.entradas)) : "—"}</p>
          {summary && <Sparkline data={summary.dailyEntradas} color="hsl(var(--success))" />}
        </div>

        <div className="glass p-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-muted-foreground text-xs font-semibold">
              <TrendingDown className="w-4 h-4 text-destructive" />
              Saídas
            </span>
          </div>
          <p className="font-display text-3xl font-semibold tracking-tight text-destructive">{summary ? mask(formatCurrency(summary.saidas)) : "—"}</p>
          {summary && <Sparkline data={summary.dailySaidas} color="hsl(var(--destructive))" />}
        </div>
      </div>

      {/* Projection cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: "Projeção Semanal", value: projections?.weekly },
          { label: "Projeção Mensal", value: projections?.monthly },
          { label: "Projeção Anual", value: projections?.annual },
        ].map((p) => (
          <div key={p.label} className="glass p-5 flex items-center justify-between">
            <div>
              <span className="text-muted-foreground text-xs font-semibold">{p.label}</span>
              <p className="font-display text-2xl font-semibold tracking-tight text-foreground mt-1">
                {p.value !== undefined ? mask(formatCurrency(p.value)) : "—"}
              </p>
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-muted-foreground hover:text-foreground cursor-help">
                  <Info className="w-4 h-4" />
                </span>
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-[220px] text-xs">
                  Estimativa com base na média diária de lucro dos últimos 30 dias. Não considera sazonalidade.
                </p>
              </TooltipContent>
            </Tooltip>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="glass p-4 flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground font-semibold">
            <CalendarRange className="w-3.5 h-3.5" />
            Data Inicial
          </span>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="field text-sm rounded-lg px-3 py-2"
          />
        </div>
        <div className="space-y-1">
          <span className="text-xs text-muted-foreground font-semibold">Data Final</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="field text-sm rounded-lg px-3 py-2"
          />
        </div>
        <div className="space-y-1">
          <span className="text-xs text-muted-foreground font-semibold">Tipo</span>
          <select
            value={typeFilter}
            onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
            className="field text-sm rounded-lg px-3 py-2"
          >
            <option value="all">Todos</option>
            <option value="entrada">Entrada</option>
            <option value="saida">Saída</option>
          </select>
        </div>
        <div className="space-y-1">
          <span className="text-xs text-muted-foreground font-semibold">Produto</span>
          <select
            value={productFilter}
            onChange={(e) => { setProductFilter(e.target.value); setPage(1); }}
            className="field text-sm rounded-lg px-3 py-2"
          >
            <option value="all">Todos</option>
            {systemsList.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
        <button
          onClick={handleFilter}
          className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold px-4 py-2 rounded-full transition-colors"
        >
          <Filter className="w-4 h-4" />
          Filtrar
        </button>
        <button
          onClick={() => setBulkDeleteConfirm(true)}
          disabled={selected.size === 0}
          className="ml-auto flex items-center gap-2 bg-destructive/15 hover:bg-destructive/25 border border-destructive/30 text-destructive text-sm font-medium px-4 py-2 rounded-full transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Trash2 className="w-4 h-4" />
          Deletar em Massa {selected.size > 0 ? `(${selected.size})` : ""}
        </button>
      </div>

      {/* Search + per-page */}
      <div className="glass p-4 flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2 text-muted-foreground text-xs font-semibold">
          <Search className="w-4 h-4" />
          Buscar
        </div>
        <div className="relative flex-1 min-w-[200px]">
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Buscar por cliente ou produto..."
            className="w-full field text-sm rounded-lg pl-3 pr-9 py-2 placeholder:text-muted-foreground"
          />
          {search && (
            <button onClick={() => { setSearch(""); setPage(1); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-muted-foreground font-semibold">Por página</span>
          <select
            value={perPage}
            onChange={(e) => { setPerPage(Number(e.target.value)); setPage(1); }}
            className="field text-sm rounded-lg px-3 py-2"
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="glass-strong overflow-x-auto">
        {movementsLoading ? (
          <div className="p-8 text-center text-muted-foreground">Carregando movimentações...</div>
        ) : (
          <>
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-4 py-3 text-left w-10">
                    <Checkbox
                      checked={movements.length > 0 && selected.size === movements.length}
                      onCheckedChange={(c) => toggleSelectAll(!!c)}
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">#</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Produto/Plano/Cliente</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Tipo</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Valor</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Data</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Ações</th>
                </tr>
              </thead>
              <tbody>
                {movements.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-16 text-muted-foreground text-sm">
                      Nenhuma movimentação encontrada para os filtros selecionados.
                    </td>
                  </tr>
                ) : (
                  movements.map((m, idx) => (
                    <tr key={rowKey(m)} className="border-b border-border hover:bg-muted transition-colors">
                      <td className="px-4 py-3">
                        <Checkbox
                          checked={selected.has(rowKey(m))}
                          onCheckedChange={(c) => toggleSelectRow(m, !!c)}
                        />
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-sm font-mono">
                        {(page - 1) * perPage + idx + 1}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-foreground text-sm font-medium">{m.productLabel}</div>
                        {m.clientName && <div className="text-muted-foreground text-xs">{m.clientName}</div>}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                            m.type === "entrada"
                              ? "bg-success/10 text-success  "
                              : "bg-destructive/10 text-destructive  "
                          }`}
                        >
                          {m.type === "entrada" ? "Entrada" : "Saída"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`font-semibold text-sm ${m.type === "entrada" ? "text-success" : "text-destructive"}`}>
                          {mask(formatCurrency(m.value))}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-sm">{formatDateBr(m.date)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {m.source === "manual" && (
                            <button
                              onClick={() => openEditManual(m)}
                              className="flex items-center gap-1.5 bg-primary/15 hover:bg-primary/25 border border-primary/30 text-primary text-xs font-medium px-3 py-1.5 rounded-full transition-colors"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                          )}
                          <button
                            onClick={() => setDeleteConfirm(m)}
                            className="flex items-center gap-1.5 bg-destructive/15 hover:bg-destructive/25 border border-destructive/30 text-destructive text-xs font-medium px-3 py-1.5 rounded-full transition-colors"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            <div className="px-4 py-3 border-t border-border flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                Mostrando {total === 0 ? 0 : (page - 1) * perPage + 1} até {Math.min(page * perPage, total)} de {total} resultado{total !== 1 ? "s" : ""}
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-accent disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs text-muted-foreground px-2">Página {page} de {totalPages}</span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-accent disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Manual entry modal */}
      {showManualModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-scrim/50 backdrop-blur-sm" onClick={closeManualModal} />
          <div
            className="relative w-full max-w-md rounded-card p-6 space-y-5 glass-strong"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-foreground font-semibold text-lg">
                {editingEntry ? "Editar Lançamento" : "Novo Lançamento Manual"}
              </h2>
              <button onClick={closeManualModal} className="text-muted-foreground hover:text-foreground transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleManualSubmit} className="space-y-4">
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setManualForm((f) => ({ ...f, type: "entrada" }))}
                  className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-medium border transition-all ${
                    manualForm.type === "entrada"
                      ? "bg-success border-success text-success-foreground"
                      : "bg-field border-input text-muted-foreground hover:border-success/40"
                  }`}
                >
                  Entrada
                </button>
                <button
                  type="button"
                  onClick={() => setManualForm((f) => ({ ...f, type: "saida" }))}
                  className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-medium border transition-all ${
                    manualForm.type === "saida"
                      ? "bg-destructive border-destructive text-destructive-foreground"
                      : "bg-field border-input text-muted-foreground hover:border-destructive/40"
                  }`}
                >
                  Saída
                </button>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Descrição</label>
                <input
                  type="text"
                  value={manualForm.description}
                  onChange={(e) => setManualForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Ex: Despesa administrativa"
                  className="w-full field text-sm rounded-xl px-4 py-3 placeholder:text-muted-foreground"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Valor (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={manualForm.value}
                    onChange={(e) => setManualForm((f) => ({ ...f, value: e.target.value }))}
                    placeholder="0,00"
                    className="w-full field text-sm rounded-xl px-4 py-3 placeholder:text-muted-foreground"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Data</label>
                  <input
                    type="date"
                    value={manualForm.date}
                    onChange={(e) => setManualForm((f) => ({ ...f, date: e.target.value }))}
                    className="w-full field text-sm rounded-xl px-4 py-3"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={closeManualModal}
                  className="flex-1 px-4 py-2.5 rounded-full border border-input text-muted-foreground hover:text-foreground hover:border-foreground/25 text-sm font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isManualSavePending}
                  className="flex-1 px-4 py-2.5 rounded-full text-sm font-semibold transition-all disabled:opacity-60 bg-primary text-primary-foreground shadow-glow hover:bg-primary/90"
                >
                  {isManualSavePending ? "Salvando..." : "Salvar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Single delete confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-scrim/50 backdrop-blur-sm" onClick={() => setDeleteConfirm(null)} />
          <div
            className="relative w-full max-w-sm rounded-card p-6 space-y-4 glass-strong border-destructive/30"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-destructive/15 border border-destructive/30 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <h3 className="text-foreground font-semibold">Excluir movimentação</h3>
                <p className="text-muted-foreground text-sm">Essa ação não pode ser desfeita.</p>
              </div>
            </div>
            <p className="text-foreground/85 text-sm">
              Tem certeza que deseja excluir <strong className="text-foreground">{deleteConfirm.productLabel}</strong> ({formatCurrency(deleteConfirm.value)})?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-4 py-2.5 rounded-full border border-input text-muted-foreground hover:text-foreground text-sm font-medium transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => deleteMutation.mutate(deleteConfirm)}
                disabled={deleteMutation.isPending}
                className="flex-1 px-4 py-2.5 rounded-full bg-destructive hover:bg-destructive/90 text-destructive-foreground text-sm font-semibold transition-colors disabled:opacity-60"
              >
                {deleteMutation.isPending ? "Excluindo..." : "Excluir"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk delete confirm */}
      {bulkDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-scrim/50 backdrop-blur-sm" onClick={() => setBulkDeleteConfirm(false)} />
          <div
            className="relative w-full max-w-sm rounded-card p-6 space-y-4 glass-strong border-destructive/30"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-destructive/15 border border-destructive/30 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <h3 className="text-foreground font-semibold">Excluir movimentações</h3>
                <p className="text-muted-foreground text-sm">Essa ação não pode ser desfeita.</p>
              </div>
            </div>
            <p className="text-foreground/85 text-sm">
              Tem certeza que deseja excluir <strong className="text-foreground">{selected.size}</strong> movimentação(ões) selecionada(s)?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setBulkDeleteConfirm(false)}
                className="flex-1 px-4 py-2.5 rounded-full border border-input text-muted-foreground hover:text-foreground text-sm font-medium transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  const items = Array.from(selected).map((key) => {
                    const [source, id] = key.split(":");
                    return { id: parseInt(id), source };
                  });
                  bulkDeleteMutation.mutate(items);
                }}
                disabled={bulkDeleteMutation.isPending}
                className="flex-1 px-4 py-2.5 rounded-full bg-destructive hover:bg-destructive/90 text-destructive-foreground text-sm font-semibold transition-colors disabled:opacity-60"
              >
                {bulkDeleteMutation.isPending ? "Excluindo..." : "Excluir"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
