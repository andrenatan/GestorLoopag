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
  pending: "bg-warning/10 text-warning  ",
  approved: "bg-success/10 text-success  ",
  rejected: "bg-destructive/10 text-destructive  ",
  disabled: "bg-muted text-foreground  ",
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
    <div className="mx-auto w-full max-w-[1600px] space-y-6 px-4 pb-10 pt-5 sm:px-6 lg:px-8 lg:pt-8">
      <div data-reveal className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div>
          <h1 className="text-balance font-display text-3xl font-semibold leading-[1.05] tracking-tight text-foreground sm:text-[2.6rem]">Templates de Mensagem</h1>
          <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground sm:text-base">
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

      <Card>
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
                          <p className="text-xs text-destructive max-w-xs">{template.rejectionReason}</p>
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
                          className="text-destructive"
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
