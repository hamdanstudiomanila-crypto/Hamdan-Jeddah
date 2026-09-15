# Jeddah system baseline

Recorded 2026-09-15 from local repository HEAD `5a344a1` plus the uncommitted Early Out changes. This is an architecture and behavior baseline, not a complete line-by-line security audit or proof of the deployed state. Read this before changing related features; verify the actual implementation when touching a module.

## Source and deployment boundaries

- Next.js 16.3.4, React 19.2.4, TypeScript, Tailwind 4, Supabase Auth/Postgres/Storage/Realtime, n8n integrations, Vercel deployment configuration.
- Jeddah project reference: `qamdcpgwkveikddemvhz`. Manila is a separate project; do not infer its configuration from Jeddah.
- `AGENTS.md` requires reading the relevant installed Next.js documentation before code changes.
- Local files, committed files, deployed Vercel code, applied database migrations, and published n8n workflows are separate states. None implies that the others are current.
- No production service was queried or modified for this baseline. Secrets and environment-file contents were not copied here.

## Roles and dashboard ownership

| Route | Stored role | Main responsibilities |
|---|---|---|
| `/employee` | `employee` | Attendance, leave/disputes, own payslips, documents, notifications, helpdesk, directory, commute, Ask AI |
| `/hr` | `admin` | Employee records, attendance review/reporting, leave/disputes, payslips, announcements, holidays, HR helpdesk |
| `/super-admin` | `super_admin` | Accounts, settings, audit/archive/backup tools, attendance administration, IT helpdesk |

`proxy.ts` verifies authentication and the stored profile role for protected dashboard routes. API authorization and database RLS are separate enforcement layers. Do not replace these with client-only checks.

## Code map

| Area | Entry points |
|---|---|
| Dashboard orchestration | `app/employee/page.tsx`, `app/hr/page.tsx`, `app/super-admin/page.tsx` |
| Feature presentation | `components/employee/`, `components/hr/`, `components/super-admin/` |
| Modal behavior | `components/shared/ModalShell.tsx` (focus, keyboard, close guards, scrolling) |
| Attendance data and actions | `lib/employee/attendance.ts`, `hooks/employee/useAttendance.ts`, `components/employee/AttendanceSection.tsx` |
| Shared business rules | `lib/work-schedule.ts`, `lib/attendance-rules.ts`, `lib/leave-rules.ts`, `lib/account-rules.ts` |
| Configuration and appearance | `lib/app-settings.ts`, `lib/seasonal-theme.ts`, `lib/portal-theme.ts`, `app/globals.css` |
| English/Arabic | `components/language/`, `lib/i18n/`, RTL handling in feature content |
| Database evolution | `supabase/migrations/`, `supabase/tests/`, `supabase/checks/` |
| Automation builders | `scripts/build-announcement-workflow.mjs`, `scripts/build-helpdesk-workflow.mjs` |
| Email validation/templates | `lib/automations/announcement-email.mjs`, `lib/automations/helpdesk-email.mjs` |

Dashboard pages still contain substantial cross-feature state and mutations. The modal extraction does not mean all business logic has been separated.

## Attendance and schedule

- Calendar/timezone: Asia/Riyadh (UTC+3).
- Schedule effective September 1, 2026: Sunday–Thursday; default 08:00–18:00. Earlier dates retain historical rules. Leave calculations exclude configured holidays and rest days.
- Work start/end display settings and late cutoff are separate settings. Preserve dated behavior when changing them.
- Time-in/time-out API routes use authenticated active employee accounts and server timestamps. Production office IP allowlist fails closed if missing; local development bypasses the production network requirement.
- Shared attendance hook owns attendance fetching and action state. Do not add another direct client timestamp write.
- **Early Out is currently a derived employee UI tag**, not a persisted `attendance_logs.status` value. It appears in employee history and work clock alongside the original Present/Late classification. It compares time-out to the configured end, with historical 19:00 before September 1. Exact official out is not early; next-day exits are not early.
- Early Out is not currently wired into HR/Super Admin records, calendar, export totals, or AI attendance summaries. Historical labels use current configured end values for post-effective-date records; there is no per-record schedule snapshot.

## Helpdesk

- Table: `employee_support_requests`; roles route by category: IT Concern to Super Admin, other categories to HR.
- States: Open, In Progress, Resolved, Cancelled. Active excludes the two terminal states; History includes them.
- Employee may cancel their own active request. HR may cancel active HR requests. Resolved/cancelled requests are immutable under the history guard and have no reopen UI.
- Replies use a single `hr_notes` field, including IT replies; this is not a threaded conversation.
- Shared HR/IT modal uses compact summary cards and equal-width status controls. Employee modal retains new-request form and Active/History cards.
- Routing in dashboards does not automatically change email recipients in n8n.

## Leave, requests, payslips, documents

- Jeddah leave filing accepts past, current, and future dates, including retroactive vacation leave. End date must not precede start date; HR review, sick-leave supporting documents, and the maximum request duration still apply.
- Leave credits are retired from employee/HR screens, settings, and Ask AI balance queries. Leave uses request rows, per-day allocations, holidays, and dated workweek rules. Historical credit rows remain for preservation.
- Migration 20260915073910_jeddah_leave_without_credits.sql stops credit deductions and lets settled retroactive leave replace an existing Absent attendance row. It preserves time-in records and rest-day/holiday exclusions. The internal legacy day status Deducted means processed, with no credit balance mutation.
- September request-support migration adds supporting documents for new sick leave, private leave-support storage, review/cancellation RPCs, and Realtime dependencies. Preserve transaction-based review behavior.
- Employees read their own published payslips; draft visibility and publication rights belong to authorized administration. Publication API verifies that an UPDATE returned a published row before triggering email.
- Payslip acknowledgement uses its dedicated database RPC. Storage file access and metadata access both matter.
- Employee documents use metadata plus storage; migration files alone do not back up stored file contents or employee data.

## APIs and external workflows

API route families: time-in/out and office-network check; employee creation/deactivation/password administration/email check; payslip publication; backup; address search/commute; Ask AI and its reauthentication endpoint.

- Backup, commute, payslip publish, and Ask AI have server-side n8n configuration. Local environment changes do not configure Vercel.
- Announcement notifications use announcement INSERT/UPDATE events. Helpdesk notifications use new requests or changed non-empty replies. Status-only helpdesk changes do not send notification mail in the template logic.
- Helpdesk template sender/inbox is `hr@hamdanstudio.com`; replies target the requestor's Auth email. Email replies do not write back to portal tickets.
- Use the exact Production URL copied from the intended live n8n node; do not manufacture UUID path segments. Workflow JSON does not prove activation or credential correctness.
- Direct webhook acknowledgement is not completed email delivery. These email templates do not provide a durable outbox or guaranteed deduplication.
- Ask AI separates model classification/PDF extraction from authorized server queries. Private payslips use owner/published checks, and sensitive access has reauthentication support. Directory answers have a narrower public-work-profile scope.
- Commute uses Saudi/Jeddah context with TomTom and configured automation dependencies.

## Database domains

Migration inventory includes profiles, attendance logs/disputes, announcements, government/employment metadata, payslips, leave requests/credits/day allocations, holidays, app settings, archives, API rate limits, helpdesk requests, employee documents, weather advisories, and audit logs. Later migrations amend the initial numbered snapshot; the snapshot alone is not the current schema.

## Known documentation discrepancies

1. Root README describes an older upgrade package and uses Submitted helpdesk status; current implementation uses Open.
2. `supabase/migrations/README.md` identifies the older Manila project. Do not use it as evidence of the linked Jeddah database or current production security settings.
3. Automation docs describe templates and sometimes earlier webhook paths/credential headers. Verify live credentials, URLs, recipients and test mode independently before delivery changes.
4. `next.config.ts` still allows public images from both project hosts. That allowlist is not proof of which database the app connects to.
5. Earlier document test counts and deployment statements are dated evidence, not the result of this review.

## Verification and working tree at baseline

`npm test` on 2026-09-15: **14 test files, 179 tests passed**. This does not run the live SQL checks, authenticated browser flows, real SMTP sends, or verify Vercel/n8n deployment state.

Existing uncommitted feature changes before creating this document:

- `app/employee/page.tsx`
- `components/employee/EmployeeWorkClock.tsx`
- `lib/attendance-rules.ts`
- `lib/i18n/ar.json`
- `tests/early-out.test.ts` (new)

Keep these changes when working on another feature. This document is an additional local file; no commit, push, deployment, database mutation, or email send was performed for the baseline.

## How to use this baseline

For each next request, identify its dashboard, shared business rule, database boundary and automation dependency. Preserve unrelated existing behavior. Update this document when behavior changes, and record what was actually verified versus what still requires a live check. Consult feature docs under `docs/` for detail, but resolve dated documentation conflicts against current code and verified service state.

## Leave filing update verification (2026-09-15)

- Local implementation only; no deployment or live database migration was performed.
- Live Supabase read for Jeddah was denied by the connector. Local database tests could not connect to PostgreSQL at 127.0.0.1:54322. The migration still requires database execution and verification.
- TypeScript check passed; 15 Vitest files and 185 tests passed, including retroactive date validation, Jeddah working-day calculations, and retired AI balance behavior. SQL regression coverage is prepared but was not executed because no database connection was available.
