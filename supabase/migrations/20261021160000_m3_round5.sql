-- Jalon 3, round 5 (audit round 3).
-- HIGH 1 : quota quotidien du fournisseur de péages.
--  • fournisseurs.plafond_jour : plafond global d'appels de péages par jour (UTC), SOUS le quota réel du fournisseur
--    (PTV : plan gratuit plafonné par jour, « Daily Quota Exceeded » ; 500 transactions/jour d'après le guide de migration PTV,
--     100 000/mois d'après la FAQ ; le décompte d'une requête à 25 waypoints n'est pas publié → plafond à la moitié, marge pour les tests).
--  • fournisseurs.quota_epuise_jusqua : le fournisseur a répondu « quota dépassé » ; aucun appel ne part avant cette heure
--    (remise à zéro attendue à 00:00 UTC : les journées d'usage PTV sont des journées UTC, API Account getUsage).
--  • cache_peages : réponse de péages réutilisée pour un même départ, une même arrivée et un même tracé (7 jours).
alter table public.fournisseurs add column if not exists plafond_jour int;
alter table public.fournisseurs add column if not exists quota_epuise_jusqua timestamptz;
update public.fournisseurs set plafond_jour = 250 where id = 'ptv' and plafond_jour is null;
update public.fournisseurs set plafond_jour = 80 where id = 'here' and plafond_jour is null;
comment on column public.fournisseurs.plafond_jour is 'plafond global d''appels de péages par jour UTC (sous le quota du fournisseur) ; null = 250';
comment on column public.fournisseurs.quota_epuise_jusqua is 'quota du fournisseur dépassé : aucun appel avant cette heure';

create table if not exists public.cache_peages (
  cle text primary key,             -- fournisseur + départ + arrivée + points de passage (arrondis à 1e-3)
  fournisseur text not null,
  lignes jsonb not null,
  cree_le timestamptz not null default now()
);
alter table public.cache_peages enable row level security;
revoke all on public.cache_peages from anon, authenticated;
create index if not exists cache_peages_cree_le on public.cache_peages (cree_le);

-- le compteur de quota suit la journée du fournisseur (UTC), plus celle de Paris
create or replace function public.quota_peages_reserver(p_identite text, p_max_identite int, p_max_global int)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_jour date := (now() at time zone 'UTC')::date; v_i int; v_g int;
begin
  insert into public.quota_peages (jour, identite, appels) values (v_jour, '*', 0) on conflict do nothing;
  insert into public.quota_peages (jour, identite, appels) values (v_jour, p_identite, 0) on conflict do nothing;
  select appels into v_g from public.quota_peages where jour = v_jour and identite = '*' for update;
  select appels into v_i from public.quota_peages where jour = v_jour and identite = p_identite for update;
  if v_g >= p_max_global or v_i >= p_max_identite then return false; end if;
  update public.quota_peages set appels = appels + 1 where jour = v_jour and identite in ('*', p_identite);
  return true;
end $$;
revoke all on function public.quota_peages_reserver(text, int, int) from public, anon, authenticated;
grant execute on function public.quota_peages_reserver(text, int, int) to service_role;

-- LOW 9 : un incident ou une bascule est « résolu » quand le fournisseur actif a de nouveau répondu après (retabli_le).
alter table public.moteurs add column if not exists retabli_le timestamptz;
