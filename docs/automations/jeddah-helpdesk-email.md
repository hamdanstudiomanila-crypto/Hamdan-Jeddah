# Jeddah Help Desk email notifications

Import `jeddah-helpdesk-email.json` into n8n. This new workflow is inactive, with test mode enabled. It does not replace the announcement or backup workflow.

| Portal action | From | To | Subject |
|---|---|---|---|
| Employee submits request | hr@hamdanstudio.com | hr@hamdanstudio.com | Category - Subject |
| HR saves a new/changed reply | hr@hamdanstudio.com | Requestor's Supabase Auth email | Category - Subject |

Example: `IT Concern - Cannot log in`. Empty subjects fall back to a short description summary. Test emails have a `[TEST]` prefix. The email contains category, subject, requestor email, status, request ID, Jeddah timestamp, description, and HR response when applicable. A button opens the appropriate portal dashboard; open Help Desk there to continue. The template uses Hamdan Studio branding and green/dark styling. Email replies are not ingested into the portal.

## n8n setup

1. Import the JSON as a new workflow on the live n8n instance used by ngrok.
2. In **Helpdesk Webhook**, select a new Header Auth credential named `JEDDAH Helpdesk Webhook`. Header name: `x-helpdesk-secret`. Use a new random secret and keep the same value for Supabase. Do not use a database password or modify another workflow's credential.
3. In **Get Requestor Email**, select the **Jeddah Supabase** server credential for `qamdcpgwkveikddemvhz`. The email lookup uses the request's `user_id`; it never accepts a destination email from the submitted description or subject.
4. In **Send Helpdesk Email**, select **SMTP account 2**, whose user is `hr@hamdanstudio.com`.
5. Keep **Config** `testMode: true`. The default `testEmail` is `hr@hamdanstudio.com`; both scenarios go there for testing.
6. Save/publish. Copy the **exact Production URL displayed by this node on the live VM**. Do not add a UUID manually or reuse the announcement URL. The configured path is `helpdesk-email-jeddah`.

## Connect Supabase

In the Jeddah Supabase dashboard, Database → Webhooks → Create:

- Name: `jeddah_helpdesk_email`
- Table: `public.employee_support_requests`
- Events: INSERT and UPDATE
- Method: POST
- URL: the exact copied n8n Production URL
- Headers: `Content-Type: application/json` and `x-helpdesk-secret` with the n8n Header Auth secret.

Create only one such webhook, to avoid duplicate sends. This uses the existing request/reply writes; no frontend deployment is required. The database webhook has not been installed by generating these files. Its actual live URL and matching secret are required before installation.

## Verify before enabling employee delivery

Submit a test request through an employee's Help Desk modal. Confirm the test email arrives at HR with category, subject and description. In HR, save a non-empty reply in `hr_notes`; confirm the second test email includes that reply and original request. In Config set `testMode: false`, save/publish, and use a designated test employee to verify actual requestor delivery. Test mode changes only email destination: requests remain visible in the portal.

Status-only updates, identical replies, empty/removed replies, and deletes do not send mail. Editing the HR reply sends another notification. HR replies are a single mutable `hr_notes` field in the current schema, not a message thread. Direct database edits of that field also trigger notifications. Existing records are not emailed on activation.

The workflow logs successful and failed executions to help diagnose setup. Restrict access and configure pruning because helpdesk messages may contain private information. HTTP acknowledgement means receipt, not SMTP delivery. There is no durable retry queue or per-event delivery ledger: tunnel outages may lose notifications and manual event replay may duplicate mail. Automatic SMTP retries are disabled; inspect the failed execution before retrying.

## Maintenance

```text
node scripts/build-helpdesk-workflow.mjs
npm test -- tests/helpdesk-email.test.ts
```

Builder regenerates the importable JSON from `lib/automations/helpdesk-email.mjs`. Importing does not select your private credentials or activate the workflow. Do not paste the module (which has exports) directly into an n8n Code node; import the generated workflow instead.

Reference: [Supabase database webhooks](https://supabase.com/docs/guides/database/webhooks).
