import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Server,
  Users,
  Coins,
} from "lucide-react";
import type { System, ClientPlan, SystemCreditRule } from "@shared/schema";

type SystemWithCount = System & { clientCount: number };
type CreditRule = SystemCreditRule & { clientPlanName: string };

function formatCurrency(val: string | number | null | undefined) {
  if (val === null || val === undefined || val === "") return null;
  const n = typeof val === "string" ? parseFloat(val) : val;
  return isNaN(n) ? null : n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function CreditRulesSection({ systemId }: { systemId: number }) {
  const { toast } = useToast();
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [creditsConsumed, setCreditsConsumed] = useState("");

  const { data: clientPlans = [] } = useQuery<ClientPlan[]>({
    queryKey: ["/api/client-plans"],
  });

  const { data: rules = [], isLoading } = useQuery<CreditRule[]>({
    queryKey: ["/api/systems", systemId, "credit-rules"],
    queryFn: async () => {
      const res = await apiRequest(`/api/systems/${systemId}/credit-rules`, "GET");
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: { clientPlanId: number; creditsConsumed: number }) =>
      apiRequest(`/api/systems/${systemId}/credit-rules`, "POST", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/systems", systemId, "credit-rules"] });
      setSelectedPlanId("");
      setCreditsConsumed("");
      toast({ title: "Regra de crédito adicionada" });
    },
    onError: (e: any) => toast({ title: e?.message || "Erro ao adicionar regra", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, creditsConsumed }: { id: number; creditsConsumed: number }) =>
      apiRequest(`/api/credit-rules/${id}`, "PUT", { creditsConsumed }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/systems", systemId, "credit-rules"] });
      toast({ title: "Regra de crédito atualizada" });
    },
    onError: () => toast({ title: "Erro ao atualizar regra", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/credit-rules/${id}`, "DELETE"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/systems", systemId, "credit-rules"] });
      toast({ title: "Regra de crédito removida" });
    },
    onError: () => toast({ title: "Erro ao remover regra", variant: "destructive" }),
  });

  const availablePlans = clientPlans.filter((p) => !rules.some((r) => r.clientPlanId === p.id));

  const handleAdd = () => {
    const planId = parseInt(selectedPlanId);
    const credits = parseInt(creditsConsumed);
    if (!planId || !credits || credits < 1) {
      toast({ title: "Selecione um plano e informe os créditos", variant: "destructive" });
      return;
    }
    createMutation.mutate({ clientPlanId: planId, creditsConsumed: credits });
  };

  return (
    <div className="space-y-3 pt-2">
      <Label className="flex items-center gap-2">
        <Coins className="w-4 h-4" />
        Regras de crédito por plano
      </Label>
      <p className="text-xs text-muted-foreground">
        Define quantos créditos uma renovação completa deste sistema consome, por plano de cliente.
      </p>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando regras...</p>
      ) : (
        <div className="space-y-2">
          {rules.map((rule) => (
            <div key={rule.id} className="flex items-center gap-2">
              <span className="flex-1 text-sm">{rule.clientPlanName}</span>
              <Input
                type="number"
                min={1}
                className="w-28"
                defaultValue={rule.creditsConsumed}
                onBlur={(e) => {
                  const value = parseInt(e.target.value);
                  if (value && value !== rule.creditsConsumed) {
                    updateMutation.mutate({ id: rule.id, creditsConsumed: value });
                  }
                }}
              />
              <span className="text-xs text-muted-foreground">créditos</span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="text-red-600"
                onClick={() => deleteMutation.mutate(rule.id)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
          {rules.length === 0 && (
            <p className="text-xs text-muted-foreground italic">Nenhuma regra cadastrada para este sistema</p>
          )}
        </div>
      )}

      {availablePlans.length > 0 && (
        <div className="flex items-center gap-2 pt-1">
          <select
            value={selectedPlanId}
            onChange={(e) => setSelectedPlanId(e.target.value)}
            className="flex-1 h-9 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">Selecione um plano...</option>
            {availablePlans.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <Input
            type="number"
            min={1}
            placeholder="Créditos"
            className="w-28"
            value={creditsConsumed}
            onChange={(e) => setCreditsConsumed(e.target.value)}
          />
          <Button type="button" variant="outline" size="sm" onClick={handleAdd} disabled={createMutation.isPending}>
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

export default function Systems() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSystem, setEditingSystem] = useState<SystemWithCount | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    value: "",
    description: "",
    isActive: true
  });

  const { toast } = useToast();

  const { data: systems = [], isLoading } = useQuery<SystemWithCount[]>({
    queryKey: ["/api/systems"],
  });

  const createSystemMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const payload = { ...data, value: data.value.trim() === "" ? null : data.value };
      const res = await apiRequest("/api/systems", "POST", payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/systems"] });
      setIsDialogOpen(false);
      resetForm();
      toast({
        title: "Sistema cadastrado",
        description: "Sistema foi cadastrado com sucesso.",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível cadastrar o sistema.",
        variant: "destructive",
      });
    },
  });

  const updateSystemMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: typeof formData }) => {
      const payload = { ...data, value: data.value.trim() === "" ? null : data.value };
      const res = await apiRequest(`/api/systems/${id}`, "PATCH", payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/systems"] });
      setIsDialogOpen(false);
      resetForm();
      toast({
        title: "Sistema atualizado",
        description: "Sistema foi atualizado com sucesso.",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o sistema.",
        variant: "destructive",
      });
    },
  });

  const deleteSystemMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest(`/api/systems/${id}`, "DELETE");
      return null;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/systems"] });
      toast({
        title: "Sistema excluído",
        description: "Sistema foi removido com sucesso.",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível excluir o sistema.",
        variant: "destructive",
      });
    },
  });

  const filteredSystems = systems.filter((system: SystemWithCount) => {
    const matchesSearch = system.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const resetForm = () => {
    setFormData({
      name: "",
      value: "",
      description: "",
      isActive: true
    });
    setEditingSystem(null);
  };

  const handleOpenDialog = (system?: SystemWithCount) => {
    if (system) {
      setEditingSystem(system);
      setFormData({
        name: system.name,
        value: system.value ?? "",
        description: system.description || "",
        isActive: system.isActive
      });
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingSystem) {
      updateSystemMutation.mutate({ id: editingSystem.id, data: formData });
    } else {
      createSystemMutation.mutate(formData);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-64" />
          <div className="h-96 bg-muted rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Gestão de Sistemas</h1>
          <p className="text-muted-foreground">
            Gerencie os sistemas disponíveis para os clientes
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              onClick={() => handleOpenDialog()}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 flex items-center space-x-2"
              data-testid="button-new-system"
            >
              <Plus className="w-4 h-4" />
              <span>Novo Sistema</span>
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingSystem ? "Editar Sistema" : "Novo Sistema"}</DialogTitle>
              <DialogDescription>
                {editingSystem ? "Atualize as informações do sistema" : "Cadastre um novo sistema para os clientes"}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome do Sistema *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ex: P2P - Android"
                    required
                    data-testid="input-system-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="value">Valor</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">R$</span>
                    <Input
                      id="value"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.value}
                      onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                      placeholder="0,00"
                      className="pl-9"
                      data-testid="input-system-value"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Descrição</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Descrição do sistema..."
                    rows={3}
                    data-testid="input-system-description"
                  />
                </div>
                {editingSystem && <CreditRulesSection systemId={editingSystem.id} />}
              </div>
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsDialogOpen(false)}
                  data-testid="button-cancel"
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  disabled={createSystemMutation.isPending || updateSystemMutation.isPending}
                  data-testid="button-submit"
                >
                  {createSystemMutation.isPending || updateSystemMutation.isPending ? "Salvando..." : "Salvar"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="glassmorphism neon-border">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome do sistema..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              data-testid="input-search"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="glassmorphism neon-border">
        <CardHeader>
          <CardTitle>Sistemas ({filteredSystems.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Clientes</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSystems.map((system: SystemWithCount) => (
                <TableRow key={system.id} className="hover:bg-muted/50" data-testid={`row-system-${system.id}`}>
                  <TableCell className="font-mono text-sm">#{system.systemNumber}</TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center text-white">
                        <Server className="w-4 h-4" />
                      </div>
                      <span className="font-medium">{system.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-1.5 bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300 text-xs font-semibold px-2.5 py-1 rounded-full">
                      <Users className="w-3 h-3" />
                      {system.clientCount}
                    </span>
                  </TableCell>
                  <TableCell>
                    {formatCurrency(system.value) ? (
                      <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 text-xs font-semibold px-2.5 py-1 rounded-full">
                        {formatCurrency(system.value)}
                      </span>
                    ) : (
                      <span className="text-sm text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {system.description || "-"}
                  </TableCell>
                  <TableCell>
                    <Badge className={system.isActive ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300" : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"}>
                      {system.isActive ? "Ativo" : "Inativo"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        title="Editar"
                        onClick={() => handleOpenDialog(system)}
                        data-testid={`button-edit-${system.id}`}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="text-red-600" 
                        title="Excluir"
                        onClick={() => deleteSystemMutation.mutate(system.id)}
                        data-testid={`button-delete-${system.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {filteredSystems.length === 0 && (
            <div className="text-center py-12">
              <Server className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">Nenhum sistema encontrado</p>
              <p className="text-sm text-muted-foreground/70 mt-1">
                Clique em "Novo Sistema" para cadastrar
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
