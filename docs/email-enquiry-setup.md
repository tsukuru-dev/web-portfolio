# Enquiry email setup and recovery guide

Last verified: 25 November 2026

This document explains how the Madhatter Studio enquiry form sends email, why the DNS is split between Zoho and Cloudflare, and how to reproduce or repair the setup without breaking `contact@madhatterstudio.co.uk`.

## The rule that must not be broken

The apex domain and the forms subdomain have different mail providers:

| Hostname | Purpose | Mail provider |
| --- | --- | --- |
| `madhatterstudio.co.uk` | Normal human email, including `contact@` | Zoho Mail |
| `forms.madhatterstudio.co.uk` | Automated website enquiry sender | Cloudflare Email Service / Email Routing |

This separation is intentional.

- Keep the Zoho MX records on the apex domain (`@`).
- Keep the Cloudflare-generated mail records on the `forms` subdomain.
- Do not enable Cloudflare Email Routing on the apex domain after setup: doing so can replace or conflict with the Zoho MX and SPF records.
- An SPF record at `madhatterstudio.co.uk` and another at `forms.madhatterstudio.co.uk` are valid because they belong to different DNS names. The “only one SPF record” rule applies per hostname, not across the entire zone.

## Current production addresses

| Role | Address |
| --- | --- |
| Automated sender | `enquiries@forms.madhatterstudio.co.uk` |
| Verified destination | `contact@madhatterstudio.co.uk` |
| Reply-To | The visitor's email address from the form |

The Worker sends from the forms subdomain to the verified `contact@` destination. Clicking Reply in Zoho should address the visitor because the generated message sets `Reply-To` to the visitor's name and email.

Zoho does not send the website notification. Zoho receives it at `contact@`; Cloudflare sends it from `enquiries@forms...`.

## How this account was actually made to work

Cloudflare initially required Email Routing to be onboarded before the forms subdomain could be configured. That temporarily interfered with the Zoho records on the main domain. The successful sequence was:

1. Save an exact copy of the working Zoho MX records and any Zoho SPF/DKIM records before touching Email Routing.
2. Verify `contact@madhatterstudio.co.uk` as a Cloudflare destination address.
3. Allow Cloudflare Email Routing to onboard the main domain temporarily and create the records it required.
4. Add `forms.madhatterstudio.co.uk` as an Email Routing subdomain.
5. Wait for Cloudflare to create and verify the required mail records on the `forms` hostname.
6. Disable Email Routing for the main/apex domain.
7. Remove Cloudflare's apex MX/SPF records and restore the saved Zoho records at `@`.
8. Leave the Cloudflare records for `forms.madhatterstudio.co.uk` in place.
9. Confirm that normal Zoho mail still works in both directions.
10. Submit a real website enquiry and confirm it arrives at `contact@` from `enquiries@forms.madhatterstudio.co.uk`.

Cloudflare's dashboard terminology changes over time. The current documentation separates Email Routing from Email Sending and supports onboarding a sending subdomain as its own domain. On this account, the sequence above is the known-working history. Do not repeat the temporary apex onboarding unless the dashboard genuinely requires it.

Official references:

- [Configure Email Service subdomains](https://developers.cloudflare.com/email-service/configuration/subdomains/)
- [Verify destination addresses](https://developers.cloudflare.com/email-service/configuration/destination-addresses/)
- [Configure Worker send bindings](https://developers.cloudflare.com/email-service/configuration/send-bindings/)
- [Email Sending Workers API](https://developers.cloudflare.com/email-service/api/send-emails/workers-api/)

## Expected DNS ownership

Do not copy record values from this guide; use the values shown by Zoho and Cloudflare for this account.

### Apex: `madhatterstudio.co.uk`

Expected ownership:

- MX: Zoho only.
- SPF TXT: one Zoho-compatible SPF record at `@`.
- DKIM: Zoho's selector record(s).
- DMARC: the domain's chosen DMARC policy.
- No Cloudflare Email Routing MX or SPF record at `@`.

### Subdomain: `forms.madhatterstudio.co.uk`

Expected ownership:

- Cloudflare-generated MX/bounce records.
- One Cloudflare-generated SPF record for the `forms` hostname.
- Cloudflare-generated DKIM/DMARC records if the onboarding flow adds them.
- Do not replace these with Zoho records.

If Zoho reports that SPF for the main domain has been disabled, first check for two SPF TXT records at `@`. A Cloudflare SPF record at `forms` is separate and should not be deleted merely because Zoho controls the apex.

## Application architecture

```text
Visitor submits /enquire/
        |
        v
POST /api/enquiry
        |
        v
Cloudflare Worker: worker/index.ts
  - same-origin check
  - content-type and 25 KB body limit
  - honeypot check
  - server-side field validation
  - Turnstile Siteverify validation
  - MIME email generation
        |
        v
ENQUIRY_EMAIL send_email binding
        |
        v
contact@madhatterstudio.co.uk (Zoho inbox)
```

The Worker serves both the built Astro assets and the API. `wrangler.jsonc` uses `run_worker_first` for `/api/*`, so `/api/enquiry` reaches the Worker before the static asset binding.

## Relevant files

| File | Responsibility |
| --- | --- |
| `src/pages/enquire.astro` | Form UI, client validation, Turnstile widget and POST request |
| `worker/index.ts` | Production API, security checks, Turnstile verification and send call |
| `src/lib/enquiry.ts` | Server-side form normalisation and validation |
| `src/lib/enquiry-email.ts` | Builds the raw MIME email and headers |
| `src/data/enquiry.ts` | Allowed form options used by client and server |
| `wrangler.jsonc` | Worker, asset and email-binding configuration |
| `.env.example` | Public Turnstile build-variable template |
| `.dev.vars.example` | Local Worker runtime-variable template |
| `tests/enquiry.test.ts` | Form-validation tests |
| `tests/enquiry-email.test.ts` | MIME sender, destination, Reply-To and body tests |
| `tests/deployment-config.test.ts` | Guards production sender/destination configuration |

## Wrangler configuration

The production configuration currently contains:

```jsonc
"vars": {
  "EMAIL_FROM": "enquiries@forms.madhatterstudio.co.uk",
  "EMAIL_TO": "contact@madhatterstudio.co.uk"
},
"send_email": [
  {
    "name": "ENQUIRY_EMAIL",
    "destination_address": "contact@madhatterstudio.co.uk"
  }
]
```

The binding name must remain `ENQUIRY_EMAIL` unless both `wrangler.jsonc` and the `Env` interface / send call in `worker/index.ts` are changed together.

The `destination_address` restriction is deliberate: this Worker may send only to the verified `contact@` address. On Cloudflare's free plan, sending to verified destination addresses is supported; arbitrary recipients may require a paid plan.

## Variables and secrets

| Name | Where it is used | Secret? | Production value |
| --- | --- | --- | --- |
| `PUBLIC_TURNSTILE_SITE_KEY` | Astro build / browser widget | No | Production Turnstile site key |
| `TURNSTILE_SECRET_KEY` | Worker runtime / Siteverify | Yes | Production Turnstile secret |
| `EMAIL_FROM` | Worker runtime | No | `enquiries@forms.madhatterstudio.co.uk` |
| `EMAIL_TO` | Worker runtime | No | `contact@madhatterstudio.co.uk` |
| `ENQUIRY_EMAIL` | Worker binding | Binding | Defined by `send_email` in Wrangler |

## Manual Cloudflare dashboard setup

These are the settings that a human added in Cloudflare. They are not all created merely by cloning the repository.

Cloudflare separates **build variables** from **Worker runtime variables**. Build variables exist only while Cloudflare is running the build command; they are not automatically available to the deployed Worker. Runtime variables and secrets are available to `worker/index.ts` when a request reaches `/api/enquiry`. See Cloudflare's [Workers Builds configuration](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/) and [runtime environment variables](https://developers.cloudflare.com/workers/configuration/environment-variables/) documentation.

### 1. Build variable

Dashboard location:

```text
Workers & Pages
  > web-portfolio
  > Settings
  > Build
  > Build variables and secrets
```

Add this as a normal variable, not a secret:

| Type | Name | Value |
| --- | --- | --- |
| Variable | `PUBLIC_TURNSTILE_SITE_KEY` | The public site key from the production Turnstile widget |

Why it is here: Astro reads this value while building `src/pages/enquire.astro`. The `PUBLIC_` prefix intentionally makes the public site key available to the browser. It is not the Turnstile secret.

After adding or changing this value, trigger a fresh Cloudflare build. Retrying an old output without rebuilding will not update the key embedded in the site.

### 2. Runtime secret

Dashboard location:

```text
Workers & Pages
  > web-portfolio
  > Settings
  > Variables & Secrets
```

The human must add the following to the production Worker runtime:

| Type | Name | Value |
| --- | --- | --- |
| Secret | `TURNSTILE_SECRET_KEY` | The secret belonging to the production Turnstile widget |

Enter `TURNSTILE_SECRET_KEY` using Cloudflare's encrypted **Secret** type. Do not put its real value in this repository, a screenshot, a support message, build logs or an AI conversation.

Do not put `TURNSTILE_SECRET_KEY` only under Build variables and secrets. The build may pass, but the deployed Worker will return a configuration error because build-only values do not exist at runtime.

The runtime secret must be entered by a human. An AI or repository change must never invent, request, expose or commit its real value.

### 3. Wrangler-managed variables and email binding

The following production values are not secrets and are already managed by `wrangler.jsonc`:

```jsonc
"vars": {
  "EMAIL_FROM": "enquiries@forms.madhatterstudio.co.uk",
  "EMAIL_TO": "contact@madhatterstudio.co.uk"
}
```

Wrangler applies these runtime variables when it deploys the Worker. They do not need to be manually duplicated under the dashboard's Variables & Secrets screen. If dashboard copies already exist, keep them identical to `wrangler.jsonc` or remove the duplicates so the repository remains the clear source of truth.

`keep_vars: true` prevents unrelated dashboard-managed runtime values, including the manually entered secret, from being removed during deployment.

`ENQUIRY_EMAIL` is not a text variable and should not be entered in either variables screen. It is a Worker email binding deployed from `wrangler.jsonc`:

```jsonc
"send_email": [
  {
    "name": "ENQUIRY_EMAIL",
    "destination_address": "contact@madhatterstudio.co.uk"
  }
]
```

Before the binding can send successfully, a human must:

1. Verify `contact@madhatterstudio.co.uk` under Cloudflare Email Service destination addresses.
2. Complete the `forms.madhatterstudio.co.uk` Email Routing / Email Sending subdomain setup described earlier in this document.
3. Confirm the Cloudflare-generated records remain on the `forms` subdomain.
4. Deploy the Worker so Wrangler creates or updates the `ENQUIRY_EMAIL` binding.

### 4. Turnstile widget

A human must create the production Turnstile widget in Cloudflare and configure its hostname for:

```text
madhatterstudio.co.uk
```

If another hostname will serve the form, such as `www.madhatterstudio.co.uk`, add it to the widget before using the form there. The Worker compares the hostname returned by Siteverify with the hostname that received the submission.

Copy the widget's public site key into the build variable and its secret key into the runtime secret. Never swap the two.

### 5. Git deployment settings

Confirm these manually in the Worker's Build settings:

| Setting | Production value |
| --- | --- |
| Connected repository | This `web-portfolio` repository |
| Production branch | `main` |
| Build command | `npm run build` |
| Deploy command | `npx wrangler deploy` or the equivalent `npm run deploy` workflow |
| Root directory | Repository root |

Only `main` should promote a production deployment. The `dev` branch is for ongoing work and CI validation.

### Manual setup checklist

- [ ] Zoho apex MX/SPF records are saved before changing Email Routing.
- [ ] `contact@madhatterstudio.co.uk` is a verified Cloudflare destination.
- [ ] `forms.madhatterstudio.co.uk` is onboarded for Cloudflare email.
- [ ] Cloudflare apex Email Routing is disabled after subdomain onboarding.
- [ ] Zoho apex MX/SPF records are restored.
- [ ] `PUBLIC_TURNSTILE_SITE_KEY` exists under Build variables.
- [ ] `TURNSTILE_SECRET_KEY` exists under runtime Variables & Secrets as a secret.
- [ ] Wrangler deploys `EMAIL_FROM` and `EMAIL_TO` from `wrangler.jsonc`.
- [ ] The `ENQUIRY_EMAIL` binding is visible on the deployed Worker.
- [ ] The custom domain is attached and HTTPS is active.
- [ ] A new production build has run after changing build variables.
- [ ] A real enquiry reaches Zoho and Reply addresses the visitor.

`PUBLIC_TURNSTILE_SITE_KEY` must be available during the Astro build because it is read through `import.meta.env`.

`TURNSTILE_SECRET_KEY` must be available to the deployed Worker at runtime. Keep it as a Cloudflare secret, never in Git. After deployment, verify it under the deployed Worker's variables/secrets rather than assuming a build-only variable reached runtime.

`keep_vars: true` in `wrangler.jsonc` tells Wrangler to preserve dashboard-managed variables that are not declared in the file.

The Worker checks that the request's `Origin` exactly matches the request URL's origin; it does not require a separate `SITE_ORIGIN` variable.

## Turnstile flow

1. The page renders the Turnstile widget with action `enquiry`.
2. The browser includes `cf-turnstile-response` in the submitted `FormData`.
3. The Worker sends that token, the runtime secret and the visitor IP to Cloudflare Siteverify.
4. The Worker accepts the response only when:
   - the verification request succeeds;
   - `success` is true;
   - the returned hostname matches the website hostname;
   - the returned action is `enquiry`.

Turnstile tokens are single-use and expire. Server-side Siteverify validation is mandatory; the browser widget alone is not sufficient. See [Cloudflare's Siteverify documentation](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/).

## Email construction details

`src/lib/enquiry-email.ts` uses `mimetext` to generate a valid raw MIME message.

Important headers:

```text
From: Madhatter website <enquiries@forms.madhatterstudio.co.uk>
To: <contact@madhatterstudio.co.uk>
Reply-To: Visitor Name <visitor@example.com>
Subject: New project enquiry: Business or visitor name
```

Do not replace the `Reply-To` `Mailbox` object with an arbitrary raw string. A previous implementation produced:

```text
MIMETEXT_INVALID_HEADER_VALUE: The value for the header "Reply-To" is invalid.
```

The current tested code is:

```ts
message.setHeader(
  'Reply-To',
  new Mailbox({ name: enquiry.name, addr: enquiry.email }),
);
```

## Deployment and validation

The intended Git workflow is:

1. Develop on `dev`.
2. Run the validation suite.
3. Merge production-ready work into `main`.
4. Let Cloudflare deploy only from `main`.

Before merging:

```bash
npm ci
npm run validate
```

The GitHub Actions workflow runs linting, tests, Astro/TypeScript checks and a production build on pushes to `dev` and `main`, and on pull requests targeting `main`.

The package lock must be committed and remain in sync with `package.json`; CI uses `npm ci`, which deliberately fails when they differ.

## Production test checklist

After any email, DNS, Worker or Turnstile change:

1. Confirm the website loads over HTTPS.
2. Submit the form from the production `/enquire/` page.
3. Confirm the UI shows the success state only after the API succeeds.
4. Confirm the message arrives at `contact@madhatterstudio.co.uk`.
5. Confirm From is `enquiries@forms.madhatterstudio.co.uk`.
6. Click Reply and confirm the recipient becomes the visitor's email.
7. Send a normal message to and from the Zoho `contact@` inbox to confirm apex mail still works.
8. Run `npm test` and confirm the deployment configuration, validation and MIME tests pass.

## Logs and troubleshooting

### Form shows “Please submit the form from the website”

The Worker's same-origin check failed. Inspect the request `Origin`, host, custom-domain configuration and any redirects. The production form must POST to `/api/enquiry` on the same origin.

### Form returns 400 or says spam protection failed

Check:

- `PUBLIC_TURNSTILE_SITE_KEY` was present at build time;
- `TURNSTILE_SECRET_KEY` exists at Worker runtime;
- the Turnstile widget permits the production hostname;
- the widget action remains `enquiry`;
- a token was not reused or allowed to expire.

### Form returns 502

Open the deployed Worker's logs and look for `Enquiry processing failed`.

Common causes:

- invalid MIME headers, especially `Reply-To`;
- missing or misnamed `ENQUIRY_EMAIL` binding;
- sender domain/subdomain not fully onboarded;
- sender does not match `EMAIL_FROM`;
- destination does not match the binding restriction;
- destination address is no longer verified.

### API reports success but no message arrives

Check the Cloudflare Email Sending activity/logs, the destination verification state, Zoho spam/quarantine and the `send_email` binding. Cloudflare notes that older Email Routing summaries can show Worker-sent email as “dropped” even when it was delivered, so use the current Email Sending logs where available.

### Zoho reports an SPF discrepancy

Inspect TXT records at the apex only. There must be one SPF record at `madhatterstudio.co.uk`. Remove leftover Cloudflare apex SPF records and restore the correct Zoho SPF value. Do not remove the independent SPF record at `forms.madhatterstudio.co.uk`.

### Main inbox stops receiving mail

Treat this as an apex MX problem:

1. Disable Cloudflare Email Routing for the main domain if it was re-enabled.
2. Restore the saved Zoho MX records at `@`.
3. Remove Cloudflare apex MX records.
4. Leave the `forms` subdomain records untouched.
5. Wait for DNS propagation and test Zoho again.

### Website or custom domain returns NXDOMAIN

That is a website DNS/custom-domain issue, not caused by the MIME code. Check the apex/`www` web records and Cloudflare custom-domain attachment separately from MX/TXT mail records.

## Safe-change rules for a future maintainer or AI

Before changing this system:

1. Read this document, `wrangler.jsonc`, `worker/index.ts`, `src/lib/enquiry-email.ts` and the three enquiry/deployment test files.
2. Do not modify or remove Zoho apex MX/SPF records as part of an application-code change.
3. Do not move the automated sender back to the apex domain.
4. Do not expose `TURNSTILE_SECRET_KEY` in Astro client code or commit it.
5. Keep `EMAIL_FROM`, `EMAIL_TO`, the binding restriction and tests consistent.
6. Preserve the visitor as `Reply-To`; never use the visitor's address as From.
7. Do not install or replace email packages unless the current MIME implementation genuinely cannot meet the requirement.
8. Run `npm run validate` before production deployment.
9. Test both the website enquiry and ordinary Zoho mail after any DNS change.
10. Leave commits and staging to the repository owner unless explicitly asked.

## Recovery summary

If rebuilding from scratch:

1. Ensure Zoho is healthy on the apex and save its DNS records.
2. Verify `contact@madhatterstudio.co.uk` as the Cloudflare destination.
3. Onboard only `forms.madhatterstudio.co.uk` for Cloudflare automated mail if the current dashboard permits it.
4. If Cloudflare temporarily requires apex Email Routing, follow the known-working sequence above and restore Zoho immediately afterward.
5. Configure the `ENQUIRY_EMAIL` binding and exact From/To values from `wrangler.jsonc`.
6. Add the production Turnstile build key and Worker runtime secret.
7. Deploy from `main`.
8. Complete the production test checklist.
