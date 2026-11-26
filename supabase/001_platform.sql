-- Sprint Zero: структура бази платформи (v1, бета).
-- Запускати один раз у Supabase → SQL Editor. Повторний запуск безпечний.

-- ---------- налаштування ----------
create table if not exists public.settings (
  key text primary key,
  value jsonb
);
insert into public.settings (key, value) values
  ('admin_emails', '["dimalucenko40@gmail.com"]'::jsonb),
  ('beta_end', 'null'::jsonb)
on conflict (key) do nothing;

-- ---------- профілі ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  avatar_url text,
  is_admin boolean not null default false,
  marketing_consent boolean not null default false,
  consent_at timestamptz,
  terms_accepted_at timestamptz,
  onboarding jsonb not null default '{}'::jsonb,
  utm jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz
);

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false);
$$;

-- новий користувач → профіль
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare admins jsonb;
begin
  select value into admins from public.settings where key = 'admin_emails';
  insert into public.profiles (id, email, full_name, avatar_url, is_admin)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'avatar_url',
    coalesce(admins ? lower(new.email), false)
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- користувач не може сам зробити себе адміном
create or replace function public.protect_profile() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    new.is_admin := old.is_admin;
    new.email := old.email;
    new.created_at := old.created_at;
  end if;
  return new;
end $$;

drop trigger if exists protect_profile on public.profiles;
create trigger protect_profile before update on public.profiles
  for each row execute function public.protect_profile();

-- ---------- стан користувача (дзеркало localStorage) ----------
create table if not exists public.user_state (
  user_id uuid not null references auth.users(id) on delete cascade,
  key text not null check (length(key) <= 120),
  value text not null check (length(value) <= 1000000),
  updated_at timestamptz not null default now(),
  primary key (user_id, key)
);

-- ---------- події аналітики ----------
create table if not exists public.events (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id) on delete set null,
  anon_id text check (length(anon_id) <= 64),
  name text not null check (length(name) <= 64),
  course text check (length(course) <= 16),
  lesson text check (length(lesson) <= 16),
  props jsonb not null default '{}'::jsonb check (length(props::text) <= 2000),
  created_at timestamptz not null default now()
);
create index if not exists events_user_idx on public.events (user_id, created_at desc);
create index if not exists events_name_idx on public.events (name, created_at desc);

-- ---------- фідбек ----------
create table if not exists public.feedback (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  course text not null,
  scope text not null check (scope in ('lesson','week','final')),
  ref text not null,
  rating int check (rating between 1 and 5),
  comment text check (length(comment) <= 4000),
  created_at timestamptz not null default now()
);

-- ---------- сертифікати ----------
create table if not exists public.cert_counters (
  course text primary key,
  last int not null default 0
);

create table if not exists public.certificates (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  number text not null unique,
  user_id uuid not null references auth.users(id) on delete cascade,
  course text not null,
  name_uk text not null check (length(name_uk) between 2 and 80),
  name_lat text not null check (length(name_lat) between 2 and 80),
  first_cohort boolean not null default false,
  issued_at timestamptz not null default now(),
  revoked_at timestamptz,
  unique (user_id, course)
);

-- вимоги для сертифіката курсу PM: мін. кількість заповнених полів у практичних уроках
create table if not exists public.cert_requirements (
  course text primary key,
  lessons_total int not null,
  practice_min jsonb not null,
  final_lesson text not null,
  quiz_min_ratio numeric not null
);
insert into public.cert_requirements values
  ('pm', 36,
   '{"01-3":11,"02-3":10,"03-3":10,"04-3":11,"05-3":9,"06-3":7,"07-3":6,"08-3":25,"09-3":6,"10-3":3,"11-3":6,"12-3":6}'::jsonb,
   '12-3', 0.7)
on conflict (course) do update set
  lessons_total = excluded.lessons_total, practice_min = excluded.practice_min,
  final_lesson = excluded.final_lesson, quiz_min_ratio = excluded.quiz_min_ratio;

-- перевірка критеріїв за збереженими даними користувача
create or replace function public.cert_status(p_course text default 'pm', p_user uuid default null)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  uid uuid := coalesce(p_user, auth.uid());
  req public.cert_requirements;
  progress jsonb; wb jsonb;
  done_cnt int := 0; lid text; need int; have int;
  missing jsonb := '[]'::jsonb;
  quiz text; q_right int; q_total int; quiz_ok boolean := false;
begin
  if p_user is not null and p_user <> auth.uid() and not public.is_admin() then
    raise exception 'forbidden';
  end if;
  select * into req from public.cert_requirements where course = p_course;
  select value::jsonb into progress from public.user_state where user_id = uid and key = 'pmz-progress-v1';
  select value::jsonb into wb from public.user_state where user_id = uid and key = 'pmz-workbook-v1';
  select count(*) into done_cnt from jsonb_object_keys(coalesce(progress->'done', '{}'::jsonb));

  for lid, need in select key, value::int from jsonb_each_text(req.practice_min) loop
    select count(*) into have
    from jsonb_each(coalesce(wb->'fields'->lid, '{}'::jsonb)) f
    where f.key not in ('quiz','quiz-raw') and f.key not like '%-raw'
      and coalesce((f.value->>'hidden')::boolean, false) = false
      and length(trim(coalesce(f.value->>'v',''))) >= 3;
    if have < need then
      missing := missing || jsonb_build_object('lesson', lid, 'have', have, 'need', need);
    end if;
  end loop;

  quiz := wb->'fields'->req.final_lesson->'quiz'->>'v';
  if quiz ~ '^\d+ з \d+' then
    q_right := substring(quiz from '^(\d+)')::int;
    q_total := substring(quiz from '^\d+ з (\d+)')::int;
    quiz_ok := q_total > 0 and q_right::numeric / q_total >= req.quiz_min_ratio;
  end if;

  return jsonb_build_object(
    'lessons_done', done_cnt, 'lessons_total', req.lessons_total,
    'lessons_ok', done_cnt >= req.lessons_total,
    'practice_missing', missing, 'practice_ok', jsonb_array_length(missing) = 0,
    'quiz', quiz, 'quiz_ok', quiz_ok,
    'eligible', done_cnt >= req.lessons_total and jsonb_array_length(missing) = 0 and quiz_ok
  );
end $$;

-- видача сертифіката: номер і дата — тільки на сервері
create or replace function public.issue_certificate(p_course text, p_name_uk text, p_name_lat text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  st jsonb; n int; c public.certificates; beta jsonb; created timestamptz;
begin
  if uid is null then raise exception 'not_signed_in'; end if;
  select * into c from public.certificates where user_id = uid and course = p_course;
  if found then return to_jsonb(c); end if;
  st := public.cert_status(p_course, null);
  if not (st->>'eligible')::boolean then raise exception 'not_eligible'; end if;
  insert into public.cert_counters (course, last) values (p_course, 0) on conflict do nothing;
  update public.cert_counters set last = last + 1 where course = p_course returning last into n;
  select value into beta from public.settings where key = 'beta_end';
  select created_at into created from public.profiles where id = uid;
  insert into public.certificates (slug, number, user_id, course, name_uk, name_lat, first_cohort)
  values (
    substr(replace(gen_random_uuid()::text, '-', ''), 1, 10),
    'SZ-' || upper(p_course) || '-' || lpad(n::text, 4, '0'),
    uid, p_course, trim(p_name_uk), trim(p_name_lat),
    (beta is null or beta = 'null'::jsonb or created < (beta #>> '{}')::timestamptz)
  ) returning * into c;
  insert into public.events (user_id, name, course, props) values (uid, 'cert_issued', p_course, jsonb_build_object('number', c.number));
  return to_jsonb(c);
end $$;

-- публічна перевірка сертифіката за кодом зі сторінки
create or replace function public.get_certificate(p_slug text)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'number', number, 'course', course, 'name_uk', name_uk, 'name_lat', name_lat,
    'first_cohort', first_cohort, 'issued_at', issued_at, 'revoked', revoked_at is not null)
  from public.certificates where slug = p_slug;
$$;

-- ---------- RLS ----------
alter table public.settings enable row level security;
alter table public.profiles enable row level security;
alter table public.user_state enable row level security;
alter table public.events enable row level security;
alter table public.feedback enable row level security;
alter table public.cert_counters enable row level security;
alter table public.certificates enable row level security;
alter table public.cert_requirements enable row level security;

drop policy if exists "settings admin" on public.settings;
create policy "settings admin" on public.settings for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "profiles read" on public.profiles;
create policy "profiles read" on public.profiles for select to authenticated using (id = auth.uid() or public.is_admin());
drop policy if exists "profiles update" on public.profiles;
create policy "profiles update" on public.profiles for update to authenticated using (id = auth.uid() or public.is_admin()) with check (id = auth.uid() or public.is_admin());

drop policy if exists "state own" on public.user_state;
create policy "state own" on public.user_state for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "state admin read" on public.user_state;
create policy "state admin read" on public.user_state for select to authenticated using (public.is_admin());

drop policy if exists "events insert anon" on public.events;
create policy "events insert anon" on public.events for insert to anon with check (user_id is null);
drop policy if exists "events insert auth" on public.events;
create policy "events insert auth" on public.events for insert to authenticated with check (user_id = auth.uid() or user_id is null);
drop policy if exists "events admin read" on public.events;
create policy "events admin read" on public.events for select to authenticated using (public.is_admin());

drop policy if exists "feedback own" on public.feedback;
create policy "feedback own" on public.feedback for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "feedback read" on public.feedback;
create policy "feedback read" on public.feedback for select to authenticated using (user_id = auth.uid() or public.is_admin());

drop policy if exists "certs read" on public.certificates;
create policy "certs read" on public.certificates for select to authenticated using (user_id = auth.uid() or public.is_admin());
drop policy if exists "certs admin update" on public.certificates;
create policy "certs admin update" on public.certificates for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "req read" on public.cert_requirements;
create policy "req read" on public.cert_requirements for select to authenticated using (true);

-- ---------- доступ через API (автоматичний доступ вимкнено, даємо явно) ----------
grant usage on schema public to anon, authenticated;
grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.user_state to authenticated;
grant insert on public.events to anon, authenticated;
grant select on public.events to authenticated;
grant select, insert on public.feedback to authenticated;
grant select, update on public.certificates to authenticated;
grant select on public.cert_requirements to authenticated;
grant select, insert, update on public.settings to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.cert_status(text, uuid) to authenticated;
grant execute on function public.issue_certificate(text, text, text) to authenticated;
grant execute on function public.get_certificate(text) to anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.protect_profile() from public, anon, authenticated;

-- ---------- зведення для адмінки ----------
create or replace view public.admin_students with (security_invoker = true) as
select
  p.id, p.email, p.full_name, p.avatar_url, p.created_at, p.last_seen_at,
  p.marketing_consent, p.onboarding, p.utm,
  coalesce((select count(*) from jsonb_object_keys(coalesce((s.value::jsonb)->'done', '{}'::jsonb))), 0) as lessons_done,
  (select max(e.created_at) from public.events e where e.user_id = p.id) as last_event_at,
  (select c.number from public.certificates c where c.user_id = p.id and c.course = 'pm') as cert_number
from public.profiles p
left join public.user_state s on s.user_id = p.id and s.key = 'pmz-progress-v1';
grant select on public.admin_students to authenticated;
