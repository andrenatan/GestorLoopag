import { useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";

export default function Success() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    // Redirect to dashboard after successful payment
    const timer = setTimeout(() => {
      setLocation("/dashboard");
    }, 3000);

    return () => clearTimeout(timer);
  }, [setLocation]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-500 via-emerald-500 to-teal-500 dark:from-green-900 dark:via-emerald-900 dark:to-teal-900 flex items-center justify-center p-4">
      <Card className="glass-card max-w-2xl w-full">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <CheckCircle2 className="h-20 w-20 text-green-400" />
          </div>
          <CardTitle className="text-3xl text-white mb-2">
            Pagamento Confirmado!
          </CardTitle>
          <CardDescription className="text-white/70 text-lg">
            Sua assinatura foi ativada com sucesso
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center text-white/90">
            <p className="mb-4">
              Obrigado por escolher o Loopag! Sua conta já está ativa e você tem acesso completo a todas as funcionalidades da plataforma.
            </p>
            <p className="text-sm text-white/70">
              Você será redirecionado automaticamente em alguns segundos...
            </p>
          </div>
          
          <div className="flex gap-4 justify-center">
            <Button
              data-testid="button-go-dashboard"
              onClick={() => setLocation("/dashboard")}
              size="lg"
              className="w-full sm:w-auto"
            >
              Ir para o Dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
