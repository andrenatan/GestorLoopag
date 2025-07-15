import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { Client } from "@shared/schema";

const clientFormSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  phone: z.string().min(1, "Telefone é obrigatório"),
  username: z.string().min(1, "Usuário é obrigatório"),
  password: z.string().min(1, "Senha é obrigatória"),
  system: z.enum(["P2P - Android", "IPTV - Geral", "Dois Pontos Distintos"]),
  cloudyEmail: z.string().email("Email ClouDy inválido"),
  cloudyPassword: z.string().min(1, "Senha ClouDy é obrigatória"),
  cloudyExpiry: z.string().min(1, "Vencimento ClouDy é obrigatório"),
  subscriptionStatus: z.enum(["Ativa", "Inativa", "Aguardando", "Teste"]).default("Ativa"),
  paymentMethods: z.array(z.string()).default([]),
  activationDate: z.string().min(1, "Data de ativação é obrigatória"),
  expiryDate: z.string().min(1, "Data de vencimento é obrigatória"),
  paymentStatus: z.enum(["Em dia", "Pendente"]).default("Em dia"),
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
  { id: "pix", label: "PIX" },
  { id: "cartao", label: "Cartão" },
  { id: "boleto", label: "Boleto" },
];

export function ClientForm({ initialData, onSubmit, onCancel, isLoading = false }: ClientFormProps) {
  const form = useForm<ClientFormData>({
    resolver: zodResolver(clientFormSchema),
    defaultValues: {
      name: initialData?.name || "",
      phone: initialData?.phone || "",
      username: initialData?.username || "",
      password: initialData?.password || "",
      system: initialData?.system || "IPTV - Geral",
      cloudyEmail: initialData?.cloudyEmail || "",
      cloudyPassword: initialData?.cloudyPassword || "",
      cloudyExpiry: initialData?.cloudyExpiry || "",
      subscriptionStatus: initialData?.subscriptionStatus || "Ativa",
      paymentMethods: initialData?.paymentMethods || [],
      activationDate: initialData?.activationDate || new Date().toISOString().split('T')[0],
      expiryDate: initialData?.expiryDate || "",
      paymentStatus: initialData?.paymentStatus || "Em dia",
      plan: initialData?.plan || "",
      value: initialData?.value || "",
      referralSource: initialData?.referralSource || "",
      referredById: initialData?.referredById || undefined,
      notes: initialData?.notes || "",
    },
  });

  const handleSubmit = (data: ClientFormData) => {
    onSubmit(data);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card className="glassmorphism neon-border">
        <CardHeader>
          <CardTitle>
            {initialData ? "Editar Cliente" : "Novo Cliente"}
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
                          <Input placeholder="Nome completo do cliente" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Telefone *</FormLabel>
                        <FormControl>
                          <Input placeholder="(11) 99999-9999" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
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
                        <FormLabel>Usuário *</FormLabel>
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
                        <FormLabel>Senha *</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="Senha de acesso" {...field} />
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
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o sistema" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="P2P - Android">P2P - Android</SelectItem>
                            <SelectItem value="IPTV - Geral">IPTV - Geral</SelectItem>
                            <SelectItem value="Dois Pontos Distintos">Dois Pontos Distintos</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <Separator />

              {/* Informações ClouDy */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Informações ClouDy</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="cloudyEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email ClouDy *</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="email@cloudy.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="cloudyPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Senha ClouDy *</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="Senha ClouDy" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="cloudyExpiry"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Vencimento ClouDy *</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
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
                            <SelectItem value="Em dia">Em dia</SelectItem>
                            <SelectItem value="Pendente">Pendente</SelectItem>
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
                    name="paymentMethods"
                    render={() => (
                      <FormItem>
                        <div className="mb-4">
                          <FormLabel>Métodos de Pagamento</FormLabel>
                        </div>
                        <div className="flex space-x-4">
                          {paymentMethodOptions.map((method) => (
                            <FormField
                              key={method.id}
                              control={form.control}
                              name="paymentMethods"
                              render={({ field }) => {
                                return (
                                  <FormItem
                                    key={method.id}
                                    className="flex flex-row items-start space-x-3 space-y-0"
                                  >
                                    <FormControl>
                                      <Checkbox
                                        checked={field.value?.includes(method.id)}
                                        onCheckedChange={(checked) => {
                                          return checked
                                            ? field.onChange([...field.value, method.id])
                                            : field.onChange(
                                                field.value?.filter(
                                                  (value) => value !== method.id
                                                )
                                              )
                                        }}
                                      />
                                    </FormControl>
                                    <FormLabel className="font-normal">
                                      {method.label}
                                    </FormLabel>
                                  </FormItem>
                                )
                              }}
                            />
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  <FormField
                    control={form.control}
                    name="plan"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Plano *</FormLabel>
                        <FormControl>
                          <Input placeholder="Nome do plano" {...field} />
                        </FormControl>
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
