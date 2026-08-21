// POST { employee_id }
// Admin-only. Removes both the Auth user and the employees row so a
// deleted employee immediately loses access (hard delete). If you'd
// rather keep history, use PATCH employees.is_active=false from the
// admin app instead of calling this function.
import { corsHeaders } from "../_shared/cors.ts";
import { requireAdmin } from "../_shared/admin-guard.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const guard = await requireAdmin(req);
  if (!guard.ok) return new Response(JSON.stringify({ error: guard.message }), { status: guard.status, headers: corsHeaders });
  const { admin } = guard;

  try {
    const { employee_id } = await req.json();
    if (!employee_id) return new Response(JSON.stringify({ error: "employee_id majburiy" }), { status: 400, headers: corsHeaders });

    const { data: employee, error: findErr } = await admin
      .from("employees")
      .select("auth_user_id")
      .eq("id", employee_id)
      .single();
    if (findErr || !employee) return new Response(JSON.stringify({ error: "Xodim topilmadi" }), { status: 404, headers: corsHeaders });

    const { error: delEmpErr } = await admin.from("employees").delete().eq("id", employee_id);
    if (delEmpErr) return new Response(JSON.stringify({ error: delEmpErr.message }), { status: 400, headers: corsHeaders });

    if (employee.auth_user_id) {
      await admin.auth.admin.deleteUser(employee.auth_user_id); // best-effort; employees row is already gone
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: corsHeaders });
  }
});
