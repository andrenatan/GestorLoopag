import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { ArrowLeft, MessageSquare, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";

type Category = "utility" | "marketing" | "authentication";
type ButtonType = "QUICK_REPLY" | "URL" | "PHONE_NUMBER";

interface TemplateButtonForm {
  type: ButtonType;
  text: string;
  url?: string;
  phoneNumber?: string;
}

interface ConnectionStatus {
  status: "connected" | "disconnected" | "error";
  displayPhoneNumber?: string | null;
}

const LANGUAGE_OPTIONS = [
  { value: "pt_BR", label: "Português (Brasil)" },
  { value: "en_US", label: "Inglês (EUA)" },
  { value: "es_ES", label: "Espanhol" },
];

const CATEGORY_OPTIONS: { value: Category; label: string; help: string }[] = [
  { value: "utility", label: "Utilitário", help: "Confirmações, alertas, atualizações de pedido" },
  { value: "marketing", label: "Marketing", help: "Promoções, ofertas, campanhas de reativação" },
  { value: "authentication", label: "Autenticação", help: "Códigos de verificação (OTP)" },
];

const PREVIEW_SAMPLES = ["João Silva", "15/07/2026", "IPTV Premium", "R$ 49,90"];

function renderPreviewText(text: string): string {
  return text.replace(/\{\{(\d+)\}\}/g, (_match, num) => {
    const idx = (parseInt(num, 10) - 1) % PREVIEW_SAMPLES.length;
    return PREVIEW_SAMPLES[idx] ?? `{{${num}}}`;
  });
}

export default function CrmTemplateNew() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const [name, setName] = useState("");
  const [language, setLanguage] = useState("pt_BR");
  const [category, setCategory] = useState<Category>("utility");

  const [showHeader, setShowHeader] = useState(false);
  const [headerText, setHeaderText] = useState("");
  const [showFooter, setShowFooter] = useState(false);
  const [footerText, setFooterText] = useState("");
  const [showButtons, setShowButtons] = useState(false);
  const [buttons, setButtons] = useState<TemplateButtonForm[]>([]);

  const [bodyText, setBodyText] = useState("");

  const { data: connection } = useQuery<ConnectionStatus>({
    queryKey: ["/api/whatsapp/connection"],
  });
  const hasConnection = connection?.status === "connected";

  const categoryInfo = CATEGORY_OPTIONS.find((c) => c.value === category);
  const nameError = name.length > 0 && !/^[a-z0-9_]+$/.test(name)
    ? "Use apenas letras minúsculas, números e underscore."
    : null;

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("/api/crm/templates", "POST", {
        name,
        category,
        language,
        headerText: showHeader && headerText ? headerText : undefined,
        bodyText,
        footerText: showFooter && footerText ? footerText : undefined,
        buttons: showButtons && buttons.length > 0 ? buttons : undefined,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/crm/templates"] });
      toast({ title: "Template enviado", description: "Enviado para aprovação da Meta (status: pendente)." });
      setLocation("/crm/templates");
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error?.message || "Não foi possível criar o template.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate();
  };

  const addButton = () => {
    if (buttons.length >= 3) return;
    setButtons([...buttons, { type: "QUICK_REPLY", text: "" }]);
  };
  const updateButton = (index: number, patch: Partial<TemplateButtonForm>) => {
    setButtons(buttons.map((b, i) => (i === index ? { ...b, ...patch } : b)));
  };
  const removeButton = (index: number) => {
    setButtons(buttons.filter((_, i) => i !== index));
  };

  const isEmpty = !headerText && !bodyText && !footerText && buttons.length === 0;

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/crm/templates" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </Link>
      </div>

      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center shrink-0">
          <MessageSquare className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Novo Template</h1>
          <p className="text-muted-foreground text-sm">
            Crie um template de mensagem para envio via WhatsApp, sujeito a aprovação da Meta
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 items-start">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label>WABA / Canal *</Label>
            <Select value={hasConnection ? "current" : ""} disabled>
              <SelectTrigger>
                <SelectValue placeholder={hasConnection ? undefined : "Nenhuma conexão de WhatsApp configurada"} />
              </SelectTrigger>
              <SelectContent>
                {hasConnection && (
                  <SelectItem value="current">{connection?.displayPhoneNumber || "Conexão ativa"}</SelectItem>
                )}
              </SelectContent>
            </Select>
            {!hasConnection && (
              <p className="text-xs text-destructive">
                Conecte um número em "Conexão" antes de criar templates.
              </p>
            )}
          </div>

          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground pt-1">
            Identificação
          </p>

          <div className="space-y-2">
            <Label htmlFor="name">Nome do template *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value.toLowerCase().replace(/\s+/g, "_"))}
              placeholder="ex: confirmacao_pedido"
              required
            />
            <p className={cn("text-xs", nameError ? "text-destructive" : "text-muted-foreground")}>
              {nameError || "Apenas letras minúsculas, números e underscores. Sem espaços."}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Idioma *</Label>
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LANGUAGE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Categoria *</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as Category)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORY_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <p className="text-xs text-muted-foreground -mt-3">
            {categoryInfo?.help} — categorizar incorretamente pode causar reprovação do template pela Meta.
          </p>

          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground pt-1">
            Conteúdo da mensagem
          </p>

          <div className="flex gap-2">
            <Button type="button" variant={showHeader ? "secondary" : "outline"} size="sm" onClick={() => setShowHeader(!showHeader)}>
              <Plus className="w-3 h-3 mr-1" />
              Cabeçalho
            </Button>
            <Button type="button" variant={showFooter ? "secondary" : "outline"} size="sm" onClick={() => setShowFooter(!showFooter)}>
              <Plus className="w-3 h-3 mr-1" />
              Rodapé
            </Button>
            <Button type="button" variant={showButtons ? "secondary" : "outline"} size="sm" onClick={() => setShowButtons(!showButtons)}>
              <Plus className="w-3 h-3 mr-1" />
              Botões
            </Button>
          </div>

          {showHeader && (
            <div className="space-y-2 border rounded-xl p-3">
              <Label htmlFor="headerText">Cabeçalho (texto)</Label>
              <Input
                id="headerText"
                value={headerText}
                onChange={(e) => setHeaderText(e.target.value)}
                placeholder="Ex: Confirmação de pedido"
                maxLength={60}
              />
              <p className="text-xs text-muted-foreground">
                Cabeçalho de mídia (imagem/documento) ainda não é suportado — só texto por enquanto.
              </p>
            </div>
          )}

          {showFooter && (
            <div className="space-y-2 border rounded-xl p-3">
              <Label htmlFor="footerText">Rodapé (texto curto)</Label>
              <Input
                id="footerText"
                value={footerText}
                onChange={(e) => setFooterText(e.target.value)}
                placeholder="Ex: Loopag - Gestão de Assinaturas"
                maxLength={60}
              />
            </div>
          )}

          {showButtons && (
            <div className="space-y-2 border rounded-xl p-3">
              <div className="flex items-center justify-between">
                <Label>Botões (até 3)</Label>
                <Button type="button" variant="outline" size="sm" onClick={addButton} disabled={buttons.length >= 3}>
                  <Plus className="w-3 h-3 mr-1" />
                  Adicionar
                </Button>
              </div>
              {buttons.map((button, index) => (
                <div key={index} className="flex gap-2 items-start">
                  <Select value={button.type} onValueChange={(v) => updateButton(index, { type: v as ButtonType })}>
                    <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="QUICK_REPLY">Texto</SelectItem>
                      <SelectItem value="URL">URL</SelectItem>
                      <SelectItem value="PHONE_NUMBER">Telefone</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    placeholder="Texto do botão"
                    value={button.text}
                    onChange={(e) => updateButton(index, { text: e.target.value })}
                    className="flex-1"
                  />
                  {button.type === "URL" && (
                    <Input
                      placeholder="https://..."
                      value={button.url || ""}
                      onChange={(e) => updateButton(index, { url: e.target.value })}
                      className="flex-1"
                    />
                  )}
                  {button.type === "PHONE_NUMBER" && (
                    <Input
                      placeholder="+55..."
                      value={button.phoneNumber || ""}
                      onChange={(e) => updateButton(index, { phoneNumber: e.target.value })}
                      className="flex-1"
                    />
                  )}
                  <Button type="button" variant="ghost" size="icon" className="rounded-full" onClick={() => removeButton(index)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="bodyText">Corpo *</Label>
            <Textarea
              id="bodyText"
              value={bodyText}
              onChange={(e) => setBodyText(e.target.value)}
              placeholder={"Corpo da mensagem. Use {{1}}, {{2}} para variáveis.\nEx: Olá {{1}}, seu pedido {{2}} foi confirmado!"}
              rows={6}
              required
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setLocation("/crm/templates")}>
              Cancelar
            </Button>
            <Button type="submit" disabled={createMutation.isPending || !!nameError}>
              {createMutation.isPending ? "Enviando..." : "Criar template"}
            </Button>
          </div>
        </form>

        <div className="lg:sticky lg:top-6 space-y-3">
          <p className="text-xs font-semibold tracking-wide text-muted-foreground">PREVIEW</p>
          <div className="mx-auto w-full max-w-[280px] rounded-[2rem] border-8 border-foreground/10 overflow-hidden shadow-xl">
            <div className="bg-emerald-600 text-white px-4 py-3 flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-white/20" />
              <div>
                <p className="text-sm font-semibold leading-tight">Sua empresa</p>
                <p className="text-[10px] text-white/80 leading-tight">online</p>
              </div>
            </div>
            <div className="bg-[#e5ddd5] dark:bg-[#0b141a] min-h-[360px] p-3 flex flex-col justify-end">
              {isEmpty ? (
                <p className="text-xs text-muted-foreground text-center m-auto px-6">
                  Preencha o template para ver o preview
                </p>
              ) : (
                <div className="bg-white dark:bg-[#202c33] rounded-lg rounded-tl-none p-3 shadow-sm max-w-[90%] space-y-1.5">
                  {showHeader && headerText && (
                    <p className="text-sm font-bold text-foreground">{headerText}</p>
                  )}
                  {bodyText && (
                    <p className="text-sm text-foreground whitespace-pre-wrap">{renderPreviewText(bodyText)}</p>
                  )}
                  {showFooter && footerText && (
                    <p className="text-xs text-muted-foreground">{footerText}</p>
                  )}
                  {showButtons && buttons.length > 0 && (
                    <div className="pt-1.5 mt-1.5 border-t border-border space-y-1">
                      {buttons.map((b, i) => (
                        <p key={i} className="text-xs text-blue-600 dark:text-blue-400 text-center py-1">
                          {b.text || "Botão"}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
