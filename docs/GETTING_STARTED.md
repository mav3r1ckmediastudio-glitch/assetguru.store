# Getting Started Without Getting Overwhelmed

AssetGuru uses three external services, but they do not need to be configured at the same time.

## Stage 1 — Put the source in GitHub

Create a private GitHub repository and place the contents of this folder at the repository root. The root should show `src`, `static`, `supabase`, `package.json`, `README.md` and `netlify.toml`.

Do not commit a real `.env` file. Only `.env.example` belongs in GitHub.

## Stage 2 — Create Supabase

Supabase provides the database, user accounts and file storage. Create one Supabase project, then run:

```text
supabase/migrations/202607260001_assetguru_production.sql
```

in the Supabase SQL Editor.

Copy the project URL, publishable key and server-only service-role key into a local `.env` copied from `.env.example`. Never publish the service-role key.

At this stage you can test registration, login, vendor applications, products, moderation, libraries and secure downloads. Payments will not work yet.

## Stage 3 — Run locally

Install Node.js 22, open a terminal in the project folder and run:

```bash
npm install
npm run verify
npm run check
npm run dev
```

Open `http://localhost:5173`.

## Stage 4 — Deploy to Netlify

Connect Netlify to the GitHub repository. The included `netlify.toml` supplies the build command and output directory. Add the same Supabase environment variables in Netlify, with `PUBLIC_SITE_URL` set to the Netlify HTTPS URL.

## Stage 5 — Add Stripe test mode

Create Stripe only after Supabase and Netlify are working. Start in test mode, enable Connect, add the test secret key, create the webhook endpoint and test purchases using Stripe test cards.

See `STRIPE_SETUP.md` for the payment-specific steps.

## Launch rule

Do not enable real payments or invite vendors until the complete workflow in `TESTING.md` has passed. The repository is the source baseline; Supabase, Stripe and Netlify are the configured services that make it operational.
