import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Smile, Image as ImageIcon, Plus, Trash2 } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { MessageTemplate } from "@shared/schema";
import EmojiPicker, { type EmojiClickData } from "emoji-picker-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export default function Templates() {
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [uploading, setUploading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: templates, isLoading } = useQuery<MessageTemplate[]>({
    queryKey: ["/api/templates"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: { title: string; content: string; imageUrl?: string }) => {
      return await apiRequest("/api/templates", "POST", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/templates"] });
      toast({
        title: "Template criado",
        description: "Template criado com sucesso!",
      });
      setTitle("");
      setContent("");
      setImageUrl("");
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao criar template.",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest(`/api/templates/${id}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/templates"] });
      toast({
        title: "Template deletado",
        description: "Template deletado com sucesso!",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao deletar template.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !content) {
      toast({
        title: "Erro",
        description: "Título e conteúdo são obrigatórios.",
        variant: "destructive",
      });
      return;
    }
    createMutation.mutate({ 
      title, 
      content, 
      imageUrl: imageUrl || undefined 
    });
  };

  const insertVariable = (variable: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = content;
    const newText = text.substring(0, start) + variable + text.substring(end);
    
    setContent(newText);
    
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + variable.length, start + variable.length);
    }, 0);
  };

  const onEmojiClick = (emojiData: EmojiClickData) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = content;
    const newText = text.substring(0, start) + emojiData.emoji + text.substring(end);
    
    setContent(newText);
    setShowEmojiPicker(false);
    
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + emojiData.emoji.length, start + emojiData.emoji.length);
    }, 0);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: "Erro",
        description: "Por favor, selecione apenas imagens.",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Erro",
        description: "A imagem deve ter no máximo 5MB.",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = await response.json();
      setImageUrl(data.url);

      toast({
        title: "Sucesso",
        description: "Imagem enviada com sucesso!",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Falha ao enviar imagem.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950 p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent mb-2">
            Templates de Mensagens
          </h1>
          <p className="text-slate-400">
            Crie templates personalizados para enviar aos seus clientes
          </p>
        </div>

        <Card className="glass-card border-slate-700/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Criar Novo Template
            </CardTitle>
            <CardDescription>
              Use as variáveis para integração com n8n: name, value, expiry_date
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="title" className="text-slate-200">Título do Template</Label>
                <Input
                  id="title"
                  data-testid="input-template-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Lembrete de vencimento"
                  className="bg-slate-800/50 border-slate-700 text-slate-100"
                />
              </div>

              <div>
                <Label htmlFor="content" className="text-slate-200">Conteúdo da Mensagem</Label>
                <Textarea
                  id="content"
                  ref={textareaRef}
                  data-testid="textarea-template-content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Digite a mensagem aqui..."
                  rows={8}
                  className="bg-slate-800/50 border-slate-700 text-slate-100 resize-none"
                />
                <div className="flex flex-wrap gap-2 mt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    data-testid="button-insert-name"
                    onClick={() => insertVariable("{{ $json.name }}")}
                    className="bg-slate-800/50 border-slate-700 hover:bg-slate-700"
                  >
                    Inserir {"{nome}"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    data-testid="button-insert-value"
                    onClick={() => insertVariable("{{ $json.value }}")}
                    className="bg-slate-800/50 border-slate-700 hover:bg-slate-700"
                  >
                    Inserir {"{valor}"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    data-testid="button-insert-expiry-date"
                    onClick={() => insertVariable("{{ $json.expiry_date }}")}
                    className="bg-slate-800/50 border-slate-700 hover:bg-slate-700"
                  >
                    Inserir {"{vencimento}"}
                  </Button>
                  <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        data-testid="button-emoji-picker"
                        className="bg-slate-800/50 border-slate-700 hover:bg-slate-700"
                      >
                        <Smile className="w-4 h-4 mr-2" />
                        Emoji
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0 border-slate-700">
                      <EmojiPicker
                        onEmojiClick={onEmojiClick}
                        width="100%"
                        height="400px"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div>
                <Label htmlFor="image" className="text-slate-200">
                  Imagem (opcional)
                </Label>
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                      data-testid="input-template-image-file"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      data-testid="button-upload-image"
                      className="bg-slate-800/50 border-slate-700 hover:bg-slate-700"
                    >
                      <ImageIcon className="w-4 h-4 mr-2" />
                      {uploading ? "Enviando..." : imageUrl ? "Trocar Imagem" : "Selecionar Imagem"}
                    </Button>
                    {imageUrl && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setImageUrl("")}
                        data-testid="button-remove-image"
                        className="bg-slate-800/50 border-slate-700 hover:bg-red-500/20 hover:text-red-500"
                      >
                        Remover
                      </Button>
                    )}
                  </div>
                  {imageUrl && (
                    <div className="relative w-full max-w-xs">
                      <img
                        src={imageUrl}
                        alt="Preview"
                        className="w-full h-32 object-cover rounded-lg border border-slate-700"
                      />
                    </div>
                  )}
                </div>
              </div>

              <Button
                type="submit"
                data-testid="button-submit-template"
                disabled={createMutation.isPending}
                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
              >
                {createMutation.isPending ? "Criando..." : "Criar Template"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div>
          <h2 className="text-2xl font-bold text-slate-100 mb-4">Templates Criados</h2>
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-pulse text-slate-400">Carregando templates...</div>
            </div>
          ) : templates && templates.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {templates.map((template) => (
                <Card key={template.id} className="glass-card border-slate-700/50" data-testid={`card-template-${template.id}`}>
                  <CardHeader>
                    <CardTitle className="text-lg text-slate-100 flex items-center justify-between">
                      <span>{template.title}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        data-testid={`button-delete-${template.id}`}
                        onClick={() => deleteMutation.mutate(template.id)}
                        className="hover:bg-red-500/20 hover:text-red-500"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-slate-300 text-sm whitespace-pre-wrap break-words">
                      {template.content}
                    </p>
                    {template.imageUrl && (
                      <div className="mt-4">
                        <img
                          src={template.imageUrl}
                          alt="Template"
                          className="w-full h-32 object-cover rounded-lg"
                        />
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="glass-card border-slate-700/50">
              <CardContent className="py-12 text-center">
                <p className="text-slate-400">Nenhum template criado ainda</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
