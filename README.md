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

1. Create a Cloudflare Turnstile widget for the production domain.
2. Copy `.env.example` to `.env` and set `PUBLIC_TURNSTILE_SITE_KEY`.
3. Copy `.dev.vars.example` to `.dev.vars` for local Worker testing.
4. Configure `SITE_ORIGIN`, `EMAIL_FROM`, `EMAIL_TO`, and `TURNSTILE_SECRET_KEY` in Cloudflare before deployment.
5. Enable the `ENQUIRY_EMAIL` email binding and verify the destination address in Cloudflare Email Routing.

The form is intentionally unavailable until those values are configured; it never falls back to opening the visitor's email client.
