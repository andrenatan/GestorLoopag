import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { MessageCircle, QrCode, Smartphone, Edit, Trash2 } from "lucide-react";
import type { WhatsappInstance } from "@shared/schema";

export default function WhatsApp() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [instanceName, setInstanceName] = useState("");
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: instances = [], isLoading } = useQuery({
    queryKey: ["/api/whatsapp/instances"],
    queryFn: api.getWhatsappInstances,
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

  const deleteInstanceMutation = useMutation({
    mutationFn: (id: number) => api.updateWhatsappInstance(id, { status: "disconnected" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/whatsapp/instances"] });
      toast({
        title: "Sucesso",
        description: "Instância desconectada com sucesso!",
      });
    },
  });

  const connectInstanceMutation = useMutation({
    mutationFn: (id: number) => api.connectWhatsappInstance(id),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/whatsapp/instances"] });
      if (data.qrCode) {
        setQrCode(data.qrCode);
        setIsDialogOpen(true);
        toast({
          title: "Sucesso",
          description: "QR Code gerado com sucesso!",
        });
      }
    },
  });

  const handleConnectWhatsApp = () => {
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

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Gerenciamento de WhatsApp</h1>
          <p className="text-muted-foreground">
            Gerencie suas instâncias WhatsApp e conexões
          </p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)} data-testid="button-add-instance">
          <MessageCircle className="w-4 h-4 mr-2" />
          Conectar WhatsApp
        </Button>
      </div>

      <Card className="glassmorphism neon-border">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Smartphone className="w-5 h-5 text-blue-500" />
            <span>Instâncias WhatsApp</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Carregando instâncias...</p>
            </div>
          ) : instances.length === 0 ? (
            <div className="text-center py-8">
              <MessageCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Nenhuma instância WhatsApp configurada</p>
              <Button className="mt-4" onClick={() => setIsDialogOpen(true)} data-testid="button-add-instance-empty">
                Adicionar Instância
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {instances.map((instance: WhatsappInstance) => (
                <div
                  key={instance.id}
                  className="flex items-center justify-between p-4 rounded-lg border bg-card dark:bg-gray-800/50"
                  data-testid={`instance-card-${instance.id}`}
                >
                  <div className="flex items-center space-x-4">
                    <div className={`w-3 h-3 rounded-full ${
                      instance.status === "connected" 
                        ? "bg-green-500 animate-pulse" 
                        : "bg-red-500"
                    }`} />
                    <div>
                      <h3 className="font-semibold text-lg">{instance.name}</h3>
                      <Badge 
                        variant={instance.status === "connected" ? "default" : "destructive"}
                        className="mt-1"
                      >
                        {instance.status === "connected" ? "Conectado" : "Desconectado"}
                      </Badge>
                      {instance.instanceId && (
                        <p className="text-xs text-muted-foreground mt-1">
                          ID: {instance.instanceId}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {instance.status !== "connected" && (
                      <Button
                        size="sm"
                        variant="default"
                        className="bg-green-500 hover:bg-green-600"
                        onClick={() => connectInstanceMutation.mutate(instance.id)}
                        disabled={connectInstanceMutation.isPending}
                        data-testid={`button-connect-${instance.id}`}
                      >
                        <QrCode className="w-4 h-4 mr-1" />
                        Conectar
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      data-testid={`button-edit-${instance.id}`}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => deleteInstanceMutation.mutate(instance.id)}
                      disabled={deleteInstanceMutation.isPending}
                      data-testid={`button-disconnect-${instance.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

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
