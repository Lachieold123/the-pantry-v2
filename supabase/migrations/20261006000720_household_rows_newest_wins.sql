-- A write that arrives late (a phone that was offline) must not overwrite a
-- newer one: an update with an older updated_at is skipped.
create function public.household_rows_keep_newest() returns trigger
language plpgsql set search_path = ''
as $$
begin
  if new.updated_at < old.updated_at then
    return null;
  end if;
  return new;
end;
$$;

create trigger household_rows_keep_newest
  before update on public.household_rows
  for each row execute function public.household_rows_keep_newest();
