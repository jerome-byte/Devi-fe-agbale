-- 08_alertes_croissance.sql — rattrapage des alertes de statut OMS
--
-- Constaté le 21 novembre 2026 sur la base en ligne :
--   v_growth_by_zone compte 33 enfants « à surveiller » et 8 « à orienter »,
--   alors que la table `alerts` ne contient que 7 `growth_surveiller` et
--   1 `growth_orient` ouverts. Sept enfants « à orienter » n'ont donc aucune alerte.
--
-- Cause : la règle R7 de `run_rules` (04_rules.sql) n'examine que les pesées de moins
-- de 45 jours (`l.measured_at >= p_as_of - 45`) et saute les enfants qui ont déjà une
-- alerte de stagnation ouverte. Une pesée plus ancienne ne produit donc jamais son
-- alerte de statut.
--
-- Ce script crée les alertes manquantes, une par enfant et par type, sans toucher aux
-- messages ni aux autres alertes. Il est rejouable : la seconde exécution n'insère rien.
--
-- À exécuter une fois dans Supabase → SQL Editor.

insert into alerts (child_id, type, target_role, center_id)
select l.child_id,
       case when l.status = 'a_orienter' then 'growth_orient' else 'growth_surveiller' end,
       'agent',
       c.center_id
from v_last_weigh_in l
join children c on c.id = l.child_id
where l.status in ('a_surveiller', 'a_orienter')
  and not exists (
    select 1
    from alerts x
    where x.child_id = l.child_id
      and x.type = case when l.status = 'a_orienter' then 'growth_orient' else 'growth_surveiller' end
      and x.status in ('open', 'acknowledged'));

-- Contrôle après exécution : les deux séries doivent se répondre.
--
--   select status, count(*) from v_last_weigh_in
--    where status <> 'normal' group by 1 order by 1;
--
--   select type, count(*) from alerts
--    where status = 'open' and type like 'growth%' group by 1 order by 1;
