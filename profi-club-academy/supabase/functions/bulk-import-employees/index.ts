// POST { employees: [{ full_name, date_of_birth: "DD.MM.YY", employee_role, department? }, ...] }
// Admin-only. Used by the "reyestr yuklash" (upload registry) CSV
// import screen. Creates each row's Auth user + employees row.
// Returns a per-row result so the UI can show which ones failed and why
// (e.g. malformed DOB, duplicate name) without losing the good rows.
import { corsHeaders } from "../_shared/cors.ts";
import { requireAdmin, parseDob } from "../_shared/admin-guard.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const guard = await requireAdmin(req);
  if (!guard.ok) return new Response(JSON.stringify({ error: guard.message }), { status: guard.status, headers: corsHeaders });
  const { admin } = guard;

  try {
    const { employees } = await req.json();
    if (!Array.isArray(employees) || employees.length === 0) {
      return new Response(JSON.stringify({ error: "employees ro'yxati bo'sh" }), { status: 400, headers: corsHeaders });
    }

    const results: Array<{ row: number; full_name: string; ok: boolean; error?: string }> = [];

    for (let i = 0; i < employees.length; i++) {
      const row = employees[i];
      const { full_name, date_of_birth, employee_role, department } = row;

      if (!full_name || !date_of_birth || !employee_role) {
        results.push({ row: i + 1, full_name: full_name ?? "?", ok: false, error: "full_name/date_of_birth/employee_role yetishmayapti" });
        continue;
      }
      if (!["manager", "sales"].includes(employee_role)) {
        results.push({ row: i + 1, full_name, ok: false, error: `noto'g'ri rol: ${employee_role}` });
        continue;
      }
      const dob = parseDob(String(date_of_birth));
      if (!dob) {
        results.push({ row: i + 1, full_name, ok: false, error: "sana DD.MM.YY formatida emas" });
        continue;
      }

      const slug = String(full_name).toLowerCase().replace(/[^a-z0-9]+/gi, "").slice(0, 20) || "emp";
      const loginEmail = `emp-${slug}-${Date.now().toString(36)}-${i}@proficlub.internal`;

      const { data: authUser, error: authErr } = await admin.auth.admin.createUser({
        email: loginEmail,
        password: dob.password,
        email_confirm: true,
      });
      if (authErr) {
        results.push({ row: i + 1, full_name, ok: false, error: authErr.message });
        continue;
      }

      const { error: empErr } = await admin.from("employees").insert({
        auth_user_id: authUser.user.id,
        login_email: loginEmail,
        full_name,
        date_of_birth: dob.isoDate,
        employee_role,
        department: department ?? null,
      });

      if (empErr) {
        await admin.auth.admin.deleteUser(authUser.user.id);
        results.push({ row: i + 1, full_name, ok: false, error: empErr.message });
        continue;
      }

      results.push({ row: i + 1, full_name, ok: true });
    }

    const successCount = results.filter((r) => r.ok).length;
    return new Response(
      JSON.stringify({ successCount, failCount: results.length - successCount, results }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: corsHeaders });
  }
});
