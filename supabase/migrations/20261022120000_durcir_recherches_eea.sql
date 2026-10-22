-- Durcissement r1 (D8) : cache des recherches de voiture par nom (clé = requête normalisée), lu et écrit par la fonction voiture-eea
-- (rôle service seulement : RLS activée, aucune politique pour anon/authenticated).
create table if not exists public.recherches_eea (
  cle text primary key,
  versions jsonb not null,
  maj timestamptz not null default now()
);
alter table public.recherches_eea enable row level security;
