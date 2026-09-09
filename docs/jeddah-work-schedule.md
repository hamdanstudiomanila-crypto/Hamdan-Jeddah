# Jeddah work schedule

Effective September 8, 2026, the working week is Sunday through Thursday, 8:00 AM to 6:00 PM, in `Asia/Riyadh` (UTC+3). Time-in after 8:00 AM is late, with no grace period. Friday and Saturday are rest days.

## Policy effects

- Attendance uses the server clock in Jeddah. Rest-day time-in remains possible and is not classified as late.
- Automatic absences skip Friday, Saturday, and configured company holidays. A database trigger also rejects manual rest-day absence entries from the effective date onward.
- Leave estimates and database allocations use the same dated workweek. Rest days and configured holidays do not consume leave credits. Previously pending rest-day allocations are voided; approved requests gain eligible Sunday allocations.
- Employee attendance calendars label rest days. HR's missing-time-in and leave-today summaries exclude non-working days.
- Early time-out warnings use the configured work end (6:00 PM by default). The time-out reminder is set to 6:00 PM. Start/end settings also control the displayed schedule; late cutoff remains a separate configurable setting.
- Historical attendance rows and settled leave credits are not rewritten. Dates before September 8 retain the previous Monday-Friday workweek and previous late cutoff for calculations.
- HR editing and employee master-list exports omit SSS, PhilHealth, Pag-IBIG, and TIN. Existing stored values are retained. The employment table remains in use for hired date and employment status, which leave eligibility still needs.
- Commute inputs, forecasts, and result times use Jeddah time. Address search is biased toward Jeddah and restricted to Saudi Arabia. The existing Jeddah n8n commute export already uses `SA` geocoding and `Asia/Riyadh`; its live import/activation must match that export.

The 8 AM-6 PM schedule is a time span, not a new payable-hours calculation. Breaks, overtime, salary rates, uploaded payslip amounts, and configured holidays are unchanged. Review the holiday calendar for the Jeddah office separately if it still contains Manila holidays.

## Verification

- Regression tests cover Sunday leave, Friday/Saturday exclusions, the effective-date boundary, company holidays, exact 8 AM and immediate lateness, and the Jeddah midnight/year boundary.
- The SQL migration was trialed in a transaction and rolled back, including rest-day INSERT guard assertions, before being applied to the linked Jeddah database.
- Migration: `supabase/migrations/20260908094018_jeddah_workweek_schedule.sql`.
