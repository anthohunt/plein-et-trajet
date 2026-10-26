-- Jalon 1 — Les prix autour de moi : stations, prix, moyennes nationales (US-1.1…1.6, US-1.E1…E4, US-2.E1)
create extension if not exists postgis with schema extensions;

create table if not exists public.stations (
  id text primary key,                       -- identifiant officiel du point de vente
  nom text,                                  -- nom du point de vente (prix-carburants.gouv.fr), null tant que non enrichi
  enseigne text,                             -- marque (prix-carburants.gouv.fr)
  adresse text,
  cp text,
  ville text,
  geom extensions.geography(Point, 4326) not null,
  lat double precision not null,
  lon double precision not null,
  services text[] not null default '{}',
  automate_24_24 boolean not null default false,
  maj timestamptz not null default now(),    -- dernière synchro de la ligne
  enseigne_maj timestamptz                   -- dernière tentative d'enrichissement nom/enseigne
);
create index if not exists stations_geom_idx on public.stations using gist (geom);

create table if not exists public.prix (
  station_id text not null references public.stations(id) on delete cascade,
  carburant text not null check (carburant in ('Gazole','SP95-E10','SP95','SP98','E85','GPLc')),
  prix numeric(5,3),                         -- null possible pour une rupture sans prix déclaré
  maj timestamptz,
  rupture boolean not null default false,    -- rupture temporaire déclarée
  primary key (station_id, carburant)
);
create index if not exists prix_carburant_idx on public.prix (carburant, station_id);

create table if not exists public.moyennes_nationales (
  jour date not null,
  carburant text not null check (carburant in ('Gazole','SP95-E10','SP95','SP98','E85','GPLc')),
  prix_moyen numeric(5,3) not null,
  nb_stations int not null,
  primary key (jour, carburant)
);

alter table public.stations enable row level security;
alter table public.prix enable row level security;
alter table public.moyennes_nationales enable row level security;

drop policy if exists "lecture publique stations" on public.stations;
create policy "lecture publique stations" on public.stations for select to anon, authenticated using (true);
drop policy if exists "lecture publique prix" on public.prix;
create policy "lecture publique prix" on public.prix for select to anon, authenticated using (true);
drop policy if exists "lecture publique moyennes" on public.moyennes_nationales;
create policy "lecture publique moyennes" on public.moyennes_nationales for select to anon, authenticated using (true);
-- écriture : aucune politique pour anon/authenticated ; le rôle service_role contourne RLS.
revoke insert, update, delete on public.stations, public.prix, public.moyennes_nationales from anon, authenticated;

-- Stations autour d'un point (S1). Les prix sont lus à part dans rest/v1/prix (filtre carburant),
-- pour que la carte et la liste partagent une seule lecture de prix.
create or replace function public.stations_autour(lat double precision, lon double precision, rayon_m integer default 10000)
returns table (
  id text, nom text, enseigne text, adresse text, cp text, ville text,
  lat double precision, lon double precision, services text[], automate_24_24 boolean, distance_km double precision
)
language sql stable
set search_path = public, extensions
as $$
  select s.id, s.nom, s.enseigne, s.adresse, s.cp, s.ville, s.lat, s.lon, s.services, s.automate_24_24,
         round((st_distance(s.geom, st_makepoint(stations_autour.lon, stations_autour.lat)::geography) / 1000.0)::numeric, 2)::double precision as distance_km
  from public.stations s
  where st_dwithin(s.geom, st_makepoint(stations_autour.lon, stations_autour.lat)::geography, least(greatest(rayon_m, 500), 40000))
  order by distance_km
  limit 300;
$$;
grant execute on function public.stations_autour(double precision, double precision, integer) to anon, authenticated;
