import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "../lib/supabase";
import { Employee } from "../lib/types";

interface AuthContextValue {
  employee: Employee | null;
  loading: boolean;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({ employee: null, loading: true, refresh: async () => {} });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadEmployee() {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      setEmployee(null);
      setLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from("employees")
      .select("id, full_name, employee_role, department, is_admin")
      .eq("auth_user_id", sessionData.session.user.id)
      .single();
    setEmployee(error ? null : (data as Employee));
    setLoading(false);
  }

  useEffect(() => {
    loadEmployee();
    const { data: listener } = supabase.auth.onAuthStateChange(() => {
      loadEmployee();
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  return <AuthContext.Provider value={{ employee, loading, refresh: loadEmployee }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
