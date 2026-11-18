-- =====================================================================
-- 02_views.sql : vues du tableau de bord de pilotage (agrégées)
-- Le rôle « pilotage » ne doit lire QUE ces vues (jamais les tables brutes).
-- Toutes les vues sont recalculées à chaque lecture (300 enfants : instantané).
-- =====================================================================

-- Bandeau « données de démonstration » (exigé par la checklist de dépôt)
create or replace view v_demo_banner as
select count(*) filter (where is_demo)            as demo_children,
       count(*)                                   as total_children,
       coalesce(bool_or(is_demo), false)          as contains_demo_data
from children;

-- Base commune : rendez-vous échus (due_date <= aujourd'hui) avec zone et vaccin
create or replace view v_appt_due as
select a.id, a.child_id, c.zone_id, c.center_id, c.birth_date,
       s.vaccine_code, s.dose, s.label_fr,
       a.due_date, a.status, a.done_at,
       (a.status = 'done')                                              as is_done,
       (a.status = 'done' and a.done_at <= a.due_date + s.grace_days)   as is_on_time
from appointments a
join vaccine_schedule s on s.id = a.schedule_id
join children c         on c.id = a.child_id
where a.due_date <= current_date;

-- Couverture par zone et par vaccin/dose
create or replace view v_coverage_by_zone as
select z.id as zone_id, z.name as zone, d.vaccine_code, d.dose,
       count(*)                                         as due_count,
       count(*) filter (where d.is_done)                as done_count,
       count(*) filter (where d.status = 'missed')      as missed_count,
       round(100.0 * count(*) filter (where d.is_done) / nullif(count(*), 0), 1) as coverage_pct
from v_appt_due d join zones z on z.id = d.zone_id
group by z.id, z.name, d.vaccine_code, d.dose;

-- Synthèse par zone (carte des zones qui vont bien / en difficulté)
create or replace view v_zone_summary as
select z.id as zone_id, z.name as zone,
       (select count(*) from children c where c.zone_id = z.id)            as children,
       count(d.id)                                                         as due_count,
       count(d.id) filter (where d.is_done)                                as done_count,
       count(d.id) filter (where d.status = 'missed')                      as missed_count,
       round(100.0 * count(d.id) filter (where d.is_done) / nullif(count(d.id), 0), 1) as coverage_pct,
       round(100.0 * count(d.id) filter (where d.is_on_time) / nullif(count(d.id), 0), 1) as on_time_pct,
       case when 100.0 * count(d.id) filter (where d.is_done) / nullif(count(d.id), 0) >= 85 then 'bon'
            when 100.0 * count(d.id) filter (where d.is_done) / nullif(count(d.id), 0) >= 70 then 'moyen'
            else 'en difficulté' end                                       as level
from zones z left join v_appt_due d on d.zone_id = z.id
group by z.id, z.name;

-- Abandon Penta1 -> Penta3 (cohorte : enfants dont Penta3 est échu et Penta1 reçu)
create or replace view v_penta_dropout as
with p as (
  select c.id as child_id, c.zone_id,
         bool_or(s.dose = 1 and a.status = 'done') as p1,
         bool_or(s.dose = 3 and a.status = 'done') as p3,
         bool_or(s.dose = 3 and a.due_date <= current_date) as p3_due
  from appointments a
  join vaccine_schedule s on s.id = a.schedule_id and s.vaccine_code = 'PENTA'
  join children c on c.id = a.child_id
  group by c.id, c.zone_id
)
select coalesce(z.id, 0)                    as zone_id,
       coalesce(z.name, 'Toutes zones')     as zone,
       count(*) filter (where p1 and p3_due)               as penta1_cohort,
       count(*) filter (where p1 and p3 and p3_due)        as penta3_done,
       round(100.0 * (1 - count(*) filter (where p1 and p3 and p3_due)::numeric
             / nullif(count(*) filter (where p1 and p3_due), 0)), 1) as dropout_pct
from p join zones z on z.id = p.zone_id
group by grouping sets ((z.id, z.name), ());

-- Actes de naissance manquants
create or replace view v_birth_cert as
select coalesce(z.id, 0) as zone_id, coalesce(z.name, 'Toutes zones') as zone,
       count(*)                                          as children,
       count(*) filter (where not c.has_birth_certificate) as missing,
       count(*) filter (where c.birth_cert_resolved_at is not null) as resolved,
       round(100.0 * count(*) filter (where not c.has_birth_certificate) / nullif(count(*), 0), 1) as missing_pct
from children c join zones z on z.id = c.zone_id
group by grouping sets ((z.id, z.name), ());

-- Engagement des familles (écoute des messages, réponses aux rappels)
create or replace view v_message_engagement as
select coalesce(z.id, 0) as zone_id, coalesce(z.name, 'Toutes zones') as zone,
       count(*) filter (where m.status <> 'scheduled')                         as sent,
       count(*) filter (where m.status = 'listened')                           as listened,
       round(100.0 * count(*) filter (where m.status = 'listened')
             / nullif(count(*) filter (where m.status <> 'scheduled'), 0), 1)  as listen_pct,
       count(*) filter (where m.response_key is not null)                      as responses,
       count(*) filter (where m.response_key = 1)                              as answered_yes,
       count(*) filter (where m.response_key = 2)                              as answered_no
from messages m
join children c on c.id = m.child_id
join zones z    on z.id = c.zone_id
group by grouping sets ((z.id, z.name), ());

-- Alertes ouvertes par type et par zone
create or replace view v_alerts_summary as
select z.id as zone_id, z.name as zone, a.type,
       count(*) filter (where a.status = 'open')         as open_count,
       count(*) filter (where a.status = 'acknowledged') as acknowledged_count,
       count(*) filter (where a.status = 'resolved')     as resolved_count
from alerts a join children c on c.id = a.child_id join zones z on z.id = c.zone_id
group by z.id, z.name, a.type;

-- Dernière pesée par enfant (base des indicateurs de croissance)
create or replace view v_last_weigh_in as
select distinct on (w.child_id) w.child_id, w.measured_at, w.age_months,
       w.weight_kg, w.z_score, w.trend
from weigh_ins w
order by w.child_id, w.measured_at desc;

create or replace view v_growth_by_zone as
select coalesce(z.id, 0) as zone_id, coalesce(z.name, 'Toutes zones') as zone,
       count(*)                                              as weighed_children,
       count(*) filter (where l.trend = 'stagnation')        as stagnation,
       count(*) filter (where l.trend = 'chute')             as chute,
       round(100.0 * count(*) filter (where l.trend <> 'ok') / nullif(count(*), 0), 1) as flagged_pct,
       count(*) filter (where l.z_score < -2)                as underweight,
       round(100.0 * count(*) filter (where l.z_score < -2) / nullif(count(*), 0), 1) as underweight_pct
from v_last_weigh_in l
join children c on c.id = l.child_id
join zones z    on z.id = c.zone_id
group by grouping sets ((z.id, z.name), ());

-- Tendance mensuelle : couverture des rendez-vous échus, par mois d'échéance
create or replace view v_coverage_trend as
select date_trunc('month', d.due_date)::date as month,
       count(*)                               as due_count,
       count(*) filter (where d.is_done)      as done_count,
       round(100.0 * count(*) filter (where d.is_done) / count(*), 1) as coverage_pct
from v_appt_due d
where d.due_date >= (date_trunc('month', current_date) - interval '11 months')
group by 1 order by 1;

-- Score de risque v0 (règles pondérées, à calibrer pour le pitch).
-- missed_vaccines = nombre de RENDEZ-VOUS manqués (un rendez-vous = une date, pas une ligne de vaccin)
create or replace view v_child_risk as
select c.id as child_id, c.first_name, c.zone_id, c.center_id, c.birth_date,
       coalesce(m.missed, 0)       as missed_vaccines,
       (not c.has_birth_certificate) as no_birth_cert,
       coalesce(g.flagged, false)  as growth_flag,
       coalesce(u.unlistened, 0)   as unlistened_msgs,
       c.distance_km,
       (3 * coalesce(m.missed, 0)
        + case when not c.has_birth_certificate then 2 else 0 end
        + case when coalesce(g.flagged, false) then 2 else 0 end
        + least(coalesce(u.unlistened, 0), 3)
        + case when coalesce(c.distance_km, 0) > 4 then 1 else 0 end)  as risk_score
from children c
left join (select child_id, count(distinct due_date) as missed from appointments
           where status = 'missed' group by child_id) m on m.child_id = c.id
left join (select child_id, (trend <> 'ok') as flagged from v_last_weigh_in) g on g.child_id = c.id
left join (select child_id, count(*) as unlistened from messages
           where status in ('delivered','sent') and scheduled_for > now() - interval '60 days'
           group by child_id) u on u.child_id = c.id;

-- Indicateurs clés en une ligne (cartes du haut du dashboard)
create or replace view v_kpis as
select
  (select count(*) from children)                                                as children_total,
  (select round(100.0 * count(*) filter (where is_done) / nullif(count(*), 0), 1) from v_appt_due) as coverage_pct,
  (select dropout_pct from v_penta_dropout where zone_id = 0)                    as penta_dropout_pct,
  (select count(*) from children where not has_birth_certificate)                as missing_birth_certs,
  (select listen_pct from v_message_engagement where zone_id = 0)                as listen_pct,
  (select count(*) from alerts where status = 'open')                            as open_alerts,
  (select flagged_pct from v_growth_by_zone where zone_id = 0)                   as growth_flagged_pct,
  (select count(*) from v_child_risk where risk_score >= 10)                      as high_risk_children;

-- Droits : le rôle pilotage lit uniquement les vues agrégées (Supabase).
-- grant select on v_kpis, v_zone_summary, v_coverage_by_zone, v_penta_dropout,
--   v_birth_cert, v_message_engagement, v_alerts_summary, v_growth_by_zone,
--   v_coverage_trend, v_demo_banner to authenticated;
