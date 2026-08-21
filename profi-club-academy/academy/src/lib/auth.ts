import { supabase } from "./supabase";

// The UI only ever asks for Full Name + DOB (DD.MM.YY). Internally we
// look up the employee's synthetic login email via the get_login_email
// RPC (a security-definer Postgres function — see supabase/schema.sql),
// then sign in normally with that email + the DOB as the password.
// The employee never sees or knows this email exists.

export type LoginResult =
  | { ok: true }
  | { ok: false; message: string };

export async function loginWithNameAndDob(fullName: string, dobDDMMYY: string): Promise<LoginResult> {
  const trimmedName = fullName.trim();
  const trimmedDob = dobDDMMYY.trim();

  if (!trimmedName || !/^\d{2}\.\d{2}\.\d{2}$/.test(trimmedDob)) {
    return { ok: false, message: "Исм-фамилия ва туғилган сана (КК.ОО.ЙЙ) тўғри киритилганини текширинг" };
  }

  const { data: loginEmail, error: rpcError } = await supabase.rpc("get_login_email", { p_full_name: trimmedName });
  if (rpcError || !loginEmail) {
    return { ok: false, message: "Бундай исм-фамилияли фойдаланувчи топилмади. Админ билан боғланинг" };
  }

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: loginEmail as string,
    password: trimmedDob,
  });

  if (signInError) {
    return { ok: false, message: "Туғилган сана нотўғри киритилди" };
  }

  return { ok: true };
}

export async function logout() {
  await supabase.auth.signOut();
}
