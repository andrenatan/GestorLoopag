import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Search, 
  Filter, 
  Edit2,
  MessageCircle,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Upload,
  Download
} from "lucide-react";
import type { Client } from "@shared/schema";
import { getBrasiliaStartOfDay, parseDateString, formatDateString } from "@/lib/timezone";

interface DataTableProps {
  data: Client[];
  onEdit?: (client: Client) => void;
  onDelete?: (id: number) => void;
  onWhatsApp?: (client: Client) => void;
  onBulkAction?: (ids: number[], action: string) => void;
  isLoading?: boolean;
}

const statusColors = {
  "Ativa": "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  "Inativa": "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  "Aguardando": "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  "Teste": "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
};

const systemColors = {
  "P2P - Android": "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  "IPTV - Geral": "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  "Dois Pontos Distintos": "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
};

export function DataTable({ 
  data, 
  onEdit, 
  onDelete, 
  onWhatsApp, 
  onBulkAction,
  isLoading = false
}: DataTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [systemFilter, setSystemFilter] = useState("all");
  const [selectedItems, setSelectedItems] = useState<number[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Filter data
  const filteredData = data.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.phone.includes(searchTerm);
    
    const matchesStatus = statusFilter === "all" || item.subscriptionStatus === statusFilter;
    const matchesSystem = systemFilter === "all" || item.system === systemFilter;

    return matchesSearch && matchesStatus && matchesSystem;
  });

  // Pagination
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = filteredData.slice(startIndex, startIndex + itemsPerPage);

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
      setSelectedItems(paginatedData.map((item) => item.id));
    } else {
      setSelectedItems([]);
    }
  };

  const handleSelectItem = (id: number, checked: boolean) => {
    if (checked) {
      setSelectedItems([...selectedItems, id]);
    } else {
      setSelectedItems(selectedItems.filter(itemId => itemId !== id));
    }
  };

  if (isLoading) {
    return (
      <Card className="glassmorphism neon-border">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-10 bg-muted rounded" />
            <div className="h-64 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glassmorphism neon-border">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Clientes ({filteredData.length})</CardTitle>
          <div className="flex items-center space-x-3">
            {selectedItems.length > 0 && onBulkAction && (
              <div className="flex items-center space-x-2">
                <span className="text-sm text-muted-foreground">
                  {selectedItems.length} selecionados
                </span>
                <Select onValueChange={(action) => onBulkAction(selectedItems, action)}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Ações em lote" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="activate">Ativar</SelectItem>
                    <SelectItem value="deactivate">Desativar</SelectItem>
                    <SelectItem value="delete">Excluir</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <Button variant="outline" size="sm">
              <Upload className="w-4 h-4 mr-2" />
              Importar
            </Button>
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Exportar
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex items-center space-x-4 p-4 bg-muted/50 rounded-lg">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, telefone, email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
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

        {/* Table */}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedItems.length === paginatedData.length && paginatedData.length > 0}
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
              {paginatedData.map((item) => {
                const daysToExpiry = getDaysToExpiry(item.expiryDate);
                const isSelected = selectedItems.includes(item.id);

                return (
                  <TableRow key={item.id} className="hover:bg-muted/50">
                    <TableCell>
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={(checked) => handleSelectItem(item.id, !!checked)}
                      />
                    </TableCell>
                    <TableCell className="font-mono text-sm">#{item.id}</TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                          {item.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                        </div>
                        <div>
                          <p className="font-medium">{item.name}</p>
                          <p className="text-sm text-muted-foreground">{item.username}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{item.phone}</TableCell>
                    <TableCell>
                      <Badge className={systemColors[item.system] || "bg-gray-100 text-gray-800"}>
                        {item.system}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColors[item.subscriptionStatus] || "bg-gray-100 text-gray-800"}>
                        {item.subscriptionStatus}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="text-sm">{formatDateString(item.expiryDate)}</p>
                        <p className={`text-xs ${getExpiryColor(daysToExpiry)}`}>
                          {daysToExpiry < 0 ? `${Math.abs(daysToExpiry)} dias atraso` : 
                           daysToExpiry === 0 ? "Vence hoje" :
                           `${daysToExpiry} dias`}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      R$ {parseFloat(item.value || "0").toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        {onEdit && (
                          <Button variant="ghost" size="icon" onClick={() => onEdit(item)} title="Editar">
                            <Edit2 className="w-4 h-4" />
                          </Button>
                        )}
                        {onWhatsApp && (
                          <Button variant="ghost" size="icon" className="text-green-600" onClick={() => onWhatsApp(item)} title="WhatsApp">
                            <MessageCircle className="w-4 h-4" />
                          </Button>
                        )}
                        {onDelete && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-red-600" 
                            onClick={() => onDelete(item.id)}
                            title="Excluir"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-muted-foreground">Mostrando</span>
            <Select value={itemsPerPage.toString()} onValueChange={(value) => setItemsPerPage(parseInt(value))}>
              <SelectTrigger className="w-20">
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
              de {filteredData.length} clientes
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
  );
}
