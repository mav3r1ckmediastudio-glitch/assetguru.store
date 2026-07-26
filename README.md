# AssetGuru

A premium multi-vendor marketplace for **GameGuru MAX** assets — think "Unity Asset Store" for the GameGuru ecosystem. Buyers discover and purchase game-ready content; creators run storefronts and get paid; admins moderate the catalogue.

Built with **SvelteKit + TypeScript + TailwindCSS**, backed by **Supabase** (Postgres, Auth, Storage) and **Stripe Connect** for marketplace payments. Deploys to **Netlify**.

> The marketplace launches with **zero assets** — the owner uploads the first assets, then invites external creators.

---

## Quick start

```bash
npm install
cp .env.example .env    # then fill in your keys (see docs/DEPLOYMENT.md)
npm run dev             # http://localhost:5173
```

The source can be installed without credentials, but the live catalogue, authentication, uploads, orders and dashboards require a configured Supabase project. Stripe is only needed when you begin testing purchases and vendor payouts.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Local dev server |
| `npm run build` | Production build |
| `npm run preview` | Preview the production build |
| `npm run check` | Type + Svelte checks |
| `npm run verify` | Sanity-check routes and static assets |
| `npm run db:types` | Regenerate DB types from Supabase |

## Project layout

```
src/
  lib/          components, stores, server-only helpers (supabase, stripe), data adapters
  routes/       pages + API endpoints
    auth/       sign up / in / out / reset / verify
    account/    buyer: library, orders, downloads, reviews, support, settings
    creator/    vendor: products, uploads, orders, earnings, storefront, analytics
    admin/      moderation, vendors, cases, catalogue, reports, audit, settings
    api/        checkout, stripe webhook, vendor Connect, secure downloads, etc.
supabase/
  migrations/   production database schema, RLS, triggers, storage buckets
static/         images and static assets
docs/           setup and reference documentation
```

## Documentation

- **[docs/GETTING_STARTED.md](docs/GETTING_STARTED.md)** — the next steps in the correct order
- **[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)** — Supabase + Netlify setup, environment variables, going live
- **[docs/STRIPE_SETUP.md](docs/STRIPE_SETUP.md)** — Stripe Connect, webhooks, test mode
- **[docs/SECURITY.md](docs/SECURITY.md)** — Row Level Security model, roles, private downloads
- **[docs/TESTING.md](docs/TESTING.md)** — how to test the buyer/vendor/admin workflows
- **[docs/BRAND_GUIDELINES.md](docs/BRAND_GUIDELINES.md)** — colours, type and UI system

## Tech stack

Frontend: SvelteKit, TypeScript, TailwindCSS · Hosting: Netlify · Auth/DB/Storage: Supabase (PostgreSQL) · Payments: Stripe + Stripe Connect

## Status

The application UI, server routes, database migration, security policies, authentication flow, payment integration and storage workflow are present in source. They still need to be connected to real Supabase, Stripe and Netlify projects and tested end to end before public launch.

## License

No license is set yet. If you intend to keep this private/proprietary, that's the default — you may want to add a `LICENSE` file before making the repository public.
