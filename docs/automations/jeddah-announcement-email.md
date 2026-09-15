# Jeddah announcement email setup

Import `jeddah-announcement-email.json` into n8n. It is inactive and starts in test mode. No credentials, database changes or live sends are included in the export.

The portal's HR Publish button inserts `public.announcements`; Update Announcement changes the same row. There is no draft/published column. This workflow accepts INSERT and UPDATE events, ignores unchanged content/image updates, and emails users whose `profiles.role` is exactly `employee`. Email addresses come from Supabase Auth, not editable profile metadata. Banned/deleted accounts and invalid addresses are excluded. Admin/HR accounts are not recipients unless their profile role is employee.

1. Create a **new Header Auth credential** named `JEDDAH Announcement Webhook` in n8n: header name `x-announcement-secret`, value a new randomly generated secret. Select it in **Announcement Webhook**. Keep it separate from backup credentials.
2. Select **JEDDAH Supabase** credentials in **Get Profiles** and **Get Employee Email**. Host: `https://qamdcpgwkveikddemvhz.supabase.co`; use this project's server secret/service-role credential. Do not edit the shared Manila credential. The workflow retrieves all profile pages, then looks up each employee's Auth email.
3. Select your existing authorized **SMTP account** in **Send Announcement Email**. In **Config**, verify `fromEmail` is an address this SMTP account can send from. The default matches the existing backup sender.
4. Keep `testMode: true`. Enter your own address in `testEmail` in **Config**. The test sends one email to that address, even when there are many employees. With no employee profiles, the workflow stops before the send stage.
5. Save/publish the workflow. Copy its **Production URL**; the path is `/webhook/announcement-published-jeddah`. Use the current public ngrok host, not localhost. n8n and ngrok must remain running.
6. In the **Jeddah** Supabase dashboard, open **Database → Webhooks → Create webhook**. Choose `public.announcements`, events **INSERT and UPDATE**, HTTP POST, and the production URL. Add `Content-Type: application/json` and `x-announcement-secret` matching the n8n Header Auth credential. Do not add a webhook to Manila.
7. Publish a real intended announcement while test mode is on, or use the synthetic payload below with n8n's Test URL. Check the execution and the single test email. Test URL requests require the same secret header. A real portal publish is visible on the dashboard even in email test mode.
8. Once verified, set `testMode: false` in Config and save/publish. Future new/changed announcements will email employees individually. Prior announcements are not scanned or emailed on activation.

Synthetic webhook body for a manual test (does not write a portal announcement):

```json
{
  "type": "INSERT",
  "schema": "public",
  "table": "announcements",
  "record": {
    "id": "11111111-1111-4111-8111-111111111111",
    "content": "Test announcement — please confirm the email layout.",
    "image_url": null,
    "updated_at": "2026-09-10T09:00:00Z"
  },
  "old_record": null
}
```

Email branding is Hamdan Studio, timestamps use Asia/Riyadh with AM/PM, and the button opens the Jeddah employee portal. Announcement text is HTML-escaped; only this project's public announcement images are embedded. Each employee gets a separate email; there is no shared To/CC list or n8n attribution footer.

## Delivery behavior and limits

This is a direct database-webhook → SMTP workflow, not a durable delivery queue. An HTTP acknowledgement confirms webhook receipt, not completed email delivery. Monitor failed n8n executions and Supabase webhook responses. A tunnel outage can lose a notification; publishing the announcement still succeeds. Replaying an event or restarting a partially sent execution can produce duplicate emails; SMTP retry is disabled to avoid silently resending an ambiguous send. There is no persistent per-recipient deduplication or automatic catch-up. Do not enable automatic whole-execution retries. Review recipients already sent before retrying after partial delivery. Rapid publications each produce their own notification snapshot, even if the portal now displays a newer version.

Failed executions can contain employee email addresses; restrict n8n access and retention. Successful production execution data is disabled in the export. An Auth lookup failure stops before email preparation, so no partial batch is sent at that stage. SMTP failures can occur after earlier recipients were sent.

Changing a row directly in Supabase also triggers notification because the existing schema treats saved announcements as published. If drafts, durable retry or exactly-once-style delivery tracking are needed, add a publication/outbox schema before expanding this workflow.

## Maintenance and verification

Edit `lib/automations/announcement-email.mjs` for validation/template changes, then run:

```text
node scripts/build-announcement-workflow.mjs
npm test -- tests/announcement-email.test.ts
```

Re-import the regenerated export and reselect credentials. Tests use synthetic data and never send mail. Live activation and SMTP delivery must be verified in n8n after credentials are selected.

References: [Supabase database webhooks](https://supabase.com/docs/guides/database/webhooks), [n8n Supabase node](https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.supabase/).

