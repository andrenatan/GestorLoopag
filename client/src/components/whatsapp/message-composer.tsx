import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Edit3, Eye, Save, Plus, Smartphone } from "lucide-react";
import type { MessageTemplate } from "@shared/schema";

interface MessageComposerProps {
  selectedTemplateId?: number;
  onTemplateChange?: (templateId: number) => void;
}

const templateTypes = [
  { value: "vence_3_dias", label: "Vencimento - 3 dias" },
  { value: "vence_hoje", label: "Vencimento - Hoje" },
  { value: "vencido", label: "Vencimento - Atrasado" },
  { value: "novo_cliente", label: "Novo cliente" },
];

const sampleVariables = {
  nome: "João Silva",
  valor: "R$ 89,90",
  vencimento: "15/12/2024",
  plano: "IPTV Premium",
  sistema: "IPTV - Geral",
};

export function MessageComposer({ selectedTemplateId, onTemplateChange }: MessageComposerProps) {
  const [editingTemplate, setEditingTemplate] = useState<MessageTemplate | null>(null);
  const [messageContent, setMessageContent] = useState("");
  const [templateName, setTemplateName] = useState("");
  const [templateType, setTemplateType] = useState<string>("");
  const [isCreating, setIsCreating] = useState(false);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: templates = [] } = useQuery({
    queryKey: ["/api/templates"],
    queryFn: api.getMessageTemplates,
  });

  const createTemplateMutation = useMutation({
    mutationFn: (data: { name: string; type: string; content: string }) => 
      api.createMessageTemplate({
        ...data,
        type: data.type as any,
        isActive: true,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/templates"] });
      toast({
        title: "Template criado",
        description: "Template de mensagem foi criado com sucesso.",
      });
      setIsCreating(false);
      setTemplateName("");
      setTemplateType("");
      setMessageContent("");
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível criar o template.",
        variant: "destructive",
      });
    },
  });

  const updateTemplateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<MessageTemplate> }) =>
      api.updateMessageTemplate(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/templates"] });
      toast({
        title: "Template atualizado",
        description: "Template foi atualizado com sucesso.",
      });
      setEditingTemplate(null);
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o template.",
        variant: "destructive",
      });
    },
  });

  // Load selected template
  useEffect(() => {
    if (selectedTemplateId) {
      const template = templates.find((t: MessageTemplate) => t.id === selectedTemplateId);
      if (template) {
        setMessageContent(template.content);
        setEditingTemplate(template);
      }
    }
  }, [selectedTemplateId, templates]);

  const generatePreview = (content: string) => {
    let preview = content;
    Object.entries(sampleVariables).forEach(([key, value]) => {
      preview = preview.replace(new RegExp(`{${key}}`, 'g'), value);
    });
    return preview;
  };

  const handleSaveTemplate = () => {
    if (isCreating) {
      if (!templateName || !templateType || !messageContent) {
        toast({
          title: "Erro",
          description: "Preencha todos os campos obrigatórios.",
          variant: "destructive",
        });
        return;
      }
      createTemplateMutation.mutate({
        name: templateName,
        type: templateType,
        content: messageContent,
      });
    } else if (editingTemplate) {
      updateTemplateMutation.mutate({
        id: editingTemplate.id,
        data: { content: messageContent },
      });
    }
  };

  const handleCreateNew = () => {
    setIsCreating(true);
    setEditingTemplate(null);
    setMessageContent("");
    setTemplateName("");
    setTemplateType("");
  };

  const handleSelectTemplate = (templateId: string) => {
    const template = templates.find((t: MessageTemplate) => t.id === parseInt(templateId));
    if (template) {
      setMessageContent(template.content);
      setEditingTemplate(template);
      setIsCreating(false);
      onTemplateChange?.(template.id);
    }
  };

  return (
    <Card className="glassmorphism neon-border">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <Edit3 className="w-5 h-5 text-blue-500" />
            <span>Template de Mensagem</span>
          </CardTitle>
          <Button size="sm" variant="outline" onClick={handleCreateNew}>
            <Plus className="w-4 h-4 mr-2" />
            Novo Template
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Template Selection */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Selecionar Template</label>
          <Select onValueChange={handleSelectTemplate} value={editingTemplate?.id.toString()}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione um template" />
            </SelectTrigger>
            <SelectContent>
              {templates.map((template: MessageTemplate) => (
                <SelectItem key={template.id} value={template.id.toString()}>
                  <div className="flex items-center space-x-2">
                    <span>{template.name}</span>
                    <Badge variant="outline" className="text-xs">
                      {templateTypes.find(t => t.value === template.type)?.label}
                    </Badge>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* New Template Fields */}
        {isCreating && (
          <>
            <Separator />
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Nome do Template</label>
                  <Input
                    placeholder="Nome do template"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Tipo</label>
                  <Select value={templateType} onValueChange={setTemplateType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      {templateTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </>
        )}

        <Separator />

        {/* Message Editor */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Conteúdo da Mensagem</label>
          <Textarea
            placeholder="Digite sua mensagem aqui. Use {nome}, {valor}, {vencimento}, {plano}, {sistema} para variáveis dinâmicas."
            value={messageContent}
            onChange={(e) => setMessageContent(e.target.value)}
            rows={6}
            className="resize-none"
          />
        </div>

        {/* Variables Helper */}
        <div className="bg-muted/50 p-3 rounded-lg">
          <p className="text-sm font-medium mb-2">Variáveis disponíveis:</p>
          <div className="flex flex-wrap gap-2">
            {Object.keys(sampleVariables).map((variable) => (
              <Badge key={variable} variant="outline" className="text-xs">
                {`{${variable}}`}
              </Badge>
            ))}
          </div>
        </div>

        {/* Preview */}
        {messageContent && (
          <>
            <Separator />
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Eye className="w-4 h-4 text-green-500" />
                <label className="text-sm font-medium">Preview da Mensagem</label>
              </div>
              <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
                {/* WhatsApp Style Preview */}
                <div className="bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm border max-w-sm">
                  <div className="flex items-center space-x-2 mb-2">
                    <Smartphone className="w-4 h-4 text-green-500" />
                    <span className="text-sm font-medium text-green-600">WhatsApp Business</span>
                  </div>
                  <div className="whitespace-pre-wrap text-sm leading-relaxed">
                    {generatePreview(messageContent)}
                  </div>
                  <div className="flex justify-end mt-2">
                    <span className="text-xs text-muted-foreground">
                      {new Date().toLocaleTimeString('pt-BR', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Actions */}
        <div className="flex justify-end space-x-2">
          {(isCreating || editingTemplate) && (
            <Button 
              onClick={handleSaveTemplate}
              disabled={createTemplateMutation.isPending || updateTemplateMutation.isPending}
            >
              <Save className="w-4 h-4 mr-2" />
              {isCreating ? "Criar Template" : "Salvar Alterações"}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
