import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Tv, Users, Zap, Check } from "lucide-react";

export default function Landing() {
  const [, setLocation] = useLocation();
  const { login, register } = useAuth();
  const { toast } = useToast();
  
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 dark:from-indigo-900 dark:via-purple-900 dark:to-pink-900">
      <div className="container mx-auto px-4 py-12">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-white mb-4">
            Loopag
          </h1>
          <p className="text-xl text-white/90 mb-8">
            Sistema Completo de Gestão IPTV
          </p>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <div className="glass-card p-6 text-center text-white">
            <Tv className="h-12 w-12 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Gestão de Clientes</h3>
            <p className="text-sm text-white/80">
              Controle completo de assinaturas IPTV
            </p>
          </div>
          <div className="glass-card p-6 text-center text-white">
            <Zap className="h-12 w-12 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Cobranças Automáticas</h3>
            <p className="text-sm text-white/80">
              Automação via WhatsApp integrado
            </p>
          </div>
          <div className="glass-card p-6 text-center text-white">
            <Users className="h-12 w-12 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Equipe Completa</h3>
            <p className="text-sm text-white/80">
              Gestão de funcionários e comissões
            </p>
          </div>
        </div>

        {/* Auth Card */}
        <div className="max-w-md mx-auto">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-white">Acesse sua Conta</CardTitle>
              <CardDescription className="text-white/70">
                Entre ou crie sua conta gratuitamente
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="login" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-4">
                  <TabsTrigger value="login">Entrar</TabsTrigger>
                  <TabsTrigger value="register">Cadastrar</TabsTrigger>
                </TabsList>

                <TabsContent value="login">
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                      <Input
                        data-testid="input-login-email"
                        type="email"
                        placeholder="E-mail"
                        value={loginData.email}
                        onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                        required
                        className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                      />
                    </div>
                    <div>
                      <Input
                        data-testid="input-login-password"
                        type="password"
                        placeholder="Senha"
                        value={loginData.password}
                        onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                        required
                        className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                      />
                    </div>
                    <Button 
                      data-testid="button-login"
                      type="submit" 
                      className="w-full" 
                      disabled={isLoading}
                    >
                      {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Entrar
                    </Button>
                  </form>
                </TabsContent>

                <TabsContent value="register">
                  <form onSubmit={handleRegister} className="space-y-4">
                    <div>
                      <Input
                        data-testid="input-register-name"
                        placeholder="Nome Completo"
                        value={registerData.name}
                        onChange={(e) => setRegisterData({ ...registerData, name: e.target.value })}
                        required
                        className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                      />
                    </div>
                    <div>
                      <Input
                        data-testid="input-register-username"
                        placeholder="Usuário"
                        value={registerData.username}
                        onChange={(e) => setRegisterData({ ...registerData, username: e.target.value })}
                        required
                        className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                      />
                    </div>
                    <div>
                      <Input
                        data-testid="input-register-email"
                        type="email"
                        placeholder="E-mail"
                        value={registerData.email}
                        onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                        required
                        className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                      />
                    </div>
                    <div>
                      <Input
                        data-testid="input-register-phone"
                        placeholder="Telefone"
                        value={registerData.phone}
                        onChange={(e) => setRegisterData({ ...registerData, phone: e.target.value })}
                        required
                        className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                      />
                    </div>
                    <div>
                      <Input
                        data-testid="input-register-password"
                        type="password"
                        placeholder="Senha"
                        value={registerData.password}
                        onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                        required
                        className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                      />
                    </div>
                    <Button 
                      data-testid="button-register"
                      type="submit" 
                      className="w-full" 
                      disabled={isLoading}
                    >
                      {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Criar Conta
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
