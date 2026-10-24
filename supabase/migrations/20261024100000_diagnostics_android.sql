-- Observatoire de l'enregistrement en fond (plan de tests de robustesse Android, niveau 0, 24/10/2026).
-- L'appli Android y envoie son journal technique (Diagnostic.java) à chaque ouverture et à chaque fin de trajet.
-- Écriture seule pour l'appareil (identité anonyme) ; lecture réservée au rôle service (analyse côté serveur).
create table if not exists public.diagnostics (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  cree_le timestamptz not null default now(),
  occasion text not null check (char_length(occasion) <= 40),
  version text check (char_length(version) <= 40),
  etat text check (char_length(etat) <= 2000),
  texte text not null check (char_length(texte) <= 600000)
);
create index if not exists diagnostics_user_cree on public.diagnostics (user_id, cree_le desc);
alter table public.diagnostics enable row level security;
drop policy if exists "appareil ecrit ses diagnostics" on public.diagnostics;
create policy "appareil ecrit ses diagnostics" on public.diagnostics for insert to authenticated with check (user_id = auth.uid());
grant insert on public.diagnostics to authenticated;
