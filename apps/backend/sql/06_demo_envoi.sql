-- =====================================================================
-- 06_demo_envoi.sql : boutons de démo qui envoient de VRAIS messages WhatsApp
-- À exécuter après 04_rules.sql (Cherif). N'écrase aucune fonction existante.
--
-- demo_fast_forward (Cherif) crée des messages « simulés », déjà marqués envoyés :
-- rien ne part sur WhatsApp. demo_envoyer prend la même date cible, mais crée des
-- messages « scheduled » datés de maintenant : le backend les envoie aussitôt.
--
--   select * from demo_envoyer('<child_id>', 'J-1');   -- J-2 | J-1 | J0 | MISSED_3 | MISSED_7
--   select demo_reset_envoi('<child_id>');             -- entre deux répétitions
-- =====================================================================

set search_path = public, extensions;

create or replace function demo_envoyer(p_child_id uuid, p_event text)
returns table(simulated_date date, rule text, n int)
language plpgsql as $$
declare
  v_due date; v_as_of date;
begin
  -- Même rendez-vous cible que demo_fast_forward.
  select min(due_date) into v_due from appointments
   where child_id = p_child_id and status in ('planned','missed') and due_date >= current_date - 1;
  if v_due is null then
    select min(due_date) into v_due from appointments
     where child_id = p_child_id and status = 'planned';
  end if;
  if v_due is null then raise exception 'Aucun rendez-vous planifié pour cet enfant'; end if;
  v_as_of := case p_event
    when 'J-2' then v_due - 2 when 'J-1' then v_due - 1 when 'J0' then v_due
    when 'MISSED_3' then v_due + 3 when 'MISSED_7' then v_due + 7
    else null end;
  if v_as_of is null then raise exception 'Événement inconnu : %', p_event; end if;

  return query select v_as_of, r.rule, r.n from run_rules(v_as_of, p_child_id, false) r;

  -- Les messages décidés pour la date simulée partent maintenant.
  update messages set scheduled_for = now()
   where child_id = p_child_id and status = 'scheduled' and not is_simulated
     and scheduled_for::date = v_as_of;
end $$;

-- Remise à zéro complète, messages réels compris (sinon la contrainte unique
-- empêcherait de renvoyer le même rappel à la répétition suivante).
create or replace function demo_reset_envoi(p_child_id uuid) returns void
language sql as $$
  delete from messages where child_id = p_child_id;
  delete from alerts   where child_id = p_child_id;
  update appointments set status = 'planned', done_at = null where child_id = p_child_id;
$$;
