-- Boletaire – cuentas de usuario (pega en Supabase → SQL Editor → Run, después de supabase.sql).
-- Para publicar en la comunidad hay que iniciar sesión. Ver la web sigue siendo libre.

-- Administradores y cuentas bloqueadas (nadie puede leerlas desde la web)
create table if not exists public.admins (uid uuid primary key);
create table if not exists public.bans (uid text primary key, reason text, at timestamptz not null default now());
alter table public.admins enable row level security;
alter table public.bans enable row level security;
revoke all on public.admins, public.bans from anon, authenticated;

-- El correo del creador es administrador en cuanto se registra
create or replace function public.boletaire_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if lower(new.email) = 'guillemestellers@gmail.com' then
    insert into public.admins(uid) values (new.id) on conflict do nothing;
  end if;
  return new;
end $$;
drop trigger if exists boletaire_new_user on auth.users;
create trigger boletaire_new_user after insert on auth.users for each row execute function public.boletaire_new_user();
insert into public.admins(uid) select id from auth.users where lower(email) = 'guillemestellers@gmail.com' on conflict do nothing;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.admins where uid = auth.uid())
$$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

-- Escribir en la comunidad: solo con sesión iniciada; el documento es siempre el de tu cuenta
create or replace function public.put_my_doc(p_coll text, p_data jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  max_len int := 3000;
begin
  if me is null then raise exception 'inicia sesión para publicar'; end if;
  if exists(select 1 from public.bans where uid = me::text) then raise exception 'cuenta bloqueada'; end if;
  if p_coll not in ('forum', 'checkins') then raise exception 'colección no válida'; end if;
  if p_coll = 'forum' then max_len := 900000; end if;
  if jsonb_typeof(p_data) <> 'object' or length(p_data::text) > max_len then raise exception 'documento demasiado grande'; end if;
  insert into public.docs (coll, uid, token, data, updated_at)
  values (p_coll, me::text, 'cuenta', p_data, now())
  on conflict (coll, uid) do update set data = excluded.data, updated_at = now();
end $$;
revoke all on function public.put_my_doc(text, jsonb) from public;
grant execute on function public.put_my_doc(text, jsonb) to authenticated;

create or replace function public.post_my_report(p_items jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid();
begin
  if me is null then raise exception 'inicia sesión para avisar'; end if;
  if exists(select 1 from public.bans where uid = me::text) then raise exception 'cuenta bloqueada'; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) > 12 or length(p_items::text) > 4000 then
    raise exception 'aviso demasiado grande';
  end if;
  insert into public.reports (uid, token, items, updated_at)
  values (me::text, 'cuenta', p_items, now())
  on conflict (uid) do update set items = excluded.items, updated_at = now();
end $$;
revoke all on function public.post_my_report(jsonb) from public;
grant execute on function public.post_my_report(jsonb) to authenticated;

-- Sin sesión ya no se puede publicar (las funciones anónimas antiguas quedan desactivadas)
revoke execute on function public.put_doc(text, text, text, jsonb) from anon, authenticated;
revoke execute on function public.post_report(text, text, jsonb) from anon, authenticated;

-- Moderación (solo administradores): borrar mensajes de otros y bloquear cuentas
create or replace function public.mod_put_doc(p_coll text, p_uid text, p_data jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'solo administradores'; end if;
  if jsonb_typeof(p_data) <> 'object' then raise exception 'documento no válido'; end if;
  update public.docs set data = p_data, updated_at = now() where coll = p_coll and uid = p_uid;
end $$;
revoke all on function public.mod_put_doc(text, text, jsonb) from public;
grant execute on function public.mod_put_doc(text, text, jsonb) to authenticated;

create or replace function public.mod_ban(p_uid text, p_ban boolean, p_reason text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'solo administradores'; end if;
  if p_ban then
    insert into public.bans(uid, reason) values (p_uid, left(p_reason, 200)) on conflict (uid) do update set reason = excluded.reason, at = now();
    delete from public.docs where uid = p_uid;
    delete from public.reports where uid = p_uid;
  else
    delete from public.bans where uid = p_uid;
  end if;
end $$;
revoke all on function public.mod_ban(text, boolean, text) from public;
grant execute on function public.mod_ban(text, boolean, text) to authenticated;

-- Tus salidas, rutas y notas: guardadas en tu cuenta, solo tú las ves
create table if not exists public.user_data (
  uid        uuid primary key references auth.users(id) on delete cascade,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.user_data enable row level security;
drop policy if exists "solo mis datos" on public.user_data;
create policy "solo mis datos" on public.user_data for select using (uid = auth.uid());
revoke all on public.user_data from anon, authenticated;
grant select on public.user_data to authenticated;

create or replace function public.put_my_data(p_data jsonb)
returns timestamptz language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); t timestamptz := now();
begin
  if me is null then raise exception 'inicia sesión'; end if;
  if jsonb_typeof(p_data) <> 'object' or length(p_data::text) > 1500000 then raise exception 'datos demasiado grandes'; end if;
  insert into public.user_data(uid, data, updated_at) values (me, p_data, t)
  on conflict (uid) do update set data = excluded.data, updated_at = t;
  return t;
end $$;
revoke all on function public.put_my_data(jsonb) from public;
grant execute on function public.put_my_data(jsonb) to authenticated;

-- Borrar la cuenta y todo lo publicado
create or replace function public.delete_me()
returns void language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid();
begin
  if me is null then raise exception 'inicia sesión'; end if;
  delete from public.docs where uid = me::text;
  delete from public.reports where uid = me::text;
  delete from public.user_data where uid = me;
  delete from public.admins where uid = me;
  delete from auth.users where id = me;
end $$;
revoke all on function public.delete_me() from public;
grant execute on function public.delete_me() to authenticated;
