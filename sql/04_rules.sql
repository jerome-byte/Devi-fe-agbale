-- =====================================================================
-- 04_rules.sql : moteur de règles + avance rapide pour la démo
-- Exécuter après 01_schema.sql. Idempotent : peut tourner autant de fois que voulu.
-- Production : select * from run_rules();   (pg_cron toutes les heures, ou appel serveur)
-- =====================================================================

set search_path = public, extensions;

-- ---------- 1. Calendrier vaccinal créé à l'inscription ---------------
-- (les enfants is_demo reçoivent leurs rendez-vous du seed)
create or replace function trg_generate_appointments() returns trigger
language plpgsql as $$
begin
  if not new.is_demo then
    insert into appointments (child_id, schedule_id, due_date)
    select new.id, s.id, new.birth_date + s.age_days
    from vaccine_schedule s
    on conflict (child_id, schedule_id) do nothing;
  end if;
  return new;
end $$;

drop trigger if exists children_generate_appointments on children;
create trigger children_generate_appointments
  after insert on children for each row execute function trg_generate_appointments();

-- ---------- 2. Moteur de règles ---------------------------------------
-- p_as_of     : date de référence (aujourd'hui en production)
-- p_child_id  : limiter à un enfant (boutons de démo) ; null = tous
-- p_simulated : true = messages marqués « simulés » et immédiatement « sent »
create or replace function run_rules(
  p_as_of date default current_date,
  p_child_id uuid default null,
  p_simulated boolean default false,
  p_lookback_days int default 60      -- relances/alertes seulement sur les rendez-vous récents
) returns table(rule text, n int)
language plpgsql as $$
declare
  v_n int;
  v_off int;
  v_tpl text;
begin
  -- R1 : rappels J-2, J-1, J0 — UN message par enfant et par contact vaccinal
  foreach v_off in array array[2, 1, 0] loop
    v_tpl := case v_off when 2 then 'J-2' when 1 then 'J-1' else 'J0' end;
    with ins as (
      insert into messages (child_id, guardian_id, appointment_id, template_code, channel, language,
                            scheduled_for, sent_at, status, audio_url, is_simulated)
      select rep.child_id, g.id, rep.id, v_tpl, g.channel_pref, g.language,
             p_as_of::timestamptz + interval '8 hours',
             case when p_simulated then now() end,
             case when p_simulated then 'sent' else 'scheduled' end,
             format('audio/%s/%s_C%s.mp3', g.language, v_tpl, rep.contact_no),
             p_simulated
      from (select distinct on (a.child_id, s.contact_no) a.id, a.child_id, s.contact_no
            from appointments a join vaccine_schedule s on s.id = a.schedule_id
            where a.status = 'planned' and a.due_date - p_as_of = v_off
              and (p_child_id is null or a.child_id = p_child_id)
            order by a.child_id, s.contact_no, s.id) rep
      join guardians g on g.child_id = rep.child_id and g.is_primary
      on conflict (appointment_id, template_code, channel) do nothing
      returning 1)
    select count(*) into v_n from ins;
    rule := 'rappel ' || v_tpl; n := v_n; return next;
  end loop;

  -- R2 : rendez-vous planifié non honoré à J+3 -> « missed »
  with upd as (
    update appointments a set status = 'missed'
    where a.status = 'planned' and a.due_date + 3 <= p_as_of
      and (p_child_id is null or a.child_id = p_child_id)
    returning 1)
  select count(*) into v_n from upd;
  rule := 'rendez-vous manqués (J+3)'; n := v_n; return next;

  -- R3 : relance vocale après un contact manqué (appel avec réponse 1/2/3), 1 par contact
  with ins as (
    insert into messages (child_id, guardian_id, appointment_id, template_code, channel, language,
                          scheduled_for, sent_at, status, audio_url, is_simulated)
    select rep.child_id, g.id, rep.id, 'MISSED_3', 'voice', g.language,
           (rep.due_date + 3)::timestamptz + interval '10 hours',
           case when p_simulated then now() end,
           case when p_simulated then 'sent' else 'scheduled' end,
           format('audio/%s/MISSED_3_C%s.mp3', g.language, rep.contact_no),
           p_simulated
    from (select distinct on (a.child_id, s.contact_no) a.id, a.child_id, a.due_date, s.contact_no
          from appointments a join vaccine_schedule s on s.id = a.schedule_id
          where a.status = 'missed' and a.due_date + 3 <= p_as_of
            and a.due_date >= p_as_of - p_lookback_days
            and (p_child_id is null or a.child_id = p_child_id)
          order by a.child_id, s.contact_no, s.id) rep
    join guardians g on g.child_id = rep.child_id and g.is_primary
    on conflict (appointment_id, template_code, channel) do nothing
    returning 1)
  select count(*) into v_n from ins;
  rule := 'relance vocale MISSED_3'; n := v_n; return next;

  -- R4 : contact manqué depuis 7 jours -> UNE alerte agent de santé (+ mère relais)
  with ins as (
    insert into alerts (child_id, appointment_id, type, target_role, center_id)
    select rep.child_id, rep.id, 'missed_7d', 'agent', c.center_id
    from (select distinct on (a.child_id, s.contact_no) a.id, a.child_id, s.contact_no
          from appointments a join vaccine_schedule s on s.id = a.schedule_id
          where a.status = 'missed' and a.due_date + 7 <= p_as_of
            and a.due_date >= p_as_of - p_lookback_days
            and (p_child_id is null or a.child_id = p_child_id)
          order by a.child_id, s.contact_no, s.id) rep
    join children c on c.id = rep.child_id
    where not exists (select 1 from alerts x where x.child_id = rep.child_id
                      and x.appointment_id = rep.id and x.type = 'missed_7d' and x.status in ('open','acknowledged'))
    returning 1)
  select count(*) into v_n from ins;
  rule := 'alertes manqué +7 j'; n := v_n; return next;

  -- R5 : acte de naissance manquant -> message + alerte
  with ins as (
    insert into messages (child_id, guardian_id, template_code, channel, language,
                          scheduled_for, sent_at, status, audio_url, is_simulated)
    select c.id, g.id, 'BIRTH_CERT', g.channel_pref, g.language, p_as_of::timestamptz + interval '9 hours',
           case when p_simulated then now() end,
           case when p_simulated then 'sent' else 'scheduled' end,
           format('audio/%s/BIRTH_CERT.mp3', g.language), p_simulated
    from children c join guardians g on g.child_id = c.id and g.is_primary
    where not c.has_birth_certificate
      and (p_child_id is null or c.id = p_child_id)
      and not exists (select 1 from messages m where m.child_id = c.id and m.template_code = 'BIRTH_CERT')
    returning 1)
  select count(*) into v_n from ins;
  rule := 'messages acte de naissance'; n := v_n; return next;

  with ins as (
    insert into alerts (child_id, type, target_role, center_id)
    select c.id, 'birth_cert_missing', case when c.daycare_id is not null then 'educatrice' else 'agent' end, c.center_id
    from children c
    where not c.has_birth_certificate
      and (p_child_id is null or c.id = p_child_id)
      and not exists (select 1 from alerts x where x.child_id = c.id
                      and x.type = 'birth_cert_missing' and x.status in ('open','acknowledged'))
    returning 1)
  select count(*) into v_n from ins;
  rule := 'alertes acte manquant'; n := v_n; return next;

  -- R6 : stagnation / chute de croissance (pesée récente de moins de 45 jours)
  with ins as (
    insert into alerts (child_id, type, target_role, center_id)
    select l.child_id, 'growth_stagnation', 'agent', c.center_id
    from v_last_weigh_in l join children c on c.id = l.child_id
    where l.trend <> 'ok' and l.measured_at >= p_as_of - 45
      and (p_child_id is null or l.child_id = p_child_id)
      and not exists (select 1 from alerts x where x.child_id = l.child_id
                      and x.type = 'growth_stagnation' and x.status in ('open','acknowledged'))
    returning 1)
  select count(*) into v_n from ins;
  rule := 'alertes croissance'; n := v_n; return next;
end $$;

-- ---------- 3. Pesée : z-score et tendance calculés à l'insertion ------
-- Utilise who_weight_for_age si la table est chargée (méthode LMS), sinon laisse z_score vide.
create or replace function trg_weigh_in_compute() returns trigger
language plpgsql as $$
declare
  c record; r record; prev record; v_age numeric;
begin
  select birth_date, sex into c from children where id = new.child_id;
  v_age := coalesce(new.age_months, (new.measured_at - c.birth_date) / 30.4375);
  new.age_months := round(v_age, 1);
  select * into r from who_weight_for_age
   where sex = c.sex and age_months = round(v_age)::int;
  if found and new.z_score is null then
    new.z_score := round(case when r.l = 0 then ln(new.weight_kg / r.m) / r.s
                              else (power(new.weight_kg / r.m, r.l) - 1) / (r.l * r.s) end, 2);
  end if;
  -- Statut OMS : à orienter (z < -3), à surveiller (z < -2), sinon normal.
  if new.z_score is not null then
    new.status := case
      when new.z_score < -3 then 'a_orienter'
      when new.z_score < -2 then 'a_surveiller'
      else 'normal' end;
  end if;

  -- Stagnation (règle de Gerson) : dernière mesure à au moins un mois,
  -- poids identique ou en baisse, ou chute d'au moins une ligne de z-score.
  select weight_kg, z_score into prev from weigh_ins
   where child_id = new.child_id
     and measured_at <= new.measured_at - interval '1 month'
   order by measured_at desc limit 1;
  if new.trend is null then
    new.trend := case
      when prev.weight_kg is null then 'ok'
      when new.weight_kg < prev.weight_kg then 'chute'
      when new.weight_kg = prev.weight_kg then 'stagnation'
      when prev.z_score is not null and new.z_score is not null
        and prev.z_score - new.z_score >= 1 then 'stagnation'
      else 'ok' end;
  end if;
  return new;
end $$;

drop trigger if exists weigh_ins_compute on weigh_ins;
create trigger weigh_ins_compute before insert on weigh_ins
  for each row execute function trg_weigh_in_compute();

-- ---------- 4. Boutons d'avance rapide (démo) --------------------------
-- demo_fast_forward(child, 'J-2' | 'J-1' | 'J0' | 'MISSED_3' | 'MISSED_7')
-- Cible le prochain rendez-vous de l'enfant (planifié ou manqué) et simule la date voulue.
create or replace function demo_fast_forward(p_child_id uuid, p_event text)
returns table(simulated_date date, rule text, n int)
language plpgsql as $$
declare
  v_due date; v_as_of date;
begin
  -- rendez-vous cible : le plus proche, planifié OU déjà manqué (pour enchaîner J-2 -> +3 j -> +7 j)
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
  return query select v_as_of, r.rule, r.n from run_rules(v_as_of, p_child_id, true) r;
end $$;

-- Annuler la simulation d'un enfant (remettre la démo à zéro entre deux répétitions)
create or replace function demo_reset_child(p_child_id uuid) returns void
language sql as $$
  delete from messages where child_id = p_child_id and is_simulated;
  delete from alerts   where child_id = p_child_id;
  update appointments set status = 'planned', done_at = null where child_id = p_child_id;
$$;
