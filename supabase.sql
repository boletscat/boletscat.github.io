-- Boletaire – avisos entre usuarios. Pega todo esto en Supabase → SQL Editor → Run (una sola vez).
-- Cada móvil tiene un identificador y una clave secreta propios: solo puede cambiar sus avisos.
-- Los avisos se ven durante 6 días y solo guardan la zona, las especies, la cantidad y la fecha.

create table if not exists public.reports (
  uid        text primary key,
  token      text not null,
  items      jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.reports enable row level security;

drop policy if exists "leer avisos recientes" on public.reports;
create policy "leer avisos recientes" on public.reports
  for select using (updated_at > now() - interval '6 days');

-- La clave secreta (token) no se puede leer desde la web
revoke all on public.reports from anon, authenticated;
grant select (uid, items, updated_at) on public.reports to anon, authenticated;

create or replace function public.post_report(p_uid text, p_token text, p_items jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_uid is null or length(p_uid) > 40 or p_token is null or length(p_token) < 16 or length(p_token) > 80 then
    raise exception 'identificador no válido';
  end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) > 12 or length(p_items::text) > 4000 then
    raise exception 'aviso demasiado grande';
  end if;
  insert into public.reports (uid, token, items, updated_at)
  values (p_uid, p_token, p_items, now())
  on conflict (uid) do update
    set items = excluded.items, updated_at = now()
    where public.reports.token = excluded.token;
end $$;

revoke all on function public.post_report(text, text, jsonb) from public;
grant execute on function public.post_report(text, text, jsonb) to anon, authenticated;

-- Comunidad: foro de dudas y «Estoy aquí buscando». Cada móvil solo puede cambiar su propio documento.
create table if not exists public.docs (
  coll       text not null,
  uid        text not null,
  token      text not null,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (coll, uid)
);
alter table public.docs enable row level security;
drop policy if exists "leer comunidad" on public.docs;
create policy "leer comunidad" on public.docs for select using (
  coll = 'forum' or (coll = 'checkins' and updated_at > now() - interval '1 day')
);
revoke all on public.docs from anon, authenticated;
grant select (coll, uid, data, updated_at) on public.docs to anon, authenticated;

create or replace function public.put_doc(p_coll text, p_uid text, p_token text, p_data jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare
  max_len int := 3000;
begin
  if p_coll = 'forum' then max_len := 900000; end if;
  if p_coll not in ('forum', 'checkins') then raise exception 'colección no válida'; end if;
  if p_uid is null or length(p_uid) > 40 or p_token is null or length(p_token) < 16 or length(p_token) > 80 then
    raise exception 'identificador no válido';
  end if;
  if jsonb_typeof(p_data) <> 'object' or length(p_data::text) > max_len then
    raise exception 'documento demasiado grande';
  end if;
  insert into public.docs (coll, uid, token, data, updated_at)
  values (p_coll, p_uid, p_token, p_data, now())
  on conflict (coll, uid) do update
    set data = excluded.data, updated_at = now()
    where public.docs.token = excluded.token;
end $$;
revoke all on function public.put_doc(text, text, text, jsonb) from public;
grant execute on function public.put_doc(text, text, text, jsonb) to anon, authenticated;
