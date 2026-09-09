-- Publishing uses the signed-in HR session, so it needs an UPDATE policy.
-- Existing SELECT policy already lets admins read draft payslips.
create policy "Admins can update payslips"
  on public.payslips for update to authenticated
  using (exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and p.role in ('admin', 'super_admin')
  ))
  with check (exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and p.role in ('admin', 'super_admin')
  ));
