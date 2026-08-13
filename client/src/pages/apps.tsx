import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  Plus,
  Search,
  X,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  ChevronLeft,
  ChevronRight,
  Smartphone,
  DollarSign,
  AlignLeft,
  Users,
} from "lucide-react";

interface App {
  id: number;
  name: string;
  activationValue: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  clientCount: number;
}

interface AppFormData {
  name: string;
  activationValue: string;
  description: string;
}

const emptyForm = (): AppFormData => ({
  name: "",
  activationValue: "",
  description: "",
});

function formatCurrency(val: string | number) {
  const n = typeof val === "string" ? parseFloat(val) : val;
  return isNaN(n) ? "R$ 0,00" : n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function Apps() {
  const [search, setSearch] = useState("");
  const [perPage, setPerPage] = useState(10);
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<App | null>(null);
  const [form, setForm] = useState<AppFormData>(emptyForm());
  const [deleteConfirm, setDeleteConfirm] = useState<App | null>(null);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: apps = [], isLoading } = useQuery<App[]>({
    queryKey: ["/api/apps"],
  });

  const createMutation = useMutation({
    mutationFn: (data: AppFormData) => apiRequest("/api/apps", "POST", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/apps"] });
      closeModal();
      toast({ title: "Aplicativo cadastrado com sucesso." });
    },
    onError: (e: any) =>
      toast({ title: e?.message || "Erro ao cadastrar aplicativo.", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: AppFormData }) =>
      apiRequest(`/api/apps/${id}`, "PUT", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/apps"] });
      closeModal();
      toast({ title: "Aplicativo atualizado com sucesso." });
    },
    onError: (e: any) =>
      toast({ title: e?.message || "Erro ao atualizar aplicativo.", variant: "destructive" }),
  });

  const toggleStatusMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/apps/${id}/toggle-status`, "PATCH"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/apps"] });
      toast({ title: "Status do aplicativo atualizado." });
    },
    onError: () => toast({ title: "Erro ao alterar status.", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/apps/${id}`, "DELETE"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/apps"] });
      setDeleteConfirm(null);
      toast({ title: "Aplicativo excluído com sucesso." });
    },
    onError: () => toast({ title: "Erro ao excluir aplicativo.", variant: "destructive" }),
  });

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setShowModal(true);
  };

  const openEdit = (app: App) => {
    setEditing(app);
    setForm({
      name: app.name,
      activationValue: app.activationValue,
      description: app.description ?? "",
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
      toast({ title: "Nome do aplicativo é obrigatório.", variant: "destructive" });
      return;
    }
    if (!form.activationValue || isNaN(parseFloat(form.activationValue)) || parseFloat(form.activationValue) < 0) {
      toast({ title: "Informe um valor de ativação válido.", variant: "destructive" });
      return;
    }
    if (editing) {
      updateMutation.mutate({ id: editing.id, data: form });
    } else {
      createMutation.mutate(form);
    }
  };

  const filtered = apps.filter((a) => a.name.toLowerCase().includes(search.toLowerCase()));

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * perPage, safePage * perPage);

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="p-6 space-y-4 min-h-screen">
      {/* Header */}
      <div
        className="rounded-2xl p-6 flex items-center justify-between"
        style={{
          background: "linear-gradient(135deg, rgba(99,102,241,0.15) 0%, rgba(139,92,246,0.1) 100%)",
          border: "1px solid rgba(99,102,241,0.2)",
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}
          >
            <Smartphone className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="inline-block mb-1 text-[10px] font-semibold uppercase tracking-wider text-indigo-300 bg-indigo-600/20 border border-indigo-500/30 px-2 py-0.5 rounded-full">
              Aplicativos
            </span>
            <h1 className="text-2xl font-bold text-white">Aplicativos dos Clientes</h1>
            <p className="text-slate-400 text-sm">Gerencie os aplicativos utilizados pelos seus clientes para assistir IPTV.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={openCreate}
            className="flex items-center gap-2 text-white font-semibold px-4 py-2.5 rounded-xl transition-all text-sm"
            style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}
          >
            <Plus className="w-4 h-4" />
            Novo Aplicativo
          </button>
        </div>
      </div>

      {/* Search + Per-page */}
      <div className="bg-[#111c2a] border border-[#1e2e3e] rounded-xl p-4 flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold uppercase tracking-wider">
          <Search className="w-4 h-4" />
          BUSCAR
        </div>
        <div className="relative flex-1 min-w-[200px]">
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Buscar aplicativo por nome..."
            className="w-full bg-[#0d1b2a] border border-[#2a3a4a] text-slate-300 text-sm rounded-lg pl-3 pr-9 py-2 focus:outline-none focus:border-indigo-500 placeholder-slate-600"
          />
          {search && (
            <button onClick={() => { setSearch(""); setPage(1); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">POR PÁGINA</span>
          <select
            value={perPage}
            onChange={(e) => { setPerPage(Number(e.target.value)); setPage(1); }}
            className="bg-[#0d1b2a] border border-[#2a3a4a] text-slate-300 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500"
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-[#111c2a] border border-[#1e2e3e] rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-slate-400">Carregando aplicativos...</div>
        ) : paginated.length === 0 ? (
          <div className="text-center py-16">
            <Smartphone className="w-12 h-12 mx-auto text-slate-600 mb-3" />
            <p className="text-slate-400 text-sm">
              {search ? "Nenhum aplicativo encontrado para essa busca." : "Nenhum aplicativo cadastrado"}
            </p>
            {!search && (
              <p className="text-slate-600 text-xs mt-1">Clique em "+ Novo Aplicativo" para cadastrar</p>
            )}
          </div>
        ) : (
          <>
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#1e2e3e]">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">ID</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">NOME</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">VALOR ATIVAÇÃO</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">CLIENTES</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">DESCRIÇÃO</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">AÇÕES</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((app) => (
                  <tr key={app.id} className="border-b border-[#1a2a3a] hover:bg-[#142030] transition-colors">
                    <td className="px-4 py-3 text-slate-400 text-sm font-mono">#{app.id}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center text-white shrink-0">
                          <Smartphone className="w-4 h-4" />
                        </div>
                        <span className="text-white font-semibold text-sm">{app.name}</span>
                        <span
                          className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                            app.isActive
                              ? "bg-green-600/20 border-green-500/30 text-green-400"
                              : "bg-red-600/20 border-red-500/30 text-red-400"
                          }`}
                        >
                          {app.isActive ? "Ativo" : "Inativo"}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-green-400 font-semibold text-sm">{formatCurrency(app.activationValue)}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5 bg-indigo-600/20 border border-indigo-500/30 text-indigo-300 text-xs font-semibold px-2.5 py-1 rounded-full">
                        <Users className="w-3 h-3" />
                        {app.clientCount}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-sm max-w-xs truncate">
                      {app.description || <span className="text-slate-600 italic">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openEdit(app)}
                          title="Editar"
                          className="flex items-center gap-1.5 bg-indigo-600/20 hover:bg-indigo-600/40 border border-indigo-500/30 text-indigo-300 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
                        >
                          <Edit2 className="w-3 h-3" />
                          Editar
                        </button>
                        <button
                          onClick={() => toggleStatusMutation.mutate(app.id)}
                          title={app.isActive ? "Ocultar (marcar como inativo)" : "Mostrar (marcar como ativo)"}
                          disabled={toggleStatusMutation.isPending}
                          className="flex items-center gap-1.5 bg-slate-600/20 hover:bg-slate-600/40 border border-slate-500/30 text-slate-300 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
                        >
                          {app.isActive ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(app)}
                          title="Excluir"
                          className="flex items-center gap-1.5 bg-red-600/20 hover:bg-red-600/40 border border-red-500/30 text-red-400 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            <div className="px-4 py-3 border-t border-[#1e2e3e] flex items-center justify-between">
              <p className="text-xs text-slate-500">
                Mostrando {filtered.length === 0 ? 0 : (safePage - 1) * perPage + 1} até {Math.min(safePage * perPage, filtered.length)} de {filtered.length} resultado{filtered.length !== 1 ? "s" : ""}
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={safePage === 1}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
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
                      <span key={`ellipsis-${i}`} className="px-2 text-slate-500 text-xs">…</span>
                    ) : (
                      <button
                        key={p}
                        onClick={() => setPage(p as number)}
                        className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors ${
                          safePage === p
                            ? "bg-indigo-600 text-white"
                            : "text-slate-400 hover:text-white hover:bg-white/10"
                        }`}
                      >
                        {p}
                      </button>
                    )
                  )}
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safePage === totalPages}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
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
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeModal} />
          <div
            className="relative w-full max-w-lg rounded-2xl p-6 space-y-5 shadow-2xl"
            style={{ background: "#0f1929", border: "1px solid rgba(99,102,241,0.2)" }}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}
                >
                  <Plus className="w-4 h-4 text-white" />
                </div>
                <h2 className="text-white font-semibold text-lg">
                  {editing ? "Editar Aplicativo" : "Novo Aplicativo"}
                </h2>
              </div>
              <button onClick={closeModal} className="text-slate-400 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Nome */}
              <div className="space-y-1.5">
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  <Smartphone className="w-3.5 h-3.5" />
                  NOME DO APLICATIVO
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Ex: Clouddy"
                  className="w-full bg-[#0d1b2a] border border-[#2a3a4a] text-slate-200 text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500 placeholder-slate-600"
                />
              </div>

              {/* Valor de Ativação */}
              <div className="space-y-1.5">
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  <DollarSign className="w-3.5 h-3.5" />
                  VALOR DE ATIVAÇÃO
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.activationValue}
                  onChange={(e) => setForm((f) => ({ ...f, activationValue: e.target.value }))}
                  placeholder="0,00"
                  className="w-full bg-[#0d1b2a] border border-[#2a3a4a] text-slate-200 text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500 placeholder-slate-600"
                />
              </div>

              {/* Descrição */}
              <div className="space-y-1.5">
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  <AlignLeft className="w-3.5 h-3.5" />
                  DESCRIÇÃO (OPCIONAL)
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Descrição do aplicativo (opcional)"
                  rows={4}
                  className="w-full bg-[#0d1b2a] border border-[#2a3a4a] text-slate-200 text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500 placeholder-slate-600 resize-y"
                />
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex items-center gap-2 flex-1 justify-center px-4 py-2.5 rounded-xl border border-[#2a3a4a] text-slate-400 hover:text-white hover:border-slate-500 text-sm font-medium transition-colors"
                >
                  <X className="w-4 h-4" />
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex items-center gap-2 flex-1 justify-center px-4 py-2.5 rounded-xl text-white text-sm font-semibold transition-all disabled:opacity-60"
                  style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}
                >
                  {isPending ? (
                    <span className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
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
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setDeleteConfirm(null)} />
          <div
            className="relative w-full max-w-sm rounded-2xl p-6 space-y-4 shadow-2xl"
            style={{ background: "#0f1929", border: "1px solid rgba(239,68,68,0.3)" }}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-600/20 border border-red-500/30 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h3 className="text-white font-semibold">Excluir aplicativo</h3>
                <p className="text-slate-400 text-sm">Essa ação não pode ser desfeita.</p>
              </div>
            </div>
            <p className="text-slate-300 text-sm">
              Tem certeza que deseja excluir o aplicativo{" "}
              <strong className="text-white">{deleteConfirm.name}</strong>?
              {deleteConfirm.clientCount > 0 && (
                <span className="text-yellow-400 block mt-1">
                  ⚠ {deleteConfirm.clientCount} cliente(s) têm esse aplicativo vinculado. Os vínculos serão removidos.
                </span>
              )}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-[#2a3a4a] text-slate-400 hover:text-white text-sm font-medium transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => deleteMutation.mutate(deleteConfirm.id)}
                disabled={deleteMutation.isPending}
                className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-semibold transition-colors disabled:opacity-60"
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
