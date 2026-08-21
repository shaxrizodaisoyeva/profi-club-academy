import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "../lib/supabase";
import { Employee } from "../lib/types";

interface AuthContextValue {
  employee: Employee | null;
  loading: boolean;
  notAdmin: boolean; // logged in successfully but is_admin = false — reject with a message
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({ employee: null, loading: true, notAdmin: false, refresh: async () => {} });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [notAdmin, setNotAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  async function loadEmployee() {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      setEmployee(null);
      setNotAdmin(false);
      setLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from("employees")
      .select("id, full_name, employee_role, department, is_admin")
      .eq("auth_user_id", sessionData.session.user.id)
      .single();

    if (error || !data) {
      setEmployee(null);
      setNotAdmin(false);
    } else if (!data.is_admin) {
      // Correct credentials, but this person isn't an admin — this app
      // is admin-only, so sign them back out immediately.
      await supabase.auth.signOut();
      setEmployee(null);
      setNotAdmin(true);
    } else {
      setEmployee(data as Employee);
      setNotAdmin(false);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadEmployee();
    const { data: listener } = supabase.auth.onAuthStateChange(() => {
      loadEmployee();
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  return <AuthContext.Provider value={{ employee, loading, notAdmin, refresh: loadEmployee }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
