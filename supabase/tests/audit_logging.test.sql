begin;

select set_config(
  'request.jwt.claims',
  json_build_object(
    'sub', (select id from public.profiles where role = 'super_admin' limit 1),
    'role', 'authenticated'
  )::text,
  true
);

set local role authenticated;

select public.log_audit_event(
  'verification_test',
  'system',
  null,
  'Rollback-only audit RPC verification.'
) as audit_id;

rollback;
