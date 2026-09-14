# Helpdesk routing and resolved history

IT Concern tickets are managed from the Super Admin dashboard's IT Help Desk Quick Action (replacing Attendance Records in Quick Actions). Attendance remains accessible through the existing attendance tools. The mobile tools sheet also includes IT Help Desk. All other existing categories belong to HR Help Desk. Employees retain access to their own requests, including resolved and cancelled tickets.

All three views separate Active from History. The shared HR/IT workspace has real status counts, searchable ticket/employee lists, category and status filters, oldest/newest ordering, and a separate detail/reply panel. No fabricated overdue or average response metrics are shown. Resolving and saving moves a ticket to History, where no editing controls appear. The original subject, category, owner and description cannot be changed. A database trigger blocks updates to resolved/cancelled records, and RLS limits HR/admin updates to non-IT tickets and super_admin updates to IT tickets. Archiving is a status-based view, not a delete or separate table.

Employees can cancel only their own Open or In Progress requests using an inline confirmation in Help Desk. Cancellation retains the original content and any existing response, removes the ticket from active counts, and places it in read-only History. Employees cannot reopen a cancelled/resolved ticket, cancel another person's ticket, or forge a response while cancelling. HR and IT cannot reopen cancelled tickets either. Cancellation alone does not generate a reply email because it does not change `hr_notes`.

Migrations `20260914055838_helpdesk_routing_and_history.sql` and `20260914064323_helpdesk_employee_cancellation.sql` were applied to Jeddah and recorded in migration history. Existing resolved records are preserved. Database status values are Open, In Progress, Resolved and Cancelled (the old Submitted UI value was invalid).

Validation: TypeScript and production build; transactional database integration checks in `tests/helpdesk-routing.sql` for department isolation, resolution, immutable history, employee visibility and rejected employee replies. Synthetic writes are rolled back, preventing webhook emails. Browser verification used a temporary synthetic fixture: Active(1) → Resolve and archive → Active(0), History(1), with no input/save controls in History and no console errors. Fixture removed afterward.

Email recipients remain configured separately in n8n. The existing helpdesk automation still notifies its configured inbox and requestor; this change does not switch IT email recipients or alter live n8n templates. HR responses remain stored in the existing `hr_notes` field, including IT responses. The frontend displays IT response labels for IT tickets. Deploy the frontend changes to show the new controls in production.
# Compact layout and HR cancellation

The shared HR/IT desk uses a narrower modal, smaller summary cards, reduced spacing, and a shorter response field. HR can choose **Cancel ticket**, then **Cancel and archive** for an active HR request. Cancelled tickets move to read-only History. IT routing and employee cancellation remain unchanged.

Migration `20260914070004_helpdesk_hr_cancellation.sql` enables HR cancellation in Jeddah. Transactional routing tests cover cancellation and prevent reopening. Browser verification used synthetic data only.
