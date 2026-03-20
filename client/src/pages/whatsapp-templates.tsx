import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, Eye, X, ChevronDown, Copy } from "lucide-react";
import type { MessageTemplate } from "@shared/schema";

const VARIABLES = [
  { label: "Nome do cliente", value: "{{nome}}" },
  { label: "Número do cliente", value: "{{numero_cliente}}" },
  { label: "Telefone", value: "{{telefone}}" },
  { label: "Plano", value: "{{plano}}" },
  { label: "Valor", value: "{{valor}}" },
  { label: "Vencimento", value: "{{vencimento}}" },
  { label: "Usuário (login)", value: "{{usuario}}" },
  { label: "Senha", value: "{{senha}}" },
  { label: "Sistema", value: "{{sistema}}" },
];

const templateSchema = z.object({
  title: z.string().min(1, "Título obrigatório"),
  content: z.string().min(1, "Conteúdo obrigatório"),
  imageUrl: z.string().url("URL inválida").optional().or(z.literal("")),
  isActive: z.boolean().optional(),
});

type TemplateFormData = z.infer<typeof templateSchema>;

function insertVariable(
  ref: React.RefObject<HTMLTextAreaElement>,
  variable: string,
  setValue: (val: string) => void,
  currentValue: string
) {
  const el = ref.current;
  if (!el) {
    setValue(currentValue + variable);
    return;
  }
  const start = el.selectionStart ?? currentValue.length;
  const end = el.selectionEnd ?? currentValue.length;
  const newVal = currentValue.slice(0, start) + variable + currentValue.slice(end);
  setValue(newVal);
  requestAnimationFrame(() => {
    el.focus();
    el.setSelectionRange(start + variable.length, start + variable.length);
  });
}

function renderPreview(content: string): string {
  return content
    .replace(/{{nome}}/g, "João Silva")
    .replace(/{{numero_cliente}}/g, "0042")
    .replace(/{{telefone}}/g, "11 99999-0000")
    .replace(/{{plano}}/g, "Mensal")
    .replace(/{{valor}}/g, "R$ 60,00")
    .replace(/{{vencimento}}/g, "31/03/2026")
    .replace(/{{usuario}}/g, "joaosilva")
    .replace(/{{senha}}/g, "senha123")
    .replace(/{{sistema}}/g, "Orca Player");
}

interface TemplateFormProps {
  template?: MessageTemplate | null;
  onClose: () => void;
}

function TemplateForm({ template, onClose }: TemplateFormProps) {
  const { toast } = useToast();
  const [showPreview, setShowPreview] = useState(false);
  const textAreaRef = { current: null as HTMLTextAreaElement | null };

  const form = useForm<TemplateFormData>({
    resolver: zodResolver(templateSchema),
    defaultValues: {
      title: template?.title ?? "",
      content: template?.content ?? "",
      imageUrl: template?.imageUrl ?? "",
      isActive: template?.isActive ?? true,
    },
  });

  const content = form.watch("content");

  const mutation = useMutation({
    mutationFn: (data: TemplateFormData) => {
      const body = { ...data, imageUrl: data.imageUrl || null };
      if (template) {
        return apiRequest("PUT", `/api/message-templates/${template.id}`, body);
      }
      return apiRequest("POST", "/api/message-templates", body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/message-templates"] });
      toast({ title: template ? "Template atualizado!" : "Template criado!" });
      onClose();
    },
    onError: (err: Error) => {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 backdrop-blur-sm pt-12 pb-4 px-4 overflow-y-auto">
      <div className="bg-[#0d1b2a] border border-[#1e2e3e] rounded-xl w-full max-w-2xl">
        {/* Modal header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1e2e3e]">
          <h2 className="text-white font-semibold">
            {template ? "Editar Template" : "Novo Template"}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form
          onSubmit={form.handleSubmit((d) => mutation.mutate(d))}
          className="p-6 space-y-5"
        >
          {/* Title */}
          <div>
            <label className="block text-sm text-slate-400 mb-1.5">Título</label>
            <input
              {...form.register("title")}
              placeholder="Ex: Cobrança de Vencimento"
              className="w-full bg-[#111c2a] border border-[#2a3a4a] rounded-lg px-3 py-2.5 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500"
            />
            {form.formState.errors.title && (
              <p className="text-red-400 text-xs mt-1">{form.formState.errors.title.message}</p>
            )}
          </div>

          {/* Variable buttons */}
          <div>
            <label className="block text-sm text-slate-400 mb-2">Inserir variável</label>
            <div className="flex flex-wrap gap-2">
              {VARIABLES.map((v) => (
                <button
                  key={v.value}
                  type="button"
                  onClick={() =>
                    insertVariable(
                      { current: document.getElementById("template-content") as HTMLTextAreaElement },
                      v.value,
                      (val) => form.setValue("content", val),
                      form.getValues("content")
                    )
                  }
                  className="bg-blue-600/20 hover:bg-blue-600/40 border border-blue-600/30 text-blue-300 text-xs px-2.5 py-1 rounded-md transition-colors font-mono"
                >
                  {v.label}
                </button>
              ))}
            </div>
          </div>

          {/* Content editor + preview toggle */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-sm text-slate-400">Mensagem</label>
              <button
                type="button"
                onClick={() => setShowPreview((p) => !p)}
                className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors"
              >
                <Eye className="w-3.5 h-3.5" />
                {showPreview ? "Editar" : "Visualizar"}
              </button>
            </div>

            {showPreview ? (
              <div className="bg-[#111c2a] border border-[#2a3a4a] rounded-lg px-3 py-3 min-h-[140px]">
                {renderPreview(content).split("\n").map((line, i) => (
                  <p key={i} className="text-slate-200 text-sm leading-relaxed">
                    {line || <br />}
                  </p>
                ))}
                <p className="text-slate-500 text-xs mt-3 border-t border-[#1e2e3e] pt-2">
                  Prévia com dados fictícios
                </p>
              </div>
            ) : (
              <textarea
                id="template-content"
                {...form.register("content")}
                rows={7}
                placeholder={"Olá {{nome}}, sua assinatura {{plano}} vence em {{vencimento}}.\nValor: {{valor}}\n\nAcesse com:\nUsuário: {{usuario}}\nSenha: {{senha}}"}
                className="w-full bg-[#111c2a] border border-[#2a3a4a] rounded-lg px-3 py-2.5 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500 font-mono resize-none"
              />
            )}
            {form.formState.errors.content && (
              <p className="text-red-400 text-xs mt-1">{form.formState.errors.content.message}</p>
            )}
          </div>

          {/* Image URL (optional) */}
          <div>
            <label className="block text-sm text-slate-400 mb-1.5">URL da imagem (opcional)</label>
            <input
              {...form.register("imageUrl")}
              placeholder="https://..."
              className="w-full bg-[#111c2a] border border-[#2a3a4a] rounded-lg px-3 py-2.5 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white font-medium text-sm px-5 py-2 rounded-lg transition-colors"
            >
              {mutation.isPending ? "Salvando..." : "Salvar template"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function WhatsAppTemplates() {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<MessageTemplate | null>(null);

  const { data: templates = [], isLoading } = useQuery<MessageTemplate[]>({
    queryKey: ["/api/message-templates"],
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/message-templates/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/message-templates"] });
      toast({ title: "Template excluído." });
    },
    onError: (err: Error) => {
      toast({ title: "Erro ao excluir", description: err.message, variant: "destructive" });
    },
  });

  const openCreate = () => {
    setEditingTemplate(null);
    setShowForm(true);
  };

  const openEdit = (t: MessageTemplate) => {
    setEditingTemplate(t);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingTemplate(null);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Templates de Mensagem</h1>
          <p className="text-slate-400 text-sm">
            Crie templates com variáveis dinâmicas para cobranças e notificações
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm px-4 py-2.5 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Novo Template
        </button>
      </div>

      {/* Variables reference */}
      <div className="bg-[#0d1b2a] border border-[#1e2e3e] rounded-xl p-4">
        <p className="text-slate-300 text-sm font-medium mb-3">Variáveis disponíveis</p>
        <div className="flex flex-wrap gap-2">
          {VARIABLES.map((v) => (
            <div key={v.value} className="flex items-center gap-1.5 bg-[#111c2a] border border-[#2a3a4a] rounded-md px-2.5 py-1">
              <code className="text-blue-300 text-xs">{v.value}</code>
              <span className="text-slate-500 text-xs">→ {v.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Templates list */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-[#0d1b2a] border border-[#1e2e3e] rounded-xl h-24 animate-pulse" />
          ))}
        </div>
      ) : templates.length === 0 ? (
        <div className="bg-[#0d1b2a] border border-[#1e2e3e] rounded-xl p-12 text-center">
          <p className="text-slate-400">Nenhum template criado ainda.</p>
          <button
            onClick={openCreate}
            className="mt-4 text-blue-400 hover:text-blue-300 text-sm underline"
          >
            Criar primeiro template
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {templates.map((t) => (
            <div
              key={t.id}
              className="bg-[#0d1b2a] border border-[#1e2e3e] rounded-xl p-4 flex items-start gap-4"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-white font-medium text-sm">{t.title}</h3>
                  {t.isActive ? (
                    <span className="bg-green-500/20 text-green-400 text-xs px-2 py-0.5 rounded-full">Ativo</span>
                  ) : (
                    <span className="bg-slate-700/50 text-slate-500 text-xs px-2 py-0.5 rounded-full">Inativo</span>
                  )}
                </div>
                <p className="text-slate-400 text-xs leading-relaxed line-clamp-2 font-mono">
                  {t.content}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => openEdit(t)}
                  className="p-2 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
                  title="Editar"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    if (confirm("Excluir este template?")) deleteMutation.mutate(t.id);
                  }}
                  className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                  title="Excluir"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Form modal */}
      {showForm && (
        <TemplateForm template={editingTemplate} onClose={closeForm} />
      )}
    </div>
  );
}
