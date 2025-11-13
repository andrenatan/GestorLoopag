import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { ClientForm } from "@/components/clients/client-form";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { 
  Plus, 
  Search, 
  Filter, 
  Download, 
  Upload,
  Edit2,
  MessageCircle,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ArrowLeft
} from "lucide-react";
import type { Client } from "@shared/schema";
import { getBrasiliaStartOfDay, parseDateString } from "@/lib/timezone";

const statusColors = {
  "Ativa": "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  "Inativa": "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  "Aguardando": "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  "Teste": "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
};

const systemColors: Record<string, string> = {
  "P2P - Android": "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  "IPTV - Geral": "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  "Dois Pontos Distintos": "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
};

export default function Clients() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [systemFilter, setSystemFilter] = useState("all");
  const [selectedClients, setSelectedClients] = useState<number[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | undefined>();
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ["/api/clients"],
    queryFn: api.getClients,
  });

  const createClientMutation = useMutation({
    mutationFn: (data: any) => api.createClient(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      setShowForm(false);
      setEditingClient(undefined);
      toast({
        title: "Cliente cadastrado",
        description: "Cliente foi cadastrado com sucesso.",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível cadastrar o cliente.",
        variant: "destructive",
      });
    },
  });

  const updateClientMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => api.updateClient(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      setShowForm(false);
      setEditingClient(undefined);
      toast({
        title: "Cliente atualizado",
        description: "Cliente foi atualizado com sucesso.",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o cliente.",
        variant: "destructive",
      });
    },
  });

  const deleteClientMutation = useMutation({
    mutationFn: (id: number) => api.deleteClient(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      toast({
        title: "Cliente excluído",
        description: "Cliente foi removido com sucesso.",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível excluir o cliente.",
        variant: "destructive",
      });
    },
  });

  // Filter clients
  const filteredClients = clients.filter((client: Client) => {
    const matchesSearch = client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         client.phone.includes(searchTerm);
    
    const matchesStatus = statusFilter === "all" || client.subscriptionStatus === statusFilter;
    const matchesSystem = systemFilter === "all" || client.system === systemFilter;

    return matchesSearch && matchesStatus && matchesSystem;
  });

  // Pagination
  const totalPages = Math.ceil(filteredClients.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedClients = filteredClients.slice(startIndex, startIndex + itemsPerPage);

  const getDaysToExpiry = (expiryDate: string) => {
    // Use Brasília timezone (GMT-3) for consistency with backend
    const today = getBrasiliaStartOfDay();
    const expiry = parseDateString(expiryDate);
    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getExpiryColor = (days: number) => {
    if (days < 0) return "text-red-600";
    if (days === 0) return "text-red-500";
    if (days <= 3) return "text-orange-600";
    if (days <= 7) return "text-yellow-600";
    return "text-green-600";
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedClients(paginatedClients.map((client: Client) => client.id));
    } else {
      setSelectedClients([]);
    }
  };

  const handleSelectClient = (clientId: number, checked: boolean) => {
    if (checked) {
      setSelectedClients([...selectedClients, clientId]);
    } else {
      setSelectedClients(selectedClients.filter(id => id !== clientId));
    }
  };

  const handleNewClient = () => {
    setEditingClient(undefined);
    setShowForm(true);
  };

  const handleEditClient = (client: Client) => {
    setEditingClient(client);
    setShowForm(true);
  };

  const handleFormSubmit = (data: any) => {
    if (editingClient) {
      updateClientMutation.mutate({ id: editingClient.id, data });
    } else {
      createClientMutation.mutate(data);
    }
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setEditingClient(undefined);
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

  if (showForm) {
    return (
      <div className="p-6 space-y-6">
        {/* Form Header */}
        <div className="flex items-center space-x-4">
          <Button 
            variant="outline" 
            size="icon"
            onClick={handleFormCancel}
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">
              {editingClient ? "Editar Cliente" : "Novo Cliente"}
            </h1>
            <p className="text-muted-foreground">
              {editingClient ? "Atualize as informações do cliente" : "Cadastre um novo cliente IPTV"}
            </p>
          </div>
        </div>

        {/* Client Form */}
        <ClientForm
          initialData={editingClient}
          onSubmit={handleFormSubmit}
          onCancel={handleFormCancel}
          isLoading={createClientMutation.isPending || updateClientMutation.isPending}
        />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Gestão de Clientes</h1>
          <p className="text-muted-foreground">
            Gerencie sua base de clientes IPTV
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="outline" className="flex items-center space-x-2">
            <Upload className="w-4 h-4" />
            <span>Importar</span>
          </Button>
          <Button 
            onClick={handleNewClient}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Cliente</span>
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="glassmorphism neon-border">
        <CardContent className="p-4">
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome, telefone, email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Todos os Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Status</SelectItem>
                <SelectItem value="Ativa">Ativa</SelectItem>
                <SelectItem value="Inativa">Inativa</SelectItem>
                <SelectItem value="Aguardando">Aguardando</SelectItem>
                <SelectItem value="Teste">Teste</SelectItem>
              </SelectContent>
            </Select>
            <Select value={systemFilter} onValueChange={setSystemFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Todos os Sistemas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Sistemas</SelectItem>
                <SelectItem value="P2P - Android">P2P - Android</SelectItem>
                <SelectItem value="IPTV - Geral">IPTV - Geral</SelectItem>
                <SelectItem value="Dois Pontos Distintos">Dois Pontos Distintos</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon">
              <Filter className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Data Table */}
      <Card className="glassmorphism neon-border">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Clientes ({filteredClients.length})</CardTitle>
            {selectedClients.length > 0 && (
              <div className="flex items-center space-x-2">
                <span className="text-sm text-muted-foreground">
                  {selectedClients.length} selecionados
                </span>
                <Button variant="outline" size="sm">
                  Ações em Lote
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedClients.length === paginatedClients.length && paginatedClients.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                </TableHead>
                <TableHead>ID</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Sistema</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedClients.map((client: Client) => {
                const daysToExpiry = getDaysToExpiry(client.expiryDate);
                const isSelected = selectedClients.includes(client.id);

                return (
                  <TableRow key={client.id} className="hover:bg-muted/50">
                    <TableCell>
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={(checked) => handleSelectClient(client.id, !!checked)}
                      />
                    </TableCell>
                    <TableCell className="font-mono text-sm">#{client.clientNumber}</TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                          {client.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                        </div>
                        <div>
                          <p className="font-medium">{client.name}</p>
                          <p className="text-sm text-muted-foreground">{client.username}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{client.phone}</TableCell>
                    <TableCell>
                      <Badge className={systemColors[client.system] || "bg-gray-100 text-gray-800"}>
                        {client.system}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColors[client.subscriptionStatus] || "bg-gray-100 text-gray-800"}>
                        {client.subscriptionStatus}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="text-sm">{new Date(client.expiryDate).toLocaleDateString('pt-BR')}</p>
                        <p className={`text-xs ${getExpiryColor(daysToExpiry)}`}>
                          {daysToExpiry < 0 ? `${Math.abs(daysToExpiry)} dias atraso` : 
                           daysToExpiry === 0 ? "Vence hoje" :
                           `${daysToExpiry} dias`}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      R$ {parseFloat(client.value || "0").toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          title="Editar"
                          onClick={() => {
                            setEditingClient(client);
                            setShowForm(true);
                          }}
                          data-testid={`button-edit-${client.id}`}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-green-600" title="WhatsApp">
                          <MessageCircle className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="text-red-600" 
                          title="Excluir"
                          onClick={() => deleteClientMutation.mutate(client.id)}
                          data-testid={`button-delete-${client.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          {/* Pagination */}
          <div className="flex items-center justify-between mt-6 pt-4 border-t">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-muted-foreground">Mostrando</span>
              <Select 
                value={itemsPerPage.toString()}
                onValueChange={(value) => {
                  setItemsPerPage(Number(value));
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="w-16">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-sm text-muted-foreground">
                de {filteredClients.length} clientes
              </span>
            </div>
            <div className="flex items-center space-x-1">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const page = i + 1;
                return (
                  <Button
                    key={page}
                    variant={currentPage === page ? "default" : "outline"}
                    size="icon"
                    onClick={() => setCurrentPage(page)}
                  >
                    {page}
                  </Button>
                );
              })}
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
