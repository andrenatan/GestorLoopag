import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import { MessageCircle, Send, Loader2 } from "lucide-react";
import type { CrmContact, CrmMessage } from "@shared/schema";

interface ConversationListItem extends CrmContact {
  lastMessage: string | null;
  lastMessageDirection: "inbound" | "outbound" | null;
}

interface ConversationMessagesResponse {
  contact: CrmContact;
  messages: CrmMessage[];
}

function formatTime(date: string | Date | null) {
  if (!date) return "";
  return new Date(date).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export default function Crm() {
  const { toast } = useToast();
  const [selectedPhone, setSelectedPhone] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: conversations = [], isLoading: loadingConversations } = useQuery<ConversationListItem[]>({
    queryKey: ["/api/crm/conversations"],
    refetchInterval: 5000,
  });

  const { data: conversationData, isLoading: loadingMessages } = useQuery<ConversationMessagesResponse>({
    queryKey: ["/api/crm/conversations", selectedPhone, "messages"],
    queryFn: async () => {
      const res = await apiRequest(`/api/crm/conversations/${encodeURIComponent(selectedPhone!)}/messages`, "GET");
      return res.json();
    },
    enabled: !!selectedPhone,
    refetchInterval: 5000,
  });

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [conversationData?.messages?.length]);

  const sendMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("/api/crm/send", "POST", { phone: selectedPhone, content: draft });
      return res.json();
    },
    onSuccess: () => {
      setDraft("");
      queryClient.invalidateQueries({ queryKey: ["/api/crm/conversations", selectedPhone, "messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/crm/conversations"] });
    },
    onError: () => {
      toast({ title: "Erro", description: "Não foi possível enviar a mensagem.", variant: "destructive" });
    },
  });

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.trim() || !selectedPhone) return;
    sendMutation.mutate();
  };

  return (
    <div className="flex h-screen">
      <div className="w-80 border-r border-border flex flex-col">
        <div className="p-4 border-b border-border">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <MessageCircle className="w-5 h-5" />
            Conversas
          </h1>
        </div>
        <ScrollArea className="flex-1">
          {loadingConversations ? (
            <div className="p-4 text-sm text-muted-foreground">Carregando...</div>
          ) : conversations.length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground">Nenhuma conversa ainda</div>
          ) : (
            conversations.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedPhone(c.phone)}
                className={cn(
                  "w-full text-left px-4 py-3 border-b border-border/50 hover:bg-muted/50 transition-colors",
                  selectedPhone === c.phone && "bg-muted"
                )}
              >
                <div className="font-medium text-sm truncate">{c.displayName}</div>
                <div className="text-xs text-muted-foreground truncate">
                  {c.lastMessageDirection === "outbound" ? "Você: " : ""}
                  {c.lastMessage || "Sem mensagens"}
                </div>
                <div className="text-xs text-muted-foreground/70">{formatTime(c.lastMessageAt)}</div>
              </button>
            ))
          )}
        </ScrollArea>
      </div>

      <div className="flex-1 flex flex-col">
        {!selectedPhone ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            Selecione uma conversa para ver o histórico
          </div>
        ) : (
          <>
            <div className="p-4 border-b border-border">
              <div className="font-semibold">{conversationData?.contact?.displayName || selectedPhone}</div>
              <div className="text-xs text-muted-foreground">{selectedPhone}</div>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-2">
              {loadingMessages ? (
                <div className="text-sm text-muted-foreground">Carregando mensagens...</div>
              ) : (
                conversationData?.messages.map((m) => (
                  <div
                    key={m.id}
                    className={cn(
                      "max-w-[70%] rounded-lg px-3 py-2 text-sm",
                      m.direction === "outbound" ? "ml-auto bg-blue-600 text-white" : "mr-auto bg-muted"
                    )}
                  >
                    <div>{m.content}</div>
                    <div className={cn("text-[10px] mt-1", m.direction === "outbound" ? "text-blue-100" : "text-muted-foreground")}>
                      {formatTime(m.createdAt)}
                    </div>
                  </div>
                ))
              )}
            </div>

            <form onSubmit={handleSend} className="p-4 border-t border-border flex gap-2">
              <Input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Digite uma mensagem..."
                disabled={sendMutation.isPending}
              />
              <Button type="submit" disabled={sendMutation.isPending || !draft.trim()}>
                {sendMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
