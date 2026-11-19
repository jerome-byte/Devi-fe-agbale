-- 05_demo.sql : prépare l'enfant de démonstration du pitch.
--
-- Kossi doit être suivi à Bè-Kpota (centre 1) pour que les vocaux J-1 / J0
-- existent (le catalogue ne couvre que Bè-Kpota et Sylvanus Olympio).
--
-- Le script le remet dans la situation du scénario :
--   - environ 3 mois, prochain contact vaccinal dans 2 jours (J-2) ;
--   - contacts 1 à 3 déjà faits ;
--   - deux pesées à un mois d'écart avec le même poids (stagnation) ;
--   - aucun message ni alerte hérités du seed.
-- Rejouable : s'applique au premier enfant de démonstration venu.

do $$
declare
  v_id uuid;
begin
  select id into v_id
    from children
   where is_demo and first_name in ('Kosi')
   order by created_at
   limit 1;

  if v_id is null then
    select id into v_id from children where is_demo order by created_at limit 1;
  end if;

  if v_id is null then
    return;
  end if;

  update children
     set first_name = 'Kosi',
         center_id = 1,
         zone_id = 1,
         birth_date = current_date - 96,
         has_birth_certificate = false,
         birth_cert_resolved_at = null
   where id = v_id;

  delete from messages     where child_id = v_id;
  delete from alerts       where child_id = v_id;
  delete from appointments where child_id = v_id;
  delete from weigh_ins    where child_id = v_id;

  insert into appointments (child_id, schedule_id, due_date, status, done_at)
  select v_id,
         s.id,
         c.birth_date + s.age_days,
         case when s.contact_no <= 3 then 'done' else 'planned' end,
         case when s.contact_no <= 3 then c.birth_date + s.age_days end
    from vaccine_schedule s
    cross join children c
   where c.id = v_id;

  insert into weigh_ins (child_id, measured_at, weight_kg, height_cm)
  values (v_id, current_date - 40, 5.2, 57.0),
         (v_id, current_date, 5.2, 58.5);
end $$;
