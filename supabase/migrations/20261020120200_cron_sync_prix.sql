-- Planification de sync-prix toutes les 10 min (pg_cron + pg_net).
-- Le secret partagé avec la fonction est lu dans Vault (nom : sync_prix_secret), posé hors dépôt :
--   select vault.create_secret('<SYNC_SECRET>', 'sync_prix_secret');
create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

select cron.unschedule(jobid) from cron.job where jobname = 'sync-prix';
select cron.schedule(
  'sync-prix',
  '*/10 * * * *',
  $$
  select net.http_post(
    url := 'https://rglrwtkqwihdztgqlbsy.supabase.co/functions/v1/sync-prix?enseignes=120',
    headers := jsonb_build_object('Content-Type', 'application/json',
      'x-sync-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'sync_prix_secret' limit 1)),
    body := '{}'::jsonb,
    timeout_milliseconds := 150000
  );
  $$
);
