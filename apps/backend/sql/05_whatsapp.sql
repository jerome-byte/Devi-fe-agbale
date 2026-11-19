-- =====================================================================
-- 05_whatsapp.sql : colonnes utilisées par le backend d'envoi WhatsApp
-- À exécuter après 01_schema.sql (Cherif). Idempotent, n'ajoute que des colonnes.
-- =====================================================================

-- Identifiant du message chez WhatsApp : relie les accusés (distribué, lu)
-- et les réponses « 1 » / « 2 » à la ligne d'origine.
alter table messages add column if not exists wa_message_id text;
-- Dernière erreur d'envoi (audio introuvable, refus de Meta...).
alter table messages add column if not exists error text;
-- Nombre de tentatives d'envoi.
alter table messages add column if not exists attempts int not null default 0;

create index if not exists idx_messages_wa on messages (wa_message_id);
create index if not exists idx_messages_a_envoyer on messages (scheduled_for)
  where status = 'scheduled';
