-- Accounts and sync: one row per record, readable and writable only by its owner.
-- Whole records are stored as JSON, so a new field on a question needs no migration here.

create table public.docs (
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  collection text not null check (collection in ('questions', 'attempts', 'mockExams', 'settings')),
  id         text not null,
  data       jsonb not null,
  deleted    boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, collection, id)
);

-- The pull reads "my rows after this point", in this order.
create index docs_pull on public.docs (user_id, updated_at, id);

-- updated_at is the server's clock on every write, whatever the device sends: it is the pull cursor.
create function public.docs_touch() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger docs_touch before insert or update on public.docs
for each row execute function public.docs_touch();

alter table public.docs enable row level security;

create policy "Owners read their rows" on public.docs
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Owners add their rows" on public.docs
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Owners change their rows" on public.docs
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
-- No delete policy: a removal is a row with deleted = true, so it reaches the other devices.

-- Delete account: removes the caller's own user; the cascade removes their rows.
create function public.delete_my_account() returns void
language sql security definer set search_path = '' as $$
  delete from auth.users where id = (select auth.uid());
$$;

revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
