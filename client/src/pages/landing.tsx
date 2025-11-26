import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
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
  Sparkles,
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
      setLocation("/dashboard");
    } catch (error: any) {
      toast({
        title: "Erro ao fazer login",
        description: error.message || "Verifique suas credenciais",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await register(registerData);
      setLocation("/plans");
    } catch (error: any) {
      toast({
        title: "Erro ao criar conta",
        description: error.message || "Tente novamente mais tarde",
        variant: "destructive",
      });
    } finally {
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

  return (
    <div className="min-h-screen relative overflow-hidden bg-[#0a0a1a]">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Gradient Orbs */}
        <motion.div
          animate={{
            x: [0, 100, 0],
            y: [0, -50, 0],
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute -top-40 -left-40 w-96 h-96 bg-gradient-to-r from-blue-600/30 to-purple-600/30 rounded-full blur-3xl"
        />
        <motion.div
          animate={{
            x: [0, -100, 0],
            y: [0, 50, 0],
            scale: [1, 1.3, 1],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute -bottom-40 -right-40 w-[500px] h-[500px] bg-gradient-to-r from-purple-600/30 to-pink-600/30 rounded-full blur-3xl"
        />
        <motion.div
          animate={{
            x: [0, 50, 0],
            y: [0, -30, 0],
          }}
          transition={{
            duration: 15,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-r from-indigo-600/20 to-cyan-600/20 rounded-full blur-3xl"
        />
        
        {/* Grid Pattern */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0wIDBoNjB2NjBIMHoiLz48cGF0aCBkPSJNMzAgMzBtLTEgMGExIDEgMCAxIDAgMiAwYTEgMSAwIDEgMCAtMiAwIiBmaWxsPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMDUpIi8+PC9nPjwvc3ZnPg==')] opacity-40" />
      </div>

      <div className="relative z-10 container mx-auto px-4 py-8 min-h-screen flex flex-col">
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="flex items-center justify-between mb-8"
        >
          <Link href="/" data-testid="link-back-home">
            <div className="inline-flex items-center gap-2 cursor-pointer group">
              <motion.div
                whileHover={{ rotate: 360 }}
                transition={{ duration: 0.5 }}
                className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/25"
              >
                <Tv className="w-6 h-6 text-white" />
              </motion.div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent group-hover:from-blue-300 group-hover:to-pink-300 transition-all">
                  Loopag
                </h1>
                <p className="text-gray-500 text-xs">
                  Voltar ao início
                </p>
              </div>
            </div>
          </Link>
          <div className="text-right hidden sm:block">
            <p className="text-gray-400 text-sm">
              Acesse sua conta
            </p>
            <p className="text-gray-500 text-xs">
              Sistema de Gestão IPTV
            </p>
          </div>
        </motion.header>

        {/* Main Content */}
        <div className="flex-1 flex items-center justify-center">
          <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Side - Features */}
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="hidden lg:block space-y-8"
            >
              <div>
                <h2 className="text-3xl font-bold text-white mb-4">
                  Gerencie seu negócio IPTV com
                  <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent"> eficiência</span>
                </h2>
                <p className="text-gray-400 text-lg">
                  Automatize cobranças, gerencie clientes e acompanhe métricas em tempo real.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {features.map((feature, index) => (
                  <motion.div
                    key={feature.title}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.4 + index * 0.1 }}
                    whileHover={{ scale: 1.02, y: -2 }}
                    className="group p-4 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 hover:border-blue-500/50 hover:bg-white/10 transition-all duration-300"
                  >
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center mb-3 group-hover:from-blue-500/30 group-hover:to-purple-500/30 transition-all">
                      <feature.icon className="w-5 h-5 text-blue-400" />
                    </div>
                    <h3 className="font-semibold text-white mb-1">{feature.title}</h3>
                    <p className="text-sm text-gray-500">{feature.description}</p>
                  </motion.div>
                ))}
              </div>

              <div className="flex items-center gap-4 pt-4">
                <div className="flex -space-x-2">
                  {[...Array(4)].map((_, i) => (
                    <div
                      key={i}
                      className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 border-2 border-[#0a0a1a] flex items-center justify-center"
                    >
                      <Users className="w-4 h-4 text-white" />
                    </div>
                  ))}
                </div>
                <div>
                  <p className="text-white font-semibold">+500 usuários</p>
                  <p className="text-sm text-gray-500">confiam na plataforma</p>
                </div>
              </div>
            </motion.div>

            {/* Right Side - Auth Card */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="w-full max-w-md mx-auto"
            >
              <div className="relative">
                {/* Glow Effect */}
                <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 rounded-3xl blur-xl opacity-30" />
                
                {/* Card */}
                <div className="relative bg-[#12121f]/90 backdrop-blur-xl rounded-3xl border border-white/10 p-8 shadow-2xl">
                  {/* Sparkle */}
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                    className="absolute -top-3 -right-3"
                  >
                    <Sparkles className="w-6 h-6 text-purple-400" />
                  </motion.div>

                  {/* Tabs */}
                  <div className="flex gap-2 p-1 bg-white/5 rounded-xl mb-8">
                    <button
                      data-testid="tab-login"
                      onClick={() => setActiveTab("login")}
                      className={`flex-1 py-3 px-4 rounded-lg text-sm font-medium transition-all duration-300 ${
                        activeTab === "login"
                          ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-500/25"
                          : "text-gray-400 hover:text-white"
                      }`}
                    >
                      Entrar
                    </button>
                    <button
                      data-testid="tab-register"
                      onClick={() => setActiveTab("register")}
                      className={`flex-1 py-3 px-4 rounded-lg text-sm font-medium transition-all duration-300 ${
                        activeTab === "register"
                          ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-500/25"
                          : "text-gray-400 hover:text-white"
                      }`}
                    >
                      Criar Conta
                    </button>
                  </div>

                  {/* Login Form */}
                  {activeTab === "login" && (
                    <motion.form
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                      onSubmit={handleLogin}
                      className="space-y-5"
                    >
                      <div className="space-y-2">
                        <Label htmlFor="login-email" className="text-gray-300 text-sm">
                          E-mail
                        </Label>
                        <div className="relative">
                          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                          <Input
                            id="login-email"
                            data-testid="input-login-email"
                            type="email"
                            placeholder="seu@email.com"
                            value={loginData.email}
                            onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                            required
                            className="pl-12 h-12 bg-white/5 border-white/10 text-white placeholder:text-gray-500 rounded-xl focus:border-blue-500 focus:ring-blue-500/20 transition-all"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="login-password" className="text-gray-300 text-sm">
                          Senha
                        </Label>
                        <div className="relative">
                          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                          <Input
                            id="login-password"
                            data-testid="input-login-password"
                            type="password"
                            placeholder="••••••••"
                            value={loginData.password}
                            onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                            required
                            className="pl-12 h-12 bg-white/5 border-white/10 text-white placeholder:text-gray-500 rounded-xl focus:border-blue-500 focus:ring-blue-500/20 transition-all"
                          />
                        </div>
                      </div>

                      <Button
                        data-testid="button-login"
                        type="submit"
                        disabled={isLoading}
                        className="w-full h-12 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-medium rounded-xl shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all duration-300 group"
                      >
                        {isLoading ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <>
                            Entrar
                            <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                          </>
                        )}
                      </Button>

                      <p className="text-center text-gray-500 text-sm">
                        Não tem uma conta?{" "}
                        <button
                          type="button"
                          data-testid="link-goto-register"
                          onClick={() => setActiveTab("register")}
                          className="text-blue-400 hover:text-blue-300 font-medium transition-colors"
                        >
                          Criar agora
                        </button>
                      </p>
                    </motion.form>
                  )}

                  {/* Register Form */}
                  {activeTab === "register" && (
                    <motion.form
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                      onSubmit={handleRegister}
                      className="space-y-4"
                    >
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="register-name" className="text-gray-300 text-sm">
                            Nome
                          </Label>
                          <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                            <Input
                              id="register-name"
                              data-testid="input-register-name"
                              placeholder="Seu nome"
                              value={registerData.name}
                              onChange={(e) => setRegisterData({ ...registerData, name: e.target.value })}
                              required
                              className="pl-10 h-11 bg-white/5 border-white/10 text-white placeholder:text-gray-500 rounded-xl focus:border-blue-500 text-sm"
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="register-username" className="text-gray-300 text-sm">
                            Usuário
                          </Label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">@</span>
                            <Input
                              id="register-username"
                              data-testid="input-register-username"
                              placeholder="usuario"
                              value={registerData.username}
                              onChange={(e) => setRegisterData({ ...registerData, username: e.target.value })}
                              required
                              className="pl-8 h-11 bg-white/5 border-white/10 text-white placeholder:text-gray-500 rounded-xl focus:border-blue-500 text-sm"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="register-email" className="text-gray-300 text-sm">
                          E-mail
                        </Label>
                        <div className="relative">
                          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                          <Input
                            id="register-email"
                            data-testid="input-register-email"
                            type="email"
                            placeholder="seu@email.com"
                            value={registerData.email}
                            onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                            required
                            className="pl-11 h-11 bg-white/5 border-white/10 text-white placeholder:text-gray-500 rounded-xl focus:border-blue-500 text-sm"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="register-phone" className="text-gray-300 text-sm">
                          Telefone
                        </Label>
                        <div className="relative">
                          <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                          <Input
                            id="register-phone"
                            data-testid="input-register-phone"
                            placeholder="(00) 00000-0000"
                            value={registerData.phone}
                            onChange={(e) => setRegisterData({ ...registerData, phone: e.target.value })}
                            required
                            className="pl-11 h-11 bg-white/5 border-white/10 text-white placeholder:text-gray-500 rounded-xl focus:border-blue-500 text-sm"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="register-password" className="text-gray-300 text-sm">
                          Senha
                        </Label>
                        <div className="relative">
                          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                          <Input
                            id="register-password"
                            data-testid="input-register-password"
                            type="password"
                            placeholder="••••••••"
                            value={registerData.password}
                            onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                            required
                            className="pl-11 h-11 bg-white/5 border-white/10 text-white placeholder:text-gray-500 rounded-xl focus:border-blue-500 text-sm"
                          />
                        </div>
                      </div>

                      <Button
                        data-testid="button-register"
                        type="submit"
                        disabled={isLoading}
                        className="w-full h-12 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-medium rounded-xl shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all duration-300 group mt-2"
                      >
                        {isLoading ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <>
                            Criar Conta
                            <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                          </>
                        )}
                      </Button>

                      <p className="text-center text-gray-500 text-sm">
                        Já tem uma conta?{" "}
                        <button
                          type="button"
                          data-testid="link-goto-login"
                          onClick={() => setActiveTab("login")}
                          className="text-blue-400 hover:text-blue-300 font-medium transition-colors"
                        >
                          Fazer login
                        </button>
                      </p>
                    </motion.form>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Footer */}
        <motion.footer
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="text-center py-6 text-gray-500 text-sm"
        >
          <p>© 2024 Loopag. Todos os direitos reservados.</p>
        </motion.footer>
      </div>
    </div>
  );
}
