-- Application d'un lot du flux instantané officiel (appelée par l'Edge Function sync-prix, rôle service).
-- p_lot : tableau JSON d'enregistrements bruts de l'API Explore v2.1.
create or replace function public.sync_prix_appliquer(p_lot jsonb)
returns integer
language plpgsql
security definer
set search_path = public, extensions
as $$
declare n integer;
begin
  with src as (
    select r from jsonb_array_elements(p_lot) r
    where r->'geom' is not null and jsonb_typeof(r->'geom') = 'object'
  )
  insert into public.stations as s (id, adresse, cp, ville, geom, lat, lon, services, automate_24_24, maj)
  select (r->>'id'), r->>'adresse', r->>'cp', r->>'ville',
         st_makepoint((r->'geom'->>'lon')::float8, (r->'geom'->>'lat')::float8)::geography,
         (r->'geom'->>'lat')::float8, (r->'geom'->>'lon')::float8,
         coalesce(array(select jsonb_array_elements_text(case when jsonb_typeof(r->'services_service')='array' then r->'services_service' else '[]'::jsonb end)), '{}'),
         coalesce(r->>'horaires_automate_24_24', '') = 'Oui',
         now()
  from src
  on conflict (id) do update set adresse = excluded.adresse, cp = excluded.cp, ville = excluded.ville,
    geom = excluded.geom, lat = excluded.lat, lon = excluded.lon, services = excluded.services,
    automate_24_24 = excluded.automate_24_24, maj = excluded.maj;
  get diagnostics n = row_count;

  create temp table if not exists _p (station_id text, carburant text, prix numeric(5,3), maj timestamptz, rupture boolean) on commit drop;
  truncate _p;
  insert into _p
  select x.station_id, x.carburant, x.prix, x.maj, x.rupture_temp
  from (
    select (r->>'id') as station_id, f.carburant,
           nullif(r->>(f.cle || '_prix'), '')::numeric(5,3) as prix,
           nullif(r->>(f.cle || '_maj'), '')::timestamptz as maj,
           (f.nom_officiel = any(string_to_array(coalesce(r->>'carburants_rupture_temporaire', ''), ';'))) as rupture_temp,
           (f.nom_officiel = any(string_to_array(coalesce(r->>'carburants_rupture_definitive', ''), ';'))) as rupture_def
    from jsonb_array_elements(p_lot) r
    cross join (values ('gazole','Gazole','Gazole'), ('e10','SP95-E10','E10'), ('sp95','SP95','SP95'),
                       ('sp98','SP98','SP98'), ('e85','E85','E85'), ('gplc','GPLc','GPLc')) as f(cle, carburant, nom_officiel)
    where r->'geom' is not null and jsonb_typeof(r->'geom') = 'object'
  ) x
  -- une ligne si un prix est déclaré, ou si une rupture temporaire est déclarée ; rupture définitive = non vendu
  where not x.rupture_def and (x.prix is not null or x.rupture_temp);

  insert into public.prix as p (station_id, carburant, prix, maj, rupture)
  select station_id, carburant, prix, maj, rupture from _p
  on conflict (station_id, carburant) do update set prix = excluded.prix, maj = excluded.maj, rupture = excluded.rupture;

  -- carburants qui ne figurent plus pour une station du lot : supprimés
  delete from public.prix p
  where p.station_id in (select (r->>'id') from jsonb_array_elements(p_lot) r)
    and not exists (select 1 from _p where _p.station_id = p.station_id and _p.carburant = p.carburant);
  return n;
end $$;
revoke all on function public.sync_prix_appliquer(jsonb) from public, anon, authenticated;
grant execute on function public.sync_prix_appliquer(jsonb) to service_role;

-- Moyenne nationale du jour (heure de Paris) : agrégat sur toutes les stations qui déclarent un prix, hors rupture.
create or replace function public.recalculer_moyennes()
returns integer
language sql
security definer
set search_path = public
as $$
  with m as (
    insert into public.moyennes_nationales as mn (jour, carburant, prix_moyen, nb_stations)
    select (now() at time zone 'Europe/Paris')::date, carburant, round(avg(prix), 3), count(*)
    from public.prix where prix is not null and not rupture
    group by carburant
    on conflict (jour, carburant) do update set prix_moyen = excluded.prix_moyen, nb_stations = excluded.nb_stations
    returning 1
  ) select count(*)::int from m;
$$;
revoke all on function public.recalculer_moyennes() from public, anon, authenticated;
grant execute on function public.recalculer_moyennes() to service_role;

-- Stations à enrichir (nom / enseigne) : d'abord celles jamais tentées, les plus proches du point donné.
create or replace function public.stations_a_enrichir(p_lat double precision, p_lon double precision, p_limite integer)
returns table (id text)
language sql stable
security definer
set search_path = public, extensions
as $$
  select s.id from public.stations s
  where s.nom is null and (s.enseigne_maj is null or s.enseigne_maj < now() - interval '7 days')
  order by s.enseigne_maj nulls first, st_distance(s.geom, st_makepoint(p_lon, p_lat)::geography)
  limit p_limite;
$$;
revoke all on function public.stations_a_enrichir(double precision, double precision, integer) from public, anon, authenticated;
grant execute on function public.stations_a_enrichir(double precision, double precision, integer) to service_role;
