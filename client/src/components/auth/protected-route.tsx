import { useAuth } from "@/hooks/use-auth";
import { Redirect } from "wouter";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, isReady } = useAuth();

  if (isLoading || !isReady) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Redirect to="/" />;
  }

  return <>{children}</>;
}

export function PublicRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, isReady, user, isOwner } = useAuth();

  if (isLoading || !isReady) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isAuthenticated) {
    // Wait for metadata so we can route owner vs employee correctly
    if (!user) {
      return (
        <div className="flex h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      );
    }
    return <Redirect to={isOwner ? "/dashboard" : "/clients"} />;
  }

  return <>{children}</>;
}

export function RequireOwner({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, isReady, isOwner, user } = useAuth();

  if (isLoading || !isReady) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Redirect to="/" />;
  }

  // Wait for user metadata to load before deciding (avoids flicker)
  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isOwner) {
    return (
      <div className="flex h-screen items-center justify-center p-6">
        <div className="text-center max-w-md">
          <h2 className="text-2xl font-bold mb-2">Acesso restrito</h2>
          <p className="text-muted-foreground">
            Você não tem acesso a esta tela. Verifique com seu gestor.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

interface RequirePermissionProps extends ProtectedRouteProps {
  permission: string;
}

// Granular version of RequireOwner: the owner always passes; an employee only
// passes if `permission` is in their linked employees.permissions. Guards
// against direct URL access to a page the sidebar already hides for them.
export function RequirePermission({ children, permission }: RequirePermissionProps) {
  const { isAuthenticated, isLoading, isReady, hasPermission, user } = useAuth();

  if (isLoading || !isReady) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Redirect to="/" />;
  }

  // Wait for user metadata to load before deciding (avoids flicker)
  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!hasPermission(permission)) {
    return (
      <div className="flex h-screen items-center justify-center p-6">
        <div className="text-center max-w-md">
          <h2 className="text-2xl font-bold mb-2">Acesso restrito</h2>
          <p className="text-muted-foreground">
            Você não tem acesso a esta tela. Verifique com seu gestor.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
