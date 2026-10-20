-- US-5.6 — « Où trouver ma clé » : lien et consigne de chaque fournisseur à clé, lus en table (jamais en dur dans l'interface).
alter table public.fournisseurs add column if not exists url_cle text;
alter table public.fournisseurs add column if not exists consigne_cle text;

-- Tankerkönig : fournisseur à clé des stations allemandes (service « prix »)
insert into public.fournisseurs (id, service, nom, cle_requise, ordre) values ('tankerkoenig', 'prix', 'Tankerkönig · Allemagne (clé gratuite)', true, 2) on conflict (id) do nothing;

update public.fournisseurs set url_cle = 'https://developer.myptv.com/en', consigne_cle = 'Connecte-toi, puis ouvre le menu « API Keys » pour créer ou copier ta clé.' where id = 'ptv';
update public.fournisseurs set url_cle = 'https://client.stadiamaps.com/dashboard/', consigne_cle = 'Tableau de bord Stadia Maps : crée une propriété, puis copie sa clé d''API.' where id = 'stadia';
update public.fournisseurs set url_cle = 'https://platform.here.com/access/apps', consigne_cle = 'Access Manager, rubrique « Apps » : crée une application, puis une clé d''API.' where id = 'here';
update public.fournisseurs set url_cle = 'https://creativecommons.tankerkoenig.de/', consigne_cle = 'Inscription gratuite : la clé d''API est envoyée par e-mail.' where id = 'tankerkoenig';
-- aucun lien pour un fournisseur sans clé
update public.fournisseurs set url_cle = null, consigne_cle = null where not cle_requise;

-- stations allemandes : toutes les 6 h (la fonction ne fait rien tant qu'aucune clé Tankerkönig n'est rangée dans Vault)
select cron.unschedule(jobid) from cron.job where jobname = 'sync-stations-de';
select cron.schedule('sync-stations-de', '35 */6 * * *', $$
  select net.http_post(url := 'https://rglrwtkqwihdztgqlbsy.supabase.co/functions/v1/sync-stations-pays?pays=DE',
    headers := jsonb_build_object('Content-Type','application/json','x-sync-secret',(select decrypted_secret from vault.decrypted_secrets where name = 'sync_prix_secret' limit 1)),
    body := '{}'::jsonb, timeout_milliseconds := 150000) $$);
