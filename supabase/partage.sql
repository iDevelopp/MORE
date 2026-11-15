-- MORE · partage du suivi (à exécuter une fois dans Supabase → SQL Editor)
-- Les instantanés et les commentaires sont chiffrés dans le navigateur : le serveur ne stocke que des blocs illisibles.

create table if not exists public.partages (
  id text primary key check (id ~ '^[A-Za-z0-9_-]{22}$'),
  owner uuid not null default auth.uid() references auth.users (id) on delete cascade,
  data jsonb not null check (pg_column_size(data) < 1500000),
  updated_at timestamptz not null default now()
);
alter table public.partages enable row level security;
revoke all on public.partages from anon, authenticated;
grant select, insert, update, delete on public.partages to authenticated;
drop policy if exists "partages : le propriétaire" on public.partages;
create policy "partages : le propriétaire" on public.partages for all to authenticated
  using ((select auth.uid()) = owner) with check ((select auth.uid()) = owner);

create table if not exists public.commentaires (
  id bigint generated always as identity primary key,
  partage_id text not null references public.partages (id) on delete cascade,
  data jsonb not null check (pg_column_size(data) < 8000),
  created_at timestamptz not null default now()
);
create index if not exists commentaires_partage on public.commentaires (partage_id, created_at);
alter table public.commentaires enable row level security;
revoke all on public.commentaires from anon, authenticated;
grant select, delete on public.commentaires to authenticated;
drop policy if exists "commentaires : lecture du propriétaire" on public.commentaires;
create policy "commentaires : lecture du propriétaire" on public.commentaires for select to authenticated
  using (exists (select 1 from public.partages p where p.id = partage_id and p.owner = (select auth.uid())));
drop policy if exists "commentaires : suppression du propriétaire" on public.commentaires;
create policy "commentaires : suppression du propriétaire" on public.commentaires for delete to authenticated
  using (exists (select 1 from public.partages p where p.id = partage_id and p.owner = (select auth.uid())));

-- Lecture d'un lien de suivi (sans compte) : uniquement si on connaît son identifiant
create or replace function public.lire_partage(p_id text)
returns table (data jsonb, updated_at timestamptz, commentaires jsonb)
language sql stable security definer set search_path = '' as $$
  select p.data, p.updated_at,
    coalesce((select jsonb_agg(jsonb_build_object('data', c.data, 'at', c.created_at) order by c.created_at)
              from public.commentaires c where c.partage_id = p.id), '[]'::jsonb)
  from public.partages p where p.id = p_id;
$$;

-- Commentaire laissé depuis un lien de suivi (30 par heure maximum par lien)
create or replace function public.commenter_partage(p_id text, p_data jsonb)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if pg_column_size(p_data) > 8000 then raise exception 'Commentaire trop long'; end if;
  if not exists (select 1 from public.partages where id = p_id) then raise exception 'Lien inconnu'; end if;
  if (select count(*) from public.commentaires where partage_id = p_id and created_at > now() - interval '1 hour') >= 30
    then raise exception 'Trop de commentaires, réessaie plus tard'; end if;
  insert into public.commentaires (partage_id, data) values (p_id, p_data);
end $$;

revoke all on function public.lire_partage(text) from public;
revoke all on function public.commenter_partage(text, jsonb) from public;
grant execute on function public.lire_partage(text) to anon, authenticated;
grant execute on function public.commenter_partage(text, jsonb) to anon, authenticated;
