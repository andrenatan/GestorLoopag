import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, Home } from "lucide-react";
import { Link } from "wouter";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md rounded-2xl">
        <CardContent className="pt-6 text-center space-y-4">
          <div className="mx-auto w-14 h-14 rounded-xl bg-destructive/10 border border-destructive/20 flex items-center justify-center">
            <AlertCircle className="h-7 w-7 text-destructive" />
          </div>

          <div className="space-y-1.5">
            <h1 className="text-2xl font-bold text-foreground">
              Página não encontrada
            </h1>
            <p className="text-sm text-muted-foreground">
              O endereço que você tentou acessar não existe ou foi movido.
            </p>
          </div>

          <Link href="/dashboard" data-testid="link-back-dashboard">
            <Button className="w-full sm:w-auto">
              <Home className="h-4 w-4 mr-2" />
              Voltar ao início
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
