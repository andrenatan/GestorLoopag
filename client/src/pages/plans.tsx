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

  const selectPlanMutation = useMutation({
    mutationFn: async (planId: number) => {
      await apiRequest(`/api/users/${user?.id}/plan`, "PATCH", { planId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      toast({
        title: "Plano selecionado!",
        description: "Bem-vindo ao Loopag!",
      });
      setLocation("/dashboard");
    },
    onError: () => {
      toast({
        title: "Erro ao selecionar plano",
        description: "Tente novamente mais tarde",
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
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 dark:from-indigo-900 dark:via-purple-900 dark:to-pink-900 py-12">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">
            Escolha seu Plano
          </h1>
          <p className="text-xl text-white/90">
            Selecione o plano ideal para seu negócio
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans?.map((plan) => (
            <Card
              key={plan.id}
              className={`glass-card relative ${
                plan.isPopular ? "border-2 border-yellow-400" : ""
              }`}
            >
              {plan.isPopular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="bg-yellow-400 text-black px-4 py-1 rounded-full text-sm font-semibold">
                    Mais Popular
                  </span>
                </div>
              )}
              <CardHeader>
                <CardTitle className="text-2xl text-white">{plan.name}</CardTitle>
                <CardDescription className="text-white/70">
                  <span className="text-4xl font-bold text-white">
                    R$ {plan.price.toFixed(2)}
                  </span>
                  <span className="text-white/60">
                    {plan.billingPeriod === "monthly" && "/mês"}
                    {plan.billingPeriod === "quarterly" && "/trimestre"}
                    {plan.billingPeriod === "yearly" && "/ano"}
                  </span>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-3">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-center text-white">
                      <Check className="h-5 w-5 mr-2 text-green-400" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  data-testid={`button-select-plan-${plan.id}`}
                  onClick={() => selectPlanMutation.mutate(plan.id)}
                  disabled={selectPlanMutation.isPending}
                  className="w-full"
                  variant={plan.isPopular ? "default" : "outline"}
                >
                  {selectPlanMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Selecionar Plano
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
