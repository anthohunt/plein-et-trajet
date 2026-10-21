-- Jalon 5 (V1) — T5.1 : base véhicules EEA « CO2 cars » interrogée à la demande (Discodata), versions gardées dans `versions_eea`.
-- La liste des tables Discodata est un paramètre du moteur « vehicules » (registre des moteurs) : la table d'une nouvelle année
-- s'ajoute sans redéploiement (décision d'Anthony du 20/10 : « je veux pas que ce soit hardcodé »).

create table if not exists public.versions_eea (
  cle text primary key,                       -- MARQUE·T·VA·VE·ANNÉE
  marque text not null,
  modele text not null,
  t text not null,
  va text not null,
  ve text not null,
  annee integer not null check (annee between 2010 and 2030),
  masse_kg integer not null,
  puissance_kw numeric,
  cylindree_cm3 integer,
  carburant text not null check (carburant in ('Gazole','SP95-E10','SP95','SP98','E85','GPLc')),
  co2_nedc numeric,
  co2_wltp numeric,
  conso_officielle_l100 numeric not null,
  procedure text not null check (procedure in ('NEDC','WLTP')),
  immatriculations integer not null,
  conso_phases jsonb not null,               -- { basse, moyenne, haute, tres_haute } en L/100 km
  maj timestamptz not null default now()
);
create index if not exists versions_eea_ve on public.versions_eea (ve);
create index if not exists versions_eea_t_va_ve on public.versions_eea (t, va, ve);

alter table public.versions_eea enable row level security;
drop policy if exists "lecture publique versions_eea" on public.versions_eea;
create policy "lecture publique versions_eea" on public.versions_eea for select to anon, authenticated using (true);
grant select on public.versions_eea to anon, authenticated;
-- écriture : rôle service seulement (la fonction voiture-eea), aucune politique d'écriture pour anon/authenticated

insert into public.fournisseurs (id, service, nom, cle_requise, ordre, url)
values ('eea-discodata', 'vehicules', 'EEA CO2 cars · Discodata (sans clé)', false, 1, 'https://discodata.eea.europa.eu/sql')
on conflict (id) do update set service = excluded.service, nom = excluded.nom, url = excluded.url;

insert into public.moteurs (service, nom, description, actif, etat, message, ordre, code, params)
values ('vehicules', 'Base véhicules', 'Voiture identifiée par le code D.2 de la carte grise (base européenne EEA, CC BY 4.0).',
        'eea-discodata', 'ok', 'Prêt · sans clé', 7, 'pret_sans_cle',
        jsonb_build_object('tables', jsonb_build_array(
          '[CO2Emission].[latest].[co2cars]',
          '[CO2Emission].[latest].[co2cars_2023Pv27]',
          '[CO2Emission].[latest].[co2cars_2024Fv30]',
          '[CO2Emission].[latest].[co2cars_2025Pv31]')))
on conflict (service) do update set actif = excluded.actif, params = excluded.params, description = excluded.description;
