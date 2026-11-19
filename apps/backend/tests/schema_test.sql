-- Extrait des tables de sql/01_schema.sql (Cherif) utilisées par le backend.
-- Sert uniquement aux tests d'intégration : la vraie source reste le schéma de Cherif.
drop table if exists messages, appointments, guardians, children, health_centers cascade;

create table health_centers (id int primary key, name text not null);

create table children (
  id         uuid primary key default gen_random_uuid(),
  first_name text not null,
  birth_date date not null default current_date,
  center_id  int references health_centers(id)
);

create table guardians (
  id         uuid primary key default gen_random_uuid(),
  child_id   uuid not null references children(id) on delete cascade,
  phone      text not null,
  language   text not null default 'ewe',
  is_primary boolean not null default true
);

create table appointments (
  id       uuid primary key default gen_random_uuid(),
  child_id uuid not null references children(id) on delete cascade
);

create table messages (
  id             uuid primary key default gen_random_uuid(),
  child_id       uuid not null references children(id) on delete cascade,
  guardian_id    uuid references guardians(id) on delete set null,
  appointment_id uuid references appointments(id) on delete cascade,
  template_code  text not null,
  channel        text not null check (channel in ('whatsapp','voice')),
  language       text,
  scheduled_for  timestamptz,
  sent_at        timestamptz,
  status         text not null default 'scheduled'
                 check (status in ('scheduled','sent','delivered','listened','failed')),
  audio_url      text,
  response_key   int check (response_key in (1,2,3)),
  responded_at   timestamptz,
  is_simulated   boolean not null default false,
  unique (appointment_id, template_code, channel)
);
