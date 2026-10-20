-- Jalon 3, round 4.
-- 1) Écran Moteurs : l'état d'un moteur est un CODE + paramètres (la phrase est composée par src/lib/textes.ts, T.etatMoteur) ;
--    la colonne `message` (texte écrit par le serveur) n'est plus lue ni écrite.
alter table public.moteurs add column if not exists code text not null default 'pret_sans_cle';
alter table public.moteurs add column if not exists params jsonb not null default '{}'::jsonb;
update public.moteurs set code = case
    when message like 'Connecté · test Albi → Barcelone%' then 'ok_peages'
    when message like 'Connecté · test Albi → Toulouse%' then 'ok_itineraire'
    when message like 'Enregistré%' then 'enregistre'
    when message = 'Clé à coller' then 'cle_a_coller'
    else 'pret_sans_cle' end,
  params = '{}'::jsonb
  where code = 'pret_sans_cle';
alter table public.moteurs alter column message drop not null;
comment on column public.moteurs.message is 'abandonnée au round 4 du jalon 3 (remplacée par code + params) ; plus lue ni écrite';

-- 2) Descriptions à jour (audit round 2, LOW 7) : Roumanie et Royaume-Uni sont branchés depuis le round 3.
update public.moteurs set description = 'Prix station par station, synchronisés : France toutes les 10 min ; Espagne toutes les 30 min ; Italie, Portugal, Slovénie, Croatie, Autriche, Danemark toutes les 3 h ; Islande, Roumanie, Royaume-Uni toutes les 6 h.'
  where service = 'prix';
update public.fournisseurs set nom = 'Flux officiels par pays · FR, ES, IT, PT, SI, HR, AT, DK, IS, RO, GB (sans clé)' where id = 'officiel';
