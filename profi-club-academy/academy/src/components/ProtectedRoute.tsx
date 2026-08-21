import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ReactNode } from "react";

export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const { employee, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center text-navy">Юкланмоқда...</div>;
  if (!employee) return <Navigate to="/login" replace />;
  return <>{children}</>;
}
