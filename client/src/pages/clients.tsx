import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ClientForm } from "@/components/clients/client-form";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  Search,
  X,
  Edit2,
  MessageCircle,
  Trash2,
  ArrowLeft,
  RefreshCw,
  FileText,
  User,
  Send,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import type { Client } from "@shared/schema";
import { getBrasiliaStartOfDay, parseDateString } from "@/lib/timezone";

// ─── Helpers ────────────────────────────────────────────────────────────────

function getDaysToExpiry(expiryDate: string): number {
  const today = getBrasiliaStartOfDay();
  const expiry = parseDateString(expiryDate);
  expiry.setHours(0, 0, 0, 0);
  return Math.round((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function formatExpiryDate(expiryDate: string): string {
  const [y, m, d] = expiryDate.split("-");
  return `${d}/${m}/${y} 23:59`;
}

function expiryBadgeStyle(days: number, status: string): string {
  if (status !== "Ativa") return "bg-red-600 text-white";
  if (days < 0) return "bg-red-600 text-white";
  if (days === 0) return "bg-red-500 text-white";
  if (days <= 3) return "bg-orange-500 text-white";
  return "bg-green-500 text-white";
}

function statusBadgeStyle(status: string, days: number): string {
  if (status !== "Ativa") return "bg-red-600 text-white";
  if (days === 0) return "bg-cyan-500 text-white";
  if (days === 1) return "bg-yellow-500 text-white";
  if (days <= 3) return "bg-orange-500 text-white";
  return "bg-green-500 text-white";
}

function statusLabel(status: string, days: number): string {
  if (status !== "Ativa") return "Vencido";
  if (days === 0) return "Vence Hoje";
  if (days === 1) return "Vence Amanhã";
  if (days <= 3) return "Vence em 3 dias";
  return "Ativo";
}

function dotColor(status: string, days: number): string {
  if (status !== "Ativa") return "bg-red-500";
  if (days <= 3) return "bg-orange-500";
  return "bg-green-500";
}

// ─── Filter Bar ─────────────────────────────────────────────────────────────

interface FilterState {
  dateStart: string;
  dateEnd: string;
  status: string;
  paymentStatus: string;
  plan: string;
  system: string;
}

function emptyFilters(): FilterState {
  return { dateStart: "", dateEnd: "", status: "all", paymentStatus: "all", plan: "all", system: "all" };
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function Clients() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState<FilterState>(emptyFilters());
  const [selectedClients, setSelectedClients] = useState<number[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [showForm, setShowForm] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | undefined>();
  const searchRef = useRef<HTMLInputElement>(null);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: clients = [], isLoading } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
    queryFn: api.getClients,
  });

  const { data: systemsList = [] } = useQuery<{ id: number; name: string }[]>({
    queryKey: ["/api/systems"],
    queryFn: api.getSystems,
  });

  const { data: plansList = [] } = useQuery<{ id: number; name: string; price: string }[]>({
    queryKey: ["/api/plans"],
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => api.createClient(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      setShowForm(false);
      setEditingClient(undefined);
      toast({ title: "Cliente cadastrado com sucesso." });
    },
    onError: () => toast({ title: "Erro ao cadastrar cliente.", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => api.updateClient(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      setShowForm(false);
      setEditingClient(undefined);
      toast({ title: "Cliente atualizado com sucesso." });
    },
    onError: () => toast({ title: "Erro ao atualizar cliente.", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.deleteClient(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      setSelectedClients((prev) => prev.filter((id) => id !== undefined));
      toast({ title: "Cliente excluído com sucesso." });
    },
    onError: () => toast({ title: "Erro ao excluir cliente.", variant: "destructive" }),
  });

  // ── Filtering ──────────────────────────────────────────────────────────────

  const filteredClients = clients.filter((client) => {
    const days = getDaysToExpiry(client.expiryDate);
    const term = searchTerm.toLowerCase();

    const matchesSearch =
      !term ||
      client.name.toLowerCase().includes(term) ||
      (client.username || "").toLowerCase().includes(term) ||
      (client.phone || "").replace(/\D/g, "").includes(term.replace(/\D/g, "")) ||
      (client.phone || "").toLowerCase().includes(term);

    const matchesStatus = (() => {
      if (filters.status === "all") return true;
      if (filters.status === "Ativa") return client.subscriptionStatus === "Ativa" && days > 3;
      if (filters.status === "VenceHoje") return client.subscriptionStatus === "Ativa" && days === 0;
      if (filters.status === "VenceAmanha") return client.subscriptionStatus === "Ativa" && days === 1;
      if (filters.status === "Vence3Dias") return client.subscriptionStatus === "Ativa" && days > 0 && days <= 3;
      if (filters.status === "Inativa") return client.subscriptionStatus === "Inativa";
      if (filters.status === "Aguardando") return client.subscriptionStatus === "Aguardando";
      if (filters.status === "Teste") return client.subscriptionStatus === "Teste";
      return true;
    })();

    const matchesPayment =
      filters.paymentStatus === "all" || client.paymentStatus === filters.paymentStatus;

    const matchesPlan =
      filters.plan === "all" || (client.plan || "") === filters.plan;

    const matchesSystem =
      filters.system === "all" || client.system === filters.system;

    const matchesDateStart =
      !filters.dateStart || client.expiryDate >= filters.dateStart;

    const matchesDateEnd =
      !filters.dateEnd || client.expiryDate <= filters.dateEnd;

    return matchesSearch && matchesStatus && matchesPayment && matchesPlan && matchesSystem && matchesDateStart && matchesDateEnd;
  });

  // ── Pagination ─────────────────────────────────────────────────────────────

  const totalPages = Math.max(1, Math.ceil(filteredClients.length / itemsPerPage));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * itemsPerPage;
  const paginatedClients = filteredClients.slice(startIndex, startIndex + itemsPerPage);

  // ── Handlers ───────────────────────────────────────────────────────────────

  const setFilter = (key: keyof FilterState, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  const handleClearFilters = () => {
    setFilters(emptyFilters());
    setSearchTerm("");
    setCurrentPage(1);
  };

  const handleSelectAll = (checked: boolean) => {
    setSelectedClients(checked ? paginatedClients.map((c) => c.id) : []);
  };

  const handleSelectClient = (id: number, checked: boolean) => {
    setSelectedClients((prev) => (checked ? [...prev, id] : prev.filter((x) => x !== id)));
  };

  const handleDeleteSelected = () => {
    if (!selectedClients.length) return;
    if (!window.confirm(`Excluir ${selectedClients.length} cliente(s)?`)) return;
    selectedClients.forEach((id) => deleteMutation.mutate(id));
    setSelectedClients([]);
  };

  const handleFormSubmit = (data: any) => {
    if (editingClient) {
      updateMutation.mutate({ id: editingClient.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  // ── Loading ────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-[#1a2a3a] rounded w-64" />
          <div className="h-96 bg-[#1a2a3a] rounded" />
        </div>
      </div>
    );
  }

  // ── Form View ──────────────────────────────────────────────────────────────

  if (showForm) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => { setShowForm(false); setEditingClient(undefined); }}
            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white">
              {editingClient ? "Editar Cliente" : "Novo Cliente"}
            </h1>
            <p className="text-slate-400 text-sm">
              {editingClient ? "Atualize as informações do cliente" : "Cadastre um novo cliente IPTV"}
            </p>
          </div>
        </div>
        <ClientForm
          initialData={editingClient}
          onSubmit={handleFormSubmit}
          onCancel={() => { setShowForm(false); setEditingClient(undefined); }}
          isLoading={createMutation.isPending || updateMutation.isPending}
        />
      </div>
    );
  }

  // ── List View ──────────────────────────────────────────────────────────────

  const allOnPageSelected = paginatedClients.length > 0 && paginatedClients.every((c) => selectedClients.includes(c.id));

  return (
    <div className="p-6 space-y-4 min-h-screen" style={{ background: "transparent" }}>

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Clientes</h1>
          <p className="text-slate-400 text-sm">Lista de clientes</p>
        </div>
        <button
          onClick={() => { setEditingClient(undefined); setShowForm(true); }}
          className="flex items-center gap-2 bg-cyan-500 hover:bg-cyan-400 text-white font-semibold px-5 py-2.5 rounded-lg transition-colors text-sm"
        >
          <Plus className="w-4 h-4" />
          Novo cliente
        </button>
      </div>

      {/* ── Filter Bar ── */}
      <div className="bg-[#111c2a] border border-[#1e2e3e] rounded-xl p-4">
        <div className="flex flex-wrap items-end gap-3">

          {/* Date Start */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-400">Data inicial</label>
            <input
              type="date"
              value={filters.dateStart}
              onChange={(e) => setFilter("dateStart", e.target.value)}
              className="bg-[#0d1b2a] border border-[#2a3a4a] text-slate-300 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-cyan-500 w-40"
            />
          </div>

          {/* Date End */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-400">Data final</label>
            <input
              type="date"
              value={filters.dateEnd}
              onChange={(e) => setFilter("dateEnd", e.target.value)}
              className="bg-[#0d1b2a] border border-[#2a3a4a] text-slate-300 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-cyan-500 w-40"
            />
          </div>

          {/* Status */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-400">Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilter("status", e.target.value)}
              className="bg-[#0d1b2a] border border-[#2a3a4a] text-slate-300 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-cyan-500 w-40"
            >
              <option value="all">Todos</option>
              <option value="Ativa">Ativos</option>
              <option value="VenceHoje">Vence Hoje</option>
              <option value="VenceAmanha">Vence Amanhã</option>
              <option value="Vence3Dias">Vence em 3 Dias</option>
              <option value="Inativa">Inativa</option>
              <option value="Aguardando">Aguardando</option>
              <option value="Teste">Teste</option>
            </select>
          </div>

          {/* Situação Pgto */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-400">Situação Pgto</label>
            <select
              value={filters.paymentStatus}
              onChange={(e) => setFilter("paymentStatus", e.target.value)}
              className="bg-[#0d1b2a] border border-[#2a3a4a] text-slate-300 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-cyan-500 w-40"
            >
              <option value="all">Todos</option>
              <option value="Pago">Pago</option>
              <option value="A Pagar">A Pagar</option>
              <option value="Vencido">Vencido</option>
            </select>
          </div>

          {/* Planos */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-400">Planos</label>
            <select
              value={filters.plan}
              onChange={(e) => setFilter("plan", e.target.value)}
              className="bg-[#0d1b2a] border border-[#2a3a4a] text-slate-300 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-cyan-500 w-40"
            >
              <option value="all">Todos</option>
              {plansList.map((p) => (
                <option key={p.id} value={p.name}>{p.name}</option>
              ))}
            </select>
          </div>

          {/* Sistemas */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-400">Sistemas</label>
            <select
              value={filters.system}
              onChange={(e) => setFilter("system", e.target.value)}
              className="bg-[#0d1b2a] border border-[#2a3a4a] text-slate-300 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-cyan-500 w-40"
            >
              <option value="all">Todos</option>
              {systemsList.map((s) => (
                <option key={s.id} value={s.name}>{s.name}</option>
              ))}
            </select>
          </div>

          {/* Limpar */}
          <button
            onClick={handleClearFilters}
            className="ml-auto bg-[#1e3a5f] hover:bg-[#2a4a70] text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors border border-[#2a4a70]"
          >
            Limpar
          </button>
        </div>
      </div>

      {/* ── Search + Bulk ── */}
      <div className="bg-[#111c2a] border border-[#1e2e3e] rounded-xl p-4">
        <div className="flex items-center gap-4 flex-wrap">
          {/* Search */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              ref={searchRef}
              type="text"
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              placeholder="Buscar por nome, usuário ou telefone..."
              className="w-full bg-[#0d1b2a] border border-[#2a3a4a] text-slate-300 text-sm rounded-lg pl-9 pr-9 py-2 focus:outline-none focus:border-cyan-500 placeholder-slate-600"
            />
            {searchTerm && (
              <button
                onClick={() => { setSearchTerm(""); searchRef.current?.focus(); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Selection info + bulk actions */}
          <div className="flex items-center gap-3">
            <span className="text-slate-400 text-sm whitespace-nowrap">
              {selectedClients.length} cliente(s) selecionado(s)
            </span>
            {selectedClients.length > 0 && (
              <button
                onClick={handleDeleteSelected}
                className="flex items-center gap-1.5 bg-red-600 hover:bg-red-500 text-white text-sm font-medium px-3 py-1.5 rounded-lg transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Deletar
              </button>
            )}
          </div>

          {/* Items per page – right side */}
          <div className="ml-auto">
            <select
              value={itemsPerPage}
              onChange={() => setCurrentPage(1)}
              className="bg-[#0d1b2a] border border-[#2a3a4a] text-slate-300 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-cyan-500"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── Table ── */}
      <div className="bg-[#111c2a] border border-[#1e2e3e] rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#1e2e3e]">
              <th className="px-4 py-3 text-left w-10">
                <Checkbox
                  checked={allOnPageSelected}
                  onCheckedChange={handleSelectAll}
                  className="border-slate-600"
                />
              </th>
              <th className="px-2 py-3 w-6" />
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Nome</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Usuário</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Plano</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Sistema</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Vencimento</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Ações</th>
            </tr>
          </thead>
          <tbody>
            {paginatedClients.length === 0 ? (
              <tr>
                <td colSpan={9} className="text-center py-16 text-slate-500 text-sm">
                  Nenhum cliente encontrado
                </td>
              </tr>
            ) : (
              paginatedClients.map((client) => {
                const days = getDaysToExpiry(client.expiryDate);
                const isSelected = selectedClients.includes(client.id);

                return (
                  <tr
                    key={client.id}
                    className={`border-b border-[#1a2a3a] transition-colors ${isSelected ? "bg-[#1a2f45]" : "hover:bg-[#142030]"}`}
                  >
                    {/* Checkbox */}
                    <td className="px-4 py-3">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={(c) => handleSelectClient(client.id, !!c)}
                        className="border-slate-600"
                      />
                    </td>

                    {/* Status dot */}
                    <td className="px-2 py-3">
                      <div className={`w-2.5 h-2.5 rounded-full ${dotColor(client.subscriptionStatus, days)}`} />
                    </td>

                    {/* Nome + Telefone */}
                    <td className="px-4 py-3">
                      <p className="text-white text-sm font-medium">{client.name}</p>
                      <p className="text-slate-500 text-xs">{client.phone}</p>
                    </td>

                    {/* Usuário */}
                    <td className="px-4 py-3 text-slate-300 text-sm">{client.username}</td>

                    {/* Plano + Valor */}
                    <td className="px-4 py-3">
                      <p className="text-slate-300 text-sm">
                        {client.plan} {client.value ? `- R$ ${parseFloat(client.value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : ""}
                      </p>
                    </td>

                    {/* Sistema */}
                    <td className="px-4 py-3 text-slate-300 text-sm">{client.system}</td>

                    {/* Vencimento */}
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2.5 py-1 rounded text-xs font-semibold ${expiryBadgeStyle(days, client.subscriptionStatus)}`}>
                        {formatExpiryDate(client.expiryDate)}
                      </span>
                    </td>

                    {/* Status badge */}
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2.5 py-1 rounded text-xs font-semibold ${statusBadgeStyle(client.subscriptionStatus, days)}`}>
                        {statusLabel(client.subscriptionStatus, days)}
                      </span>
                    </td>

                    {/* Ações */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <ActionBtn title="Detalhes" onClick={() => {}}>
                          <FileText className="w-3.5 h-3.5" />
                        </ActionBtn>
                        <ActionBtn title="Editar" onClick={() => { setEditingClient(client); setShowForm(true); }}>
                          <Edit2 className="w-3.5 h-3.5" />
                        </ActionBtn>
                        <ActionBtn title="Renovar" onClick={() => { setEditingClient(client); setShowForm(true); }}>
                          <RefreshCw className="w-3.5 h-3.5" />
                        </ActionBtn>
                        <ActionBtn title="Perfil" onClick={() => {}}>
                          <User className="w-3.5 h-3.5" />
                        </ActionBtn>
                        <ActionBtn title="WhatsApp" onClick={() => {}}>
                          <Send className="w-3.5 h-3.5" />
                        </ActionBtn>
                        <ActionBtn title="Excluir" onClick={() => {
                          if (window.confirm(`Excluir ${client.name}?`)) deleteMutation.mutate(client.id);
                        }} danger>
                          <Trash2 className="w-3.5 h-3.5" />
                        </ActionBtn>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* ── Footer ── */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-[#1e2e3e]">
          <p className="text-slate-400 text-sm">
            Mostrando {filteredClients.length === 0 ? 0 : startIndex + 1} até{" "}
            {Math.min(startIndex + itemsPerPage, filteredClients.length)} de{" "}
            <span className="text-cyan-400 font-medium underline cursor-default">
              {filteredClients.length} resultados
            </span>
          </p>

          <div className="flex items-center gap-1">
            <PagBtn onClick={() => setCurrentPage(Math.max(1, safeCurrentPage - 1))} disabled={safeCurrentPage === 1}>
              <ChevronLeft className="w-4 h-4" />
            </PagBtn>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const page = i + 1;
              return (
                <PagBtn key={page} onClick={() => setCurrentPage(page)} active={safeCurrentPage === page}>
                  {page}
                </PagBtn>
              );
            })}
            <PagBtn onClick={() => setCurrentPage(Math.min(totalPages, safeCurrentPage + 1))} disabled={safeCurrentPage === totalPages}>
              <ChevronRight className="w-4 h-4" />
            </PagBtn>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Small reusable components ───────────────────────────────────────────────

function ActionBtn({
  children,
  title,
  onClick,
  danger = false,
}: {
  children: React.ReactNode;
  title: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      className={`p-1.5 rounded-md border transition-colors ${
        danger
          ? "border-[#3a1a1a] text-red-400 hover:bg-red-900/30"
          : "border-[#2a3a4a] text-slate-400 hover:text-white hover:bg-[#1e3a5f]"
      }`}
    >
      {children}
    </button>
  );
}

function PagBtn({
  children,
  onClick,
  disabled,
  active,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-medium transition-colors ${
        active
          ? "bg-cyan-500 text-white"
          : disabled
          ? "text-slate-600 cursor-not-allowed"
          : "text-slate-400 hover:bg-[#1e3a5f] hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}
