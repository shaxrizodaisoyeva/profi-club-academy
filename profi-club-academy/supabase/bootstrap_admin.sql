-- =====================================================================
-- ONE-TIME: create your very first admin account.
-- The admin app itself can't create the first admin (chicken-and-egg —
-- adding employees requires already being an admin), so this one step
-- is done by hand, directly in Supabase. After this, do everything
-- else (more admins, all employees) from the admin app's "Ходимлар
-- рўйхати" page.
-- =====================================================================

-- STEP 1 — In the Supabase Dashboard:
--   Authentication → Users → Add user
--     Email:    admin@proficlub.internal   (anything ending in
--               @proficlub.internal works — it's never shown to anyone)
--     Password: your chosen DOB in DD.MM.YY format, e.g. 15.04.90
--     ✅ Auto Confirm User
--   Copy the new user's UUID (shown in the users table after creation).

-- STEP 2 — Run this in the SQL Editor, filling in your details:
insert into employees (auth_user_id, login_email, full_name, date_of_birth, employee_role, is_admin)
values (
  'PASTE-THE-UUID-FROM-STEP-1-HERE',
  'admin@proficlub.internal',           -- must exactly match the email used in Step 1
  'Ism Familiya',                        -- your real name — this is what you'll type to log in
  '1990-04-15',                          -- ISO format here (YYYY-MM-DD), matching the DOB you set as the password
  'manager',
  true                                   -- is_admin
);

-- STEP 3 — Log in to the admin app with:
--   Исм Фамилия: Ism Familiya
--   Туғилган сана: 15.04.90
-- From here on, add every other admin and employee through the admin
-- app's "Ходимлар рўйхати" page — no more manual SQL needed.
