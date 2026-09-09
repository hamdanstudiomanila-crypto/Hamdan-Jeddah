-- Keep privileged writes outside the exposed API schema. Employees must not
-- receive general UPDATE access to payslip ownership, publication, or PDF data.
create schema if not exists private;

create or replace function private.acknowledge_my_payslip(p_payslip_id uuid)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  acknowledged_time timestamptz;
begin
  if caller_id is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.profiles p
    where p.id = caller_id and p.role = 'employee' and p.is_active is true
  ) then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  update public.payslips
  set acknowledged_at = coalesce(acknowledged_at, now())
  where id = p_payslip_id and user_id = caller_id and published is true
  returning acknowledged_at into acknowledged_time;

  if not found then
    raise exception 'Published payslip not found or not owned by you'
      using errcode = '42501';
  end if;

  return acknowledged_time;
end;
$$;

revoke all on function private.acknowledge_my_payslip(uuid) from public, anon;
grant usage on schema private to authenticated;
grant execute on function private.acknowledge_my_payslip(uuid) to authenticated;

-- Exact RPC name and argument used by the employee portal.
create or replace function public.acknowledge_my_payslip(p_payslip_id uuid)
returns timestamptz
language sql
security invoker
set search_path = ''
as $$
  select private.acknowledge_my_payslip(p_payslip_id);
$$;

revoke all on function public.acknowledge_my_payslip(uuid) from public, anon;
grant execute on function public.acknowledge_my_payslip(uuid) to authenticated;

notify pgrst, 'reload schema';
