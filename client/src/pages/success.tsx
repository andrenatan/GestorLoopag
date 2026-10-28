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
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full p-2">
        <CardHeader className="text-center space-y-3">
          <div className="mx-auto w-16 h-16 rounded-full bg-success/15 flex items-center justify-center">
            <CheckCircle2 className="h-9 w-9 text-success" />
          </div>
          <CardTitle className="text-3xl sm:text-4xl font-semibold text-foreground">
            Pagamento Confirmado!
          </CardTitle>
          <CardDescription className="text-muted-foreground text-base sm:text-lg">
            Sua assinatura foi ativada com sucesso
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center text-foreground/90 space-y-2">
            <p>
              Obrigado por escolher o Loopag! Sua conta já está ativa e você tem acesso completo a todas as funcionalidades da plataforma.
            </p>
            <p className="text-sm text-muted-foreground">
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
