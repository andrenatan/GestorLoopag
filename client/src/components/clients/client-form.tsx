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
import { Upload, FileSpreadsheet, AlertTriangle, ChevronsUpDown, Check } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
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
  { name: "Afeganistão", code: "+93", flag: "🇦🇫" },
  { name: "África do Sul", code: "+27", flag: "🇿🇦" },
  { name: "Albânia", code: "+355", flag: "🇦🇱" },
  { name: "Alemanha", code: "+49", flag: "🇩🇪" },
  { name: "Andorra", code: "+376", flag: "🇦🇩" },
  { name: "Angola", code: "+244", flag: "🇦🇴" },
  { name: "Antiga e Barbuda", code: "+1268", flag: "🇦🇬" },
  { name: "Arábia Saudita", code: "+966", flag: "🇸🇦" },
  { name: "Argélia", code: "+213", flag: "🇩🇿" },
  { name: "Argentina", code: "+54", flag: "🇦🇷" },
  { name: "Armênia", code: "+374", flag: "🇦🇲" },
  { name: "Austrália", code: "+61", flag: "🇦🇺" },
  { name: "Áustria", code: "+43", flag: "🇦🇹" },
  { name: "Azerbaijão", code: "+994", flag: "🇦🇿" },
  { name: "Bahamas", code: "+1242", flag: "🇧🇸" },
  { name: "Bahrein", code: "+973", flag: "🇧🇭" },
  { name: "Bangladesh", code: "+880", flag: "🇧🇩" },
  { name: "Barbados", code: "+1246", flag: "🇧🇧" },
  { name: "Bélgica", code: "+32", flag: "🇧🇪" },
  { name: "Belize", code: "+501", flag: "🇧🇿" },
  { name: "Benin", code: "+229", flag: "🇧🇯" },
  { name: "Bielorrússia", code: "+375", flag: "🇧🇾" },
  { name: "Bolívia", code: "+591", flag: "🇧🇴" },
  { name: "Bósnia e Herzegovina", code: "+387", flag: "🇧🇦" },
  { name: "Botsuana", code: "+267", flag: "🇧🇼" },
  { name: "Brunei", code: "+673", flag: "🇧🇳" },
  { name: "Bulgária", code: "+359", flag: "🇧🇬" },
  { name: "Burkina Faso", code: "+226", flag: "🇧🇫" },
  { name: "Burundi", code: "+257", flag: "🇧🇮" },
  { name: "Butão", code: "+975", flag: "🇧🇹" },
  { name: "Cabo Verde", code: "+238", flag: "🇨🇻" },
  { name: "Camboja", code: "+855", flag: "🇰🇭" },
  { name: "Camarões", code: "+237", flag: "🇨🇲" },
  { name: "Canadá", code: "+1", flag: "🇨🇦" },
  { name: "Catar", code: "+974", flag: "🇶🇦" },
  { name: "Cazaquistão", code: "+7", flag: "🇰🇿" },
  { name: "Chade", code: "+235", flag: "🇹🇩" },
  { name: "Chile", code: "+56", flag: "🇨🇱" },
  { name: "China", code: "+86", flag: "🇨🇳" },
  { name: "Chipre", code: "+357", flag: "🇨🇾" },
  { name: "Colômbia", code: "+57", flag: "🇨🇴" },
  { name: "Comores", code: "+269", flag: "🇰🇲" },
  { name: "Congo", code: "+242", flag: "🇨🇬" },
  { name: "Congo (Rep. Dem.)", code: "+243", flag: "🇨🇩" },
  { name: "Coreia do Norte", code: "+850", flag: "🇰🇵" },
  { name: "Coreia do Sul", code: "+82", flag: "🇰🇷" },
  { name: "Costa do Marfim", code: "+225", flag: "🇨🇮" },
  { name: "Costa Rica", code: "+506", flag: "🇨🇷" },
  { name: "Croácia", code: "+385", flag: "🇭🇷" },
  { name: "Cuba", code: "+53", flag: "🇨🇺" },
  { name: "Dinamarca", code: "+45", flag: "🇩🇰" },
  { name: "Djibuti", code: "+253", flag: "🇩🇯" },
  { name: "Dominica", code: "+1767", flag: "🇩🇲" },
  { name: "Egito", code: "+20", flag: "🇪🇬" },
  { name: "El Salvador", code: "+503", flag: "🇸🇻" },
  { name: "Emirados Árabes", code: "+971", flag: "🇦🇪" },
  { name: "Equador", code: "+593", flag: "🇪🇨" },
  { name: "Eritreia", code: "+291", flag: "🇪🇷" },
  { name: "Eslováquia", code: "+421", flag: "🇸🇰" },
  { name: "Eslovênia", code: "+386", flag: "🇸🇮" },
  { name: "Espanha", code: "+34", flag: "🇪🇸" },
  { name: "Eswatini", code: "+268", flag: "🇸🇿" },
  { name: "Etiópia", code: "+251", flag: "🇪🇹" },
  { name: "Fiji", code: "+679", flag: "🇫🇯" },
  { name: "Filipinas", code: "+63", flag: "🇵🇭" },
  { name: "Finlândia", code: "+358", flag: "🇫🇮" },
  { name: "França", code: "+33", flag: "🇫🇷" },
  { name: "Gabão", code: "+241", flag: "🇬🇦" },
  { name: "Gâmbia", code: "+220", flag: "🇬🇲" },
  { name: "Gana", code: "+233", flag: "🇬🇭" },
  { name: "Geórgia", code: "+995", flag: "🇬🇪" },
  { name: "Granada", code: "+1473", flag: "🇬🇩" },
  { name: "Grécia", code: "+30", flag: "🇬🇷" },
  { name: "Guatemala", code: "+502", flag: "🇬🇹" },
  { name: "Guiana", code: "+592", flag: "🇬🇾" },
  { name: "Guiné", code: "+224", flag: "🇬🇳" },
  { name: "Guiné-Bissau", code: "+245", flag: "🇬🇼" },
  { name: "Guiné Equatorial", code: "+240", flag: "🇬🇶" },
  { name: "Haiti", code: "+509", flag: "🇭🇹" },
  { name: "Honduras", code: "+504", flag: "🇭🇳" },
  { name: "Hungria", code: "+36", flag: "🇭🇺" },
  { name: "Iêmen", code: "+967", flag: "🇾🇪" },
  { name: "Índia", code: "+91", flag: "🇮🇳" },
  { name: "Indonésia", code: "+62", flag: "🇮🇩" },
  { name: "Irã", code: "+98", flag: "🇮🇷" },
  { name: "Iraque", code: "+964", flag: "🇮🇶" },
  { name: "Irlanda", code: "+353", flag: "🇮🇪" },
  { name: "Islândia", code: "+354", flag: "🇮🇸" },
  { name: "Israel", code: "+972", flag: "🇮🇱" },
  { name: "Itália", code: "+39", flag: "🇮🇹" },
  { name: "Jamaica", code: "+1876", flag: "🇯🇲" },
  { name: "Japão", code: "+81", flag: "🇯🇵" },
  { name: "Jordânia", code: "+962", flag: "🇯🇴" },
  { name: "Kosovo", code: "+383", flag: "🇽🇰" },
  { name: "Kuwait", code: "+965", flag: "🇰🇼" },
  { name: "Laos", code: "+856", flag: "🇱🇦" },
  { name: "Lesoto", code: "+266", flag: "🇱🇸" },
  { name: "Letônia", code: "+371", flag: "🇱🇻" },
  { name: "Líbano", code: "+961", flag: "🇱🇧" },
  { name: "Libéria", code: "+231", flag: "🇱🇷" },
  { name: "Líbia", code: "+218", flag: "🇱🇾" },
  { name: "Liechtenstein", code: "+423", flag: "🇱🇮" },
  { name: "Lituânia", code: "+370", flag: "🇱🇹" },
  { name: "Luxemburgo", code: "+352", flag: "🇱🇺" },
  { name: "Madagascar", code: "+261", flag: "🇲🇬" },
  { name: "Malásia", code: "+60", flag: "🇲🇾" },
  { name: "Malawi", code: "+265", flag: "🇲🇼" },
  { name: "Maldivas", code: "+960", flag: "🇲🇻" },
  { name: "Mali", code: "+223", flag: "🇲🇱" },
  { name: "Malta", code: "+356", flag: "🇲🇹" },
  { name: "Marrocos", code: "+212", flag: "🇲🇦" },
  { name: "Mauritânia", code: "+222", flag: "🇲🇷" },
  { name: "Maurício", code: "+230", flag: "🇲🇺" },
  { name: "México", code: "+52", flag: "🇲🇽" },
  { name: "Mianmar", code: "+95", flag: "🇲🇲" },
  { name: "Micronésia", code: "+691", flag: "🇫🇲" },
  { name: "Moçambique", code: "+258", flag: "🇲🇿" },
  { name: "Moldávia", code: "+373", flag: "🇲🇩" },
  { name: "Mônaco", code: "+377", flag: "🇲🇨" },
  { name: "Mongólia", code: "+976", flag: "🇲🇳" },
  { name: "Montenegro", code: "+382", flag: "🇲🇪" },
  { name: "Namíbia", code: "+264", flag: "🇳🇦" },
  { name: "Nauru", code: "+674", flag: "🇳🇷" },
  { name: "Nepal", code: "+977", flag: "🇳🇵" },
  { name: "Nicarágua", code: "+505", flag: "🇳🇮" },
  { name: "Níger", code: "+227", flag: "🇳🇪" },
  { name: "Nigéria", code: "+234", flag: "🇳🇬" },
  { name: "Noruega", code: "+47", flag: "🇳🇴" },
  { name: "Nova Zelândia", code: "+64", flag: "🇳🇿" },
  { name: "Omã", code: "+968", flag: "🇴🇲" },
  { name: "Países Baixos", code: "+31", flag: "🇳🇱" },
  { name: "Palau", code: "+680", flag: "🇵🇼" },
  { name: "Palestina", code: "+970", flag: "🇵🇸" },
  { name: "Panamá", code: "+507", flag: "🇵🇦" },
  { name: "Papua Nova Guiné", code: "+675", flag: "🇵🇬" },
  { name: "Paraguai", code: "+595", flag: "🇵🇾" },
  { name: "Peru", code: "+51", flag: "🇵🇪" },
  { name: "Polônia", code: "+48", flag: "🇵🇱" },
  { name: "Portugal", code: "+351", flag: "🇵🇹" },
  { name: "Quirguistão", code: "+996", flag: "🇰🇬" },
  { name: "Quênia", code: "+254", flag: "🇰🇪" },
  { name: "Reino Unido", code: "+44", flag: "🇬🇧" },
  { name: "Rep. Centro-Africana", code: "+236", flag: "🇨🇫" },
  { name: "Rep. Dominicana", code: "+1809", flag: "🇩🇴" },
  { name: "República Checa", code: "+420", flag: "🇨🇿" },
  { name: "Romênia", code: "+40", flag: "🇷🇴" },
  { name: "Ruanda", code: "+250", flag: "🇷🇼" },
  { name: "Rússia", code: "+7", flag: "🇷🇺" },
  { name: "Samoa", code: "+685", flag: "🇼🇸" },
  { name: "San Marino", code: "+378", flag: "🇸🇲" },
  { name: "Santa Lúcia", code: "+1758", flag: "🇱🇨" },
  { name: "São Cristóvão e Névis", code: "+1869", flag: "🇰🇳" },
  { name: "São Tomé e Príncipe", code: "+239", flag: "🇸🇹" },
  { name: "São Vicente e Granadinas", code: "+1784", flag: "🇻🇨" },
  { name: "Senegal", code: "+221", flag: "🇸🇳" },
  { name: "Serra Leoa", code: "+232", flag: "🇸🇱" },
  { name: "Sérvia", code: "+381", flag: "🇷🇸" },
  { name: "Singapura", code: "+65", flag: "🇸🇬" },
  { name: "Síria", code: "+963", flag: "🇸🇾" },
  { name: "Somália", code: "+252", flag: "🇸🇴" },
  { name: "Sri Lanka", code: "+94", flag: "🇱🇰" },
  { name: "Sudão", code: "+249", flag: "🇸🇩" },
  { name: "Sudão do Sul", code: "+211", flag: "🇸🇸" },
  { name: "Suécia", code: "+46", flag: "🇸🇪" },
  { name: "Suíça", code: "+41", flag: "🇨🇭" },
  { name: "Suriname", code: "+597", flag: "🇸🇷" },
  { name: "Tailândia", code: "+66", flag: "🇹🇭" },
  { name: "Taiwan", code: "+886", flag: "🇹🇼" },
  { name: "Tajiquistão", code: "+992", flag: "🇹🇯" },
  { name: "Tanzânia", code: "+255", flag: "🇹🇿" },
  { name: "Timor-Leste", code: "+670", flag: "🇹🇱" },
  { name: "Togo", code: "+228", flag: "🇹🇬" },
  { name: "Tonga", code: "+676", flag: "🇹🇴" },
  { name: "Trinidad e Tobago", code: "+1868", flag: "🇹🇹" },
  { name: "Tunísia", code: "+216", flag: "🇹🇳" },
  { name: "Turcomenistão", code: "+993", flag: "🇹🇲" },
  { name: "Turquia", code: "+90", flag: "🇹🇷" },
  { name: "Tuvalu", code: "+688", flag: "🇹🇻" },
  { name: "Ucrânia", code: "+380", flag: "🇺🇦" },
  { name: "Uganda", code: "+256", flag: "🇺🇬" },
  { name: "Uruguai", code: "+598", flag: "🇺🇾" },
  { name: "Uzbequistão", code: "+998", flag: "🇺🇿" },
  { name: "Vanuatu", code: "+678", flag: "🇻🇺" },
  { name: "Venezuela", code: "+58", flag: "🇻🇪" },
  { name: "Vietnã", code: "+84", flag: "🇻🇳" },
  { name: "Estados Unidos", code: "+1", flag: "🇺🇸" },
  { name: "Zâmbia", code: "+260", flag: "🇿🇲" },
  { name: "Zimbábue", code: "+263", flag: "🇿🇼" },
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
  const [countryPickerOpen, setCountryPickerOpen] = useState(false);
  
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
                      <Popover open={countryPickerOpen} onOpenChange={setCountryPickerOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={countryPickerOpen}
                            className="w-[150px] justify-between font-normal"
                            data-testid="select-country-code"
                          >
                            <span className="flex items-center gap-1.5 truncate">
                              <span>{countries.find(c => c.code === countryCode)?.flag ?? "🌍"}</span>
                              <span className="text-sm">{countryCode}</span>
                            </span>
                            <ChevronsUpDown className="ml-1 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[280px] p-0" align="start">
                          <Command filter={(value, search) => {
                            const country = countries.find(c => `${c.name}|${c.code}` === value);
                            if (!country) return 0;
                            const q = search.toLowerCase();
                            return (country.name.toLowerCase().includes(q) || country.code.includes(q)) ? 1 : 0;
                          }}>
                            <CommandInput placeholder="Buscar país ou DDI..." />
                            <CommandList className="max-h-[260px]">
                              <CommandEmpty>Nenhum país encontrado.</CommandEmpty>
                              <CommandGroup>
                                {countries.map((country) => (
                                  <CommandItem
                                    key={`${country.name}|${country.code}`}
                                    value={`${country.name}|${country.code}`}
                                    onSelect={() => {
                                      handleCountryCodeChange(country.code);
                                      setCountryPickerOpen(false);
                                    }}
                                  >
                                    <span className="flex items-center gap-2 flex-1">
                                      <span>{country.flag}</span>
                                      <span className="truncate">{country.name}</span>
                                      <span className="ml-auto text-muted-foreground text-xs shrink-0">{country.code}</span>
                                    </span>
                                    <Check className={`ml-2 h-4 w-4 shrink-0 ${countryCode === country.code ? "opacity-100" : "opacity-0"}`} />
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
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
