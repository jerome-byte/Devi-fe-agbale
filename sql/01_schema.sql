-- =====================================================================
-- ɖevi ƒe agbalẽ — Hack4Children 2026
-- 01_schema.sql : modèle de données (Supabase / PostgreSQL 15+)
-- À exécuter dans le SQL Editor de Supabase, AVANT 02_views.sql
-- =====================================================================

-- Supabase installe pgcrypto dans le schéma extensions : on l'ajoute au chemin
-- de recherche pour que gen_random_bytes soit visible sur tout projet.
set search_path = public, extensions;

create extension if not exists pgcrypto;

-- ========== RÉFÉRENCES ==============================================
create table if not exists zones (
  id         int primary key,
  name       text not null,
  commune    text,
  prefecture text
);

create table if not exists health_centers (
  id      int primary key,
  name    text not null,
  zone_id int references zones(id),
  lat     numeric,
  lng     numeric
);

create table if not exists daycares (          -- Garderies Communautaires Intégrées
  id      int primary key,
  name    text not null,
  zone_id int references zones(id),
  center_id int references health_centers(id)   -- centre de santé partenaire
);

-- Calendrier PEV officiel du Togo (0 à 5 ans) : table PARAMÉTRABLE.
-- Un « contact » = une visite qui regroupe plusieurs vaccins (1 message par contact).
create table if not exists vaccine_schedule (
  id         serial primary key,
  vaccine_code text not null,
  dose       int  not null default 1,
  label_fr   text not null,
  age_days   int  not null,          -- âge cible en jours
  contact_no int  not null,          -- contact vaccinal (1 à 9)
  contact_label text,                -- ex. '6 semaines'
  grace_days int  not null default 7,
  unique (vaccine_code, dose)
);

-- Tables LMS OMS poids-pour-l'âge (à charger depuis les fichiers OMS publics)
create table if not exists who_weight_for_age (
  sex        char(1) check (sex in ('M','F')),
  age_months int,
  l numeric, m numeric, s numeric,
  primary key (sex, age_months)
);

-- ========== ACTEURS ================================================
-- profiles est relié à auth.users sur Supabase. En local sans Supabase,
-- retirer la clause "references auth.users(id)".
create table if not exists profiles (
  id        uuid primary key,   -- = auth.users.id
  full_name text,
  role      text not null check (role in ('agent','educatrice','pilotage','admin')),
  center_id  int references health_centers(id),
  daycare_id int references daycares(id)
);

create table if not exists children (
  id          uuid primary key default gen_random_uuid(),
  qr_token    text unique not null default encode(gen_random_bytes(9), 'hex'),
  first_name  text not null,
  birth_date  date not null,
  sex         char(1) check (sex in ('M','F')),
  center_id   int references health_centers(id),
  daycare_id  int references daycares(id),
  zone_id     int references zones(id),
  has_birth_certificate boolean not null default false,
  birth_cert_resolved_at date,
  distance_km numeric,                 -- distance domicile → centre (score de risque)
  is_demo     boolean not null default false,
  created_by  uuid references profiles(id),
  created_at  timestamptz not null default now()
);
create index if not exists idx_children_zone   on children(zone_id);
create index if not exists idx_children_center on children(center_id);

create table if not exists guardians (
  id         uuid primary key default gen_random_uuid(),
  child_id   uuid not null references children(id) on delete cascade,
  name       text,
  phone      text not null,
  language   text not null check (language in ('ewe','mina','kabiye','fr')),
  channel_pref text not null default 'whatsapp' check (channel_pref in ('whatsapp','voice')),
  is_primary boolean not null default true,
  consent_at timestamptz
);
create index if not exists idx_guardians_child on guardians(child_id);

-- ========== SUIVI ==================================================
create table if not exists appointments (
  id          uuid primary key default gen_random_uuid(),
  child_id    uuid not null references children(id) on delete cascade,
  schedule_id int  not null references vaccine_schedule(id),
  due_date    date not null,
  status      text not null default 'planned' check (status in ('planned','done','missed')),
  done_at     date,
  recorded_by uuid references profiles(id),
  unique (child_id, schedule_id)
);
create index if not exists idx_appt_child  on appointments(child_id);
create index if not exists idx_appt_due    on appointments(due_date, status);

create table if not exists weigh_ins (
  id          uuid primary key default gen_random_uuid(),
  child_id    uuid not null references children(id) on delete cascade,
  measured_at date not null,
  weight_kg   numeric not null,
  age_months  numeric,
  z_score     numeric,
  trend       text check (trend in ('ok','stagnation','chute')),
  recorded_by uuid references profiles(id)
);
create index if not exists idx_weigh_child on weigh_ins(child_id, measured_at);

-- ========== COMMUNICATION ==========================================
create table if not exists audio_segments (    -- enregistrements (Jérôme)
  key        text not null,
  language   text not null,
  text_fr    text,
  file_url   text not null,
  duration_s numeric,
  primary key (key, language)
);

create table if not exists messages (          -- journal des messages
  id             uuid primary key default gen_random_uuid(),
  child_id       uuid not null references children(id) on delete cascade,
  guardian_id    uuid references guardians(id) on delete set null,
  appointment_id uuid references appointments(id) on delete cascade,
  template_code  text not null,   -- WELCOME | J-2 | J-1 | J0 | MISSED_3 | BIRTH_CERT
  channel        text not null check (channel in ('whatsapp','voice')),
  language       text,
  scheduled_for  timestamptz,
  sent_at        timestamptz,
  status         text not null default 'scheduled'
                 check (status in ('scheduled','sent','delivered','listened','failed')),
  audio_url      text,            -- fichier assemblé (lecteur du carnet)
  response_key   int check (response_key in (1,2,3)),
  responded_at   timestamptz,
  is_simulated   boolean not null default false,
  unique (appointment_id, template_code, channel)
);
create index if not exists idx_msg_child on messages(child_id, scheduled_for);

create table if not exists alerts (
  id             uuid primary key default gen_random_uuid(),
  child_id       uuid not null references children(id) on delete cascade,
  appointment_id uuid references appointments(id) on delete cascade,
  type           text not null check (type in
    ('missed_7d','growth_stagnation','birth_cert_missing','screening_due','referral')),
  target_role    text check (target_role in ('agent','educatrice','pilotage')),
  center_id      int references health_centers(id),
  status         text not null default 'open' check (status in ('open','acknowledged','resolved')),
  created_at     timestamptz not null default now(),
  resolved_at    timestamptz
);
-- une seule alerte ouverte par (enfant, type, rendez-vous) -> moteur idempotent
create unique index if not exists uq_alert_open
  on alerts (child_id, type, coalesce(appointment_id, '00000000-0000-0000-0000-000000000000'::uuid))
  where status = 'open';
create index if not exists idx_alert_status on alerts(status, type);

-- ========== CALENDRIER PEV OFFICIEL (source : PEV Togo) ==============
-- Mois convertis en jours (x 30,4375) : 5 m = 152, 6 m = 183, 7 m = 213, 9 m = 274, 15 m = 457.
insert into vaccine_schedule (id, vaccine_code, dose, label_fr, age_days, contact_no, contact_label) values
  (1,  'BCG',   1, 'BCG (tuberculose)',                  0,   1, 'Naissance'),
  (2,  'VPO',   0, 'Polio orale, dose 0',                0,   1, 'Naissance'),
  (3,  'PENTA', 1, 'DTC-HepB-Hib (pentavalent), dose 1', 42,  2, '6 semaines'),
  (4,  'VPO',   1, 'Polio orale, dose 1',                42,  2, '6 semaines'),
  (5,  'PCV',   1, 'Pneumocoque, dose 1',                42,  2, '6 semaines'),
  (6,  'ROTA',  1, 'Rotavirus, dose 1',                  42,  2, '6 semaines'),
  (7,  'PENTA', 2, 'DTC-HepB-Hib (pentavalent), dose 2', 70,  3, '10 semaines'),
  (8,  'VPO',   2, 'Polio orale, dose 2',                70,  3, '10 semaines'),
  (9,  'PCV',   2, 'Pneumocoque, dose 2',                70,  3, '10 semaines'),
  (10, 'ROTA',  2, 'Rotavirus, dose 2',                  70,  3, '10 semaines'),
  (11, 'PENTA', 3, 'DTC-HepB-Hib (pentavalent), dose 3', 98,  4, '14 semaines'),
  (12, 'VPO',   3, 'Polio orale, dose 3',                98,  4, '14 semaines'),
  (13, 'PCV',   3, 'Pneumocoque, dose 3',                98,  4, '14 semaines'),
  (14, 'VPI',   1, 'Polio injectable, dose 1',           98,  4, '14 semaines'),
  (15, 'R21',   1, 'Paludisme (VAP / R21), dose 1',      152, 5, '5 mois'),
  (16, 'R21',   2, 'Paludisme (VAP / R21), dose 2',      183, 6, '6 mois'),
  (17, 'R21',   3, 'Paludisme (VAP / R21), dose 3',      213, 7, '7 mois'),
  (18, 'RR',    1, 'Rougeole-Rubéole, dose 1',           274, 8, '9 mois'),
  (19, 'VAA',   1, 'Fièvre jaune',                       274, 8, '9 mois'),
  (20, 'VPI',   2, 'Polio injectable, dose 2',           274, 8, '9 mois'),
  (21, 'RR',    2, 'Rougeole-Rubéole, dose 2',           457, 9, '15 mois'),
  (22, 'MENA',  1, 'Méningite A',                        457, 9, '15 mois'),
  (23, 'R21',   4, 'Paludisme (VAP / R21), dose 4',      457, 9, '15 mois')
on conflict (vaccine_code, dose) do update
  set label_fr = excluded.label_fr, age_days = excluded.age_days,
      contact_no = excluded.contact_no, contact_label = excluded.contact_label;
select setval(pg_get_serial_sequence('vaccine_schedule','id'), (select max(id) from vaccine_schedule));
