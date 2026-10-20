-- Planification du jalon 3 (pg_cron + pg_net ; secret partagé lu dans Vault, comme sync-prix) :
--  • sync-stations-pays : prix des stations espagnoles, toutes les 30 min ;
--  • sync-moyennes-ue : Bulletin pétrolier UE, chaque jour (idempotent : la ligne de la semaine est réécrite).
select cron.unschedule(jobid) from cron.job where jobname in ('sync-stations-es', 'sync-moyennes-ue');
select cron.schedule('sync-stations-es', '7,37 * * * *', $$
  select net.http_post(
    url := 'https://rglrwtkqwihdztgqlbsy.supabase.co/functions/v1/sync-stations-pays?pays=ES',
    headers := jsonb_build_object('Content-Type', 'application/json',
      'x-sync-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'sync_prix_secret' limit 1)),
    body := '{}'::jsonb, timeout_milliseconds := 150000);
$$);
select cron.schedule('sync-moyennes-ue', '30 6 * * *', $$
  select net.http_post(
    url := 'https://rglrwtkqwihdztgqlbsy.supabase.co/functions/v1/sync-moyennes-ue',
    headers := jsonb_build_object('Content-Type', 'application/json',
      'x-sync-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'sync_prix_secret' limit 1)),
    body := '{}'::jsonb, timeout_milliseconds := 150000);
$$);
