import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { MessageCircle, QrCode, Send, Eye, Smartphone } from "lucide-react";
import type { Client, WhatsappInstance, MessageTemplate } from "@shared/schema";

export default function Billing() {
  const [selectedClients, setSelectedClients] = useState<number[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<number | null>(null);
  const [selectedInstance, setSelectedInstance] = useState<number | null>(null);
  const [customMessage, setCustomMessage] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [instanceName, setInstanceName] = useState("");
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
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

  const connectInstanceMutation = useMutation({
    mutationFn: (id: number) => api.connectWhatsappInstance(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/whatsapp/instances"] });
      toast({
        title: "Sucesso",
        description: "QR Code gerado com sucesso!",
      });
    },
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

  const createInstanceMutation = useMutation({
    mutationFn: async (name: string) => {
      const response = await api.createWhatsappInstance({
        name,
        status: "disconnected",
      });
      return response.json();
    },
    onSuccess: async (newInstance: WhatsappInstance) => {
      setIsConnecting(false);
      queryClient.invalidateQueries({ queryKey: ["/api/whatsapp/instances"] });
      
      // Check if QR code was returned from backend
      if (newInstance.qrCode) {
        setQrCode(newInstance.qrCode);
        toast({
          title: "Sucesso",
          description: "QR Code gerado com sucesso!",
        });
      } else {
        toast({
          title: "Aviso",
          description: "Instância criada, mas QR Code não foi gerado. Tente conectar novamente.",
          variant: "destructive",
        });
      }
    },
    onError: (error) => {
      setIsConnecting(false);
      const errorMessage = error instanceof Error ? error.message : "Falha ao criar instância";
      toast({
        title: "Erro",
        description: errorMessage,
        variant: "destructive",
      });
      setIsDialogOpen(false);
      setInstanceName("");
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
    if (!selectedTemplate) return customMessage;

    const template = templates.find((t: MessageTemplate) => t.id === selectedTemplate);
    if (!template) return customMessage;

    // Replace variables with sample data
    return template.content
      .replace(/{nome}/g, "João Silva")
      .replace(/{valor}/g, "R$ 89,90")
      .replace(/{vencimento}/g, "15/12/2024")
      .replace(/{plano}/g, "IPTV Premium")
      .replace(/{sistema}/g, "IPTV - Geral");
  };

  const handleConnectWhatsApp = () => {
    // Validate instance name (only letters and numbers)
    const nameRegex = /^[a-zA-Z0-9]+$/;
    if (!instanceName.trim()) {
      toast({
        title: "Erro",
        description: "Por favor, insira um nome para a instância",
        variant: "destructive",
      });
      return;
    }
    if (!nameRegex.test(instanceName)) {
      toast({
        title: "Erro",
        description: "Apenas letras e números, sem espaços ou caracteres especiais",
        variant: "destructive",
      });
      return;
    }
    setIsConnecting(true);
    createInstanceMutation.mutate(instanceName);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setInstanceName("");
    setQrCode(null);
    setIsConnecting(false);
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

      <div className="grid grid-cols-1 gap-6">
        {/* Message Template */}
        <Card className="glassmorphism neon-border">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center space-x-2">
                <Eye className="w-5 h-5 text-blue-500" />
                <span>Template de Mensagem</span>
              </CardTitle>
              <Button 
                size="sm" 
                onClick={() => setIsDialogOpen(true)}
                data-testid="button-add-instance-header"
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                Conectar WhatsApp
              </Button>
            </div>
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
      </div>

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

      {/* WhatsApp Connection Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={handleCloseDialog}>
        <DialogContent className="sm:max-w-md bg-gray-900 border-gray-800">
          <DialogHeader>
            <DialogTitle className="text-white">Conectar Novo Número</DialogTitle>
          </DialogHeader>
          
          {!qrCode ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="instance-name" className="text-white">
                  Nome do Número <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="instance-name"
                  placeholder="Ex: Vendas, Suporte, Marketing"
                  value={instanceName}
                  onChange={(e) => setInstanceName(e.target.value)}
                  className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
                  data-testid="input-instance-name"
                />
                <p className="text-xs text-gray-400">
                  Apenas letras e números, sem espaços ou caracteres especiais
                </p>
              </div>

              <Button
                onClick={handleConnectWhatsApp}
                disabled={createInstanceMutation.isPending || isConnecting}
                className="w-full bg-green-500 hover:bg-green-600 text-white"
                data-testid="button-connect-whatsapp"
              >
                <Smartphone className="w-4 h-4 mr-2" />
                {createInstanceMutation.isPending || isConnecting ? "Conectando..." : "Conectar WhatsApp"}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-white p-6 rounded-lg flex justify-center">
                <img 
                  src={qrCode.startsWith('data:') ? qrCode : `data:image/png;base64,${qrCode}`} 
                  alt="QR Code" 
                  className="w-64 h-64 object-contain" 
                  data-testid="img-qrcode" 
                />
              </div>

              <div className="space-y-2">
                <h3 className="text-center font-semibold text-white text-lg">
                  Escaneie o QR Code
                </h3>
                <ol className="text-sm text-gray-300 space-y-2 list-decimal list-inside">
                  <li>Abra o WhatsApp no seu celular</li>
                  <li>Vá em Configurações → Aparelhos conectados</li>
                  <li>Toque em "Conectar um aparelho"</li>
                  <li>Escaneie este QR Code</li>
                </ol>
              </div>

              <Button
                onClick={handleCloseDialog}
                className="w-full bg-green-500 hover:bg-green-600 text-white"
                data-testid="button-qr-scanned"
              >
                Já escaneei o QR Code
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
