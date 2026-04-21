create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  role text not null default 'rrhh' check (role in ('admin', 'rrhh', 'user')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tests (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  category text not null,
  description text,
  duration_minutes integer not null default 0,
  question_count integer not null default 0,
  status text not null default 'draft' check (status in ('active', 'draft', 'archived')),
  source text,
  questions jsonb not null default '[]'::jsonb,
  answer_key jsonb not null default '{}'::jsonb,
  areas jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(),
  token text not null unique,
  candidate_name text not null,
  candidate_email text,
  position text not null,
  status text not null default 'pending' check (status in ('pending', 'completed', 'archived')),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists public.application_tests (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications(id) on delete cascade,
  test_id uuid not null references public.tests(id) on delete restrict,
  status text not null default 'pending' check (status in ('pending', 'completed', 'archived')),
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (application_id, test_id)
);

create table if not exists public.responses (
  id uuid primary key default gen_random_uuid(),
  application_test_id uuid not null unique references public.application_tests(id) on delete cascade,
  answers jsonb not null default '{}'::jsonb,
  completed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.results (
  id uuid primary key default gen_random_uuid(),
  application_test_id uuid not null unique references public.application_tests(id) on delete cascade,
  score_total numeric,
  score_payload jsonb not null default '{}'::jsonb,
  interpretation text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_applications_token on public.applications(token);
create index if not exists idx_applications_created_by on public.applications(created_by);
create index if not exists idx_application_tests_application on public.application_tests(application_id);
create index if not exists idx_responses_application_test on public.responses(application_test_id);
create index if not exists idx_results_application_test on public.results(application_test_id);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists touch_profiles_updated_at on public.profiles;
create trigger touch_profiles_updated_at before update on public.profiles
for each row execute function public.touch_updated_at();

drop trigger if exists touch_tests_updated_at on public.tests;
create trigger touch_tests_updated_at before update on public.tests
for each row execute function public.touch_updated_at();

drop trigger if exists touch_applications_updated_at on public.applications;
create trigger touch_applications_updated_at before update on public.applications
for each row execute function public.touch_updated_at();

drop trigger if exists touch_results_updated_at on public.results;
create trigger touch_results_updated_at before update on public.results
for each row execute function public.touch_updated_at();

create or replace function public.current_profile_role()
returns text
language sql
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    coalesce(nullif(new.raw_user_meta_data->>'role', ''), 'rrhh')
  )
  on conflict (id) do update set
    email = excluded.email,
    full_name = coalesce(public.profiles.full_name, excluded.full_name);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.tests enable row level security;
alter table public.applications enable row level security;
alter table public.application_tests enable row level security;
alter table public.responses enable row level security;
alter table public.results enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'profiles' and policyname = 'profiles_select_internal') then
    create policy profiles_select_internal on public.profiles for select to authenticated
    using (id = auth.uid() or public.current_profile_role() = 'admin');
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'profiles' and policyname = 'profiles_update_admin') then
    create policy profiles_update_admin on public.profiles for update to authenticated
    using (public.current_profile_role() = 'admin')
    with check (public.current_profile_role() = 'admin');
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'profiles' and policyname = 'profiles_insert_self') then
    create policy profiles_insert_self on public.profiles for insert to authenticated
    with check (id = auth.uid() and role = 'rrhh');
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'tests' and policyname = 'tests_select_all') then
    create policy tests_select_all on public.tests for select to anon, authenticated using (true);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'tests' and policyname = 'tests_write_admin') then
    create policy tests_write_admin on public.tests for all to authenticated
    using (public.current_profile_role() = 'admin')
    with check (public.current_profile_role() = 'admin');
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'applications' and policyname = 'applications_select_public_and_internal') then
    create policy applications_select_public_and_internal on public.applications for select to anon, authenticated
    using (status <> 'archived' or public.current_profile_role() in ('admin', 'rrhh'));
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'applications' and policyname = 'applications_insert_internal') then
    create policy applications_insert_internal on public.applications for insert to authenticated
    with check (public.current_profile_role() in ('admin', 'rrhh'));
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'applications' and policyname = 'applications_update_internal') then
    create policy applications_update_internal on public.applications for update to anon, authenticated
    using (true)
    with check (true);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'applications' and policyname = 'applications_delete_internal') then
    create policy applications_delete_internal on public.applications for delete to authenticated
    using (public.current_profile_role() in ('admin', 'rrhh'));
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'application_tests' and policyname = 'application_tests_select_public_and_internal') then
    create policy application_tests_select_public_and_internal on public.application_tests for select to anon, authenticated using (true);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'application_tests' and policyname = 'application_tests_insert_internal') then
    create policy application_tests_insert_internal on public.application_tests for insert to authenticated
    with check (public.current_profile_role() in ('admin', 'rrhh'));
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'application_tests' and policyname = 'application_tests_update_public_submit') then
    create policy application_tests_update_public_submit on public.application_tests for update to anon, authenticated
    using (true)
    with check (true);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'responses' and policyname = 'responses_select_public_and_internal') then
    create policy responses_select_public_and_internal on public.responses for select to anon, authenticated using (true);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'responses' and policyname = 'responses_submit_public') then
    create policy responses_submit_public on public.responses for insert to anon, authenticated with check (true);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'responses' and policyname = 'responses_update_public') then
    create policy responses_update_public on public.responses for update to anon, authenticated using (true) with check (true);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'results' and policyname = 'results_select_public_and_internal') then
    create policy results_select_public_and_internal on public.results for select to anon, authenticated using (true);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'results' and policyname = 'results_submit_public') then
    create policy results_submit_public on public.results for insert to anon, authenticated with check (true);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'results' and policyname = 'results_update_public') then
    create policy results_update_public on public.results for update to anon, authenticated using (true) with check (true);
  end if;
end $$;

insert into public.tests (code, name, category, description, duration_minutes, question_count, status, source, answer_key, areas)
values
  (
    'moss',
    'Test de Moss',
    'Liderazgo y relaciones humanas',
    'Evalua criterio social, supervision, tacto y solucion de problemas interpersonales.',
    25,
    30,
    'active',
    'Transcrito en la app actual',
    '{"1":"c","2":"b","3":"d","4":"b","5":"b","6":"b","7":"b","8":"b","9":"c","10":"c","11":"a","12":"c","13":"d","14":"d","15":"d","16":"d","17":"b","18":"d","19":"c","20":"b","21":"a","22":"a","23":"a","24":"d","25":"b","26":"c","27":"a","28":"c","29":"a","30":"d"}'::jsonb,
    '{"A":{"name":"Habilidad en supervision","questions":[2,3,16,18,24,30],"scale":[0,17,34,50,67,84,100]},"B":{"name":"Capacidad de decision en relaciones humanas","questions":[4,6,20,23,29],"scale":[0,20,40,60,80,100]},"C":{"name":"Evaluacion de problemas interpersonales","questions":[7,9,12,14,19,21,26,27],"scale":[0,13,25,38,50,63,75,88,100]},"D":{"name":"Habilidad para establecer relaciones","questions":[1,10,11,13,25],"scale":[0,20,40,60,80,100]},"E":{"name":"Sentido comun y tacto","questions":[5,8,15,17,22,28],"scale":[0,17,34,50,67,84,100]}}'::jsonb
  ),
  (
    '16pf-102',
    '16 PF 102 items',
    'Personalidad',
    'Catalogado desde Recursos/examen dos. Pendiente de captura estructurada de reactivos, claves y baremos.',
    45,
    102,
    'draft',
    'Recursos/examen dos',
    '{}'::jsonb,
    '{}'::jsonb
  ),
  (
    'zavic',
    'Zavic',
    'Valores e intereses',
    'Catalogado desde Recursos/examen tres. Pendiente de captura estructurada de cuadernillo e interpretacion.',
    25,
    0,
    'draft',
    'Recursos/examen tres',
    '{}'::jsonb,
    '{}'::jsonb
  ),
  (
    '360-lider',
    'Evaluacion 360 lider',
    'Desempeno',
    'Catalogado desde Recursos/un examen. Preparado para evaluadores multiples y reporte consolidado.',
    30,
    0,
    'draft',
    'Recursos/un examen',
    '{}'::jsonb,
    '{}'::jsonb
  )
on conflict (code) do update set
  name = excluded.name,
  category = excluded.category,
  description = excluded.description,
  duration_minutes = excluded.duration_minutes,
  question_count = excluded.question_count,
  status = excluded.status,
  source = excluded.source,
  answer_key = excluded.answer_key,
  areas = excluded.areas,
  updated_at = now();
