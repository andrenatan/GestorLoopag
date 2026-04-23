import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { 
  Plus, 
  Search, 
  Edit2,
  Trash2,
  UserCheck,
  Calendar,
  DollarSign,
  Phone,
  Mail,
  KeyRound,
  ShieldOff,
  Copy,
  RefreshCw,
  Eye,
  EyeOff,
} from "lucide-react";
import type { Employee } from "@shared/schema";

const employeeFormSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  phone: z.string().min(1, "Telefone é obrigatório"),
  email: z.string().email("Email inválido"),
  birthDate: z.string().optional(),
  address: z.string().optional(),
  position: z.string().min(1, "Cargo é obrigatório"),
  salary: z.string().optional(),
  hireDate: z.string().min(1, "Data de admissão é obrigatória"),
  photo: z.string().optional(),
  isActive: z.boolean().default(true),
  enableAccess: z.boolean().default(false),
  accessEmail: z.string().optional(),
  accessPassword: z.string().optional(),
  // Hidden flag: true when the employee already has access (we are editing).
  // Skips email/password validation since those fields are not shown in that case.
  hasExistingAccess: z.boolean().default(false),
}).superRefine((data, ctx) => {
  // Validate access fields only when granting fresh access (toggle on, no existing access).
  if (data.enableAccess && !data.hasExistingAccess) {
    if (!data.accessEmail || !/^\S+@\S+\.\S+$/.test(data.accessEmail)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["accessEmail"], message: "Email de acesso inválido" });
    }
    if (!data.accessPassword || data.accessPassword.length < 6) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["accessPassword"], message: "Senha deve ter ao menos 6 caracteres" });
    }
  }
});

type EmployeeFormData = z.infer<typeof employeeFormSchema>;

function generateRandomPassword(length = 12) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";
  let out = "";
  const arr = new Uint32Array(length);
  crypto.getRandomValues(arr);
  for (let i = 0; i < length; i++) out += chars[arr[i] % chars.length];
  return out;
}

export default function Employees() {
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [showAccessPassword, setShowAccessPassword] = useState(false);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const revokeAccessMutation = useMutation({
    mutationFn: (id: number) => api.revokeEmployeeAccess(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
      toast({ title: "Acesso revogado", description: "O funcionário não pode mais entrar no sistema." });
    },
    onError: () => {
      toast({ title: "Erro", description: "Não foi possível revogar o acesso.", variant: "destructive" });
    },
  });

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: "Copiado", description: `${label} copiado para a área de transferência.` });
    } catch {
      toast({ title: "Erro", description: "Não foi possível copiar.", variant: "destructive" });
    }
  };

  const form = useForm<EmployeeFormData>({
    resolver: zodResolver(employeeFormSchema),
    defaultValues: {
      name: "",
      phone: "",
      email: "",
      birthDate: "",
      address: "",
      position: "",
      salary: "",
      hireDate: "",
      photo: "",
      isActive: true,
      enableAccess: false,
      accessEmail: "",
      accessPassword: "",
      hasExistingAccess: false,
    },
  });

  // Watch toggle and email so we can autofill access email and prefill password
  const enableAccess = form.watch("enableAccess");
  const formEmail = form.watch("email");

  const { data: employees = [], isLoading } = useQuery({
    queryKey: ["/api/employees"],
    queryFn: api.getEmployees,
  });

  // Strip access-only fields from the payload sent to /api/employees
  const buildEmployeePayload = (data: EmployeeFormData) => ({
    name: data.name,
    phone: data.phone,
    email: data.email,
    position: data.position,
    isActive: data.isActive,
    birthDate: data.birthDate || null,
    address: data.address || null,
    salary: data.salary ? data.salary : null,
    hireDate: data.hireDate,
    photo: data.photo || null,
  });

  const createEmployeeMutation = useMutation({
    mutationFn: async (data: EmployeeFormData): Promise<Employee> => {
      const res = await api.createEmployee(buildEmployeePayload(data));
      return (await res.json()) as Employee;
    },
  });

  const updateEmployeeMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: EmployeeFormData }): Promise<Employee> => {
      const res = await api.updateEmployee(id, buildEmployeePayload(data));
      return (await res.json()) as Employee;
    },
  });

  const grantAccessMutation = useMutation({
    mutationFn: (data: { id: number; email: string; password: string }) =>
      api.grantEmployeeAccess(data.id, { email: data.email, password: data.password }),
  });

  const deleteEmployeeMutation = useMutation({
    mutationFn: (id: number) => api.deleteEmployee(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
      toast({
        title: "Funcionário excluído",
        description: "Funcionário foi removido com sucesso.",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível excluir o funcionário.",
        variant: "destructive",
      });
    },
  });

  const filteredEmployees = employees.filter((employee: Employee) =>
    employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employee.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employee.position.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const extractErrorMessage = async (err: any, fallback: string) => {
    try {
      if (err?.response?.json) {
        const body = await err.response.json();
        return body.message || fallback;
      } else if (err?.message) {
        return err.message;
      }
    } catch {}
    return fallback;
  };

  const onSubmit = async (data: EmployeeFormData) => {
    const wasCreating = !editingEmployee;
    let saved: Employee;

    // 1. Save the employee record (create or update)
    try {
      saved = editingEmployee
        ? await updateEmployeeMutation.mutateAsync({ id: editingEmployee.id, data })
        : await createEmployeeMutation.mutateAsync(data);
    } catch (err: any) {
      const message = await extractErrorMessage(err, "Não foi possível salvar o funcionário.");
      toast({ title: "Erro ao salvar", description: message, variant: "destructive" });
      return;
    }

    queryClient.invalidateQueries({ queryKey: ["/api/employees"] });

    const hadAccess = !!editingEmployee?.accessAuthUserId;
    let createdCredentials: { email: string; password: string } | null = null;
    let revokedAccess = false;

    // 2. Sync access toggle with backend (grant/revoke). On failure, keep dialog
    // open in EDIT mode for the just-saved employee so retries don't duplicate.
    try {
      if (data.enableAccess && !hadAccess) {
        const email = (data.accessEmail || data.email).trim();
        const password = data.accessPassword || generateRandomPassword();
        await grantAccessMutation.mutateAsync({ id: saved.id, email, password });
        createdCredentials = { email, password };
      } else if (!data.enableAccess && hadAccess) {
        await revokeAccessMutation.mutateAsync(saved.id);
        revokedAccess = true;
      }
    } catch (err: any) {
      queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
      const message = await extractErrorMessage(err, "Erro ao sincronizar o acesso.");
      // Switch dialog into edit mode for the saved employee — prevents duplicate
      // creation if the user retries.
      setEditingEmployee(saved);
      toast({
        title: wasCreating
          ? "Funcionário criado, mas o acesso falhou"
          : "Funcionário atualizado, mas o acesso falhou",
        description: `${message} Ajuste os dados de acesso e tente novamente.`,
        variant: "destructive",
        duration: 15000,
      });
      return;
    }

    setDialogOpen(false);
    setEditingEmployee(null);
    form.reset();

    if (createdCredentials) {
      toast({
        title: "Funcionário salvo e acesso criado",
        description: `Passe manualmente ao funcionário — Email: ${createdCredentials.email} | Senha: ${createdCredentials.password}`,
        duration: 15000,
      });
    } else if (revokedAccess) {
      toast({
        title: wasCreating ? "Funcionário criado" : "Funcionário atualizado",
        description: "Acesso ao sistema foi revogado.",
      });
    } else {
      toast({
        title: wasCreating ? "Funcionário criado" : "Funcionário atualizado",
        description: "Alterações salvas com sucesso.",
      });
    }
  };

  const handleEdit = (employee: Employee) => {
    setEditingEmployee(employee);
    setShowAccessPassword(false);
    form.reset({
      name: employee.name,
      phone: employee.phone,
      email: employee.email,
      birthDate: employee.birthDate || "",
      address: employee.address || "",
      position: employee.position,
      salary: employee.salary || "",
      hireDate: employee.hireDate,
      photo: employee.photo || "",
      isActive: employee.isActive,
      enableAccess: !!employee.accessAuthUserId,
      accessEmail: employee.accessEmail || employee.email || "",
      accessPassword: "",
      hasExistingAccess: !!employee.accessAuthUserId,
    });
    setDialogOpen(true);
  };

  const handleAddNew = () => {
    setEditingEmployee(null);
    setShowAccessPassword(false);
    form.reset({
      name: "",
      phone: "",
      email: "",
      birthDate: "",
      address: "",
      position: "",
      salary: "",
      hireDate: "",
      photo: "",
      isActive: true,
      enableAccess: false,
      accessEmail: "",
      accessPassword: "",
      hasExistingAccess: false,
    });
    setDialogOpen(true);
  };

  const calculateAge = (birthDate: string | null) => {
    if (!birthDate) return null;
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-64" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-64 bg-muted rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Gestão de Funcionários</h1>
          <p className="text-muted-foreground">
            Gerencie a equipe e informações dos funcionários
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleAddNew} className="flex items-center space-x-2">
              <Plus className="w-4 h-4" />
              <span>Novo Funcionário</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingEmployee ? "Editar Funcionário" : "Novo Funcionário"}
              </DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome Completo</FormLabel>
                        <FormControl>
                          <Input placeholder="Nome completo" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="email@exemplo.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Telefone</FormLabel>
                        <FormControl>
                          <Input placeholder="(11) 99999-9999" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="birthDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Data de Nascimento</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Endereço</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Endereço completo" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="position"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cargo</FormLabel>
                        <FormControl>
                          <Input placeholder="Cargo/Função" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="salary"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Salário</FormLabel>
                        <FormControl>
                          <Input placeholder="0,00" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="hireDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Data de Admissão</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="isActive"
                    render={({ field }) => (
                      <FormItem className="flex items-center space-x-2 pt-6">
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormLabel>Funcionário Ativo</FormLabel>
                      </FormItem>
                    )}
                  />
                </div>

                {/* Access section */}
                <div className="border-t pt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold flex items-center gap-2">
                        <KeyRound className="w-4 h-4" />
                        Acesso ao sistema
                      </h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        Habilite para criar um login. O funcionário verá Clientes, Sistemas, Cobranças, Templates, Rankings e WhatsApp — não verá Dashboard nem Funcionários.
                      </p>
                    </div>
                    <FormField
                      control={form.control}
                      name="enableAccess"
                      render={({ field }) => (
                        <FormItem className="flex items-center space-x-2">
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={(checked) => {
                                field.onChange(checked);
                                if (checked) {
                                  // Pre-fill access fields when toggle goes on (only if granting fresh access)
                                  if (!editingEmployee?.accessAuthUserId) {
                                    if (!form.getValues("accessEmail")) {
                                      form.setValue("accessEmail", formEmail || "");
                                    }
                                    if (!form.getValues("accessPassword")) {
                                      form.setValue("accessPassword", generateRandomPassword());
                                    }
                                  }
                                }
                              }}
                              data-testid="switch-enable-access"
                            />
                          </FormControl>
                          <FormLabel className="!mt-0">Habilitar</FormLabel>
                        </FormItem>
                      )}
                    />
                  </div>

                  {enableAccess && editingEmployee?.accessAuthUserId && (
                    <div className="rounded-md bg-muted/40 p-3 text-sm text-muted-foreground">
                      Acesso ativo para <strong>{editingEmployee.accessEmail}</strong>. Para alterar a senha, desligue o acesso, salve e habilite novamente.
                    </div>
                  )}

                  {enableAccess && !editingEmployee?.accessAuthUserId && (
                    <div className="grid grid-cols-1 gap-3">
                      <FormField
                        control={form.control}
                        name="accessEmail"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email de acesso</FormLabel>
                            <div className="flex gap-2">
                              <FormControl>
                                <Input type="email" placeholder="email@exemplo.com" {...field} />
                              </FormControl>
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                onClick={() => copyToClipboard(field.value || "", "Email")}
                                title="Copiar email"
                              >
                                <Copy className="w-4 h-4" />
                              </Button>
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="accessPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Senha</FormLabel>
                            <div className="flex gap-2">
                              <FormControl>
                                <Input
                                  type={showAccessPassword ? "text" : "password"}
                                  placeholder="Senha (mín. 6 caracteres)"
                                  className="font-mono"
                                  {...field}
                                />
                              </FormControl>
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                onClick={() => setShowAccessPassword((v) => !v)}
                                title={showAccessPassword ? "Ocultar senha" : "Mostrar senha"}
                              >
                                {showAccessPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                onClick={() => form.setValue("accessPassword", generateRandomPassword())}
                                title="Gerar nova senha"
                              >
                                <RefreshCw className="w-4 h-4" />
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                onClick={() => copyToClipboard(field.value || "", "Senha")}
                                title="Copiar senha"
                              >
                                <Copy className="w-4 h-4" />
                              </Button>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Anote ou copie agora — após salvar, a senha não poderá ser visualizada.
                            </p>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}
                </div>

                <div className="flex justify-end space-x-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={
                      createEmployeeMutation.isPending ||
                      updateEmployeeMutation.isPending ||
                      grantAccessMutation.isPending ||
                      revokeAccessMutation.isPending
                    }
                  >
                    {editingEmployee ? "Atualizar" : "Criar"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <Card className="glassmorphism neon-border">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar funcionários por nome, email ou cargo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Employee Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredEmployees.map((employee: Employee) => (
          <Card key={employee.id} className="glassmorphism neon-border hover:scale-[1.02] transition-all duration-200">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between mb-3">
                <span className="font-mono text-sm text-muted-foreground">#{employee.employeeNumber}</span>
              </div>
              <div className="flex items-center space-x-4">
                <Avatar className="w-16 h-16">
                  <AvatarImage src={employee.photo || undefined} alt={employee.name} />
                  <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-500 text-white font-medium">
                    {employee.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">{employee.name}</h3>
                  <p className="text-sm text-muted-foreground">{employee.position}</p>
                  <Badge variant={employee.isActive ? "default" : "secondary"} className="mt-1">
                    {employee.isActive ? "Ativo" : "Inativo"}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center space-x-2 text-sm">
                <Mail className="w-4 h-4 text-muted-foreground" />
                <span>{employee.email}</span>
              </div>
              <div className="flex items-center space-x-2 text-sm">
                <Phone className="w-4 h-4 text-muted-foreground" />
                <span>{employee.phone}</span>
              </div>
              {employee.birthDate && (
                <div className="flex items-center space-x-2 text-sm">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span>
                    {new Date(employee.birthDate).toLocaleDateString('pt-BR')} 
                    ({calculateAge(employee.birthDate)} anos)
                  </span>
                </div>
              )}
              {employee.salary && (
                <div className="flex items-center space-x-2 text-sm">
                  <DollarSign className="w-4 h-4 text-muted-foreground" />
                  <span>R$ {parseFloat(employee.salary).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
              )}
              <div className="flex items-center space-x-2 text-sm">
                <UserCheck className="w-4 h-4 text-muted-foreground" />
                <span>Admitido em {new Date(employee.hireDate).toLocaleDateString('pt-BR')}</span>
              </div>
              
              <div className="flex items-center justify-between pt-4">
                <div>
                  {employee.accessAuthUserId ? (
                    <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white">
                      <KeyRound className="w-3 h-3 mr-1" />
                      Tem acesso
                    </Badge>
                  ) : (
                    <Badge variant="outline">Sem acesso</Badge>
                  )}
                </div>
                <div className="flex space-x-2">
                  {employee.accessAuthUserId ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (confirm(`Revogar o acesso de ${employee.name}? Ele(a) não conseguirá mais entrar no sistema.`)) {
                          revokeAccessMutation.mutate(employee.id);
                        }
                      }}
                      title="Revogar acesso"
                      className="text-amber-600 hover:text-amber-700"
                    >
                      <ShieldOff className="w-4 h-4" />
                    </Button>
                  ) : null}
                  <Button variant="outline" size="sm" onClick={() => handleEdit(employee)}>
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => {
                      if (confirm(`Excluir ${employee.name}? Se ele(a) tiver acesso, será revogado também.`)) {
                        deleteEmployeeMutation.mutate(employee.id);
                      }
                    }}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredEmployees.length === 0 && (
        <Card className="glassmorphism neon-border">
          <CardContent className="text-center py-12">
            <UserCheck className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhum funcionário encontrado</h3>
            <p className="text-muted-foreground">
              {searchTerm ? "Tente ajustar sua busca" : "Comece adicionando seu primeiro funcionário"}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
