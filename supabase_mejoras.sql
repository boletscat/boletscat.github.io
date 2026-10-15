-- Boletaire – mejoras de octubre 2026: «¿Había setas?» de todos y avisos al móvil.
-- Pega todo esto en Supabase → SQL Editor → Run (una sola vez). Se puede volver a ejecutar sin problema.

-- 1) Comprobaciones de todos: zona, día y si había setas. Sin cuenta; el identificador del dispositivo no se puede leer.
create table if not exists public.checks (
  uid        text not null,
  site       text not null,
  d          date not null,
  ok         boolean not null,
  src        text not null default 'zona',
  created_at timestamptz not null default now(),
  primary key (uid, site, d)
);
create index if not exists checks_d_idx on public.checks (d);
alter table public.checks enable row level security;
drop policy if exists "leer comprobaciones" on public.checks;
create policy "leer comprobaciones" on public.checks for select using (true);
revoke all on public.checks from anon, authenticated;
grant select (site, d, ok, src, created_at) on public.checks to anon, authenticated;

create or replace function public.post_check(p_uid text, p_site text, p_d date, p_ok boolean, p_src text default 'zona')
returns void language plpgsql security definer set search_path = public as $$
declare hoy date := (now() at time zone 'Europe/Madrid')::date;
begin
  if p_uid is null or p_uid !~ '^[A-Za-z0-9_-]{6,40}$' then raise exception 'identificador no válido'; end if;
  if p_site is null or p_site !~ '^[a-z0-9]{2,24}$' then raise exception 'zona no válida'; end if;
  if p_d is null or p_d > hoy or p_d < hoy - 10 then raise exception 'fecha no válida'; end if;
  if p_ok is null then raise exception 'falta la respuesta'; end if;
  if coalesce(p_src,'zona') not in ('zona','punto','salida') then raise exception 'origen no válido'; end if;
  if (select count(*) from public.checks where uid = p_uid and created_at > now() - interval '1 day') >= 30 then
    raise exception 'demasiadas respuestas hoy';
  end if;
  insert into public.checks (uid, site, d, ok, src) values (p_uid, p_site, p_d, p_ok, coalesce(p_src,'zona'))
  on conflict (uid, site, d) do update set ok = excluded.ok, src = excluded.src, created_at = now();
end $$;
revoke all on function public.post_check(text, text, date, boolean, text) from public;
grant execute on function public.post_check(text, text, date, boolean, text) to anon, authenticated;

-- 2) Avisos al móvil: suscripciones y claves. Solo las usa la función «avisos» (service role); desde la web no se leen.
create table if not exists public.push_subs (
  endpoint   text primary key,
  p256dh     text not null,
  auth       text not null,
  zones      text[] not null default '{}',
  min        int not null default 70,
  lang       text not null default 'es',
  last_sent  date,
  last_msg   text,
  last_test  timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.push_subs enable row level security;
revoke all on public.push_subs from anon, authenticated;

create table if not exists public.push_config (k text primary key, v text not null);
alter table public.push_config enable row level security;
revoke all on public.push_config from anon, authenticated;
insert into public.push_config (k, v) values ('cron_key', gen_random_uuid()::text) on conflict (k) do nothing;

-- 3) Cada mañana a las 6:30 UTC (8:30 en verano, 7:30 en invierno), después de la previsión: mandar los avisos
create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron;
select cron.unschedule('boletaire-avisos') where exists (select 1 from cron.job where jobname = 'boletaire-avisos');
select cron.schedule('boletaire-avisos', '30 6 * * *', $cron$
  select net.http_post(
    url := 'https://hygticgawgerhctoueqz.supabase.co/functions/v1/avisos',
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh5Z3RpY2dhd2dlcmhjdG91ZXF6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE1Njg4OTAsImV4cCI6MjEwNzE0NDg5MH0.aEhvWEYazRz6Rh6d7XfP9_Aw_YhC4EwYaZ1aipj8Zyg'),
    body := jsonb_build_object('action', 'daily', 'key', (select v from public.push_config where k = 'cron_key'))
  );
$cron$);

-- 4) Seguridad: funciones internas que no hace falta que se puedan llamar desde la web
do $$ begin
  if exists (select 1 from pg_proc where proname = 'rls_auto_enable' and pronamespace = 'public'::regnamespace) then
    revoke execute on function public.rls_auto_enable() from anon, authenticated, public; end if;
  if exists (select 1 from pg_proc where proname = 'boletaire_new_user' and pronamespace = 'public'::regnamespace) then
    revoke execute on function public.boletaire_new_user() from anon, authenticated, public; end if;
end $$;
