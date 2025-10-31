import { createContext, useContext, useEffect, useState } from "react";
import { User as SupabaseUser } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
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

  // Initialize auth state
  useEffect(() => {
    // Get current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSupabaseUser(session?.user ?? null);
      if (session?.user) {
        fetchUserMetadata(session.user.id);
      } else {
        setIsLoading(false);
      }
    });

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
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserMetadata = async (authUserId: string) => {
    try {
      const response = await fetch(`/api/users/by-auth-id/${authUserId}`);
      if (response.ok) {
        const metadata = await response.json();
        setUser(metadata);
      }
    } catch (error) {
      console.error("Error fetching user metadata:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (data: RegisterData) => {
    try {
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
      await apiRequest("/api/users/metadata", "POST", {
        authUserId: authData.user.id,
        name: data.name,
        username: data.username,
        email: data.email,
        phone: data.phone,
      });

      // User will be automatically logged in by Supabase
    } catch (error: any) {
      throw new Error(error.message || "Erro ao criar conta");
    }
  };

  const login = async (email: string, password: string) => {
    try {
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
      await supabase.auth.signOut();
      setLocation("/");
    } catch (error: any) {
      throw new Error(error.message || "Erro ao fazer logout");
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        supabaseUser,
        isLoading,
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
