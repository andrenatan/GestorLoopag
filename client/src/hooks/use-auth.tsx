import { createContext, useContext, useEffect, useState } from "react";
import { User as SupabaseUser } from "@supabase/supabase-js";
import { getSupabase } from "@/lib/supabase";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";

interface UserMetadata {
  id: number;
  name: string | null;
  username: string;
  email: string | null;
  phone: string | null;
  planId: number | null;
  role: string;
}

interface AuthContextType {
  user: UserMetadata | null;
  supabaseUser: SupabaseUser | null;
  isLoading: boolean;
  isReady: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

interface RegisterData {
  name: string;
  username: string;
  email: string;
  phone: string;
  password: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [, setLocation] = useLocation();
  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null);
  const [user, setUser] = useState<UserMetadata | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isReady, setIsReady] = useState(false);

  // Initialize auth state
  useEffect(() => {
    const initAuth = async () => {
      try {
        const supabase = await getSupabase();
        
        // Get current session
        const { data: { session } } = await supabase.auth.getSession();
        setSupabaseUser(session?.user ?? null);
        if (session?.user) {
          fetchUserMetadata(session.user.id);
        } else {
          setIsLoading(false);
          setIsReady(true);
        }

        // Listen for auth changes
        const {
          data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
          setSupabaseUser(session?.user ?? null);
          if (session?.user) {
            fetchUserMetadata(session.user.id);
          } else {
            setUser(null);
            setIsLoading(false);
            setIsReady(true);
          }
        });

        return subscription;
      } catch (error) {
        console.error("Failed to initialize auth:", error);
        setIsLoading(false);
        setIsReady(true);
        return null;
      }
    };

    let subscription: { unsubscribe: () => void } | null = null;
    
    initAuth().then((sub) => {
      subscription = sub;
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const fetchUserMetadata = async (authUserId: string) => {
    try {
      const supabase = await getSupabase();
      const { data: { session } } = await supabase.auth.getSession();
      
      const headers: HeadersInit = {};
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }
      
      const response = await fetch(`/api/users/by-auth-id/${authUserId}`, { headers });
      if (response.ok) {
        const metadata = await response.json();
        setUser(metadata);
      }
    } catch (error) {
      console.error("Error fetching user metadata:", error);
    } finally {
      setIsLoading(false);
      setIsReady(true);
    }
  };

  const register = async (data: RegisterData) => {
    try {
      const supabase = await getSupabase();
      
      // 1. Create Supabase auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            name: data.name,
            username: data.username,
            phone: data.phone,
          },
        },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("Failed to create user");

      // 2. Create user metadata in our database
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error("Falha ao obter token de autenticação");
      }

      const response = await fetch("/api/users/metadata", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          name: data.name,
          username: data.username,
          email: data.email,
          phone: data.phone,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Erro ao criar metadata do usuário");
      }

      // User will be automatically logged in by Supabase
    } catch (error: any) {
      throw new Error(error.message || "Erro ao criar conta");
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const supabase = await getSupabase();
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
    } catch (error: any) {
      throw new Error(error.message || "Erro ao fazer login");
    }
  };

  const logout = async () => {
    try {
      // Limpar estado local PRIMEIRO para evitar redirecionamentos prematuros
      setUser(null);
      setSupabaseUser(null);
      
      // Limpar qualquer dado de sessão do localStorage do Supabase
      const supabase = await getSupabase();
      
      // Fazer signOut no Supabase (isso limpa a sessão no servidor e localStorage)
      await supabase.auth.signOut();
      
      // Redirecionar para a página inicial
      setLocation("/");
    } catch (error: any) {
      // Mesmo em caso de erro, garantir que o usuário local está limpo
      setUser(null);
      setSupabaseUser(null);
      throw new Error(error.message || "Erro ao fazer logout");
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        supabaseUser,
        isLoading,
        isReady,
        login,
        register,
        logout,
        isAuthenticated: !!supabaseUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
