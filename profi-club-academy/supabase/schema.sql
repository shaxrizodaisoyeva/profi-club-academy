-- =====================================================================
-- Profi Club Академияси — Supabase schema
-- Run this in Supabase SQL Editor (or via `supabase db push`) on a
-- fresh project. Designed to either live in its OWN Supabase project,
-- or be added to the SAME project as proficlub-crm (see README for the
-- tradeoffs) — if added to the CRM project, drop the `employees` table
-- below and point everything at your existing employees table instead.
-- =====================================================================

create extension if not exists "uuid-ossp";

-- ---------------------------------------------------------------------
-- EMPLOYEES
-- Mirrors what you need from the CRM. If you connect this schema to
-- the same Supabase project as proficlub-crm, drop this table and
-- alias `employees` to your existing table via a view instead.
-- ---------------------------------------------------------------------
create type employee_role as enum ('manager', 'sales');

create table employees (
  id uuid primary key default uuid_generate_v4(),
  auth_user_id uuid unique references auth.users(id) on delete set null,
  login_email text unique not null,   -- INTERNAL ONLY, never shown in UI. Supabase Auth
                                       -- requires an email under the hood; employees never
                                       -- see or type it — they log in with full_name + DOB.
  full_name text not null,
  date_of_birth date not null,        -- also the login password (DD.MM.YY), stored here only
                                       -- for admin reference. The real password lives hashed
                                       -- in auth.users — the app NEVER selects this column for
                                       -- the login flow, only Supabase Auth checks it.
  employee_role employee_role not null,
  department text,
  is_admin boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

comment on table employees is 'Login = full_name + date_of_birth (DD.MM.YY), entered as plain text in the UI. Internally this is translated to login_email + password via the get_login_email() RPC and Supabase Auth — see README "Auth design" section.';

-- Auto-generate a safe, unique, ASCII login_email if one wasn't supplied
-- (handles Cyrillic/Uzbek names which aren't valid in email addresses).
create or replace function generate_login_email() returns trigger as $$
begin
  if new.login_email is null or new.login_email = '' then
    new.login_email := 'emp-' || replace(new.id::text, '-', '') || '@proficlub.internal';
  end if;
  return new;
end;
$$ language plpgsql;

create trigger trg_generate_login_email
  before insert on employees
  for each row execute function generate_login_email();

-- Public, safe lookup used by the LOGIN SCREEN before the user is
-- authenticated: given a typed full name, return the internal login
-- email so the app can call supabase.auth.signInWithPassword() with
-- it + the DOB the user typed. Never returns date_of_birth or any
-- other column — this is the ONLY thing anonymous visitors can query.
create or replace function get_login_email(p_full_name text) returns text as $$
  select login_email
  from employees
  where lower(trim(full_name)) = lower(trim(p_full_name))
    and is_active = true
  limit 1;
$$ language sql stable security definer set search_path = public;

grant execute on function get_login_email(text) to anon, authenticated;

-- ---------------------------------------------------------------------
-- COURSES  (Coursera-like: description, agenda/syllabus, rating)
-- ---------------------------------------------------------------------
create type course_status as enum ('draft', 'published', 'archived');

create table courses (
  id uuid primary key default uuid_generate_v4(),
  slug text unique not null,
  title text not null,
  short_description text,
  full_description text,
  agenda jsonb not null default '[]',        -- [{ "title": "...", "summary": "..." }, ...]
  cover_image_url text,
  category text,
  status course_status not null default 'draft',
  pass_threshold_pct int not null default 80,  -- quiz pass % required per module
  created_by uuid references employees(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- MODULES  (video / article, ordered within a course)
-- ---------------------------------------------------------------------
create type module_type as enum ('video', 'article');

create table modules (
  id uuid primary key default uuid_generate_v4(),
  course_id uuid not null references courses(id) on delete cascade,
  order_index int not null,
  type module_type not null,
  title text not null,
  body text,                 -- article text / video description (HTML or markdown)
  video_url text,            -- YouTube/Vimeo embed or MP4 url
  doc_name text,              -- optional downloadable doc label
  doc_url text,
  created_at timestamptz not null default now(),
  unique (course_id, order_index)
);

-- ---------------------------------------------------------------------
-- QUIZZES  (one set of questions per module)
-- ---------------------------------------------------------------------
create table quiz_questions (
  id uuid primary key default uuid_generate_v4(),
  module_id uuid not null references modules(id) on delete cascade,
  order_index int not null,
  question_text text not null,
  created_at timestamptz not null default now()
);

create table quiz_options (
  id uuid primary key default uuid_generate_v4(),
  question_id uuid not null references quiz_questions(id) on delete cascade,
  order_index int not null,
  option_text text not null,
  is_correct boolean not null default false
);

-- ---------------------------------------------------------------------
-- ENROLLMENT + PROGRESS
-- ---------------------------------------------------------------------
create table enrollments (
  id uuid primary key default uuid_generate_v4(),
  employee_id uuid not null references employees(id) on delete cascade,
  course_id uuid not null references courses(id) on delete cascade,
  enrolled_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (employee_id, course_id)
);

create table module_progress (
  id uuid primary key default uuid_generate_v4(),
  employee_id uuid not null references employees(id) on delete cascade,
  module_id uuid not null references modules(id) on delete cascade,
  completed boolean not null default false,
  best_score_pct numeric,
  attempts int not null default 0,
  completed_at timestamptz,
  unique (employee_id, module_id)
);

create table quiz_attempts (
  id uuid primary key default uuid_generate_v4(),
  employee_id uuid not null references employees(id) on delete cascade,
  module_id uuid not null references modules(id) on delete cascade,
  score_pct numeric not null,
  passed boolean not null,
  attempted_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- CERTIFICATES
-- ---------------------------------------------------------------------
create table certificates (
  id uuid primary key default uuid_generate_v4(),
  employee_id uuid not null references employees(id) on delete cascade,
  course_id uuid not null references courses(id) on delete cascade,
  cert_number text unique not null,
  issued_at timestamptz not null default now(),
  unique (employee_id, course_id)
);

-- ---------------------------------------------------------------------
-- FEEDBACK  (post-course rating + comment — offers/complaints/praise)
-- ---------------------------------------------------------------------
create table course_feedback (
  id uuid primary key default uuid_generate_v4(),
  employee_id uuid not null references employees(id) on delete cascade,
  course_id uuid not null references courses(id) on delete cascade,
  rating int not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now(),
  unique (employee_id, course_id)
);

-- =====================================================================
-- VIEWS — leaderboards & aggregate ratings, used by both apps
-- =====================================================================

create or replace view course_ratings as
select
  course_id,
  round(avg(rating)::numeric, 2) as avg_rating,
  count(*) as rating_count
from course_feedback
group by course_id;

-- Per-course leaderboard: every enrolled employee, ascending by rank
-- (rank 1 = best). Score = average of best_score_pct across that
-- course's modules; tie-break = faster completion time.
create or replace view course_leaderboard as
select
  e.course_id,
  emp.id as employee_id,
  emp.full_name,
  emp.employee_role,
  round(avg(mp.best_score_pct)::numeric, 1) as avg_score_pct,
  count(mp.id) filter (where mp.completed) as modules_completed,
  (select count(*) from modules m where m.course_id = e.course_id) as modules_total,
  e.completed_at,
  rank() over (
    partition by e.course_id
    order by avg(mp.best_score_pct) desc nulls last, e.completed_at asc nulls last
  ) as rank
from enrollments e
join employees emp on emp.id = e.employee_id
left join modules m on m.course_id = e.course_id
left join module_progress mp on mp.module_id = m.id and mp.employee_id = e.employee_id
group by e.course_id, emp.id, emp.full_name, emp.employee_role, e.completed_at
order by e.course_id, rank asc;

create or replace view course_completion_stats as
select
  c.id as course_id,
  c.title,
  count(e.id) as enrolled_count,
  count(e.completed_at) as completed_count,
  case when count(e.id) > 0
    then round(100.0 * count(e.completed_at) / count(e.id), 1)
    else 0
  end as completion_rate_pct
from courses c
left join enrollments e on e.course_id = c.id
group by c.id, c.title;

-- =====================================================================
-- ROW LEVEL SECURITY
-- =====================================================================
alter table employees enable row level security;
alter table courses enable row level security;
alter table modules enable row level security;
alter table quiz_questions enable row level security;
alter table quiz_options enable row level security;
alter table enrollments enable row level security;
alter table module_progress enable row level security;
alter table quiz_attempts enable row level security;
alter table certificates enable row level security;
alter table course_feedback enable row level security;

create or replace function is_admin() returns boolean as $$
  select coalesce((select is_admin from employees where auth_user_id = auth.uid()), false);
$$ language sql stable security definer;

create or replace function my_employee_id() returns uuid as $$
  select id from employees where auth_user_id = auth.uid();
$$ language sql stable security definer;

-- IMPORTANT: employees is NOT broadly readable — it holds date_of_birth,
-- which doubles as everyone's password. Only an employee's own row, or
-- an admin, can read it. Anonymous name lookup for login goes through
-- get_login_email() above (security definer, returns only the email).
-- Leaderboards get names via the course_leaderboard VIEW below, which
-- exposes full_name/employee_role only, never date_of_birth.
create policy "employees_self_or_admin_read" on employees for select using (auth_user_id = auth.uid() or is_admin());
create policy "employees_admin_write" on employees for all using (is_admin()) with check (is_admin());

create policy "courses_read_published" on courses for select using (status = 'published' or is_admin());
create policy "courses_admin_write" on courses for all using (is_admin()) with check (is_admin());

create policy "modules_read" on modules for select using (
  is_admin() or exists (select 1 from courses c where c.id = course_id and c.status = 'published')
);
create policy "modules_admin_write" on modules for all using (is_admin()) with check (is_admin());

create policy "questions_read" on quiz_questions for select using (
  is_admin() or exists (
    select 1 from modules m join courses c on c.id = m.course_id
    where m.id = module_id and c.status = 'published'
  )
);
create policy "questions_admin_write" on quiz_questions for all using (is_admin()) with check (is_admin());

create policy "options_read" on quiz_options for select using (
  is_admin() or exists (
    select 1 from quiz_questions q join modules m on m.id = q.module_id
    join courses c on c.id = m.course_id
    where q.id = question_id and c.status = 'published'
  )
);
create policy "options_admin_write" on quiz_options for all using (is_admin()) with check (is_admin());

create policy "enrollments_own" on enrollments for select using (employee_id = my_employee_id() or is_admin());
create policy "enrollments_own_insert" on enrollments for insert with check (employee_id = my_employee_id());
create policy "enrollments_own_update" on enrollments for update using (employee_id = my_employee_id() or is_admin());

create policy "progress_read_all" on module_progress for select using (true);
create policy "progress_own_write" on module_progress for insert with check (employee_id = my_employee_id());
create policy "progress_own_update" on module_progress for update using (employee_id = my_employee_id());

create policy "attempts_own" on quiz_attempts for select using (employee_id = my_employee_id() or is_admin());
create policy "attempts_own_insert" on quiz_attempts for insert with check (employee_id = my_employee_id());

create policy "certs_read" on certificates for select using (employee_id = my_employee_id() or is_admin());
create policy "certs_insert" on certificates for insert with check (employee_id = my_employee_id());

create policy "feedback_read_all" on course_feedback for select using (true);
create policy "feedback_own_write" on course_feedback for insert with check (employee_id = my_employee_id());
create policy "feedback_own_update" on course_feedback for update using (employee_id = my_employee_id());

-- Views run with the schema owner's privileges (standard Supabase/Postgres
-- behaviour), so they can safely join the locked-down `employees` table
-- internally while only exposing the safe columns they SELECT (full_name,
-- employee_role — never date_of_birth). They still need their own grants:
grant select on course_ratings to authenticated;
grant select on course_leaderboard to authenticated;
grant select on course_completion_stats to authenticated;
