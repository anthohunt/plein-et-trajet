-- Jalon 2 — Le coût d'un trajet : véhicules (ADEME), historique des trajets, préférences (US-3.4…3.7, US-3.E3, US-3.E4)

-- ---------------------------------------------------------------- vehicules (import ADEME Car Labelling)
create table if not exists public.vehicules (
  id text primary key,                         -- empreinte stable de (marque, modèle, motorisation, énergie, boîte, puissance)
  marque text not null,
  modele text not null,
  motorisation text not null,                  -- libellé commercial + boîte
  energie text not null,                       -- énergie ADEME d'origine (ESSENCE, GAZOLE, …)
  carburant text not null check (carburant in ('Gazole','SP95-E10','SP95','SP98','E85','GPLc')),
  masse_kg integer not null,                   -- masse en ordre de marche (Poids à vide)
  puissance_kw numeric(6,1) not null,
  conso_basse numeric(6,3) not null,           -- L/100 km WLTP, moyenne Min/Max de chaque phase
  conso_moyenne numeric(6,3) not null,
  conso_haute numeric(6,3) not null,
  conso_tres_haute numeric(6,3) not null
);
create index if not exists vehicules_marque_modele_idx on public.vehicules (marque, modele);
alter table public.vehicules enable row level security;
drop policy if exists "lecture publique vehicules" on public.vehicules;
create policy "lecture publique vehicules" on public.vehicules for select to anon, authenticated using (true);
grant select on public.vehicules to anon, authenticated;

create or replace function public.vehicules_marques()
returns table (marque text) language sql stable security invoker set search_path = public as $$
  select distinct v.marque from public.vehicules v order by v.marque;
$$;
create or replace function public.vehicules_modeles(p_marque text)
returns table (modele text) language sql stable security invoker set search_path = public as $$
  select distinct v.modele from public.vehicules v where v.marque = p_marque order by v.modele;
$$;
grant execute on function public.vehicules_marques() to anon, authenticated;
grant execute on function public.vehicules_modeles(text) to anon, authenticated;

-- ---------------------------------------------------------------- preferences (voiture mémorisée par identifiant anonyme)
create table if not exists public.preferences (
  user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  marque text,
  modele text,
  vehicule_id text references public.vehicules(id) on delete set null,
  carburant text check (carburant is null or carburant in ('Gazole','SP95-E10','SP95','SP98','E85','GPLc')),
  maj timestamptz not null default now()
);
alter table public.preferences enable row level security;
drop policy if exists "preferences lecture" on public.preferences;
drop policy if exists "preferences insertion" on public.preferences;
drop policy if exists "preferences modification" on public.preferences;
create policy "preferences lecture" on public.preferences for select to authenticated using (user_id = auth.uid());
create policy "preferences insertion" on public.preferences for insert to authenticated with check (user_id = auth.uid());
create policy "preferences modification" on public.preferences for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
grant select, insert, update on public.preferences to authenticated;

-- ---------------------------------------------------------------- trajets (historique)
create table if not exists public.trajets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  depart_label text not null,
  depart_lat double precision not null,
  depart_lon double precision not null,
  arrivee_label text not null,
  arrivee_lat double precision not null,
  arrivee_lon double precision not null,
  vehicule_id text references public.vehicules(id) on delete set null,
  vehicule_label text,
  carburant text check (carburant in ('Gazole','SP95-E10','SP95','SP98','E85','GPLc')),
  km numeric(8,1) not null,
  litres numeric(8,2) not null,
  prix_litre numeric(5,3),                     -- prix moyen national utilisé au dernier calcul
  cout numeric(8,2),                           -- coût carburant au prix moyen
  troncons jsonb not null default '[]'::jsonb,
  cree_le timestamptz not null default now()
);
create index if not exists trajets_user_idx on public.trajets (user_id, cree_le desc);
alter table public.trajets enable row level security;
drop policy if exists "trajets lecture" on public.trajets;
drop policy if exists "trajets insertion" on public.trajets;
drop policy if exists "trajets modification" on public.trajets;
drop policy if exists "trajets suppression" on public.trajets;
create policy "trajets lecture" on public.trajets for select to authenticated using (user_id = auth.uid());
create policy "trajets insertion" on public.trajets for insert to authenticated with check (user_id = auth.uid());
create policy "trajets modification" on public.trajets for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "trajets suppression" on public.trajets for delete to authenticated using (user_id = auth.uid());
grant select, insert, update, delete on public.trajets to authenticated;
