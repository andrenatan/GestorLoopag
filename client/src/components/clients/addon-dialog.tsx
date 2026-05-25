import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { PlusCircle } from "lucide-react";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import type { Client } from "@shared/schema";

function getBrasiliaDateString(): string {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const brasilia = new Date(utc + 3600000 * -3);
  return brasilia.toISOString().split("T")[0];
}

interface AddonDialogProps {
  client: Client;
  onClose: () => void;
}

export function AddonDialog({ client, onClose }: AddonDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [amount, setAmount] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [paymentDate, setPaymentDate] = useState<string>(getBrasiliaDateString());
  const [bumpClientValue, setBumpClientValue] = useState<boolean>(false);

  useEffect(() => {
    setAmount("");
    setDescription("");
    setPaymentDate(getBrasiliaDateString());
    setBumpClientValue(false);
  }, [client.id]);

  const mutation = useMutation({
    mutationFn: () => api.createClientAddon(client.id, {
      amount: amount.replace(",", "."),
      paymentDate,
      description: description.trim() || null,
      bumpClientValue,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({ title: "Adesão extra registrada." });
      onClose();
    },
    onError: (err: any) => {
      const msg = err?.message?.replace(/^\d+:\s*/, "") || "Erro ao registrar adesão.";
      let parsed = msg;
      try {
        const obj = JSON.parse(msg);
        if (obj?.message) parsed = obj.message;
      } catch {}
      toast({ title: "Erro ao registrar adesão.", description: parsed, variant: "destructive" });
    },
  });

  const handleConfirm = () => {
    if (!amount || Number(amount.replace(",", ".")) <= 0) {
      toast({ title: "Informe um valor válido.", variant: "destructive" });
      return;
    }
    if (!paymentDate) {
      toast({ title: "Informe a data do pagamento.", variant: "destructive" });
      return;
    }
    mutation.mutate();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-[#0f1e2e] border border-[#2a3a4a] rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-full bg-emerald-600/20 border border-emerald-500/40 flex items-center justify-center">
            <PlusCircle className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-white font-semibold text-lg">Adesão Extra</h2>
            <p className="text-slate-400 text-sm">{client.name}</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs text-slate-400 block mb-1.5">Valor (R$) *</label>
            <input
              type="text"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^\d,\.]/g, ""))}
              placeholder="Ex: 30,00"
              className="w-full bg-[#0d1b2a] border border-[#2a3a4a] text-slate-100 text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:border-emerald-500"
              data-testid="input-addon-amount"
            />
          </div>

          <div>
            <label className="text-xs text-slate-400 block mb-1.5">Descrição (opcional)</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder='Ex: "2ª tela", "TV do quarto"'
              maxLength={255}
              className="w-full bg-[#0d1b2a] border border-[#2a3a4a] text-slate-100 text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:border-emerald-500"
              data-testid="input-addon-description"
            />
          </div>

          <div>
            <label className="text-xs text-slate-400 block mb-1.5">Data do pagamento</label>
            <input
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              className="w-full bg-[#0d1b2a] border border-[#2a3a4a] text-slate-100 text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:border-emerald-500"
              data-testid="input-addon-date"
            />
          </div>

          <label className="flex items-start gap-3 cursor-pointer select-none bg-[#0d1b2a] border border-[#2a3a4a] rounded-lg px-3 py-2.5 hover:border-emerald-500/50 transition-colors">
            <input
              type="checkbox"
              checked={bumpClientValue}
              onChange={(e) => setBumpClientValue(e.target.checked)}
              className="mt-0.5 w-4 h-4 accent-emerald-500"
              data-testid="checkbox-addon-bump"
            />
            <div>
              <p className="text-slate-200 text-sm font-medium">Somar ao valor da renovação do cliente</p>
              <p className="text-slate-500 text-xs mt-0.5">
                Se marcado, o valor da renovação do cliente passa de R$ {parseFloat(String(client.value || 0)).toLocaleString("pt-BR", { minimumFractionDigits: 2 })} para R$ {(Number(client.value || 0) + Number(amount.replace(",", ".") || 0)).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}.
              </p>
            </div>
          </label>

          <p className="text-slate-500 text-xs bg-[#1a2d42]/50 border border-[#1a2d42] rounded-lg px-3 py-2">
            A adesão entra imediatamente no faturamento do dia. Não altera o vencimento atual do cliente.
          </p>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            disabled={mutation.isPending}
            className="flex-1 bg-[#1a2a3a] hover:bg-[#243548] text-slate-300 font-medium py-2.5 rounded-lg transition-colors text-sm border border-[#2a3a4a]"
            data-testid="button-addon-cancel"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={mutation.isPending}
            className="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-lg transition-colors text-sm"
            data-testid="button-addon-confirm"
          >
            {mutation.isPending ? "Registrando..." : "Confirmar adesão"}
          </button>
        </div>
      </div>
    </div>
  );
}
