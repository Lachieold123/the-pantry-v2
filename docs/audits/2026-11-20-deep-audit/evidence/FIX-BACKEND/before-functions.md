# Live function bodies before the apply (20 Nov 2026)

Read from project `eozyhllkvajvrecojdxu` with `pg_get_functiondef` (single SELECT, read-only). These are the definitions the 20 Nov migrations replace; the rollback SQL in `supabase/APPLY-LIVE.md` restores them verbatim.

ACLs (`proacl`) at the time:

| Function | ACL |
| --- | --- |
| `account_rows_keep_newest()` | `postgres=X, service_role=X` |
| `household_rows_keep_newest()` | `=X (PUBLIC), postgres, anon, authenticated, service_role` |
| `create_household(text, text)` | `postgres, authenticated, service_role` |
| `create_invite()` | `postgres, authenticated, service_role` |
| `delete_account()` | `postgres, authenticated, service_role` |
| `is_member(uuid)` | `postgres, authenticated, service_role` |
| `join_household(text, text)` | `postgres, authenticated, service_role` |
| `leave_household()` | `postgres, authenticated, service_role` |

Not present live: `preview_invite`, `revoke_invites`, `remove_member`, `too_many_join_attempts`, `rows_within_quota`, `rows_stamp_received`, `household_rows_since`, `account_rows_since`, `delete_stale_anonymous_users`, `may_hear`, `rows_broadcast`, `apple_token_save`, `apple_token_take`, `household_members_guard`, `households_guard`.

```sql
CREATE OR REPLACE FUNCTION public.account_rows_keep_newest()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  if new.updated_at < old.updated_at then
    return null;
  end if;
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.household_rows_keep_newest()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  if new.updated_at < old.updated_at then
    return null;
  end if;
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.create_invite()
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare h uuid; c text; alphabet text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
begin
  select household_id into h from public.household_members where user_id = auth.uid();
  if h is null then raise exception 'not-in-household'; end if;
  loop
    c := '';
    for i in 1..8 loop
      c := c || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from public.household_invites where code = c);
  end loop;
  insert into public.household_invites (code, household_id, created_by) values (c, h, auth.uid());
  return c;
end;
$function$;

CREATE OR REPLACE FUNCTION public.delete_account()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare me uuid := auth.uid();
begin
  if me is null then raise exception 'not-signed-in'; end if;
  perform public.leave_household();
  delete from public.account_rows where user_id = me;
  delete from public.profiles where user_id = me;
  delete from auth.users where id = me;
end;
$function$;

CREATE OR REPLACE FUNCTION public.join_household(p_code text, p_display_name text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare h uuid;
begin
  if auth.uid() is null then raise exception 'not-signed-in'; end if;
  select household_id into h from public.household_invites
    where code = upper(trim(p_code)) and expires_at > now();
  if h is null then raise exception 'invite-not-found'; end if;
  if exists (select 1 from public.household_members where user_id = auth.uid() and household_id = h) then return h; end if;
  if exists (select 1 from public.household_members where user_id = auth.uid()) then raise exception 'already-in-household'; end if;
  if (select count(*) from public.household_members where household_id = h) >= 8 then raise exception 'household-full'; end if;
  insert into public.household_members (household_id, user_id, display_name) values (h, auth.uid(), trim(p_display_name));
  return h;
end;
$function$;

-- Unchanged by the migrations, kept for reference:
CREATE OR REPLACE FUNCTION public.leave_household()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare h uuid;
begin
  delete from public.household_members where user_id = auth.uid() returning household_id into h;
  if h is not null and not exists (select 1 from public.household_members where household_id = h) then
    delete from public.households where id = h;
  end if;
end;
$function$;
```
