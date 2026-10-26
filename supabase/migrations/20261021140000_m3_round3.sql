-- Jalon 3, round 3 : Royaume-Uni (Asda) et Roumanie branchés ; limite des appels de péages par identité anonyme et globale.
update public.pays set statut_flux = 'branche', flux_stations = true where code in ('GB','RO');
select cron.unschedule(jobid) from cron.job where jobname in ('sync-stations-gb','sync-stations-ro');
select cron.schedule('sync-stations-' || lower(p.pays), p.minute || ' */6 * * *',
  format($j$ select net.http_post(url := 'https://VOTRE-REF-PROJET.supabase.co/functions/v1/sync-stations-pays?pays=%s',
    headers := jsonb_build_object('Content-Type','application/json','x-sync-secret',(select decrypted_secret from vault.decrypted_secrets where name = 'sync_prix_secret' limit 1)),
    body := '{}'::jsonb, timeout_milliseconds := 150000) $j$, p.pays))
from (values ('GB', 5), ('RO', 59)) as p(pays, minute);

-- LOW 19 : quota PTV/HERE exposé aux visiteurs anonymes. Chaque appel de péages réserve un créneau ici ; au-delà de la limite
-- (par identité anonyme et par jour, ou globale par jour) le calcul continue SANS péages (« Péages non disponibles… ») et aucun appel payant ne part.
create table if not exists public.quota_peages (
  jour date not null,
  identite text not null,          -- identifiant de l'utilisateur anonyme, ou '*' pour le total du jour
  appels int not null default 0,
  primary key (jour, identite)
);
alter table public.quota_peages enable row level security;
revoke all on public.quota_peages from anon, authenticated;

create or replace function public.quota_peages_reserver(p_identite text, p_max_identite int, p_max_global int)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_jour date := (now() at time zone 'Europe/Paris')::date; v_i int; v_g int;
begin
  insert into public.quota_peages (jour, identite, appels) values (v_jour, '*', 0) on conflict do nothing;
  insert into public.quota_peages (jour, identite, appels) values (v_jour, p_identite, 0) on conflict do nothing;
  select appels into v_g from public.quota_peages where jour = v_jour and identite = '*' for update;
  select appels into v_i from public.quota_peages where jour = v_jour and identite = p_identite for update;
  if v_g >= p_max_global or v_i >= p_max_identite then return false; end if;
  update public.quota_peages set appels = appels + 1 where jour = v_jour and identite in ('*', p_identite);
  return true;
end $$;
revoke all on function public.quota_peages_reserver(text, int, int) from public, anon, authenticated;
grant execute on function public.quota_peages_reserver(text, int, int) to service_role;
