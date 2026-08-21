# Profi Club Академияси

Internal training platform for Profi Club employees — two separate apps,
one Supabase backend.

```
academy/   → employee-facing app  (course catalog, quizzes, leaderboard, certificates)
admin/     → admin-only app       (course/module/quiz authoring, employee registry)
supabase/  → database schema, RLS policies, edge functions, bootstrap + seed scripts
```

## Why two apps

Employees and admins never see the same login screen or the same UI —
employees only ever pick their job type at registry time (Manager /
Sales person), never "admin". You'll deploy `academy` and `admin` as
**two separate Vercel projects from this one repo**:

1. In Vercel, "Add New Project" → import this repo → set **Root Directory**
   to `academy`. Deploy it to something like `akademiya.proficlub.uz`.
2. Repeat: import the same repo again → **Root Directory** `admin` →
   deploy to a subdomain you don't advertise publicly, e.g.
   `admin.proficlub.uz` or `boshqaruv.proficlub.uz`.

Both apps talk to the same Supabase project, so there's one source of
truth for courses, employees, and progress.

## Login design (Name + Surname, not email)

Supabase Auth needs an email under the hood, but employees never see
one. Here's what actually happens:

- Every employee gets a **synthetic email** (e.g. `emp-azizrahimov-xyz@proficlub.internal`)
  generated automatically when they're added — invisible in the UI.
- Their password **is** their date of birth, `DD.MM.YY`.
- At login, the app takes the typed Full Name, calls the `get_login_email()`
  Postgres function to find the matching synthetic email, then signs in
  normally with that email + the DOB the user typed as the password.
- `date_of_birth` is **never selected by the client** for login — the
  actual password check happens inside Supabase Auth against a securely
  hashed value. The `employees.date_of_birth` column is locked down by
  RLS (only the employee's own row, or an admin, can read it) purely so
  admins have a reference copy — it's not used to verify logins.

## Getting started

### 1. Create a Supabase project

Free tier is fine to start (see cost note below). In **SQL Editor**, run
in this order:
1. `supabase/schema.sql` — tables, views, RLS policies
2. `supabase/bootstrap_admin.sql` — follow the steps inside to create
   your first admin account (one manual step, then everything else is
   done from the admin app)
3. `supabase/seed_example.sql` — optional, a tiny test course so you
   can confirm everything works before real content is ready

### 2. Deploy the Edge Functions

The employee registry (add/delete/bulk-import) needs server-side
functions because creating logins requires Supabase's service-role key,
which must never be exposed in the browser.

```bash
npm install -g supabase
supabase login
supabase link --project-ref YOUR-PROJECT-REF
supabase functions deploy create-employee
supabase functions deploy bulk-import-employees
supabase functions deploy delete-employee
```

These deploy automatically with the right permissions — no extra env
vars needed beyond what Supabase sets by default.

### 3. Configure both apps

In `academy/.env` and `admin/.env` (copy from `.env.example`):
```
VITE_SUPABASE_URL=https://YOUR-PROJECT-ref.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR-ANON-PUBLIC-KEY
```
Both values are in Supabase → Project Settings → API. Add the same two
as Environment Variables in each Vercel project.

### 4. Run locally

```bash
cd academy && npm install && npm run dev
cd admin && npm install && npm run dev
```

### 5. Add your real employees

Log in to the admin app → **Ходимлар рўйхати** → upload a CSV (template
at `supabase/employee_registry_template.csv`) or add people one at a
time. Each row needs: `full_name, date_of_birth (DD.MM.YY), employee_role
(manager/sales), department`.

### 6. Add your first real course

Admin app → **Курслар** → create a course → fill in description/agenda
→ add modules (video or article, with a body, optional doc, and a quiz)
→ set status to **Эълон қилиш** (published) when ready. It appears in
the employee catalog immediately.

## One Supabase project or two?

You already run `proficlub-crm` in its own Supabase project. For this
platform you have two options:

- **New, separate project (what this schema assumes).** Simple, fully
  isolated, no risk to the CRM. Employee data lives in its own
  `employees` table here — you'll need to keep it in sync with the CRM
  roster (the CSV upload makes that manageable).
- **Same project as the CRM.** One source of truth for employees (no
  duplication), but means dropping the `employees` table in
  `schema.sql` and pointing everything at your existing CRM table
  instead — more setup work now, less sync work later. Worth doing
  once this MVP is approved and stable, not before.

Either way, Supabase's free tier covers 2 projects — see the earlier
cost breakdown you already have for the pause-after-inactivity caveat
once this goes to real employees.

## What's real vs. what's still a stub

Real and working once Supabase is connected: login, course CRUD,
module/quiz CRUD, quiz grading + gating, progress tracking, the
leaderboard views, certificates (PDF), feedback/comments, and the
employee registry (CSV + individual add/delete).

Not built yet, by design — flag to your boss as "next phase":
password reset flow (if someone forgets... their birthday, contact an
admin to reset via Supabase dashboard), file uploads for docs/quiz
images (currently just a URL field — pair with Supabase Storage next),
and course reordering drag-and-drop (currently just an order_index
column, edit order via the module list).
