import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Plus, Trash2, RefreshCw, FileText } from "lucide-react";
import type { CrmTemplate } from "@shared/schema";

const STATUS_LABEL: Record<string, string> = {
  pending: "Pendente",
  approved: "Aprovado",
  rejected: "Reprovado",
  disabled: "Desabilitado",
};

const STATUS_COLOR: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  approved: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  rejected: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  disabled: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
};

export default function CrmTemplates() {
  const { toast } = useToast();

  const { data: templates = [], isLoading } = useQuery<CrmTemplate[]>({
    queryKey: ["/api/crm/templates"],
  });

  const syncMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest(`/api/crm/templates/${id}/sync`, "POST");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/crm/templates"] });
      toast({ title: "Status atualizado" });
    },
    onError: () => {
      toast({ title: "Erro", description: "Não foi possível verificar o status.", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest(`/api/crm/templates/${id}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/crm/templates"] });
      toast({ title: "Template excluído" });
    },
    onError: () => {
      toast({ title: "Erro", description: "Não foi possível excluir o template.", variant: "destructive" });
    },
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Templates de Mensagem</h1>
          <p className="text-muted-foreground">
            Templates aprovados pela Meta para iniciar conversas fora da janela de 24h
          </p>
        </div>
        <Link href="/crm/templates/new">
          <Button className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Novo Template
          </Button>
        </Link>
      </div>

      <Card className="glassmorphism neon-border">
        <CardHeader>
          <CardTitle>Templates ({templates.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-sm text-muted-foreground py-8 text-center">Carregando...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Mensagem</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates.map((template) => (
                  <TableRow key={template.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-muted-foreground" />
                        {template.name}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm capitalize">{template.category}</TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-xs truncate">{template.bodyText}</TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <Badge className={STATUS_COLOR[template.status] || ""}>
                          {STATUS_LABEL[template.status] || template.status}
                        </Badge>
                        {template.status === "rejected" && template.rejectionReason && (
                          <p className="text-xs text-red-500 max-w-xs">{template.rejectionReason}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Verificar status"
                          onClick={() => syncMutation.mutate(template.id)}
                          disabled={syncMutation.isPending}
                        >
                          <RefreshCw className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-red-600"
                          title="Excluir"
                          onClick={() => deleteMutation.mutate(template.id)}
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

          {!isLoading && templates.length === 0 && (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">Nenhum template cadastrado</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
