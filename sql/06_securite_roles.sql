-- =====================================================================
-- 06_securite_roles.sql : connexion et règles de sécurité par rôle
-- À exécuter après 01 à 05 (et après apps/backend/sql/05 à 07). Rejouable.
--
-- Principe :
--   - personne ne lit les tables sans être connecté (Supabase Auth) ;
--   - l'agent de santé ne voit que les enfants de son centre ;
--   - l'éducatrice ne voit que les enfants de sa garderie ;
--   - le pilotage ne voit AUCUNE donnée nominative : seulement les vues agrégées ;
--   - personne n'écrit directement : toutes les écritures passent par le backend
--     (connexion serveur, propriétaire des tables).
--
-- Les vues agrégées (v_kpis, v_zone_summary...) restent lisibles avec la clé publique :
-- elles ne contiennent que des totaux par zone.
-- =====================================================================

set search_path = public, extensions;

-- ---------- 1. Rôle de l'utilisateur connecté --------------------------
-- security definer : lisent profiles sans dépendre des règles de profiles.
create or replace function public.mon_role() returns text
language sql stable security definer set search_path = public as $$
  select role from profiles where id = auth.uid()
$$;

create or replace function public.mon_centre() returns int
language sql stable security definer set search_path = public as $$
  select center_id from profiles where id = auth.uid()
$$;

create or replace function public.ma_garderie() returns int
language sql stable security definer set search_path = public as $$
  select daycare_id from profiles where id = auth.uid()
$$;

grant execute on function public.mon_role(), public.mon_centre(), public.ma_garderie() to authenticated;

-- ---------- 2. Sécurité activée partout, ancienne règle ouverte retirée --
do $$
declare t text;
begin
  foreach t in array array[
    'zones','health_centers','daycares','vaccine_schedule','vitamin_a_schedule',
    'who_weight_for_age','who_height_for_age','who_bmi_for_age','audio_segments',
    'profiles','children','guardians','appointments','weigh_ins','messages','alerts'
  ] loop
    if to_regclass('public.' || t) is not null then
      execute format('alter table public.%I enable row level security', t);
      execute format('drop policy if exists lecture_demo_anon on public.%I', t);
    end if;
  end loop;
end $$;

-- ---------- 3. Référentiels : lecture libre (rien de personnel) -------
do $$
declare t text;
begin
  foreach t in array array[
    'zones','health_centers','daycares','vaccine_schedule','vitamin_a_schedule',
    'who_weight_for_age','who_height_for_age','who_bmi_for_age','audio_segments'
  ] loop
    if to_regclass('public.' || t) is not null then
      execute format('drop policy if exists lecture_referentiel on public.%I', t);
      execute format('create policy lecture_referentiel on public.%I for select to anon, authenticated using (true)', t);
      execute format('grant select on public.%I to anon, authenticated', t);
    end if;
  end loop;
end $$;

-- ---------- 4. Données des enfants : selon le rôle ---------------------
-- La clé publique seule (anon) ne lit plus rien de personnel.
revoke select on public.profiles, public.children, public.guardians, public.appointments,
                 public.weigh_ins, public.messages, public.alerts from anon;
grant select on public.profiles, public.children, public.guardians, public.appointments,
                public.weigh_ins, public.messages, public.alerts to authenticated;

-- Profil : chacun lit le sien (l'administrateur lit tout).
drop policy if exists lecture_profil on public.profiles;
create policy lecture_profil on public.profiles for select to authenticated
  using (id = auth.uid() or public.mon_role() = 'admin');

-- Enfants : centre de l'agent, garderie de l'éducatrice, tout pour l'administrateur.
-- Le pilotage n'a aucune règle ici : il ne voit aucun enfant.
drop policy if exists lecture_par_role on public.children;
create policy lecture_par_role on public.children for select to authenticated
  using (
    public.mon_role() = 'admin'
    or (public.mon_role() = 'agent' and center_id = public.mon_centre())
    or (public.mon_role() = 'educatrice' and daycare_id = public.ma_garderie())
  );

-- Tables liées à un enfant : visibles seulement si l'enfant l'est.
do $$
declare t text;
begin
  foreach t in array array['guardians','appointments','weigh_ins','messages','alerts'] loop
    execute format('drop policy if exists lecture_par_role on public.%I', t);
    execute format(
      'create policy lecture_par_role on public.%I for select to authenticated
         using (exists (select 1 from public.children c where c.id = %I.child_id))', t, t);
  end loop;
end $$;

-- ---------- 5. Vues nominatives : plus accessibles avec la clé publique --
-- Ces vues contiennent des prénoms ou des données par enfant. Elles restent
-- disponibles pour le serveur (backend, scripts), pas pour le navigateur.
do $$
declare v text;
begin
  foreach v in array array['v_child_risk','v_message_log','v_alerts_list','v_demo_child','v_last_weigh_in','v_appt_due'] loop
    if to_regclass('public.' || v) is not null then
      execute format('revoke select on public.%I from anon, authenticated', v);
    end if;
  end loop;
end $$;

-- ---------- 6. Fonctions de démonstration : utilisateurs connectés -----
do $$
declare f text;
begin
  foreach f in array array[
    'run_rules(date, uuid, boolean, integer)', 'demo_fast_forward(uuid, text)', 'demo_reset_child(uuid)',
    'ack_alert(uuid)', 'resolve_alert(uuid)', 'demo_envoyer(uuid, text)', 'demo_reset_envoi(uuid)'
  ] loop
    begin
      execute format('revoke execute on function public.%s from anon, public', f);
      execute format('grant execute on function public.%s to authenticated', f);
    exception when undefined_function then null;
    end;
  end loop;
end $$;

-- ---------- 7. Comptes de démonstration --------------------------------
-- Créer d'abord les 3 comptes dans Supabase : Authentication > Users > Add user
-- (agent@example.com, educatrice@example.com, pilotage@example.com, « Auto Confirm User »).
-- Puis cette partie leur donne leur rôle (rejouable).
insert into public.profiles (id, full_name, role, center_id, daycare_id)
select u.id, p.full_name, p.role, p.center_id, p.daycare_id
from auth.users u
join (values
  ('agent@example.com',      'Akouvi Lawson',       'agent',      1,    null::int),
  ('educatrice@example.com', 'Delali Agbo',         'educatrice', null, 1),
  ('pilotage@example.com',   'Équipe de pilotage',  'pilotage',   null, null)
) as p(email, full_name, role, center_id, daycare_id) on lower(u.email) = p.email
on conflict (id) do update
  set full_name = excluded.full_name, role = excluded.role,
      center_id = excluded.center_id, daycare_id = excluded.daycare_id;
