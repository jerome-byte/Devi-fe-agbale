-- =====================================================================
-- 07_app.sql : ce dont l'application a besoin en plus du schéma de Cherif
-- Idempotent. À intégrer dans 01_schema.sql quand Cherif l'aura validé.
-- =====================================================================

-- Taille mesurée à la pesée (couché avant 2 ans, debout après) : nécessaire pour
-- les indicateurs taille pour l'âge et IMC pour l'âge (regles_croissance.md).
alter table weigh_ins add column if not exists height_cm numeric;
