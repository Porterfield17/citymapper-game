create table if not exists public.game_content (
  id text primary key check (id = 'published'),
  cities jsonb not null default '[]'::jsonb,
  daily_games jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.game_content enable row level security;

grant select on public.game_content to anon, authenticated;
revoke insert, update, delete on public.game_content from anon, authenticated;
grant all on public.game_content to service_role;

drop policy if exists "Anyone can read published game content" on public.game_content;
create policy "Anyone can read published game content"
  on public.game_content
  for select
  to anon, authenticated
  using (true);

insert into storage.buckets (id, name, public)
values ('citymapper-clues', 'citymapper-clues', true)
on conflict (id) do update set public = true;

drop policy if exists "Anyone can view published clue images" on storage.objects;
create policy "Anyone can view published clue images"
  on storage.objects
  for select
  to public
  using (bucket_id = 'citymapper-clues');

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'game_content'
  ) then
    alter publication supabase_realtime add table public.game_content;
  end if;
end
$$;