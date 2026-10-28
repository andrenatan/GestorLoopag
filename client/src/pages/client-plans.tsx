import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { PageHeader } from "@/components/layout/page-header";
import {
  Plus,
  Search,
  X,
  Edit2,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Tag,
  Calendar,
  Clock,
  AlignLeft,
  DollarSign,
  Users,
  ClipboardList,
} from "lucide-react";

type DurationType = "months" | "days";

interface ClientPlan {
  id: number;
  name: string;
  value: string;
  durationType: DurationType;
  durationQuantity: number;
  description: string | null;
  createdAt: string;
  clientCount: number;
}

interface PlanFormData {
  name: string;
  value: string;
  durationType: DurationType;
  durationQuantity: number;
  description: string;
}

const emptyForm = (): PlanFormData => ({
  name: "",
  value: "",
  durationType: "months",
  durationQuantity: 1,
  description: "",
});

function formatDuration(qty: number, type: DurationType) {
  const label = type === "months" ? (qty === 1 ? "mês" : "meses") : (qty === 1 ? "dia" : "dias");
  return `${qty} ${label}`;
}

function formatCurrency(val: string | number) {
  const n = typeof val === "string" ? parseFloat(val) : val;
  return isNaN(n) ? "R$ 0,00" : n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function ClientPlans() {
  const [search, setSearch] = useState("");
  const [perPage, setPerPage] = useState(10);
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<ClientPlan | null>(null);
  const [form, setForm] = useState<PlanFormData>(emptyForm());
  const [deleteConfirm, setDeleteConfirm] = useState<ClientPlan | null>(null);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: plans = [], isLoading } = useQuery<ClientPlan[]>({
    queryKey: ["/api/client-plans"],
  });

  const createMutation = useMutation({
    mutationFn: (data: PlanFormData) =>
      apiRequest("/api/client-plans", "POST", {
        ...data,
        value: data.value,
        durationQuantity: Number(data.durationQuantity),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/client-plans"] });
      closeModal();
      toast({ title: "Plano criado com sucesso." });
    },
    onError: (e: any) =>
      toast({ title: e?.message || "Erro ao criar plano.", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: PlanFormData }) =>
      apiRequest(`/api/client-plans/${id}`, "PUT", {
        ...data,
        value: data.value,
        durationQuantity: Number(data.durationQuantity),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/client-plans"] });
      closeModal();
      toast({ title: "Plano atualizado com sucesso." });
    },
    onError: (e: any) =>
      toast({ title: e?.message || "Erro ao atualizar plano.", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/client-plans/${id}`, "DELETE"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/client-plans"] });
      setDeleteConfirm(null);
      toast({ title: "Plano excluído com sucesso." });
    },
    onError: () =>
      toast({ title: "Erro ao excluir plano.", variant: "destructive" }),
  });

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setShowModal(true);
  };

  const openEdit = (plan: ClientPlan) => {
    setEditing(plan);
    setForm({
      name: plan.name,
      value: plan.value,
      durationType: plan.durationType,
      durationQuantity: plan.durationQuantity,
      description: plan.description ?? "",
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditing(null);
    setForm(emptyForm());
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast({ title: "Nome do plano é obrigatório.", variant: "destructive" });
      return;
    }
    if (!form.value || isNaN(parseFloat(form.value)) || parseFloat(form.value) < 0) {
      toast({ title: "Informe um valor válido.", variant: "destructive" });
      return;
    }
    if (!form.durationQuantity || Number(form.durationQuantity) < 1) {
      toast({ title: "Quantidade deve ser pelo menos 1.", variant: "destructive" });
      return;
    }
    if (editing) {
      updateMutation.mutate({ id: editing.id, data: form });
    } else {
      createMutation.mutate(form);
    }
  };

  const filtered = plans.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * perPage, safePage * perPage);

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-6 px-4 pb-10 pt-5 sm:px-6 lg:px-8 lg:pt-8">
      <PageHeader
        title="Planos dos Clientes"
        description="Gerencie os planos de assinatura oferecidos aos seus clientes."
        actions={
          <>
              <button
                onClick={openCreate}
                className="flex items-center gap-2 font-semibold px-4 py-2.5 rounded-full transition-all text-sm bg-primary text-primary-foreground shadow-glow hover:bg-primary/90"
              >
                <Plus className="w-4 h-4" />
                Novo Plano
              </button>
          </>
        }
      />

      {/* Search + Per-page */}
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
            placeholder="Buscar plano por nome..."
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
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">Carregando planos...</div>
        ) : (
          <>
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">ID</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Nome</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Clientes</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Valor</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Duração</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Descrição</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Ações</th>
                </tr>
              </thead>
              <tbody>
                {paginated.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-16 text-muted-foreground text-sm">
                      {search ? "Nenhum plano encontrado para essa busca." : "Nenhum plano cadastrado. Clique em \"+ Novo Plano\" para criar."}
                    </td>
                  </tr>
                ) : (
                  paginated.map((plan) => (
                    <tr key={plan.id} className="border-b border-border hover:bg-muted transition-colors">
                      <td className="px-4 py-3 text-muted-foreground text-sm font-mono">#{plan.id}</td>
                      <td className="px-4 py-3 text-foreground font-semibold text-sm">{plan.name}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1.5 bg-primary/15 border border-primary/30 text-primary text-xs font-semibold px-2.5 py-1 rounded-full">
                          <Users className="w-3 h-3" />
                          {plan.clientCount}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-success font-semibold text-sm">{formatCurrency(plan.value)}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1.5 bg-info/15 border border-info/30 text-info text-xs font-semibold px-2.5 py-1 rounded-full">
                          {plan.durationType === "months" ? <Calendar className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                          {formatDuration(plan.durationQuantity, plan.durationType)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-sm max-w-xs truncate">
                        {plan.description || <span className="text-muted-foreground italic">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openEdit(plan)}
                            className="flex items-center gap-1.5 bg-primary/15 hover:bg-primary/25 border border-primary/30 text-primary text-xs font-medium px-3 py-1.5 rounded-full transition-colors"
                          >
                            <Edit2 className="w-3 h-3" />
                            Editar
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(plan)}
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

            {/* Pagination */}
            <div className="px-4 py-3 border-t border-border flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                Mostrando {filtered.length === 0 ? 0 : (safePage - 1) * perPage + 1} até {Math.min(safePage * perPage, filtered.length)} de {filtered.length} resultado{filtered.length !== 1 ? "s" : ""}
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={safePage === 1}
                  className="p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-accent disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) => p === 1 || p === totalPages || Math.abs(p - safePage) <= 1)
                  .reduce<(number | "...")[]>((acc, p, i, arr) => {
                    if (i > 0 && (p as number) - (arr[i - 1] as number) > 1) acc.push("...");
                    acc.push(p);
                    return acc;
                  }, [])
                  .map((p, i) =>
                    p === "..." ? (
                      <span key={`ellipsis-${i}`} className="px-2 text-muted-foreground text-xs">…</span>
                    ) : (
                      <button
                        key={p}
                        onClick={() => setPage(p as number)}
                        className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors ${
                          safePage === p
                            ? "bg-ink text-ink-foreground"
                            : "text-muted-foreground hover:text-foreground hover:bg-accent"
                        }`}
                      >
                        {p}
                      </button>
                    )
                  )}
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safePage === totalPages}
                  className="p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-accent disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-scrim/50 backdrop-blur-sm" onClick={closeModal} />
          <div
            className="relative w-full max-w-lg rounded-card p-6 space-y-5 glass-strong"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center brand-tile"
                >
                  <Plus className="w-4 h-4" />
                </div>
                <h2 className="text-foreground font-semibold text-lg">
                  {editing ? "Editar Plano" : "Novo Plano"}
                </h2>
              </div>
              <button onClick={closeModal} className="text-muted-foreground hover:text-foreground transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Nome */}
              <div className="space-y-1.5">
                <label className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                  <Tag className="w-3.5 h-3.5" />
                  NOME DO PLANO *
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Ex: Plano Mensal"
                  className="w-full field text-sm rounded-xl px-4 py-3 placeholder:text-muted-foreground"
                />
              </div>

              {/* Valor */}
              <div className="space-y-1.5">
                <label className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                  <DollarSign className="w-3.5 h-3.5" />
                  VALOR *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.value}
                  onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))}
                  placeholder="0,00"
                  className="w-full field text-sm rounded-xl px-4 py-3 placeholder:text-muted-foreground"
                />
              </div>

              {/* Tipo de Duração */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                  <Calendar className="w-3.5 h-3.5" />
                  Tipo de duração
                </label>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, durationType: "months" }))}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition-all ${
                      form.durationType === "months"
                        ? "bg-primary border-primary text-primary-foreground"
                        : "bg-field border-input text-muted-foreground hover:border-primary/40"
                    }`}
                  >
                    <span
                      className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        form.durationType === "months" ? "border-primary-foreground" : "border-border"
                      }`}
                    >
                      {form.durationType === "months" && <span className="w-2 h-2 rounded-full bg-primary-foreground" />}
                    </span>
                    <Calendar className="w-4 h-4" />
                    Meses
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, durationType: "days" }))}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition-all ${
                      form.durationType === "days"
                        ? "bg-primary border-primary text-primary-foreground"
                        : "bg-field border-input text-muted-foreground hover:border-primary/40"
                    }`}
                  >
                    <span
                      className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        form.durationType === "days" ? "border-primary-foreground" : "border-border"
                      }`}
                    >
                      {form.durationType === "days" && <span className="w-2 h-2 rounded-full bg-primary-foreground" />}
                    </span>
                    <Clock className="w-4 h-4" />
                    Dias
                  </button>
                </div>
              </div>

              {/* Quantidade */}
              <div className="space-y-1.5">
                <label className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                  <span className="text-primary font-bold">#</span>
                  Escolha a quantidade de{" "}
                  <span
                    className="ml-1 px-2 py-0.5 rounded-full text-xs font-bold bg-highlight text-highlight-foreground"
                  >
                    {form.durationType === "months" ? "meses" : "dias"}
                  </span>{" "}
                  *
                </label>
                <input
                  type="number"
                  min="1"
                  value={form.durationQuantity}
                  onChange={(e) => setForm((f) => ({ ...f, durationQuantity: parseInt(e.target.value) || 1 }))}
                  placeholder="Quantidade"
                  className="w-full field text-sm rounded-xl px-4 py-3 placeholder:text-muted-foreground"
                />
              </div>

              {/* Descrição */}
              <div className="space-y-1.5">
                <label className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                  <AlignLeft className="w-3.5 h-3.5" />
                  Descrição
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Descrição do plano (opcional)"
                  rows={4}
                  className="w-full field text-sm rounded-xl px-4 py-3 placeholder:text-muted-foreground resize-y"
                />
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex items-center gap-2 flex-1 justify-center px-4 py-2.5 rounded-full border border-input text-muted-foreground hover:text-foreground hover:border-foreground/25 text-sm font-medium transition-colors"
                >
                  <X className="w-4 h-4" />
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex items-center gap-2 flex-1 justify-center px-4 py-2.5 rounded-full text-sm font-semibold transition-all disabled:opacity-60 bg-primary text-primary-foreground shadow-glow hover:bg-primary/90"
                >
                  {isPending ? (
                    <span className="animate-spin w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full" />
                  ) : (
                    <span>✓</span>
                  )}
                  {isPending ? "Salvando..." : "Salvar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
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
                <h3 className="text-foreground font-semibold">Excluir plano</h3>
                <p className="text-muted-foreground text-sm">Essa ação não pode ser desfeita.</p>
              </div>
            </div>
            <p className="text-foreground/85 text-sm">
              Tem certeza que deseja excluir o plano{" "}
              <strong className="text-foreground">{deleteConfirm.name}</strong>?
              {deleteConfirm.clientCount > 0 && (
                <span className="text-warning block mt-1">
                  ⚠ {deleteConfirm.clientCount} cliente(s) usam esse plano.
                </span>
              )}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-4 py-2.5 rounded-full border border-input text-muted-foreground hover:text-foreground text-sm font-medium transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => deleteMutation.mutate(deleteConfirm.id)}
                disabled={deleteMutation.isPending}
                className="flex-1 px-4 py-2.5 rounded-full bg-destructive hover:bg-destructive/90 text-destructive-foreground text-sm font-semibold transition-colors disabled:opacity-60"
              >
                {deleteMutation.isPending ? "Excluindo..." : "Excluir"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
