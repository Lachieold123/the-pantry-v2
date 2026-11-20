-- Advisor performance warnings (deep audit 20 Nov 2026, S2-17).
-- auth_rls_initplan: a bare auth.uid() in a policy runs once per row;
-- `(select auth.uid())` runs once per statement. Same rules, worded for speed.
alter policy "members rename themselves" on public.household_members
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
alter policy "members add shared rows" on public.household_rows
  with check (public.is_member(household_id) and updated_by = (select auth.uid()));
alter policy "members change shared rows" on public.household_rows
  using (public.is_member(household_id))
  with check (public.is_member(household_id) and updated_by = (select auth.uid()));

-- unindexed_foreign_keys: deleting a household or a cook scans these tables without them.
create index if not exists household_invites_by_household on public.household_invites (household_id);
create index if not exists home_events_by_cook on public.home_events (cook_id) where cook_id is not null;
