import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Send, Eye } from "lucide-react";
import type { Client, WhatsappInstance, MessageTemplate } from "@shared/schema";

export default function Billing() {
  const [selectedClients, setSelectedClients] = useState<number[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<number | null>(null);
  const [selectedInstance, setSelectedInstance] = useState<number | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: instances = [] } = useQuery({
    queryKey: ["/api/whatsapp/instances"],
    queryFn: api.getWhatsappInstances,
  });

  const { data: templates = [] } = useQuery({
    queryKey: ["/api/templates"],
    queryFn: api.getMessageTemplates,
  });

  const { data: expiring3Days = [] } = useQuery({
    queryKey: ["/api/clients/expiring/3"],
    queryFn: () => api.getExpiringClients(3),
  });

  const { data: expiringToday = [] } = useQuery({
    queryKey: ["/api/clients/expiring/0"],
    queryFn: () => api.getExpiringClients(0),
  });

  const { data: overdueClients = [] } = useQuery({
    queryKey: ["/api/clients/overdue"],
    queryFn: api.getOverdueClients,
  });

  const sendMessagesMutation = useMutation({
    mutationFn: (data: { clientIds: number[]; templateId: number; instanceId: number }) =>
      api.sendBillingMessages(data),
    onSuccess: () => {
      toast({
        title: "Mensagens enviadas",
        description: `${selectedClients.length} mensagens foram enviadas com sucesso.`,
      });
      setSelectedClients([]);
    },
  });

  const handleSendMessages = () => {
    if (!selectedInstance || !selectedTemplate || selectedClients.length === 0) {
      toast({
        title: "Erro",
        description: "Selecione uma instância, template e pelo menos um cliente.",
        variant: "destructive",
      });
      return;
    }

    sendMessagesMutation.mutate({
      clientIds: selectedClients,
      templateId: selectedTemplate,
      instanceId: selectedInstance,
    });
  };

  const generatePreview = () => {
    if (!selectedTemplate) return "";

    const template = templates.find((t: MessageTemplate) => t.id === selectedTemplate);
    if (!template) return "";

    // Replace variables with sample data
    return template.content
      .replace(/{nome}/g, "João Silva")
      .replace(/{valor}/g, "R$ 89,90")
      .replace(/{vencimento}/g, "15/12/2024")
      .replace(/{plano}/g, "IPTV Premium")
      .replace(/{sistema}/g, "IPTV - Geral");
  };

  const ClientList = ({ clients, title }: { clients: Client[]; title: string }) => (
    <div className="space-y-4">
      <h3 className="font-semibold text-lg">{title} ({clients.length})</h3>
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {clients.map((client: Client) => (
          <div key={client.id} className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-muted/50">
            <Checkbox
              checked={selectedClients.includes(client.id)}
              onCheckedChange={(checked) => {
                if (checked) {
                  setSelectedClients([...selectedClients, client.id]);
                } else {
                  setSelectedClients(selectedClients.filter(id => id !== client.id));
                }
              }}
            />
            <div className="flex-1">
              <p className="font-medium">{client.name}</p>
              <p className="text-sm text-muted-foreground">{client.phone}</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium">R$ {client.value}</p>
              <p className="text-xs text-muted-foreground">
                {new Date(client.expiryDate).toLocaleDateString('pt-BR')}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Central de Cobranças</h1>
        <p className="text-muted-foreground">
          Gerencie instâncias WhatsApp e envie cobranças automatizadas
        </p>
      </div>

      {/* Message Template */}
      <Card className="glassmorphism neon-border">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Eye className="w-5 h-5 text-blue-500" />
            <span>Template de Mensagem</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Select value={selectedTemplate?.toString()} onValueChange={(value) => setSelectedTemplate(parseInt(value))}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione um template" />
            </SelectTrigger>
            <SelectContent>
              {templates.map((template: MessageTemplate) => (
                <SelectItem key={template.id} value={template.id.toString()}>
                  {template.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="space-y-2">
            <label className="text-sm font-medium">Preview da Mensagem</label>
            <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
              <div className="whitespace-pre-wrap text-sm">
                {generatePreview()}
              </div>
            </div>
          </div>

          <div className="text-xs text-muted-foreground">
            Variáveis disponíveis: {"{nome}, {valor}, {vencimento}, {plano}, {sistema}"}
          </div>
        </CardContent>
      </Card>

      {/* Client Selection */}
      <Card className="glassmorphism neon-border">
        <CardHeader>
          <CardTitle>Envio de Cobranças</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="3days" className="space-y-4">
            <TabsList className="grid grid-cols-3 w-full">
              <TabsTrigger value="3days">Vence em 3 dias ({expiring3Days.length})</TabsTrigger>
              <TabsTrigger value="today">Vence hoje ({expiringToday.length})</TabsTrigger>
              <TabsTrigger value="overdue">Vencidos ({overdueClients.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="3days">
              <ClientList clients={expiring3Days} title="Vencendo em 3 dias" />
            </TabsContent>

            <TabsContent value="today">
              <ClientList clients={expiringToday} title="Vencendo hoje" />
            </TabsContent>

            <TabsContent value="overdue">
              <ClientList clients={overdueClients} title="Vencidos" />
            </TabsContent>
          </Tabs>

          {/* Send Controls */}
          <div className="flex items-center justify-between mt-6 pt-4 border-t">
            <div className="flex items-center space-x-4">
              <Select value={selectedInstance?.toString()} onValueChange={(value) => setSelectedInstance(parseInt(value))}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Selecionar instância" />
                </SelectTrigger>
                <SelectContent>
                  {instances
                    .filter((instance: WhatsappInstance) => instance.status === "connected")
                    .map((instance: WhatsappInstance) => (
                      <SelectItem key={instance.id} value={instance.id.toString()}>
                        {instance.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <span className="text-sm text-muted-foreground">
                {selectedClients.length} clientes selecionados
              </span>
            </div>
            <Button
              onClick={handleSendMessages}
              disabled={selectedClients.length === 0 || !selectedInstance || !selectedTemplate || sendMessagesMutation.isPending}
            >
              <Send className="w-4 h-4 mr-2" />
              Enviar Cobranças
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
