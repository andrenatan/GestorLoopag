import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Check, Loader2 } from "lucide-react";

interface Plan {
  id: number;
  name: string;
  price: number;
  billingPeriod: string;
  features: string[];
  isPopular: boolean;
  isActive: boolean;
}

export default function Plans() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: plans, isLoading } = useQuery<Plan[]>({
    queryKey: ["/api/plans"],
  });

  const checkoutMutation = useMutation({
    mutationFn: async (planId: number) => {
      const response = await apiRequest("/api/stripe/create-checkout-session", "POST", { planId });
      return response.json();
    },
    onSuccess: (data: { url: string }) => {
      // Redirect to Stripe checkout
      window.location.href = data.url;
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao processar pagamento",
        description: error.message || "Tente novamente mais tarde",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12 sm:py-16">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h1 className="font-display text-4xl sm:text-5xl font-semibold tracking-tight text-foreground mb-3">
            Escolha seu Plano
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground">
            Selecione o plano ideal para o seu negócio
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8 max-w-7xl mx-auto">
          {plans?.map((plan) => (
            <Card
              key={plan.id}
              className={`relative p-2 ${
                plan.isPopular
                  ? "border-primary/50 shadow-float lg:scale-[1.03]"
                  : ""
              }`}
            >
              {plan.isPopular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="bg-highlight text-highlight-foreground px-4 py-1.5 rounded-full text-sm font-semibold shadow-float">
                    Mais Popular
                  </span>
                </div>
              )}
              <CardHeader>
                <CardTitle className="text-2xl text-foreground">{plan.name}</CardTitle>
                <CardDescription className="text-muted-foreground">
                  <span className="font-display text-4xl font-semibold tracking-tight text-foreground">
                    R$ {Number(plan.price).toFixed(2)}
                  </span>
                  <span className="text-muted-foreground">
                    {plan.billingPeriod === "monthly" && "/mês"}
                    {plan.billingPeriod === "semiannual" && "/semestre"}
                    {plan.billingPeriod === "yearly" && "/ano"}
                    {plan.billingPeriod === "lifetime" && " único"}
                  </span>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-3">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-center text-foreground text-sm">
                      <Check className="h-5 w-5 mr-2 text-success flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  data-testid={`button-select-plan-${plan.id}`}
                  onClick={() => checkoutMutation.mutate(plan.id)}
                  disabled={checkoutMutation.isPending}
                  className="w-full"
                  variant={plan.isPopular ? "default" : "outline"}
                >
                  {checkoutMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Assinar Agora
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
