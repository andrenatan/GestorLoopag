import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { motion, useReducedMotion } from "framer-motion";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { cn } from "@/lib/utils";
import { 
  Loader2, 
  Tv, 
  Users, 
  Zap, 
  Mail, 
  Lock, 
  User, 
  Phone,
  ArrowRight,
  Shield,
  BarChart3
} from "lucide-react";

export default function Landing() {
  const [, setLocation] = useLocation();
  const { login, register } = useAuth();
  const { toast } = useToast();
  
  const [activeTab, setActiveTab] = useState<"login" | "register">("login");
  const [loginData, setLoginData] = useState({ email: "", password: "" });
  const [registerData, setRegisterData] = useState({
    name: "",
    username: "",
    email: "",
    phone: "",
    password: ""
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await login(loginData.email, loginData.password);
      toast({
        title: "Login realizado com sucesso!",
        description: "Redirecionando...",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao fazer login",
        description: error.message || "Verifique suas credenciais",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await register(registerData);
      toast({
        title: "Conta criada com sucesso!",
        description: "Redirecionando para seleção de plano...",
      });
      setLocation("/plans");
    } catch (error: any) {
      toast({
        title: "Erro ao criar conta",
        description: error.message || "Tente novamente mais tarde",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  const features = [
    {
      icon: Tv,
      title: "Gestão Completa",
      description: "Controle total de assinaturas e clientes IPTV"
    },
    {
      icon: Zap,
      title: "Automação Inteligente",
      description: "Cobranças automáticas via WhatsApp"
    },
    {
      icon: BarChart3,
      title: "Analytics",
      description: "Relatórios e métricas em tempo real"
    },
    {
      icon: Shield,
      title: "Seguro",
      description: "Dados protegidos e backup automático"
    }
  ];


  const reduceMotion = useReducedMotion();
  const rise = (delay: number) =>
    reduceMotion
      ? {}
      : {
          initial: { opacity: 0, y: 16 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.6, delay, ease: [0.22, 0.8, 0.24, 1] as const },
        };

  const tabClass = (active: boolean) =>
    cn(
      "flex-1 rounded-full px-4 py-2.5 text-sm font-semibold transition-colors duration-200",
      active ? "bg-ink text-ink-foreground shadow-float" : "text-muted-foreground hover:text-foreground",
    );

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="container relative z-10 mx-auto flex min-h-screen flex-col px-4 py-6 sm:py-8">
        {/* Header */}
        <motion.header {...rise(0)} className="mb-8 flex items-center justify-between gap-4">
          <Link href="/" data-testid="link-back-home">
            <div className="group inline-flex cursor-pointer items-center gap-3">
              <div className="brand-tile flex h-12 w-12 items-center justify-center rounded-2xl">
                <Tv className="h-6 w-6" />
              </div>
              <div>
                <span className="block font-display text-2xl font-bold tracking-tight text-foreground">Loopag</span>
                <span className="block text-xs text-muted-foreground transition-colors group-hover:text-foreground">
                  Voltar ao início
                </span>
              </div>
            </div>
          </Link>
          <div className="flex items-center gap-4">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium text-foreground">Acesse sua conta</p>
              <p className="text-xs text-muted-foreground">Sistema de Gestão IPTV</p>
            </div>
            <ThemeToggle />
          </div>
        </motion.header>

        {/* Main Content */}
        <div className="flex flex-1 items-center justify-center">
          <div className="grid w-full max-w-6xl items-center gap-12 lg:grid-cols-2">
            {/* Left Side - Features */}
            <div className="hidden space-y-8 lg:block">
              <motion.div {...rise(0.1)}>
                <h2 className="text-balance font-display text-5xl font-semibold leading-[1.02] tracking-tight text-foreground">
                  Gerencie seu negócio IPTV com eficiência
                </h2>
                <p className="mt-4 max-w-md text-lg text-muted-foreground">
                  Automatize cobranças, gerencie clientes e acompanhe métricas em tempo real.
                </p>
              </motion.div>

              <div className="grid grid-cols-2 gap-4">
                {features.map((feature, index) => (
                  <motion.div key={feature.title} {...rise(0.2 + index * 0.07)} className="glass p-5">
                    <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-highlight text-highlight-foreground">
                      <feature.icon className="h-5 w-5" />
                    </div>
                    <h3 className="mb-1 font-semibold text-foreground">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground">{feature.description}</p>
                  </motion.div>
                ))}
              </div>

              <motion.div {...rise(0.5)} className="flex items-center gap-4 pt-2">
                <div className="flex -space-x-2">
                  {[...Array(4)].map((_, i) => (
                    <div
                      key={i}
                      className="brand-tile flex h-10 w-10 items-center justify-center rounded-full ring-2 ring-background"
                    >
                      <Users className="h-4 w-4" />
                    </div>
                  ))}
                </div>
                <div>
                  <p className="font-semibold text-foreground">+500 usuários</p>
                  <p className="text-sm text-muted-foreground">confiam na plataforma</p>
                </div>
              </motion.div>
            </div>

            {/* Right Side - Auth Card */}
            <motion.div {...rise(0.15)} className="glass-strong mx-auto w-full max-w-md p-6 sm:p-8">
              {/* Tabs */}
              <div className="mb-8 flex gap-1 rounded-full border border-edge bg-secondary p-1 shadow-glass">
                <button data-testid="tab-login" onClick={() => setActiveTab("login")} className={tabClass(activeTab === "login")}>
                  Entrar
                </button>
                <button data-testid="tab-register" onClick={() => setActiveTab("register")} className={tabClass(activeTab === "register")}>
                  Criar Conta
                </button>
              </div>

              {/* Login Form */}
              {activeTab === "login" && (
                <motion.form
                  initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  onSubmit={handleLogin}
                  className="space-y-5"
                >
                  <div className="space-y-2">
                    <Label htmlFor="login-email">E-mail</Label>
                    <div className="relative">
                      <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="login-email"
                        data-testid="input-login-email"
                        type="email"
                        placeholder="seu@email.com"
                        value={loginData.email}
                        onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                        required
                        className="h-12 rounded-2xl pl-11"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="login-password">Senha</Label>
                    <div className="relative">
                      <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="login-password"
                        data-testid="input-login-password"
                        type="password"
                        placeholder="••••••••"
                        value={loginData.password}
                        onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                        required
                        className="h-12 rounded-2xl pl-11"
                      />
                    </div>
                  </div>

                  <Button data-testid="button-login" type="submit" disabled={isLoading} size="lg" className="group w-full">
                    {isLoading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <>
                        Entrar
                        <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                      </>
                    )}
                  </Button>

                  <p className="text-center text-sm text-muted-foreground">
                    Não tem uma conta?{" "}
                    <button
                      type="button"
                      data-testid="link-goto-register"
                      onClick={() => setActiveTab("register")}
                      className="font-semibold text-primary underline-offset-4 hover:underline"
                    >
                      Criar agora
                    </button>
                  </p>
                </motion.form>
              )}

              {/* Register Form */}
              {activeTab === "register" && (
                <motion.form
                  initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  onSubmit={handleRegister}
                  className="space-y-4"
                >
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="register-name">Nome</Label>
                      <div className="relative">
                        <User className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          id="register-name"
                          data-testid="input-register-name"
                          placeholder="Seu nome"
                          value={registerData.name}
                          onChange={(e) => setRegisterData({ ...registerData, name: e.target.value })}
                          required
                          className="h-11 rounded-2xl pl-10"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="register-username">Usuário</Label>
                      <div className="relative">
                        <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">@</span>
                        <Input
                          id="register-username"
                          data-testid="input-register-username"
                          placeholder="usuario"
                          value={registerData.username}
                          onChange={(e) => setRegisterData({ ...registerData, username: e.target.value })}
                          required
                          className="h-11 rounded-2xl pl-8"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="register-email">E-mail</Label>
                    <div className="relative">
                      <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="register-email"
                        data-testid="input-register-email"
                        type="email"
                        placeholder="seu@email.com"
                        value={registerData.email}
                        onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                        required
                        className="h-11 rounded-2xl pl-11"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="register-phone">Telefone</Label>
                    <div className="relative">
                      <Phone className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="register-phone"
                        data-testid="input-register-phone"
                        placeholder="(00) 00000-0000"
                        value={registerData.phone}
                        onChange={(e) => setRegisterData({ ...registerData, phone: e.target.value })}
                        required
                        className="h-11 rounded-2xl pl-11"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="register-password">Senha</Label>
                    <div className="relative">
                      <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="register-password"
                        data-testid="input-register-password"
                        type="password"
                        placeholder="••••••••"
                        value={registerData.password}
                        onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                        required
                        className="h-11 rounded-2xl pl-11"
                      />
                    </div>
                  </div>

                  <Button data-testid="button-register" type="submit" disabled={isLoading} size="lg" className="group mt-2 w-full">
                    {isLoading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <>
                        Criar Conta
                        <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                      </>
                    )}
                  </Button>

                  <p className="text-center text-sm text-muted-foreground">
                    Já tem uma conta?{" "}
                    <button
                      type="button"
                      data-testid="link-goto-login"
                      onClick={() => setActiveTab("login")}
                      className="font-semibold text-primary underline-offset-4 hover:underline"
                    >
                      Fazer login
                    </button>
                  </p>
                </motion.form>
              )}
            </motion.div>
          </div>
        </div>

        {/* Footer */}
        <footer className="py-6 text-center text-sm text-muted-foreground">
          <p>© 2024 Loopag. Todos os direitos reservados.</p>
        </footer>
      </div>
    </div>
  );
}
