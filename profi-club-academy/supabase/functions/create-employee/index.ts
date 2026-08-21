// POST { full_name, date_of_birth: "DD.MM.YY", employee_role: "manager"|"sales", department?, is_admin? }
// Admin-only. Creates the Supabase Auth user (synthetic email + DOB
// password) AND the public.employees row in one call.
import { corsHeaders } from "../_shared/cors.ts";
import { requireAdmin, parseDob } from "../_shared/admin-guard.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const guard = await requireAdmin(req);
  if (!guard.ok) return new Response(JSON.stringify({ error: guard.message }), { status: guard.status, headers: corsHeaders });
  const { admin } = guard;

  try {
    const body = await req.json();
    const { full_name, date_of_birth, employee_role, department, is_admin } = body;

    if (!full_name || !date_of_birth || !employee_role) {
      return new Response(JSON.stringify({ error: "full_name, date_of_birth, employee_role majburiy" }), { status: 400, headers: corsHeaders });
    }
    if (!["manager", "sales"].includes(employee_role)) {
      return new Response(JSON.stringify({ error: "employee_role 'manager' yoki 'sales' bo'lishi kerak" }), { status: 400, headers: corsHeaders });
    }
    const dob = parseDob(date_of_birth);
    if (!dob) {
      return new Response(JSON.stringify({ error: "date_of_birth DD.MM.YY formatida bo'lishi kerak" }), { status: 400, headers: corsHeaders });
    }

    // Deterministic synthetic email (uuid unknown yet, so use a random slug + timestamp to avoid collision)
    const slug = full_name.toLowerCase().replace(/[^a-z0-9]+/gi, "").slice(0, 20) || "emp";
    const loginEmail = `emp-${slug}-${Date.now().toString(36)}@proficlub.internal`;

    const { data: authUser, error: authErr } = await admin.auth.admin.createUser({
      email: loginEmail,
      password: dob.password,
      email_confirm: true,
    });
    if (authErr) return new Response(JSON.stringify({ error: `Auth xatosi: ${authErr.message}` }), { status: 400, headers: corsHeaders });

    const { data: employee, error: empErr } = await admin
      .from("employees")
      .insert({
        auth_user_id: authUser.user.id,
        login_email: loginEmail,
        full_name,
        date_of_birth: dob.isoDate,
        employee_role,
        department: department ?? null,
        is_admin: !!is_admin,
      })
      .select()
      .single();

    if (empErr) {
      // roll back the auth user if the employees insert failed (e.g. duplicate name isn't unique-constrained, but other issues might arise)
      await admin.auth.admin.deleteUser(authUser.user.id);
      return new Response(JSON.stringify({ error: `Employees jadvaliga yozishda xato: ${empErr.message}` }), { status: 400, headers: corsHeaders });
    }

    return new Response(JSON.stringify({ employee }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: corsHeaders });
  }
});
