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
      queryClient.invalidateQueries({ predicate: (q) => {
        const k = q.queryKey?.[0];
        return typeof k === "string" && k.startsWith("/api/dashboard/");
      } });
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
      <div className="bg-popover border border-border rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-full bg-green-500/15 border border-green-500/30 flex items-center justify-center">
            <PlusCircle className="w-5 h-5 text-green-500 dark:text-green-400" />
          </div>
          <div>
            <h2 className="text-foreground font-semibold text-lg">Adesão Extra</h2>
            <p className="text-muted-foreground text-sm">{client.name}</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs text-muted-foreground block mb-1.5">Valor (R$) *</label>
            <input
              type="text"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^\d,\.]/g, ""))}
              placeholder="Ex: 30,00"
              className="w-full bg-background border border-border text-foreground text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-green-500/40 focus:border-green-500"
              data-testid="input-addon-amount"
            />
          </div>

          <div>
            <label className="text-xs text-muted-foreground block mb-1.5">Descrição (opcional)</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder='Ex: "2ª tela", "TV do quarto"'
              maxLength={255}
              className="w-full bg-background border border-border text-foreground text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-green-500/40 focus:border-green-500"
              data-testid="input-addon-description"
            />
          </div>

          <div>
            <label className="text-xs text-muted-foreground block mb-1.5">Data do pagamento</label>
            <input
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              className="w-full bg-background border border-border text-foreground text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-green-500/40 focus:border-green-500"
              data-testid="input-addon-date"
            />
          </div>

          <label className="flex items-start gap-3 cursor-pointer select-none bg-background border border-border rounded-lg px-3 py-2.5 hover:border-green-500/50 transition-colors">
            <input
              type="checkbox"
              checked={bumpClientValue}
              onChange={(e) => setBumpClientValue(e.target.checked)}
              className="mt-0.5 w-4 h-4 accent-green-500"
              data-testid="checkbox-addon-bump"
            />
            <div>
              <p className="text-foreground text-sm font-medium">Somar ao valor da renovação do cliente</p>
              <p className="text-muted-foreground text-xs mt-0.5">
                Se marcado, o valor da renovação do cliente passa de R$ {parseFloat(String(client.value || 0)).toLocaleString("pt-BR", { minimumFractionDigits: 2 })} para R$ {(Number(client.value || 0) + Number(amount.replace(",", ".") || 0)).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}.
              </p>
            </div>
          </label>

          <p className="text-muted-foreground text-xs bg-muted/50 border border-border rounded-lg px-3 py-2">
            A adesão entra imediatamente no faturamento do dia. Não altera o vencimento atual do cliente.
          </p>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            disabled={mutation.isPending}
            className="flex-1 bg-secondary hover:bg-secondary/80 text-secondary-foreground font-medium py-2.5 rounded-lg transition-colors text-sm border border-border"
            data-testid="button-addon-cancel"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={mutation.isPending}
            className="flex-1 bg-green-600 hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-lg transition-colors text-sm"
            data-testid="button-addon-confirm"
          >
            {mutation.isPending ? "Registrando..." : "Confirmar adesão"}
          </button>
        </div>
      </div>
    </div>
  );
}
