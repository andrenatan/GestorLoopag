import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Send, Clock, Users, RefreshCw, Power, MessageSquare, ChevronDown, ChevronRight } from "lucide-react";
import type { WhatsappInstance, MessageTemplate, AutomationConfig } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";

type AutomationType = "cobrancas" | "reativacao" | "novosClientes";

interface AutomationSectionState {
  active: boolean;
  time: string;
  items: Array<{
    id: string;
    name: string;
    active: boolean;
    templateId: number | null;
    clientCount: number;
  }>;
}

export default function Billing() {
  const [selectedWhatsApp, setSelectedWhatsApp] = useState<number | null>(null);
  const [expandedSection, setExpandedSection] = useState<AutomationType | null>(null);
  const { toast } = useToast();

  // Local state for automation configurations
  const [automations, setAutomations] = useState<Record<AutomationType, AutomationSectionState>>({
    cobrancas: {
      active: false,
      time: '09:30',
      items: [
        { id: '3days', name: 'Vence em 3 dias', active: false, templateId: null, clientCount: 0 },
        { id: '1day', name: 'Vence em 1 dia', active: false, templateId: null, clientCount: 0 },
        { id: 'today', name: 'Vence Hoje', active: false, templateId: null, clientCount: 0 }
      ]
    },
    reativacao: {
      active: false,
      time: '19:30',
      items: [
        { id: '1day', name: 'Vencidos à 1 dia', active: false, templateId: null, clientCount: 0 },
        { id: '7days', name: 'Vencidos à 7 dias', active: false, templateId: null, clientCount: 0 },
        { id: '30days', name: 'Vencidos à 30 dias', active: false, templateId: null, clientCount: 0 }
      ]
    },
    novosClientes: {
      active: false,
      time: '10:00',
      items: [
        { id: '7days', name: 'Ativos há 7 dias', active: false, templateId: null, clientCount: 0 }
      ]
    }
  });

  // Fetch WhatsApp instances
  const { data: instances = [] } = useQuery<WhatsappInstance[]>({
    queryKey: ["/api/whatsapp/instances"]
  });

  // Fetch message templates
  const { data: templates = [] } = useQuery<MessageTemplate[]>({
    queryKey: ["/api/templates"]
  });

  // Fetch automation configs
  const { data: automationConfigs = [] } = useQuery<AutomationConfig[]>({
    queryKey: ["/api/automation-configs"]
  });

  // Load automation configs into local state
  useEffect(() => {
    if (automationConfigs.length > 0) {
      const newAutomations = { ...automations };
      
      automationConfigs.forEach((config) => {
        if (newAutomations[config.automationType]) {
          newAutomations[config.automationType] = {
            active: config.isActive,
            time: config.scheduledTime,
            items: config.subItems.map(item => ({
              ...item,
              clientCount: item.clientCount || 0
            }))
          };
          
          if (config.whatsappInstanceId && !selectedWhatsApp) {
            setSelectedWhatsApp(config.whatsappInstanceId);
          }
        }
      });
      
      setAutomations(newAutomations);
    }
  }, [automationConfigs]);

  // Update automation config mutation
  const updateConfigMutation = useMutation({
    mutationFn: async (data: { type: AutomationType; config: Partial<AutomationConfig> }) => {
      const existing = automationConfigs.find(c => c.automationType === data.type);
      
      if (existing) {
        return apiRequest("PUT", `/api/automation-configs/${data.type}`, data.config);
      } else {
        return apiRequest("POST", "/api/automation-configs", {
          automationType: data.type,
          webhookUrl: getWebhookUrl(data.type),
          scheduledTime: automations[data.type].time,
          ...data.config
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/automation-configs"] });
    },
    onError: (error, variables) => {
      // Rollback state on error
      queryClient.invalidateQueries({ queryKey: ["/api/automation-configs"] });
      toast({
        title: "Erro ao salvar configuração",
        description: `Não foi possível atualizar a automação. Tente novamente.`,
        variant: "destructive"
      });
    }
  });

  const getWebhookUrl = (type: AutomationType): string => {
    const webhooks = {
      cobrancas: "https://webhook.dev.userxai.online/webhook/send_messages",
      reativacao: "https://webhook.dev.userxai.online/webhook/gestor_loopag_reativacao",
      novosClientes: "https://webhook.dev.userxai.online/webhook/gestor_loopag_ativos_7dias"
    };
    return webhooks[type];
  };

  const toggleSection = (section: AutomationType) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const toggleAutomation = async (section: AutomationType) => {
    const newActive = !automations[section].active;
    
    setAutomations(prev => ({
      ...prev,
      [section]: { ...prev[section], active: newActive }
    }));

    await updateConfigMutation.mutateAsync({
      type: section,
      config: {
        isActive: newActive,
        whatsappInstanceId: selectedWhatsApp,
        subItems: automations[section].items
      }
    });

    toast({
      title: newActive ? "Automação Ativada" : "Automação Desativada",
      description: `A automação de ${getSectionTitle(section)} foi ${newActive ? 'ativada' : 'desativada'}.`
    });
  };

  const toggleItem = async (section: AutomationType, itemId: string) => {
    setAutomations(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        items: prev[section].items.map(item =>
          item.id === itemId ? { ...item, active: !item.active } : item
        )
      }
    }));

    const updatedItems = automations[section].items.map(item =>
      item.id === itemId ? { ...item, active: !item.active } : item
    );

    await updateConfigMutation.mutateAsync({
      type: section,
      config: {
        subItems: updatedItems,
        whatsappInstanceId: selectedWhatsApp
      }
    });
  };

  const updateTemplate = async (section: AutomationType, itemId: string, templateId: number) => {
    setAutomations(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        items: prev[section].items.map(item =>
          item.id === itemId ? { ...item, templateId } : item
        )
      }
    }));

    const updatedItems = automations[section].items.map(item =>
      item.id === itemId ? { ...item, templateId } : item
    );

    await updateConfigMutation.mutateAsync({
      type: section,
      config: {
        subItems: updatedItems,
        whatsappInstanceId: selectedWhatsApp
      }
    });
  };

  const getSectionTitle = (section: AutomationType): string => {
    const titles = {
      cobrancas: "Cobranças Automáticas",
      reativacao: "Campanhas de Reativação",
      novosClientes: "Novos Clientes"
    };
    return titles[section];
  };

  const getSectionDescription = (section: AutomationType): string => {
    const descriptions = {
      cobrancas: `Envio automático diário às ${automations[section].time}`,
      reativacao: `Envio automático diário às ${automations[section].time}`,
      novosClientes: `Envio automático diário às ${automations[section].time}`
    };
    return descriptions[section];
  };

  const getSectionIcon = (section: AutomationType) => {
    const icons = {
      cobrancas: Clock,
      reativacao: RefreshCw,
      novosClientes: Users
    };
    return icons[section];
  };

  const AutomationSection = ({ section }: { section: AutomationType }) => {
    const data = automations[section];
    const isExpanded = expandedSection === section;
    const Icon = getSectionIcon(section);

    return (
      <div className="bg-card rounded-lg border overflow-hidden" data-testid={`section-${section}`}>
        {/* Header */}
        <div className="p-5 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => toggleSection(section)}
                className="text-muted-foreground hover:text-foreground transition-colors"
                data-testid={`button-toggle-${section}`}
              >
                {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
              </button>

              <div className="flex items-center gap-3">
                <div className="p-2 bg-muted rounded-lg">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium">{getSectionTitle(section)}</h3>
                  <p className="text-sm text-muted-foreground">{getSectionDescription(section)}</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="w-4 h-4" />
                <span>{data.time}</span>
              </div>

              <Button
                onClick={() => toggleAutomation(section)}
                variant={data.active ? "default" : "outline"}
                size="sm"
                data-testid={`button-activate-${section}`}
              >
                <Power className="w-4 h-4 mr-2" />
                {data.active ? 'Ativo' : 'Inativo'}
              </Button>
            </div>
          </div>
        </div>

        {/* Expanded Content */}
        {isExpanded && (
          <div className="p-5 space-y-3 bg-muted/30">
            {data.items.map(item => (
              <div
                key={item.id}
                className="bg-card rounded-lg border p-4"
                data-testid={`automation-item-${section}-${item.id}`}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${item.active ? 'bg-green-500' : 'bg-muted-foreground'}`} />
                    <span className="font-medium">{item.name}</span>
                    <span className="text-sm text-muted-foreground">({item.clientCount} clientes)</span>
                  </div>

                  <Button
                    onClick={() => toggleItem(section, item.id)}
                    variant={item.active ? "default" : "outline"}
                    size="sm"
                    data-testid={`button-toggle-item-${section}-${item.id}`}
                  >
                    {item.active ? 'Ativo' : 'Inativo'}
                  </Button>
                </div>

                <div className="flex items-center gap-3">
                  <MessageSquare className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <Select
                    value={item.templateId?.toString() || ""}
                    onValueChange={(value) => updateTemplate(section, item.id, parseInt(value))}
                  >
                    <SelectTrigger data-testid={`select-template-${section}-${item.id}`}>
                      <SelectValue placeholder="Selecione um template" />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.map(tpl => (
                        <SelectItem key={tpl.id} value={tpl.id.toString()}>
                          {tpl.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="border-b px-8 py-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold mb-1">Central de Automações</h1>
            <p className="text-muted-foreground text-sm">
              Gerencie instâncias WhatsApp e envie cobranças automatizadas
            </p>
          </div>
        </div>
      </div>

      <div className="p-8 space-y-6">
        {/* WhatsApp Instance Selection */}
        <Card className="glassmorphism neon-border">
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-muted rounded-lg">
                <MessageSquare className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <h2 className="font-medium">Conexão WhatsApp</h2>
                <p className="text-sm text-muted-foreground">Selecione a instância para envio das mensagens</p>
              </div>
            </div>

            <Select
              value={selectedWhatsApp?.toString() || ""}
              onValueChange={(value) => setSelectedWhatsApp(parseInt(value))}
            >
              <SelectTrigger data-testid="select-whatsapp-instance">
                <SelectValue placeholder="Selecione uma instância" />
              </SelectTrigger>
              <SelectContent>
                {instances.map(instance => (
                  <SelectItem key={instance.id} value={instance.id.toString()}>
                    {instance.name} - {instance.status === 'connected' ? '🟢 Online' : '🔴 Offline'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Automation Sections */}
        <div className="space-y-4">
          <AutomationSection section="cobrancas" />
          <AutomationSection section="reativacao" />
          <AutomationSection section="novosClientes" />
        </div>

        {/* Manual Dispatch */}
        <Card className="glassmorphism neon-border">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-muted rounded-lg">
                  <Send className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium">Disparo Manual</h3>
                  <p className="text-sm text-muted-foreground">
                    Envie mensagens para lista personalizada de clientes ativos
                  </p>
                </div>
              </div>
              <Button data-testid="button-create-dispatch">
                Criar Disparo
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold mb-1">0</div>
              <div className="text-sm text-muted-foreground">Mensagens Hoje</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold mb-1">
                {Object.values(automations).reduce((acc, auto) => acc + auto.items.filter(i => i.active).length, 0)}
              </div>
              <div className="text-sm text-muted-foreground">Automações Ativas</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold mb-1">0</div>
              <div className="text-sm text-muted-foreground">Fila de Envio</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold mb-1">--</div>
              <div className="text-sm text-muted-foreground">Taxa de Entrega</div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
