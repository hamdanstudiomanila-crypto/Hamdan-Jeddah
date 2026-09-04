-- Allow authenticated Super Admins to record application audit events.
-- SECURITY INVOKER intentionally keeps RLS and caller privileges active.

revoke all on table public.audit_logs from anon;
revoke insert, update, delete, truncate, references, trigger
  on table public.audit_logs from authenticated;
grant select, insert on table public.audit_logs to authenticated;

drop policy if exists "Super Admin can create audit logs" on public.audit_logs;
create policy "Super Admin can create audit logs"
  on public.audit_logs
  for insert
  to authenticated
  with check (
    actor_id = (select auth.uid())
    and exists (
      select 1
      from public.profiles as profile
      where profile.id = (select auth.uid())
        and profile.role = 'super_admin'
        and coalesce(profile.is_active, true)
    )
  );

create or replace function public.log_audit_event(
  p_action text,
  p_entity_type text,
  p_entity_id text,
  p_summary text
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  audit_id uuid;
begin
  insert into public.audit_logs (
    actor_id,
    actor_name,
    action,
    entity_type,
    entity_id,
    summary
  )
  select
    auth.uid(),
    profile.full_name,
    p_action,
    p_entity_type,
    p_entity_id,
    p_summary
  from public.profiles as profile
  where profile.id = auth.uid()
    and profile.role = 'super_admin'
    and coalesce(profile.is_active, true)
  returning id into audit_id;

  if audit_id is null then
    raise exception 'Only an active Super Admin can create audit logs';
  end if;

  return audit_id;
end;
$$;

revoke execute on function public.log_audit_event(text, text, text, text)
  from public, anon;
grant execute on function public.log_audit_event(text, text, text, text)
  to authenticated;
