import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { MessageCircle, QrCode, Plus, Settings, RefreshCw } from "lucide-react";
import type { WhatsappInstance } from "@shared/schema";

const instanceFormSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  webhookUrl: z.string().url("URL inválida").optional(),
});

type InstanceFormData = z.infer<typeof instanceFormSchema>;

interface WhatsAppConnectorProps {
  onInstanceSelect?: (instanceId: number) => void;
  selectedInstanceId?: number;
}

export function WhatsAppConnector({ onInstanceSelect, selectedInstanceId }: WhatsAppConnectorProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<InstanceFormData>({
    resolver: zodResolver(instanceFormSchema),
    defaultValues: {
      name: "",
      webhookUrl: "",
    },
  });

  const { data: instances = [], isLoading } = useQuery({
    queryKey: ["/api/whatsapp/instances"],
    queryFn: api.getWhatsappInstances,
    refetchInterval: 10000, // Refresh every 10 seconds to check connection status
  });

  const createInstanceMutation = useMutation({
    mutationFn: (data: InstanceFormData) => api.createWhatsappInstance({
      name: data.name,
      webhookUrl: data.webhookUrl || null,
      status: "disconnected",
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/whatsapp/instances"] });
      toast({
        title: "Instância criada",
        description: "Nova instância WhatsApp foi criada com sucesso.",
      });
      setDialogOpen(false);
      form.reset();
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível criar a instância.",
        variant: "destructive",
      });
    },
  });

  const connectInstanceMutation = useMutation({
    mutationFn: (id: number) => api.connectWhatsappInstance(id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/whatsapp/instances"] });
      toast({
        title: "QR Code gerado",
        description: "Escaneie o QR Code no seu WhatsApp para conectar.",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao gerar QR Code.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InstanceFormData) => {
    createInstanceMutation.mutate(data);
  };

  const handleConnect = (instanceId: number) => {
    connectInstanceMutation.mutate(instanceId);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "connected":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300";
      case "connecting":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "connected":
        return "Conectado";
      case "connecting":
        return "Conectando";
      default:
        return "Desconectado";
    }
  };

  if (isLoading) {
    return (
      <Card className="glassmorphism neon-border">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-muted rounded w-48" />
            <div className="h-20 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glassmorphism neon-border">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <MessageCircle className="w-5 h-5 text-green-500" />
            <span>Conexão WhatsApp</span>
          </CardTitle>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                Nova Instância
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nova Instância WhatsApp</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome da Instância</FormLabel>
                        <FormControl>
                          <Input placeholder="Instância Principal" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="webhookUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Webhook URL (Opcional)</FormLabel>
                        <FormControl>
                          <Input placeholder="https://exemplo.com/webhook" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex justify-end space-x-2">
                    <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={createInstanceMutation.isPending}>
                      Criar
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {instances.length === 0 ? (
          <div className="text-center py-8">
            <MessageCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">Nenhuma instância WhatsApp configurada</p>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Primeira Instância
            </Button>
          </div>
        ) : (
          instances.map((instance: WhatsappInstance) => (
            <div
              key={instance.id}
              className={`p-4 rounded-lg border transition-all duration-200 cursor-pointer ${
                selectedInstanceId === instance.id
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50"
              } ${
                instance.status === "connected" 
                  ? "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20"
                  : ""
              }`}
              onClick={() => onInstanceSelect?.(instance.id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full ${
                    instance.status === "connected" 
                      ? "bg-green-500 animate-pulse" 
                      : instance.status === "connecting"
                      ? "bg-yellow-500 animate-pulse"
                      : "bg-gray-400"
                  }`} />
                  <div>
                    <span className="font-medium">{instance.name}</span>
                    {instance.instanceId && (
                      <p className="text-sm text-muted-foreground">ID: {instance.instanceId}</p>
                    )}
                  </div>
                  <Badge className={getStatusColor(instance.status)}>
                    {getStatusText(instance.status)}
                  </Badge>
                </div>
                <div className="flex items-center space-x-2">
                  {instance.status !== "connected" && (
                    <Button
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleConnect(instance.id);
                      }}
                      disabled={connectInstanceMutation.isPending}
                    >
                      {connectInstanceMutation.isPending ? (
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <QrCode className="w-4 h-4 mr-2" />
                      )}
                      {instance.status === "connecting" ? "Aguardando" : "Conectar"}
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      // TODO: Open instance settings modal
                    }}
                  >
                    <Settings className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* QR Code Display */}
              {instance.qrCode && instance.status === "connecting" && (
                <div className="mt-4 text-center">
                  <div className="w-48 h-48 bg-white rounded-lg mx-auto p-4 border">
                    <img 
                      src={instance.qrCode} 
                      alt="QR Code WhatsApp" 
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    Escaneie este QR Code no seu WhatsApp
                  </p>
                </div>
              )}
            </div>
          ))
        )}

        {/* Connection Instructions */}
        {instances.some((i: WhatsappInstance) => i.status === "connecting") && (
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
            <h4 className="font-medium text-blue-800 dark:text-blue-300 mb-2">
              Como conectar o WhatsApp:
            </h4>
            <ol className="text-sm text-blue-700 dark:text-blue-400 space-y-1">
              <li>1. Abra o WhatsApp no seu celular</li>
              <li>2. Vá em Configurações → Aparelhos conectados</li>
              <li>3. Toque em "Conectar um aparelho"</li>
              <li>4. Escaneie o QR Code acima</li>
            </ol>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
