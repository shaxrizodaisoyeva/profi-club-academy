// Shared helper: verifies the caller's JWT belongs to an employee with
// is_admin = true before allowing any registry-editing operation.
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

export async function requireAdmin(req: Request): Promise<{ ok: true; admin: SupabaseClient } | { ok: false; status: number; message: string }> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return { ok: false, status: 401, message: "Тизимга кирилмаган (missing Authorization header)" };

  const url = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

  // Client scoped to the caller's own JWT, just to identify who they are
  const callerClient = createClient(url, anonKey, { global: { headers: { Authorization: authHeader } } });
  const { data: userData, error: userErr } = await callerClient.auth.getUser();
  if (userErr || !userData?.user) return { ok: false, status: 401, message: "Фойдаланувчи топилмади" };

  // Service-role client for privileged checks/writes
  const admin = createClient(url, serviceKey);
  const { data: employee, error: empErr } = await admin
    .from("employees")
    .select("is_admin")
    .eq("auth_user_id", userData.user.id)
    .single();

  if (empErr || !employee?.is_admin) return { ok: false, status: 403, message: "Faqat admin uchun ruxsat etilgan" };
  return { ok: true, admin };
}

// DOB accepted as DD.MM.YY from the UI/CSV — convert to a real password
// string and to an ISO date for storage.
export function parseDob(dobDDMMYY: string): { password: string; isoDate: string } | null {
  const m = dobDDMMYY.trim().match(/^(\d{2})\.(\d{2})\.(\d{2})$/);
  if (!m) return null;
  const [, dd, mm, yy] = m;
  const century = Number(yy) <= 30 ? "20" : "19"; // adjust cutoff as needed
  return { password: dobDDMMYY.trim(), isoDate: `${century}${yy}-${mm}-${dd}` };
}
