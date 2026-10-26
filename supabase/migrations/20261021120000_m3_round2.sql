-- Jalon 3, round 2 : flux de stations branchés, statut de flux par pays, fournisseurs paramétrés en table, limiteur partagé.

-- statut du flux station par station : « branche » (synchronisé), « non_branche » (flux connu, pas encore branché), « aucun » (le pays ne publie pas)
alter table public.pays add column if not exists statut_flux text not null default 'aucun' check (statut_flux in ('branche','non_branche','aucun'));
insert into public.pays (code, nom, tva, flux_stations) values ('IS','Islande',24,false) on conflict (code) do nothing;
update public.pays set statut_flux = 'aucun', flux_stations = false;
update public.pays set statut_flux = 'branche', flux_stations = true where code in ('FR','ES','IT','PT','SI','HR','AT','DK','IS');
update public.pays set statut_flux = 'non_branche' where code in ('DE','RO','GB');   -- DE : clé gratuite Tankerkönig à créer ; RO : certificat TLS invalide ; GB : CSV à URL signée

-- fournisseurs d'itinéraire : adresses et pauses lues en table (FOSSGIS : « les URL ne devraient pas être codées en dur », 1 requête/s)
alter table public.fournisseurs add column if not exists url text;
alter table public.fournisseurs add column if not exists chemin_route text;
alter table public.fournisseurs add column if not exists chemin_trace text;
alter table public.fournisseurs add column if not exists pause_ms int not null default 0;
update public.fournisseurs set url = 'https://valhalla1.openstreetmap.de', chemin_route = '/route', chemin_trace = '/trace_attributes', pause_ms = 1100 where id = 'valhalla-public';
update public.fournisseurs set url = 'https://api.stadiamaps.com', chemin_route = '/route/v1', chemin_trace = '/trace_attributes/v1', pause_ms = 0 where id = 'stadia';
update public.moteurs set description = 'Prix station par station, synchronisés : France toutes les 10 min ; Espagne toutes les 30 min ; Italie, Portugal, Slovénie, Croatie, Autriche, Danemark, Islande plusieurs fois par jour.' where service = 'prix';
update public.fournisseurs set nom = 'Flux officiels par pays · FR, ES, IT, PT, SI, HR, AT, DK, IS (sans clé)' where id = 'officiel';

-- limiteur partagé entre invocations : réserve le prochain créneau d'un fournisseur et renvoie le délai à attendre (ms)
create table if not exists public.limiteurs (nom text primary key, prochain timestamptz not null default now());
alter table public.limiteurs enable row level security;
revoke all on public.limiteurs from anon, authenticated;
create or replace function public.limiteur_reserver(p_nom text, p_intervalle_ms integer)
returns integer language plpgsql security definer set search_path = public as $$
declare v_maintenant timestamptz := clock_timestamp(); v_creneau timestamptz;
begin
  insert into public.limiteurs (nom, prochain) values (p_nom, v_maintenant) on conflict (nom) do nothing;
  update public.limiteurs set prochain = greatest(prochain, v_maintenant) + make_interval(secs => p_intervalle_ms / 1000.0)
    where nom = p_nom returning prochain - make_interval(secs => p_intervalle_ms / 1000.0) into v_creneau;
  return greatest(0, ceil(extract(epoch from (v_creneau - v_maintenant)) * 1000))::int;
end $$;
revoke all on function public.limiteur_reserver(text, integer) from public, anon, authenticated;
grant execute on function public.limiteur_reserver(text, integer) to service_role;

-- planification des nouveaux flux (secret partagé lu dans Vault, comme sync-prix)
select cron.unschedule(jobid) from cron.job where jobname like 'sync-stations-%' and jobname <> 'sync-stations-es';
select cron.schedule('sync-stations-' || lower(p.pays), p.minute || ' */' || p.heures || ' * * *',
  format($j$ select net.http_post(url := 'https://VOTRE-REF-PROJET.supabase.co/functions/v1/sync-stations-pays?pays=%s',
    headers := jsonb_build_object('Content-Type','application/json','x-sync-secret',(select decrypted_secret from vault.decrypted_secrets where name = 'sync_prix_secret' limit 1)),
    body := '{}'::jsonb, timeout_milliseconds := 150000) $j$, p.pays))
from (values ('IT',11,3),('PT',17,3),('SI',23,3),('HR',29,3),('AT',41,3),('DK',47,3),('IS',53,6)) as p(pays, minute, heures);
