# Madhatter Studio

A bespoke creative studio portfolio built with Astro.

## Commands

- `npm install`
- `npm run dev`
- `npm run build`
- `npm run check`
- `npm run dev:cloudflare`
- `npm run deploy`

## Enquiry form setup

The form posts to `/api/enquiry` through the Cloudflare Worker in `worker/index.ts`.

The complete production setup, DNS split, recovery procedure and troubleshooting guide are documented in [`docs/email-enquiry-setup.md`](docs/email-enquiry-setup.md).

1. Create a Cloudflare Turnstile widget for the production domain.
2. Copy `.env.example` to `.env` and set `PUBLIC_TURNSTILE_SITE_KEY`.
3. Copy `.dev.vars.example` to `.dev.vars` for local Worker testing.
4. Configure `EMAIL_FROM`, `EMAIL_TO`, and the runtime `TURNSTILE_SECRET_KEY` in Cloudflare before deployment.
5. Confirm the `ENQUIRY_EMAIL` binding from `wrangler.jsonc` and verify the destination address in Cloudflare Email Service.

The form is intentionally unavailable until those values are configured; it never falls back to opening the visitor's email client.
