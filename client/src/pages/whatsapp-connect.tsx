import { useState, useEffect, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Smartphone, Wifi, WifiOff, RefreshCw, LogOut, QrCode } from "lucide-react";

interface BaileysStatus {
  status: "disconnected" | "connecting" | "connected";
  qrCode: string | null;
  phoneNumber: string | null;
  profilePictureUrl: string | null;
}

async function fetchStatus(): Promise<BaileysStatus> {
  const res = await apiRequest("/api/baileys/status", "GET");
  return res.json();
}

export default function WhatsAppConnect() {
  const [status, setStatus] = useState<BaileysStatus>({
    status: "disconnected",
    qrCode: null,
    phoneNumber: null,
    profilePictureUrl: null,
  });
  const [loading, setLoading] = useState(true);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { toast } = useToast();

  const startPolling = () => {
    if (pollRef.current) return;
    pollRef.current = setInterval(async () => {
      try {
        const s = await fetchStatus();
        setStatus(s);
        if (s.status !== "connecting") stopPolling();
      } catch {
      }
    }, 2500);
  };

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  useEffect(() => {
    fetchStatus()
      .then((s) => {
        setStatus(s);
        if (s.status === "connecting") startPolling();
      })
      .catch(() => {})
      .finally(() => setLoading(false));
    return () => stopPolling();
  }, []);

  const connectMutation = useMutation({
    mutationFn: () => apiRequest("/api/baileys/connect", "POST"),
    onSuccess: () => {
      toast({ title: "Iniciando conexão...", description: "Aguarde o QR code aparecer." });
      setStatus((prev) => ({ ...prev, status: "connecting" }));
      startPolling();
    },
    onError: (err: Error) => {
      toast({ title: "Erro ao conectar", description: err.message, variant: "destructive" });
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: () => apiRequest("/api/baileys/disconnect", "POST"),
    onSuccess: () => {
      stopPolling();
      setStatus({ status: "disconnected", qrCode: null, phoneNumber: null, profilePictureUrl: null });
      toast({ title: "WhatsApp desconectado." });
    },
    onError: (err: Error) => {
      toast({ title: "Erro ao desconectar", description: err.message, variant: "destructive" });
    },
  });

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-64">
        <RefreshCw className="w-6 h-6 text-slate-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Conectar WhatsApp</h1>
        <p className="text-slate-400 text-sm">Conecte seu número via QR Code usando a API Baileys</p>
      </div>

      {/* Status card */}
      <div className="bg-[#111c2a] border border-[#1e2e3e] rounded-xl p-6 max-w-xl">

        {/* Connected state */}
        {status.status === "connected" && (
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              {status.profilePictureUrl ? (
                <img
                  src={status.profilePictureUrl}
                  alt="Foto de perfil"
                  className="w-14 h-14 rounded-full border-2 border-green-500 object-cover"
                />
              ) : (
                <div className="w-14 h-14 rounded-full bg-green-500/20 border-2 border-green-500 flex items-center justify-center">
                  <Wifi className="w-7 h-7 text-green-400" />
                </div>
              )}
              <div>
                <p className="text-green-400 font-semibold text-lg">Conectado</p>
                {status.phoneNumber && (
                  <p className="text-slate-400 text-sm">+{status.phoneNumber}</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/30 rounded-lg px-4 py-3">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-green-300 text-sm">WhatsApp ativo e pronto para enviar mensagens</span>
            </div>

            <button
              onClick={() => disconnectMutation.mutate()}
              disabled={disconnectMutation.isPending}
              className="flex items-center gap-2 bg-red-600/20 hover:bg-red-600/30 border border-red-600/40 text-red-400 hover:text-red-300 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
            >
              <LogOut className="w-4 h-4" />
              {disconnectMutation.isPending ? "Desconectando..." : "Desconectar"}
            </button>
          </div>
        )}

        {/* Connecting state – waiting for QR scan */}
        {status.status === "connecting" && (
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <RefreshCw className="w-5 h-5 text-yellow-400 animate-spin" />
              <span className="text-yellow-400 font-semibold">Aguardando escaneamento...</span>
            </div>

            {status.qrCode ? (
              <>
                <div className="bg-white rounded-xl p-4 w-64 h-64 flex items-center justify-center mx-auto">
                  <img src={status.qrCode} alt="QR Code" className="w-full h-full object-contain" />
                </div>
                <div className="text-slate-300 text-sm space-y-1.5">
                  <p className="font-medium text-white">Como escanear:</p>
                  <ol className="list-decimal list-inside space-y-1 text-slate-400">
                    <li>Abra o WhatsApp no celular</li>
                    <li>Vá em <strong className="text-slate-300">Aparelhos conectados</strong></li>
                    <li>Toque em <strong className="text-slate-300">Conectar um aparelho</strong></li>
                    <li>Escaneie o QR code acima</li>
                  </ol>
                  <p className="text-xs text-slate-500 pt-1">O QR code atualiza automaticamente a cada 30s.</p>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center gap-3 py-6">
                <QrCode className="w-12 h-12 text-slate-500" />
                <p className="text-slate-400 text-sm">Gerando QR Code...</p>
              </div>
            )}

            <button
              onClick={() => disconnectMutation.mutate()}
              disabled={disconnectMutation.isPending}
              className="w-full flex items-center justify-center gap-2 bg-[#1a2a3a] hover:bg-[#243447] border border-[#2a3a4a] text-slate-400 hover:text-slate-200 px-4 py-2.5 rounded-lg text-sm transition-colors"
            >
              Cancelar
            </button>
          </div>
        )}

        {/* Disconnected state */}
        {status.status === "disconnected" && (
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-slate-700/50 border-2 border-slate-600 flex items-center justify-center">
                <WifiOff className="w-7 h-7 text-slate-500" />
              </div>
              <div>
                <p className="text-slate-300 font-semibold text-lg">Desconectado</p>
                <p className="text-slate-500 text-sm">Nenhum número conectado</p>
              </div>
            </div>

            <div className="bg-[#0d1b2a] border border-[#2a3a4a] rounded-lg px-4 py-3 text-slate-400 text-sm space-y-1">
              <p>Ao conectar, você poderá:</p>
              <ul className="list-disc list-inside text-slate-500 space-y-0.5">
                <li>Enviar mensagens de cobrança automáticas</li>
                <li>Usar templates personalizados com dados do cliente</li>
                <li>Disparar notificações de vencimento</li>
              </ul>
            </div>

            <button
              onClick={() => connectMutation.mutate()}
              disabled={connectMutation.isPending}
              className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 text-white font-semibold px-4 py-3 rounded-lg transition-colors disabled:opacity-60"
            >
              <Smartphone className="w-5 h-5" />
              {connectMutation.isPending ? "Iniciando..." : "Conectar WhatsApp"}
            </button>
          </div>
        )}
      </div>

      {/* Info card */}
      <div className="bg-[#0d1b2a] border border-[#1e2e3e] rounded-xl p-4 max-w-xl text-sm text-slate-400">
        <p className="text-slate-300 font-medium mb-1">Sobre a conexão Baileys</p>
        <p>
          A sessão é salva localmente no servidor. Após conectar uma vez, você não precisa escanear
          novamente — a conexão é restaurada automaticamente quando o servidor reinicia.
        </p>
      </div>
    </div>
  );
}
