-- Jalon 4 — Enregistrer en roulant (US-6.1…6.6, 6.E1…E3) et Royaume-Uni (US-3.9, US-1.9).

-- ---------------------------------------------------------------- trajets enregistrés en roulant (RLS par user_id inchangée)
alter table public.trajets add column if not exists enregistre boolean not null default false;
alter table public.trajets add column if not exists vitesses jsonb;            -- courbe de tout le trajet (≤ 600 valeurs, km/h)
alter table public.trajets add column if not exists vitesse_moy numeric(5,1);  -- km/h, sur le temps roulé
alter table public.trajets add column if not exists accelerations integer;
alter table public.trajets add column if not exists estimation jsonb;          -- résultat complet du trajet roulé (réaffiché tel quel, prix du jour réappliqués)

-- ---------------------------------------------------------------- prix d'origine (Royaume-Uni : pence par litre) et cours du jour
alter table public.prix add column if not exists prix_origine numeric(8,2);
alter table public.prix add column if not exists unite_origine text;          -- 'p/L'

create table if not exists public.cours_change (
  monnaie text primary key,          -- GBP, DKK, ISK, RON
  taux numeric(12,6) not null,       -- unités de la monnaie pour 1 €
  jour date not null,                -- date du cours de référence de la BCE
  source text not null,              -- adresse interrogée
  maj timestamptz not null default now()
);
alter table public.cours_change enable row level security;
drop policy if exists "lecture publique cours" on public.cours_change;
create policy "lecture publique cours" on public.cours_change for select to anon, authenticated using (true);
revoke insert, update, delete on public.cours_change from anon, authenticated;

-- lot : r.prix = € ; r.origine = prix publiés dans la monnaie du pays (même clés de carburant) ; r.unite_origine = 'p/L'
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

  create temp table if not exists _pp (station_id text, carburant text, prix numeric(5,3), maj timestamptz, prix_origine numeric(8,2), unite_origine text) on commit drop;
  truncate _pp;
  insert into _pp
  select r->>'id', k.key, (k.value)::numeric(5,3), nullif(r->>'maj','')::timestamptz,
         nullif(r->'origine'->>k.key, '')::numeric(8,2), nullif(r->>'unite_origine', '')
  from jsonb_array_elements(p_lot) r, jsonb_each_text(r->'prix') k
  where k.value is not null and k.value <> '' and k.key in ('Gazole','SP95-E10','SP95','SP98','E85','GPLc');
  insert into public.prix as p (station_id, carburant, prix, maj, rupture, prix_origine, unite_origine)
  select station_id, carburant, prix, maj, false, prix_origine, unite_origine from _pp
  on conflict (station_id, carburant) do update set prix = excluded.prix, maj = excluded.maj, rupture = false,
    prix_origine = excluded.prix_origine, unite_origine = excluded.unite_origine;
  delete from public.prix p
  where p.station_id in (select r->>'id' from jsonb_array_elements(p_lot) r)
    and not exists (select 1 from _pp where _pp.station_id = p.station_id and _pp.carburant = p.carburant);
  return n;
end $$;
revoke all on function public.sync_stations_pays(text, jsonb) from public, anon, authenticated;
grant execute on function public.sync_stations_pays(text, jsonb) to service_role;

-- ---------------------------------------------------------------- moyenne du jour d'un pays à flux station par station (Royaume-Uni)
create or replace function public.recalculer_moyenne_pays(p_pays text)
returns integer language sql security definer set search_path = public as $$
  with m as (
    insert into public.moyennes_nationales as mn (jour, carburant, pays, source, prix_moyen, nb_stations)
    select (now() at time zone 'Europe/Paris')::date, p.carburant, p_pays, 'flux', round(avg(p.prix), 3), count(*)
    from public.prix p join public.stations s on s.id = p.station_id
    where p.prix is not null and not p.rupture and s.pays = p_pays
    group by p.carburant
    on conflict (jour, carburant, pays) do update set prix_moyen = excluded.prix_moyen, nb_stations = excluded.nb_stations, source = excluded.source
    returning 1
  ) select count(*)::int from m;
$$;
revoke all on function public.recalculer_moyenne_pays(text) from public, anon, authenticated;
grant execute on function public.recalculer_moyenne_pays(text) to service_role;

-- dernière moyenne de chaque pays, avec le nombre de stations (0 pour le Bulletin pétrolier)
drop function if exists public.moyennes_par_pays(text);
create function public.moyennes_par_pays(p_carburant text)
returns table(pays text, prix_moyen numeric, source text, jour date, nb_stations integer)
language sql stable set search_path = public as $$
  select distinct on (m.pays) m.pays, m.prix_moyen, m.source, m.jour, m.nb_stations
  from public.moyennes_nationales m where m.carburant = p_carburant order by m.pays, m.jour desc
$$;
grant execute on function public.moyennes_par_pays(text) to anon, authenticated, service_role;

-- ---------------------------------------------------------------- péages à montant fixe que les fournisseurs ne tarifent pas toujours
create table if not exists public.peages_fixes (
  id text primary key,
  pays text not null,
  libelle text not null,
  montant numeric(8,2) not null,     -- dans la monnaie indiquée
  monnaie text not null,
  noms text not null,                -- expression régulière sur les noms des routes reconnues
  source text not null,
  verifie_le date not null
);
alter table public.peages_fixes enable row level security;
drop policy if exists "lecture publique peages fixes" on public.peages_fixes;
create policy "lecture publique peages fixes" on public.peages_fixes for select to anon, authenticated using (true);
revoke insert, update, delete on public.peages_fixes from anon, authenticated;
insert into public.peages_fixes (id, pays, libelle, montant, monnaie, noms, source, verifie_le) values
  ('dartford', 'GB', 'Dartford Crossing (Dart Charge, voiture, 6 h-22 h)', 3.50, 'GBP', '^(a282|dartford crossing|queen elizabeth ii bridge|dartford tunnel)$',   -- Valhalla nomme le franchissement « A282 »
   'https://nationalhighways.co.uk/help-centre/dart-charge-price-change/', '2026-10-21')
on conflict (id) do update set montant = excluded.montant, libelle = excluded.libelle, noms = excluded.noms, source = excluded.source, verifie_le = excluded.verifie_le;

update public.fournisseurs set nom = 'Flux officiels par pays · FR, ES, IT, PT, SI, HR, AT, DK, IS, RO, GB (sans clé)' where id = 'officiel';
