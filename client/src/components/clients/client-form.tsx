import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Upload, FileSpreadsheet, AlertTriangle } from "lucide-react";
import type { Client, System, ClientPlan } from "@shared/schema";
import { getBrasiliaStartOfDay, parseDateString } from "@/lib/timezone";

const FALLBACK_PLANS = [
  { name: "Mensal", value: "" },
  { name: "Trimestral", value: "" },
  { name: "Semestral", value: "" },
  { name: "Anual", value: "" },
];

const countries = [
  { name: "Brasil", code: "+55", flag: "🇧🇷" },
  { name: "Estados Unidos", code: "+1", flag: "🇺🇸" },
  { name: "Argentina", code: "+54", flag: "🇦🇷" },
  { name: "Chile", code: "+56", flag: "🇨🇱" },
  { name: "Colômbia", code: "+57", flag: "🇨🇴" },
  { name: "México", code: "+52", flag: "🇲🇽" },
  { name: "Peru", code: "+51", flag: "🇵🇪" },
  { name: "Uruguai", code: "+598", flag: "🇺🇾" },
  { name: "Paraguai", code: "+595", flag: "🇵🇾" },
  { name: "Portugal", code: "+351", flag: "🇵🇹" },
  { name: "Espanha", code: "+34", flag: "🇪🇸" },
  { name: "Itália", code: "+39", flag: "🇮🇹" },
  { name: "França", code: "+33", flag: "🇫🇷" },
  { name: "Alemanha", code: "+49", flag: "🇩🇪" },
  { name: "Reino Unido", code: "+44", flag: "🇬🇧" },
  { name: "Canadá", code: "+1", flag: "🇨🇦" },
];

const clientFormSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  phone: z.string().regex(/^\+\d{10,20}$/, "Informe um telefone válido com código do país"),
  username: z.string().min(1, "Usuário é obrigatório"),
  password: z.string().min(1, "Senha é obrigatória"),
  system: z.string().min(1, "Sistema é obrigatório"),
  subscriptionStatus: z.enum(["Ativa", "Inativa", "Aguardando", "Teste"]).default("Ativa"),
  paymentMethod: z.string().default("pix"),
  activationDate: z.string().min(1, "Data de ativação é obrigatória"),
  expiryDate: z.string().min(1, "Data de vencimento é obrigatória"),
  paymentStatus: z.enum(["Pago", "Vencido", "A Pagar"]).default("Pago"),
  plan: z.string().min(1, "Plano é obrigatório"),
  value: z.string().min(1, "Valor é obrigatório"),
  referralSource: z.string().optional(),
  referredById: z.number().optional(),
  notes: z.string().optional(),
});

type ClientFormData = z.infer<typeof clientFormSchema>;

interface ClientFormProps {
  initialData?: Client;
  onSubmit: (data: ClientFormData) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

const paymentMethodOptions = [
  { id: "pix", label: "PIX", color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300" },
  { id: "cartao", label: "Cartão", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300" },
];

export function ClientForm({ initialData, onSubmit, onCancel, isLoading = false }: ClientFormProps) {
  const [userId, setUserId] = useState<number>(1);
  const [daysToExpiry, setDaysToExpiry] = useState<number>(0);
  const [countryCode, setCountryCode] = useState<string>("+55");
  const [phoneNumber, setPhoneNumber] = useState<string>("");
  
  const { data: systems = [], isLoading: systemsLoading } = useQuery<System[]>({
    queryKey: ["/api/systems"],
  });

  const { data: clientPlans = [] } = useQuery<ClientPlan[]>({
    queryKey: ["/api/client-plans"],
  });

  const planOptions = clientPlans.length > 0
    ? clientPlans.map((p) => ({ name: p.name, value: String(p.value) }))
    : FALLBACK_PLANS;

  const handlePlanChange = (planName: string, onChange: (val: string) => void) => {
    onChange(planName);
    const selected = clientPlans.find((p) => p.name === planName);
    if (selected) {
      form.setValue("value", String(parseFloat(String(selected.value)).toFixed(2)));
    }
  };
  
  useEffect(() => {
    if (initialData?.phone) {
      const sortedCountries = [...countries].sort((a, b) => b.code.length - a.code.length);
      const country = sortedCountries.find(c => initialData.phone.startsWith(c.code));
      if (country) {
        setCountryCode(country.code);
        setPhoneNumber(initialData.phone.substring(country.code.length));
      } else {
        setPhoneNumber(initialData.phone);
      }
    }
  }, [initialData]);
  
  const form = useForm<ClientFormData>({
    resolver: zodResolver(clientFormSchema),
    defaultValues: {
      name: initialData?.name || "",
      phone: initialData?.phone || "",
      username: initialData?.username || "",
      password: initialData?.password || "",
      system: initialData?.system || "",
      subscriptionStatus: initialData?.subscriptionStatus || "Ativa",
      paymentMethod: initialData?.paymentMethod || "pix",
      activationDate: initialData?.activationDate || new Date().toISOString().split('T')[0],
      expiryDate: initialData?.expiryDate || "",
      paymentStatus: initialData?.paymentStatus || "Pago",
      plan: initialData?.plan || "",
      value: initialData?.value || "",
      referralSource: initialData?.referralSource || "",
      referredById: initialData?.referredById || undefined,
      notes: initialData?.notes || "",
    },
  });

  // Auto-generate username from name and phone
  const handleNameChange = (name: string) => {
    if (name && phoneNumber) {
      const firstName = name.split(" ")[0].toLowerCase();
      const cleanPhone = phoneNumber.replace(/\D/g, '');
      const lastFourDigits = cleanPhone.slice(-4);
      form.setValue("username", `${firstName}${lastFourDigits}`);
    }
  };

  // Handle phone number change
  const handlePhoneNumberChange = (phone: string) => {
    setPhoneNumber(phone);
    const cleanPhone = phone.replace(/\D/g, '');
    const fullPhone = cleanPhone ? `${countryCode}${cleanPhone}` : "";
    form.setValue("phone", fullPhone);
    form.setValue("password", cleanPhone);
    
    const name = form.getValues("name");
    if (name && cleanPhone) {
      const firstName = name.split(" ")[0].toLowerCase();
      const lastFourDigits = cleanPhone.slice(-4);
      form.setValue("username", `${firstName}${lastFourDigits}`);
    }
  };

  // Handle country code change
  const handleCountryCodeChange = (code: string) => {
    setCountryCode(code);
    const cleanPhone = phoneNumber.replace(/\D/g, '');
    const fullPhone = cleanPhone ? `${code}${cleanPhone}` : "";
    form.setValue("phone", fullPhone);
  };

  // Watch expiry date for calculation
  const expiryDateWatch = form.watch("expiryDate");
  
  // Calculate days to expiry using Brasília timezone (GMT-3)
  useEffect(() => {
    if (expiryDateWatch) {
      const today = getBrasiliaStartOfDay();
      const expiry = parseDateString(expiryDateWatch);
      
      const diffTime = expiry.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      setDaysToExpiry(diffDays);
    }
  }, [expiryDateWatch]);

  const getDaysToExpiryColor = () => {
    if (daysToExpiry <= 0) return "text-yellow-600 font-bold"; // Vencido
    if (daysToExpiry <= 3) return "text-red-600 font-bold"; // Crítico
    return "text-green-600"; // Normal
  };

  const handleSubmit = (data: ClientFormData) => {
    // When editing, remove activationDate from the payload
    // activationDate is immutable after creation to preserve historical revenue data
    if (initialData) {
      const { activationDate, ...dataWithoutActivationDate } = data;
      console.log('[ClientForm] Editing client - activationDate removed from payload to preserve revenue history');
      onSubmit(dataWithoutActivationDate as ClientFormData);
    } else {
      onSubmit(data);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Opção de Importação de Planilha */}
      <Card className="glassmorphism neon-border">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <FileSpreadsheet className="w-5 h-5 text-primary" />
              <div>
                <h3 className="font-semibold">Importar Planilha</h3>
                <p className="text-sm text-muted-foreground">
                  Importe clientes em lote usando uma planilha Excel ou CSV
                </p>
              </div>
            </div>
            <Button variant="outline" className="space-x-2">
              <Upload className="w-4 h-4" />
              <span>Selecionar Arquivo</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="glassmorphism neon-border">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>{initialData ? "Editar Cliente" : "Novo Cliente"}</span>
            {!initialData && (
              <Badge variant="secondary" className="text-lg px-3 py-1">
                ID: {userId.toString().padStart(3, '0')}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
              {/* Informações Pessoais */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Informações Pessoais</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome Completo *</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Nome completo do cliente" 
                            {...field}
                            onChange={(e) => {
                              field.onChange(e);
                              handleNameChange(e.target.value);
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div>
                    <FormLabel>Telefone *</FormLabel>
                    <div className="flex gap-2">
                      <Select value={countryCode} onValueChange={handleCountryCodeChange}>
                        <SelectTrigger className="w-[160px]" data-testid="select-country-code">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="max-h-[300px]">
                          {countries.map((country) => (
                            <SelectItem key={country.code} value={country.code}>
                              <span className="flex items-center gap-2">
                                <span>{country.flag}</span>
                                <span>{country.name} {country.code}</span>
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormField
                        control={form.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem className="flex-1">
                            <FormControl>
                              <Input 
                                placeholder="(99) 9999-9999" 
                                value={phoneNumber}
                                onChange={(e) => {
                                  handlePhoneNumberChange(e.target.value);
                                }}
                                data-testid="input-phone"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Credenciais de Acesso */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Credenciais de Acesso</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Usuário * 
                          <span className="text-xs text-muted-foreground ml-2">
                            (Gerado automaticamente: primeiro nome + 4 últimos dígitos do telefone)
                          </span>
                        </FormLabel>
                        <FormControl>
                          <Input placeholder="Nome de usuário" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Senha * 
                          <span className="text-xs text-muted-foreground ml-2">
                            (Padrão: número do telefone)
                          </span>
                        </FormLabel>
                        <FormControl>
                          <Input placeholder="Senha de acesso" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="system"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Sistema *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value} disabled={systemsLoading}>
                          <FormControl>
                            <SelectTrigger data-testid="select-system">
                              <SelectValue placeholder={systemsLoading ? "Carregando sistemas..." : "Selecione o sistema"} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {systems.filter(s => s.isActive).map((system) => (
                              <SelectItem key={system.id} value={system.name}>
                                {system.name}
                              </SelectItem>
                            ))}
                            {systems.filter(s => s.isActive).length === 0 && (
                              <div className="p-2 text-sm text-muted-foreground text-center">
                                Nenhum sistema ativo encontrado
                              </div>
                            )}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <Separator />

              {/* Status e Pagamento */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Status e Pagamento</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="subscriptionStatus"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status da Assinatura *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o status" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Ativa">Ativa</SelectItem>
                            <SelectItem value="Inativa">Inativa</SelectItem>
                            <SelectItem value="Aguardando">Aguardando</SelectItem>
                            <SelectItem value="Teste">Teste</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="paymentStatus"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Situação Pagamento *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione a situação" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Pago">Pago</SelectItem>
                            <SelectItem value="Vencido">Vencido</SelectItem>
                            <SelectItem value="A Pagar">A Pagar</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="mt-4">
                  <FormField
                    control={form.control}
                    name="paymentMethod"
                    render={({ field }) => (
                      <FormItem>
                        <div className="mb-4">
                          <FormLabel>Método de Pagamento</FormLabel>
                        </div>
                        <div className="flex space-x-4">
                          {paymentMethodOptions.map((method) => (
                            <div
                              key={method.id}
                              className="flex flex-row items-start space-x-3 space-y-0 cursor-pointer"
                              onClick={() => field.onChange(method.id)}
                            >
                              <Checkbox
                                checked={field.value === method.id}
                                onCheckedChange={() => field.onChange(method.id)}
                                data-testid={`checkbox-${method.id}`}
                              />
                              <FormLabel className="font-normal cursor-pointer">
                                <Badge className={method.color}>
                                  {method.label}
                                </Badge>
                              </FormLabel>
                            </div>
                          ))}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <Separator />

              {/* Datas e Valores */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Datas e Valores</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="activationDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Data de Ativação *</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="expiryDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Data de Vencimento *</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex flex-col space-y-2">
                    <FormLabel>Dias para Vencimento</FormLabel>
                    <div className={`p-3 text-center font-bold text-lg border rounded-md ${getDaysToExpiryColor()}`}>
                      {daysToExpiry > 0 ? `${daysToExpiry} dias` : daysToExpiry === 0 ? "Vence hoje" : `${Math.abs(daysToExpiry)} dias vencido`}
                      {daysToExpiry <= 3 && daysToExpiry > 0 && (
                        <AlertTriangle className="w-4 h-4 inline ml-2" />
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <FormField
                    control={form.control}
                    name="plan"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Plano *</FormLabel>
                        <Select
                          onValueChange={(val) => handlePlanChange(val, field.onChange)}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o plano" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {planOptions.map((p) => (
                              <SelectItem key={p.name} value={p.name}>
                                {p.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="value"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Valor (R$) *</FormLabel>
                        <FormControl>
                          <Input placeholder="0,00" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <Separator />

              {/* Indicação e Observações */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Indicação e Observações</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="referralSource"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Fonte/Indicação</FormLabel>
                        <FormControl>
                          <Input placeholder="Como chegou até nós" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="referredById"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cliente que Indicou (ID)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="ID do cliente" 
                            value={field.value || ""} 
                            onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem className="mt-4">
                      <FormLabel>Anotações</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Observações sobre o cliente..."
                          rows={4}
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Form Actions */}
              <div className="flex justify-end space-x-4 pt-6">
                <Button type="button" variant="outline" onClick={onCancel}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? "Salvando..." : (initialData ? "Atualizar" : "Criar Cliente")}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
