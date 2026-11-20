-- =====================================================================
-- 07_comptes_structures.sql : structures et comptes gérés par le pilotage
-- À exécuter après 06_securite_roles.sql. Rejouable.
--
-- - health_centers.kind distingue hôpital et centre de santé ;
-- - profiles garde l'e-mail, l'état (actif ou désactivé), la date et l'auteur de création ;
-- - un compte désactivé ne lit plus rien, même avec une session encore ouverte :
--   mon_role(), mon_centre() et ma_garderie() ne renvoient rien pour lui.
--
-- La création des comptes passe par le backend (apps/backend/app/comptes.py),
-- qui seul détient la clé d'administration de Supabase.
-- =====================================================================

set search_path = public, extensions;

-- ---------- 1. Hôpital ou centre de santé ------------------------------
alter table public.health_centers add column if not exists kind text not null default 'centre';
alter table public.health_centers drop constraint if exists health_centers_kind_check;
alter table public.health_centers add constraint health_centers_kind_check check (kind in ('hopital', 'centre'));
-- Le CHU Sylvanus Olympio (ajouté par le seed) est un hôpital.
update public.health_centers set kind = 'hopital' where name ilike '%sylvanus olympio%' and kind <> 'hopital';

-- ---------- 2. Comptes : e-mail, état, création ------------------------
alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists active boolean not null default true;
alter table public.profiles add column if not exists created_at timestamptz not null default now();
alter table public.profiles add column if not exists created_by uuid references public.profiles(id);

update public.profiles p set email = lower(u.email)
from auth.users u
where u.id = p.id and p.email is null;

create unique index if not exists profiles_email_unique on public.profiles (lower(email));

-- ---------- 3. Un compte désactivé ne voit plus rien --------------------
create or replace function public.mon_role() returns text
language sql stable security definer set search_path = public as $$
  select role from profiles where id = auth.uid() and active
$$;

create or replace function public.mon_centre() returns int
language sql stable security definer set search_path = public as $$
  select center_id from profiles where id = auth.uid() and active
$$;

create or replace function public.ma_garderie() returns int
language sql stable security definer set search_path = public as $$
  select daycare_id from profiles where id = auth.uid() and active
$$;

-- ---------- 4. Vérification -------------------------------------------
-- select email, role, active, center_id, daycare_id from public.profiles order by role;
-- select id, name, kind from public.health_centers order by id;
