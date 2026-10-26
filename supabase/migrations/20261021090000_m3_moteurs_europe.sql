-- Jalon 3 — Péages, Europe et moteurs (US-3.8, 4.4, 4.5, 4.E4-E6, 1.8, 5.1-5.5, 5.E1-E3)
-- Rien en dur : fournisseurs et clés sont des DONNÉES (tables + Supabase Vault), jamais du code ni des variables d'environnement.

-- ---------------------------------------------------------------- administrateur (claim dans app_metadata, non modifiable par l'utilisateur)
create or replace function public.est_admin()
returns boolean language sql stable
as $$ select coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin' $$;
grant execute on function public.est_admin() to anon, authenticated;

-- ---------------------------------------------------------------- pays (TVA des péages, flux de stations)
create table if not exists public.pays (
  code text primary key,                     -- ISO 3166-1 alpha-2
  nom text not null,
  tva numeric(5,2) not null,                 -- taux normal appliqué aux péages (prix HT PTV → TTC)
  flux_stations boolean not null default false  -- le pays publie ses prix station par station (synchronisés)
);
alter table public.pays enable row level security;
drop policy if exists "lecture publique pays" on public.pays;
create policy "lecture publique pays" on public.pays for select to anon, authenticated using (true);
grant select on public.pays to anon, authenticated;
insert into public.pays (code, nom, tva, flux_stations) values
 ('FR','France',20,true),('ES','Espagne',21,true),('IT','Italie',22,false),('PT','Portugal',23,false),('DE','Allemagne',19,false),
 ('BE','Belgique',21,false),('LU','Luxembourg',17,false),('NL','Pays-Bas',21,false),('CH','Suisse',8.1,false),('AT','Autriche',20,false),
 ('SI','Slovénie',22,false),('HR','Croatie',25,false),('HU','Hongrie',27,false),('SK','Slovaquie',23,false),('CZ','Tchéquie',21,false),
 ('PL','Pologne',23,false),('DK','Danemark',25,false),('SE','Suède',25,false),('FI','Finlande',25.5,false),('NO','Norvège',25,false),
 ('IE','Irlande',23,false),('GB','Royaume-Uni',20,false),('RO','Roumanie',21,false),('BG','Bulgarie',20,false),('GR','Grèce',24,false),
 ('RS','Serbie',20,false),('BA','Bosnie-Herzégovine',17,false),('ME','Monténégro',21,false),('MK','Macédoine du Nord',18,false),
 ('AL','Albanie',20,false),('XK','Kosovo',18,false),('MT','Malte',18,false),('CY','Chypre',19,false),('EE','Estonie',24,false),
 ('LV','Lettonie',21,false),('LT','Lituanie',21,false),('AD','Andorre',4.5,false),('MC','Monaco',20,false),('LI','Liechtenstein',8.1,false)
on conflict (code) do nothing;

-- vignettes : table tenue à la main (aucune API officielle), détection par pays traversé
create table if not exists public.vignettes (
  pays text primary key references public.pays(code),
  libelle text not null,                     -- ligne affichée dans le détail des péages
  source text not null                       -- page officielle de l'opérateur, à relire chaque année
);
alter table public.vignettes enable row level security;
drop policy if exists "lecture publique vignettes" on public.vignettes;
create policy "lecture publique vignettes" on public.vignettes for select to anon, authenticated using (true);
grant select on public.vignettes to anon, authenticated;
insert into public.vignettes (pays, libelle, source) values
 ('CH','Vignette suisse obligatoire (non comptée)','https://www.e-vignette.ch'),
 ('AT','Vignette autrichienne obligatoire (non comptée)','https://www.asfinag.at/toll/vignette/'),
 ('CZ','Vignette tchèque obligatoire (non comptée)','https://edalnice.cz'),
 ('SK','Vignette slovaque obligatoire (non comptée)','https://eznamka.sk'),
 ('HU','Vignette hongroise obligatoire (non comptée)','https://nemzetiutdij.hu'),
 ('SI','Vignette slovène obligatoire (non comptée)','https://evinjeta.dars.si'),
 ('RO','Vignette roumaine (rovinieta) obligatoire (non comptée)','https://roviniete.ro'),
 ('BG','Vignette bulgare obligatoire (non comptée)','https://bgtoll.bg')
on conflict (pays) do nothing;

-- ---------------------------------------------------------------- moteurs : un service -> un fournisseur actif, un secours
create table if not exists public.fournisseurs (
  id text primary key,
  service text not null,
  nom text not null,
  cle_requise boolean not null default false,
  ordre int not null default 0
);
create table if not exists public.moteurs (
  service text primary key,
  nom text not null,
  description text not null,
  actif text not null references public.fournisseurs(id),
  secours text references public.fournisseurs(id),
  etat text not null default 'wait' check (etat in ('ok','ko','wait')),
  message text not null default '',
  dernier_test timestamptz,
  bascule_le timestamptz,                    -- dernière bascule sur le secours
  bascule_de text,
  bascule_vers text,
  incident_le timestamptz,                   -- dernier échec du fournisseur actif
  incident_message text,
  ordre int not null default 0,
  maj timestamptz not null default now()
);
-- clés : le secret vit dans Supabase Vault (chiffré) ; ici seulement son identifiant et ses 4 derniers caractères
create table if not exists public.cles_fournisseurs (
  fournisseur text primary key references public.fournisseurs(id),
  secret_id uuid not null,
  fin text not null,
  maj timestamptz not null default now()
);

alter table public.fournisseurs enable row level security;
alter table public.moteurs enable row level security;
alter table public.cles_fournisseurs enable row level security;
revoke all on public.fournisseurs, public.moteurs, public.cles_fournisseurs from anon, authenticated;
grant select, insert, update, delete on public.fournisseurs, public.moteurs to authenticated;   -- filtrées par RLS : administrateur seulement
-- cles_fournisseurs : aucun droit pour anon/authenticated (même l'administrateur passe par la fonction serveur)
drop policy if exists "admin fournisseurs" on public.fournisseurs;
drop policy if exists "admin moteurs" on public.moteurs;
create policy "admin fournisseurs" on public.fournisseurs for all to authenticated using (public.est_admin()) with check (public.est_admin());
create policy "admin moteurs" on public.moteurs for all to authenticated using (public.est_admin()) with check (public.est_admin());

insert into public.fournisseurs (id, service, nom, cle_requise, ordre) values
 ('officiel','prix','Flux officiels par pays · France, Espagne (sans clé)',false,1),
 ('bulletin-ue','moyennes','Bulletin pétrolier UE (sans clé)',false,1),
 ('valhalla-public','itineraire','Valhalla · instance publique FOSSGIS (sans clé)',false,1),
 ('stadia','itineraire','Stadia Maps · Valhalla hébergé',true,2),
 ('itineraire-ign','itineraire','IGN · France seule (sans clé)',false,3),
 ('ptv','peages','PTV Developer',true,1),
 ('here','peages','HERE',true,2),
 ('ademe','voitures','ADEME Car Labelling (sans clé)',false,1),
 ('photon','lieux','Photon · Europe (sans clé)',false,1),
 ('lieux-ign','lieux','IGN · France (sans clé)',false,2)
on conflict (id) do nothing;
insert into public.moteurs (service, nom, description, actif, secours, etat, message, ordre) values
 ('prix','Prix des stations','Prix station par station, synchronisés (France toutes les 10 min, Espagne toutes les 30 min).','officiel',null,'ok','Prêt · sans clé',1),
 ('moyennes','Prix moyens par pays','Moyenne du jour de chaque pays traversé.','bulletin-ue',null,'ok','Prêt · sans clé',2),
 ('itineraire','Itinéraire','Tracé, tronçons, pente et altitude (Europe) ; l''IGN reste utilisé pour un trajet 100 % France.','valhalla-public',null,'ok','Prêt · sans clé',3),
 ('peages','Péages','Montant des péages voiture, TTC.','ptv',null,'wait','Clé à coller',4),
 ('voitures','Voitures','Masse, puissance, consommation officielle par version.','ademe',null,'ok','Prêt · sans clé',5),
 ('lieux','Recherche de lieux','Propositions au fil de la frappe hors de France.','photon',null,'ok','Prêt · sans clé',6)
on conflict (service) do nothing;

-- fonctions serveur (rôle service uniquement) : lecture et écriture des clés dans Vault
create or replace function public.moteur_cle(p_fournisseur text)
returns text language sql stable security definer set search_path = public, vault as $$
  select s.decrypted_secret from public.cles_fournisseurs c join vault.decrypted_secrets s on s.id = c.secret_id where c.fournisseur = p_fournisseur
$$;
create or replace function public.moteur_cle_enregistrer(p_fournisseur text, p_cle text)
returns text language plpgsql security definer set search_path = public, vault as $$
declare v_id uuid; v_fin text := right(p_cle, 4);
begin
  select secret_id into v_id from public.cles_fournisseurs where fournisseur = p_fournisseur;
  if v_id is null then
    v_id := vault.create_secret(p_cle, 'cle_' || p_fournisseur, 'Clé d''API du fournisseur ' || p_fournisseur);
  else
    perform vault.update_secret(v_id, p_cle);
  end if;
  insert into public.cles_fournisseurs (fournisseur, secret_id, fin, maj) values (p_fournisseur, v_id, v_fin, now())
    on conflict (fournisseur) do update set secret_id = excluded.secret_id, fin = excluded.fin, maj = now();
  return v_fin;
end $$;
revoke all on function public.moteur_cle(text), public.moteur_cle_enregistrer(text, text) from public, anon, authenticated;
grant execute on function public.moteur_cle(text), public.moteur_cle_enregistrer(text, text) to service_role;

alter table public.stations add column if not exists pays text not null default 'FR';
create index if not exists stations_pays_idx on public.stations (pays);

-- ---------------------------------------------------------------- moyennes par pays (Bulletin pétrolier UE + flux France)
alter table public.moyennes_nationales add column if not exists pays text not null default 'FR';
alter table public.moyennes_nationales add column if not exists source text not null default 'flux';   -- flux | bulletin | estime
alter table public.moyennes_nationales drop constraint if exists moyennes_nationales_pkey;
alter table public.moyennes_nationales add primary key (jour, carburant, pays);

create or replace function public.recalculer_moyennes()
returns integer language sql security definer set search_path = public as $$
  with m as (
    insert into public.moyennes_nationales as mn (jour, carburant, pays, source, prix_moyen, nb_stations)
    select (now() at time zone 'Europe/Paris')::date, p.carburant, 'FR', 'flux', round(avg(p.prix), 3), count(*)
    from public.prix p join public.stations s on s.id = p.station_id
    where p.prix is not null and not p.rupture and s.pays = 'FR'
    group by p.carburant
    on conflict (jour, carburant, pays) do update set prix_moyen = excluded.prix_moyen, nb_stations = excluded.nb_stations
    returning 1
  ) select count(*)::int from m;
$$;
revoke all on function public.recalculer_moyennes() from public, anon, authenticated;
grant execute on function public.recalculer_moyennes() to service_role;

-- dernière moyenne connue de chaque pays pour un carburant
create or replace function public.moyennes_par_pays(p_carburant text)
returns table (pays text, prix_moyen numeric, source text, jour date)
language sql stable set search_path = public as $$
  select distinct on (m.pays) m.pays, m.prix_moyen, m.source, m.jour
  from public.moyennes_nationales m where m.carburant = p_carburant order by m.pays, m.jour desc
$$;
grant execute on function public.moyennes_par_pays(text) to anon, authenticated;

-- moyenne UE appliquée aux pays absents du bulletin : une ligne par carburant avec pays = 'EU' (écrite par sync-moyennes-ue)

-- ---------------------------------------------------------------- stations hors de France

drop function if exists public.stations_autour(double precision, double precision, integer);
create or replace function public.stations_autour(lat double precision, lon double precision, rayon_m integer default 10000)
returns table (
  id text, nom text, enseigne text, adresse text, cp text, ville text,
  lat double precision, lon double precision, services text[], automate_24_24 boolean, distance_km double precision, pays text
)
language sql stable set search_path = public, extensions as $$
  select s.id, s.nom, s.enseigne, s.adresse, s.cp, s.ville, s.lat, s.lon, s.services, s.automate_24_24,
         round((st_distance(s.geom, st_makepoint(stations_autour.lon, stations_autour.lat)::geography) / 1000.0)::numeric, 2)::double precision as distance_km,
         s.pays
  from public.stations s
  where st_dwithin(s.geom, st_makepoint(stations_autour.lon, stations_autour.lat)::geography, least(greatest(rayon_m, 500), 40000))
  order by distance_km
  limit 300;
$$;
grant execute on function public.stations_autour(double precision, double precision, integer) to anon, authenticated;

-- application d'un lot de stations d'un pays (rôle service) : [{id,nom,enseigne,adresse,cp,ville,lat,lon,maj,prix:{Gazole:1.799,…}}]
create or replace function public.sync_stations_pays(p_pays text, p_lot jsonb)
returns integer language plpgsql security definer set search_path = public, extensions as $$
declare n integer;
begin
  insert into public.stations as s (id, nom, enseigne, adresse, cp, ville, geom, lat, lon, services, automate_24_24, maj, pays, enseigne_maj)
  select r->>'id', r->>'nom', r->>'enseigne', r->>'adresse', r->>'cp', r->>'ville',
         st_makepoint((r->>'lon')::float8, (r->>'lat')::float8)::geography, (r->>'lat')::float8, (r->>'lon')::float8,
         '{}', false, now(), p_pays, now()
  from jsonb_array_elements(p_lot) r
  on conflict (id) do update set nom = excluded.nom, enseigne = excluded.enseigne, adresse = excluded.adresse, cp = excluded.cp,
    ville = excluded.ville, geom = excluded.geom, lat = excluded.lat, lon = excluded.lon, maj = excluded.maj, pays = excluded.pays;
  get diagnostics n = row_count;

  create temp table if not exists _pp (station_id text, carburant text, prix numeric(5,3), maj timestamptz) on commit drop;
  truncate _pp;
  insert into _pp
  select r->>'id', k.key, (k.value)::numeric(5,3), nullif(r->>'maj','')::timestamptz
  from jsonb_array_elements(p_lot) r, jsonb_each_text(r->'prix') k
  where k.value is not null and k.value <> '' and k.key in ('Gazole','SP95-E10','SP95','SP98','E85','GPLc');
  insert into public.prix as p (station_id, carburant, prix, maj, rupture)
  select station_id, carburant, prix, maj, false from _pp
  on conflict (station_id, carburant) do update set prix = excluded.prix, maj = excluded.maj, rupture = false;
  delete from public.prix p
  where p.station_id in (select r->>'id' from jsonb_array_elements(p_lot) r)
    and not exists (select 1 from _pp where _pp.station_id = p.station_id and _pp.carburant = p.carburant);
  return n;
end $$;
create or replace function public.sync_stations_pays_nettoyer(p_pays text, p_avant timestamptz)
returns integer language sql security definer set search_path = public as $$
  with d as (delete from public.stations where pays = p_pays and maj < p_avant returning 1) select count(*)::int from d;
$$;
revoke all on function public.sync_stations_pays(text, jsonb), public.sync_stations_pays_nettoyer(text, timestamptz) from public, anon, authenticated;
grant execute on function public.sync_stations_pays(text, jsonb), public.sync_stations_pays_nettoyer(text, timestamptz) to service_role;
