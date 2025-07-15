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
  Mail
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
});

type EmployeeFormData = z.infer<typeof employeeFormSchema>;

export default function Employees() {
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

  const { toast } = useToast();
  const queryClient = useQueryClient();

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
    },
  });

  const { data: employees = [], isLoading } = useQuery({
    queryKey: ["/api/employees"],
    queryFn: api.getEmployees,
  });

  const createEmployeeMutation = useMutation({
    mutationFn: (data: EmployeeFormData) => api.createEmployee({
      ...data,
      birthDate: data.birthDate || null,
      address: data.address || null,
      salary: data.salary ? data.salary : null,
      hireDate: data.hireDate,
      photo: data.photo || null,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
      toast({
        title: "Funcionário criado",
        description: "Funcionário foi adicionado com sucesso.",
      });
      setDialogOpen(false);
      form.reset();
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível criar o funcionário.",
        variant: "destructive",
      });
    },
  });

  const updateEmployeeMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: EmployeeFormData }) => 
      api.updateEmployee(id, {
        ...data,
        birthDate: data.birthDate || null,
        address: data.address || null,
        salary: data.salary ? data.salary : null,
        hireDate: data.hireDate,
        photo: data.photo || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
      toast({
        title: "Funcionário atualizado",
        description: "Funcionário foi atualizado com sucesso.",
      });
      setDialogOpen(false);
      setEditingEmployee(null);
      form.reset();
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o funcionário.",
        variant: "destructive",
      });
    },
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

  const onSubmit = (data: EmployeeFormData) => {
    if (editingEmployee) {
      updateEmployeeMutation.mutate({ id: editingEmployee.id, data });
    } else {
      createEmployeeMutation.mutate(data);
    }
  };

  const handleEdit = (employee: Employee) => {
    setEditingEmployee(employee);
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
    });
    setDialogOpen(true);
  };

  const handleAddNew = () => {
    setEditingEmployee(null);
    form.reset();
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

                <div className="flex justify-end space-x-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createEmployeeMutation.isPending || updateEmployeeMutation.isPending}
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
              
              <div className="flex justify-end space-x-2 pt-4">
                <Button variant="outline" size="sm" onClick={() => handleEdit(employee)}>
                  <Edit2 className="w-4 h-4" />
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => deleteEmployeeMutation.mutate(employee.id)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
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
