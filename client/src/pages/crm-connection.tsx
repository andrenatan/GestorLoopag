import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { MessageCircle, Unlink, Loader2, ShieldCheck } from "lucide-react";

interface ConnectionStatus {
  status: "connected" | "disconnected" | "error";
  connectionType?: "embedded_signup" | "manual";
  displayPhoneNumber?: string | null;
  connectedAt?: string | null;
}

declare global {
  interface Window {
    FB?: any;
    fbAsyncInit?: () => void;
  }
}

const FB_APP_ID = import.meta.env.VITE_WHATSAPP_APP_ID as string | undefined;
const FB_CONFIG_ID = import.meta.env.VITE_WHATSAPP_CONFIG_ID as string | undefined;

function loadFacebookSdk(appId: string): Promise<void> {
  return new Promise((resolve) => {
    if (window.FB) return resolve();

    window.fbAsyncInit = () => {
      window.FB!.init({ appId, autoLogAppEvents: true, xfbml: false, version: "v21.0" });
      resolve();
    };

    if (document.getElementById("facebook-jssdk")) return;
    const script = document.createElement("script");
    script.id = "facebook-jssdk";
    script.src = "https://connect.facebook.net/en_US/sdk.js";
    script.async = true;
    document.body.appendChild(script);
  });
}

export default function CrmConnection() {
  const { toast } = useToast();
  const [sdkReady, setSdkReady] = useState(false);
  const [embeddedData, setEmbeddedData] = useState<{ phoneNumberId?: string; wabaId?: string }>({});
  const [manualForm, setManualForm] = useState({ phoneNumberId: "", accessToken: "", verifyToken: "" });

  const { data: connection, isLoading } = useQuery<ConnectionStatus>({
    queryKey: ["/api/whatsapp/connection"],
  });

  useEffect(() => {
    if (!FB_APP_ID) return;
    loadFacebookSdk(FB_APP_ID).then(() => setSdkReady(true));

    const listener = (event: MessageEvent) => {
      if (!event.origin.endsWith("facebook.com")) return;
      try {
        const data = JSON.parse(event.data);
        if (data.type === "WA_EMBEDDED_SIGNUP" && data.event === "FINISH") {
          setEmbeddedData({
            phoneNumberId: data.data?.phone_number_id,
            wabaId: data.data?.waba_id,
          });
        }
      } catch {
        // ignore non-JSON messages from other Facebook iframes
      }
    };
    window.addEventListener("message", listener);
    return () => window.removeEventListener("message", listener);
  }, []);

  const embeddedSignupMutation = useMutation({
    mutationFn: async (code: string) => {
      const res = await apiRequest("/api/whatsapp/connect/embedded-signup", "POST", {
        code,
        phoneNumberId: embeddedData.phoneNumberId,
        wabaId: embeddedData.wabaId,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/whatsapp/connection"] });
      toast({ title: "WhatsApp conectado", description: "Conexão via Login Incorporado concluída com sucesso." });
    },
    onError: () => {
      toast({ title: "Erro", description: "Não foi possível concluir o Login Incorporado.", variant: "destructive" });
    },
  });

  const manualConnectMutation = useMutation({
    mutationFn: async (data: typeof manualForm) => {
      const res = await apiRequest("/api/whatsapp/connect/manual", "POST", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/whatsapp/connection"] });
      setManualForm({ phoneNumberId: "", accessToken: "", verifyToken: "" });
      toast({ title: "WhatsApp conectado", description: "Conexão manual salva com sucesso." });
    },
    onError: () => {
      toast({ title: "Erro", description: "Não foi possível validar as credenciais informadas.", variant: "destructive" });
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("/api/whatsapp/connection", "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/whatsapp/connection"] });
      toast({ title: "WhatsApp desconectado" });
    },
    onError: () => {
      toast({ title: "Erro", description: "Não foi possível desconectar.", variant: "destructive" });
    },
  });

  const handleEmbeddedLogin = () => {
    if (!window.FB || !FB_CONFIG_ID) return;
    window.FB.login(
      (response: any) => {
        if (response.authResponse?.code) {
          embeddedSignupMutation.mutate(response.authResponse.code);
        }
      },
      {
        config_id: FB_CONFIG_ID,
        response_type: "code",
        override_default_response_type: true,
        extras: { setup: {}, sessionInfoVersion: "3" },
      }
    );
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    manualConnectMutation.mutate(manualForm);
  };

  const isConnected = connection?.status === "connected";

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl gradient-bg flex items-center justify-center shrink-0">
          <MessageCircle className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">Conexão do WhatsApp</h1>
          <p className="text-muted-foreground">Conecte o número da sua operação para usar o CRM de WhatsApp</p>
        </div>
      </div>

      <Card className="glassmorphism neon-border">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5" />
              Status da conexão
            </CardTitle>
            <CardDescription>
              {isLoading
                ? "Carregando..."
                : isConnected
                ? `Conectado via ${connection?.connectionType === "embedded_signup" ? "Login Incorporado" : "conexão manual"}`
                : "Nenhum número conectado"}
            </CardDescription>
          </div>
          <Badge className={isConnected ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300" : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"}>
            {isConnected ? "Conectado" : "Desconectado"}
          </Badge>
        </CardHeader>
        {isConnected && (
          <CardContent className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <ShieldCheck className="w-4 h-4 text-green-600" />
              <span>{connection?.displayPhoneNumber || "Número não informado pela Meta"}</span>
            </div>
            <Button
              variant="outline"
              className="text-red-600 border-red-200 hover:bg-red-50 dark:border-red-900/40 dark:hover:bg-red-900/20"
              onClick={() => disconnectMutation.mutate()}
              disabled={disconnectMutation.isPending}
            >
              <Unlink className="w-4 h-4 mr-2" />
              Desconectar
            </Button>
          </CardContent>
        )}
      </Card>

      <Card className="glassmorphism neon-border">
        <CardContent className="pt-6">
          <Tabs defaultValue="embedded">
            <TabsList>
              <TabsTrigger value="embedded">Login Incorporado</TabsTrigger>
              <TabsTrigger value="manual">Conexão Manual</TabsTrigger>
            </TabsList>

            <TabsContent value="embedded" className="space-y-4 pt-4">
              <p className="text-sm text-muted-foreground">
                Conecte seu número diretamente pelo fluxo oficial da Meta (Facebook Login for Business).
              </p>
              {!FB_APP_ID || !FB_CONFIG_ID ? (
                <p className="text-sm text-red-500">
                  Login Incorporado não configurado (faltam VITE_WHATSAPP_APP_ID / VITE_WHATSAPP_CONFIG_ID).
                </p>
              ) : (
                <Button onClick={handleEmbeddedLogin} disabled={!sdkReady || embeddedSignupMutation.isPending} className="gradient-bg text-white hover:opacity-90 border-0">
                  {embeddedSignupMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <MessageCircle className="w-4 h-4 mr-2" />
                  )}
                  Conectar com o WhatsApp
                </Button>
              )}
            </TabsContent>

            <TabsContent value="manual" className="pt-4">
              <form onSubmit={handleManualSubmit} className="space-y-5 max-w-2xl">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phoneNumberId">Phone Number ID</Label>
                    <Input
                      id="phoneNumberId"
                      value={manualForm.phoneNumberId}
                      onChange={(e) => setManualForm({ ...manualForm, phoneNumberId: e.target.value })}
                      placeholder="Ex: 123456789012345"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="verifyToken">Verify Token</Label>
                    <Input
                      id="verifyToken"
                      value={manualForm.verifyToken}
                      onChange={(e) => setManualForm({ ...manualForm, verifyToken: e.target.value })}
                      placeholder="Token de verificação do webhook"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="accessToken">Access Token</Label>
                  <Input
                    id="accessToken"
                    type="password"
                    value={manualForm.accessToken}
                    onChange={(e) => setManualForm({ ...manualForm, accessToken: e.target.value })}
                    placeholder="Token permanente do WABA"
                    required
                  />
                </div>
                <Button type="submit" disabled={manualConnectMutation.isPending} className="gradient-bg text-white hover:opacity-90 border-0">
                  {manualConnectMutation.isPending ? "Conectando..." : "Salvar conexão"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
