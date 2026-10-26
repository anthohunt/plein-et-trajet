-- Le flux officiel publie l'heure de Paris étiquetée « +00:00 » (constaté le 21/10 : e10_maj 14:59:47+00:00 à 13:28 UTC).
-- On lit donc l'heure sans fuseau, en heure de Paris ; sinon l'âge des prix est faux de 1 h (hiver) à 2 h (été).
CREATE OR REPLACE FUNCTION public.sync_prix_appliquer(p_lot jsonb)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
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
           (left(nullif(r->>(f.cle || '_maj'), ''), 19)::timestamp at time zone 'Europe/Paris') as maj,
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
end $function$

;
