-- Run in Jeddah SQL Editor after applying the acknowledgement migration.
-- Read-only: checks the RPC signature and permissions without acknowledging data.
select
  n.nspname as schema_name,
  p.proname as function_name,
  pg_get_function_arguments(p.oid) as arguments,
  p.prosecdef as security_definer,
  has_function_privilege('authenticated', p.oid, 'execute') as employee_can_execute,
  has_function_privilege('anon', p.oid, 'execute') as anonymous_can_execute
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname in ('public', 'private')
  and p.proname = 'acknowledge_my_payslip';
-- Expected: two rows, argument p_payslip_id uuid, employee_can_execute true,
-- anonymous_can_execute false. Only the private helper is security_definer.
