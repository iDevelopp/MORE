-- MORE · schéma Supabase (à lancer une fois dans SQL Editor)
-- Chaque utilisateur ne peut lire et écrire que sa propre ligne.

create table if not exists public.carnets (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  constraint taille_max check (pg_column_size(data) < 2000000)
);
alter table public.carnets enable row level security;
revoke all on public.carnets from anon;
grant select, insert, update, delete on public.carnets to authenticated;
create policy "lire ses données" on public.carnets for select to authenticated using ((select auth.uid()) = user_id);
create policy "créer ses données" on public.carnets for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "modifier ses données" on public.carnets for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "supprimer ses données" on public.carnets for delete to authenticated using ((select auth.uid()) = user_id);
