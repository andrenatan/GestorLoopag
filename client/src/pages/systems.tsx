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
import { queryClient } from "@/lib/queryClient";
import { 
  Plus, 
  Search, 
  Edit2,
  Trash2,
  Server
} from "lucide-react";
import type { System } from "@shared/schema";

export default function Systems() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSystem, setEditingSystem] = useState<System | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    isActive: true
  });

  const { toast } = useToast();

  const { data: systems = [], isLoading } = useQuery<System[]>({
    queryKey: ["/api/systems"],
  });

  const createSystemMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await fetch("/api/systems", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to create system");
      return response.json();
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
      const response = await fetch(`/api/systems/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to update system");
      return response.json();
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
      const response = await fetch(`/api/systems/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete system");
      return response.status === 204 ? null : response.json();
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

  const filteredSystems = systems.filter((system: System) => {
    const matchesSearch = system.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      isActive: true
    });
    setEditingSystem(null);
  };

  const handleOpenDialog = (system?: System) => {
    if (system) {
      setEditingSystem(system);
      setFormData({
        name: system.name,
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
                <TableHead>Descrição</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSystems.map((system: System) => (
                <TableRow key={system.id} className="hover:bg-muted/50" data-testid={`row-system-${system.id}`}>
                  <TableCell className="font-mono text-sm">#{system.id}</TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center text-white">
                        <Server className="w-4 h-4" />
                      </div>
                      <span className="font-medium">{system.name}</span>
                    </div>
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
