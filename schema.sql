-- =====================================================
-- schema.sql – im Supabase SQL Editor ausführen
-- =====================================================

-- 1) Tabelle: verknüpft die Supabase-User-ID mit dem Benutzernamen
create table public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  username   text not null,
  created_at timestamptz not null default now(),
  constraint username_format check (username ~ '^[A-Za-z0-9_]{3,20}$')
);

-- 2) Benutzernamen eindeutig, ohne Beachtung von Groß-/Kleinschreibung
--    ("Gorin" und "gorin" sind derselbe Name)
create unique index profiles_username_lower_idx
  on public.profiles (lower(username));

-- 3) Row Level Security aktivieren
alter table public.profiles enable row level security;

-- 4) Policies
--    Lesen: jeder Nutzer sieht nur seine eigene Zeile
create policy "profiles_select_own"
  on public.profiles for select
  to authenticated
  using ((select auth.uid()) = id);

--    Anlegen: nur für die eigene ID
create policy "profiles_insert_own"
  on public.profiles for insert
  to authenticated
  with check ((select auth.uid()) = id);

--    Es gibt bewusst KEINE update- und delete-Policy:
--    Der Benutzername ist damit fest und nicht mehr änderbar.

-- 5) Login per Benutzername: liefert die E-Mail zu einem Namen.
--    security definer = läuft mit erhöhten Rechten, damit auch nicht
--    eingeloggte Nutzer die Abfrage ausführen können.
create or replace function public.email_for_username(p_username text)
returns text
language sql
stable
security definer
set search_path = public, auth
as $$
  select u.email::text
  from public.profiles p
  join auth.users u on u.id = p.id
  where lower(p.username) = lower(p_username)
  limit 1;
$$;

revoke all on function public.email_for_username(text) from public;
grant execute on function public.email_for_username(text) to anon, authenticated;
