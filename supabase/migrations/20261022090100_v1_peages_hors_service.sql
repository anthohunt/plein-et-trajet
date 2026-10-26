-- Jalon 5 (V1) — T5.9 : les péages sortent de la V1. Le service est mis HORS SERVICE, sans rien effacer :
-- aucune écriture sur public.cles_fournisseurs ni sur Vault (les clés restent pour un retour éventuel).
alter table public.moteurs add column if not exists en_service boolean not null default true;
update public.moteurs set en_service = false where service = 'peages';
